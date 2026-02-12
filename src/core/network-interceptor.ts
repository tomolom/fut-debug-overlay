import { isFeatureEnabled } from './feature-toggles';
import { dispatcher } from './hook-dispatcher';
import type { HookDispatchPayload } from './hook-dispatcher';
import { sendMessage, MessageType } from './message-bridge';
import { originals } from './originals';
import { registry } from './registry';
import type { NetworkRequestRecord } from '../types';

export type { NetworkRequestRecord } from '../types';

const FETCH_KEY = 'window.fetch';
const XHR_OPEN_KEY = 'XMLHttpRequest.prototype.open';
const XHR_SEND_KEY = 'XMLHttpRequest.prototype.send';
const SAFE_HEADER_KEYS = [
  'content-type',
  'accept',
  'authorization',
  'user-agent',
];

interface UTAttribution {
  utClass: string | null;
  utMethod: string | null;
}

interface ExtractRequestMetadataInput {
  id: number;
  ts: number;
  url: string;
  method?: string;
  requestHeaders?: HeadersInit | null;
  status: number;
  startTs: number;
  endTs: number;
  size: number | null;
  stack?: string;
  correlationId: string;
}

export interface NetworkRequestMetadata extends NetworkRequestRecord {
  headers: Record<string, string>;
  startTs: number;
  endTs: number;
}

interface XhrLifecycleState {
  method: string;
  url: string;
  startTs: number;
  startPerf: number;
  stack: string;
  correlationId: string;
}

let xhrState = new WeakMap<XMLHttpRequest, XhrLifecycleState>();
let nextNetworkId = 1;
let nextCorrelationId = 1;

