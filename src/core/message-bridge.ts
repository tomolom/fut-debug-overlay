import { serialize } from './serializer';

export const MESSAGE_CHANNEL = '__FUT_DEBUG_MSG';
const FLUSH_INTERVAL_MS = 500;

export enum MessageType {
  NETWORK_EVENT = 'NETWORK_EVENT',
  METHOD_CALL = 'METHOD_CALL',
  NAV_EVENT = 'NAV_EVENT',
  PERF_DATA = 'PERF_DATA',
  SNAPSHOT_REQUEST = 'SNAPSHOT_REQUEST',
  SNAPSHOT_DATA = 'SNAPSHOT_DATA',
  TOGGLE_FEATURE = 'TOGGLE_FEATURE',
  GET_FEATURE_STATES = 'GET_FEATURE_STATES',
  FEATURE_STATES = 'FEATURE_STATES',
  GET_PERF_DATA = 'GET_PERF_DATA',
  GET_NAV_EVENTS = 'GET_NAV_EVENTS',
}

export interface BridgeMessage {
  type: MessageType;
  tabId: number;
  payload: unknown;
}

type BridgeEnvelope = {
  channel: typeof MESSAGE_CHANNEL;
  direction: 'MAIN_TO_CONTENT' | 'CONTENT_TO_MAIN';
  message?: BridgeMessage;
  messages?: BridgeMessage[];
};

type MessageHandler = (payload: unknown) => void;

const listeners = new Map<MessageType, Set<MessageHandler>>();
const outbox: BridgeMessage[] = [];
let tabId = -1;

function flushOutbox(): void {
  if (outbox.length === 0) {
    return;
  }

  const batch = outbox.splice(0, outbox.length);
  const envelope: BridgeEnvelope = {
    channel: MESSAGE_CHANNEL,
    direction: 'MAIN_TO_CONTENT',
    messages: batch,
  };
  window.postMessage(envelope, '*');
}

function dispatchMessage(message: BridgeMessage): void {
  const normalizedPayload = serialize(message.payload);
  const handlers = listeners.get(message.type);
  if (!handlers || handlers.size === 0) {
    return;
  }

  handlers.forEach((handler) => {
    try {
      handler(normalizedPayload);
    } catch (error) {
      console.warn('[UTDebug] Message bridge handler failed', error);
    }
  });
}

function handleIncomingEvent(event: MessageEvent): void {
  if (event.source !== window) {
    return;
  }

  const data = event.data as BridgeEnvelope | undefined;
  if (
    !data ||
    data.channel !== MESSAGE_CHANNEL ||
    data.direction !== 'CONTENT_TO_MAIN'
  ) {
    return;
  }

  if (Array.isArray(data.messages)) {
    data.messages.forEach(dispatchMessage);
    return;
  }

  if (data.message) {
    dispatchMessage(data.message);
  }
}

window.addEventListener('message', handleIncomingEvent);
setInterval(flushOutbox, FLUSH_INTERVAL_MS);

export function setBridgeTabId(nextTabId: number): void {
  tabId = nextTabId;
}

export function sendMessage(type: MessageType, payload: unknown): void {
  outbox.push({
    type,
    tabId,
    payload: serialize(payload),
  });
}

export function onMessage(
  type: MessageType,
  callback: (payload: unknown) => void,
): () => void {
  const handlers = listeners.get(type) ?? new Set<MessageHandler>();
  handlers.add(callback);
  listeners.set(type, handlers);

  return () => {
    const currentHandlers = listeners.get(type);
    if (!currentHandlers) {
      return;
    }
    currentHandlers.delete(callback);
    if (currentHandlers.size === 0) {
      listeners.delete(type);
    }
  };
}