export function extractUTClassFromStack(stack: string): UTAttribution {
  const utMatches = stack.match(/UT[A-Z][A-Za-z0-9_]+/g) || [];
  const utClass = utMatches[0] || null;
  if (!utClass) {
    return { utClass: null, utMethod: null };
  }

  const methodMatch = stack.match(
    /at\s+(UT[A-Z][A-Za-z0-9_]+)\.([A-Za-z0-9_$<>]+)\s*\(/,
  );
  if (!methodMatch) {
    return { utClass, utMethod: null };
  }

  return {
    utClass,
    utMethod: methodMatch[2] || null,
  };
}

function toHeaderEntries(
  headers?: HeadersInit | null,
): Array<[string, string]> {
  if (!headers) {
    return [];
  }

  if (headers instanceof Headers) {
    const entries: Array<[string, string]> = [];
    headers.forEach((value, key) => {
      entries.push([key, value]);
    });
    return entries;
  }

  if (Array.isArray(headers)) {
    return headers;
  }

  return Object.entries(headers);
}

function extractSafeHeaders(
  headers?: HeadersInit | null,
): Record<string, string> {
  const safeHeaders: Record<string, string> = {};
  const entries = toHeaderEntries(headers);

  for (let i = 0; i < entries.length; i += 1) {
    const [rawKey, rawValue] = entries[i];
    const key = rawKey.toLowerCase();
    if (!SAFE_HEADER_KEYS.includes(key)) {
      continue;
    }

    if (key === 'authorization') {
      safeHeaders[key] = '[REDACTED]';
      continue;
    }

    safeHeaders[key] = String(rawValue);
  }

  return safeHeaders;
}

export function extractRequestMetadata(
  input: ExtractRequestMetadataInput,
): NetworkRequestMetadata {
  const attribution = extractUTClassFromStack(input.stack || '');

  return {
    id: input.id,
    ts: input.ts,
    url: input.url,
    method: (input.method || 'GET').toUpperCase(),
    status: input.status,
    durationMs: Math.max(0, input.endTs - input.startTs),
    size: input.size,
    utClass: attribution.utClass,
    utMethod: attribution.utMethod,
    correlationId: input.correlationId,
    headers: extractSafeHeaders(input.requestHeaders),
    startTs: input.startTs,
    endTs: input.endTs,
  };
}

function createCorrelationId(): string {
  const current = nextCorrelationId;
  nextCorrelationId += 1;
  return `net-${current}`;
}

function createId(): number {
  const current = nextNetworkId;
  nextNetworkId += 1;
  return current;
}

function estimateSizeFromContentLength(headers: Headers): number | null {
  const raw = headers.get('content-length');
  if (!raw) {
    return null;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

function estimateXhrResponseSize(xhr: XMLHttpRequest): number | null {
  const headerSize = Number(xhr.getResponseHeader('content-length') || '');
  if (Number.isFinite(headerSize) && headerSize >= 0) {
    return headerSize;
  }

  if (typeof xhr.response === 'string') {
    return xhr.response.length;
  }

  if (xhr.response instanceof ArrayBuffer) {
    return xhr.response.byteLength;
  }

  if (typeof xhr.responseText === 'string') {
    return xhr.responseText.length;
  }

  return null;
}

function toRecord(metadata: NetworkRequestMetadata): NetworkRequestRecord {
  return {
    id: metadata.id,
    ts: metadata.ts,
    url: metadata.url,
    method: metadata.method,
    status: metadata.status,
    durationMs: metadata.durationMs,
    size: metadata.size,
    utClass: metadata.utClass,
    utMethod: metadata.utMethod,
    correlationId: metadata.correlationId,
  };
}

function publishNetworkRequest(metadata: NetworkRequestMetadata): void {
  const record = toRecord(metadata);
  recordNetworkRequest(record);

  try {
    dispatcher.emit(
      'network:request',
      metadata as unknown as HookDispatchPayload,
    );
  } catch {
    // Keep instrumentation failure-isolated.
  }

  try {
    sendMessage(MessageType.NETWORK_EVENT, metadata);
  } catch {
    // Keep instrumentation failure-isolated.
  }
}

export function recordNetworkRequest(record: NetworkRequestRecord): void {
  if (!isFeatureEnabled('network')) {
    return;
  }

  registry.networkRequests.push({ ...record });
}

export function getNetworkRequests(
  limit = 50,
  filter?: string,
): NetworkRequestRecord[] {
  const all = registry.networkRequests.toArrayNewestFirst();

  const filtered = filter
    ? all.filter((entry) => entry.url.includes(filter))
    : all;

  return filtered.slice(0, limit).map((entry) => ({ ...entry }));
}

export function resetNetworkRequests(): void {
  registry.networkRequests.clear();
  xhrState = new WeakMap<XMLHttpRequest, XhrLifecycleState>();
  nextNetworkId = 1;
  nextCorrelationId = 1;
}

function extractRequestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') {
    return input;
  }

  if (input instanceof URL) {
    return input.toString();
  }

  return input.url;
}

function patchFetch(): void {
  const currentFetch = window.fetch as any;
  if (currentFetch && currentFetch.__utPatched) {
    if (currentFetch.__utOriginal) {
      originals.store(FETCH_KEY, currentFetch.__utOriginal);
    }
    return;
  }

  originals.store(FETCH_KEY, window.fetch);
  const originalFetch = originals.get<typeof window.fetch>(FETCH_KEY);
  if (!originalFetch) {
    return;
  }

  const patchedFetch: typeof window.fetch = async function (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    const startTs = performance.now();
    const ts = Date.now();
    const stack = new Error().stack || '';
    const correlationId = createCorrelationId();

    try {
      const response = await originalFetch.call(window, input, init);

      if (!isFeatureEnabled('network')) {
        return response;
      }

      const endTs = performance.now();
      const requestLike = input instanceof Request ? input : undefined;
      const headers = init?.headers || requestLike?.headers;
      const size = estimateSizeFromContentLength(response.headers);

      const metadata = extractRequestMetadata({
        id: createId(),
        ts,
        url: extractRequestUrl(input),
        method: init?.method || requestLike?.method || 'GET',
        requestHeaders: headers,
        status: response.status,
        startTs,
        endTs,
        size,
        stack,
        correlationId,
      });

      publishNetworkRequest(metadata);

      return response;
    } catch (error) {
      if (isFeatureEnabled('network')) {
        const endTs = performance.now();
        const requestLike = input instanceof Request ? input : undefined;
        const headers = init?.headers || requestLike?.headers;
        const metadata = extractRequestMetadata({
          id: createId(),
          ts,
          url: extractRequestUrl(input),
          method: init?.method || requestLike?.method || 'GET',
          requestHeaders: headers,
          status: 0,
          startTs,
          endTs,
          size: null,
          stack,
          correlationId,
        });
        publishNetworkRequest(metadata);
      }

      throw error;
    }
  };

  (patchedFetch as any).__utPatched = true;
  (patchedFetch as any).__utOriginal = originalFetch;
  window.fetch = patchedFetch;
}

function patchXhr(): void {
  const currentOpen = XMLHttpRequest.prototype.open as any;
  if (currentOpen && currentOpen.__utPatched) {
    if (currentOpen.__utOriginal) {
      originals.store(XHR_OPEN_KEY, currentOpen.__utOriginal);
    }
    const currentSend = XMLHttpRequest.prototype.send as any;
    if (currentSend && currentSend.__utOriginal) {
      originals.store(XHR_SEND_KEY, currentSend.__utOriginal);
    }
    return;
  }

  originals.store(XHR_OPEN_KEY, XMLHttpRequest.prototype.open);
  originals.store(XHR_SEND_KEY, XMLHttpRequest.prototype.send);

  const originalOpen =
    originals.get<typeof XMLHttpRequest.prototype.open>(XHR_OPEN_KEY);
  const originalSend =
    originals.get<typeof XMLHttpRequest.prototype.send>(XHR_SEND_KEY);

  if (!originalOpen || !originalSend) {
    return;
  }

  const patchedOpen: typeof XMLHttpRequest.prototype.open = function (
    this: XMLHttpRequest,
    method: string,
    url: string | URL,
    async?: boolean,
    username?: string | null,
    password?: string | null,
  ): void {
    try {
      xhrState.set(this, {
        method: (method || 'GET').toUpperCase(),
        url: String(url),
        startTs: 0,
        startPerf: 0,
        stack: '',
        correlationId: createCorrelationId(),
      });
    } catch {
      // Keep instrumentation failure-isolated.
    }

    originalOpen.call(
      this,
      method,
      url,
      async as any,
      username as any,
      password as any,
    );
  };

  const patchedSend: typeof XMLHttpRequest.prototype.send = function (
    this: XMLHttpRequest,
    body?: Document | XMLHttpRequestBodyInit | null,
  ): void {
    const state = xhrState.get(this);
    if (state) {
      state.startPerf = performance.now();
      state.startTs = Date.now();
      state.stack = new Error().stack || '';
    }

    const finalize = () => {
      if (!isFeatureEnabled('network')) {
        return;
      }

      const latestState = xhrState.get(this);
      if (!latestState || latestState.startTs === 0) {
        return;
      }

      try {
        const endTs = performance.now();
        const metadata = extractRequestMetadata({
          id: createId(),
          ts: latestState.startTs,
          url: latestState.url,
          method: latestState.method,
          requestHeaders: null,
          status: this.status || 0,
          startTs: latestState.startPerf,
          endTs,
          size: estimateXhrResponseSize(this),
          stack: latestState.stack,
          correlationId: latestState.correlationId,
        });

        publishNetworkRequest(metadata);
      } catch {
        // Keep instrumentation failure-isolated.
      } finally {
        xhrState.delete(this);
      }
    };

    this.addEventListener('loadend', finalize, { once: true });

    originalSend.call(this, body as any);
  };

  (patchedOpen as any).__utPatched = true;
  (patchedOpen as any).__utOriginal = originalOpen;
  (patchedSend as any).__utPatched = true;
  (patchedSend as any).__utOriginal = originalSend;

  XMLHttpRequest.prototype.open = patchedOpen;
  XMLHttpRequest.prototype.send = patchedSend;
}

export function initNetworkInterceptor(): void {
  try {
    patchFetch();
  } catch {
    // Keep instrumentation failure-isolated.
  }

  try {
    patchXhr();
  } catch {
    // Keep instrumentation failure-isolated.
  }
}
