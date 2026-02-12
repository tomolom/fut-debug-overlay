const SIZE_CAP_BYTES = 10 * 1024;

type Primitive = string | number | boolean | null | undefined;

type SpecialSerialized =
  | { __type: 'Element'; tag: string; id: string; className: string }
  | { __type: 'Function'; name: string }
  | { __type: 'circular' }
  | { __type: 'maxDepth' }
  | { __type: 'Date'; value: string }
  | { __type: 'Error'; name: string; message: string; stack?: string }
  | { __type: 'RegExp'; source: string; flags: string }
  | { __truncated: true; value?: string };

export type SerializedValue =
  | Primitive
  | SpecialSerialized
  | SerializedValue[]
  | { [key: string]: SerializedValue };

function isPrimitive(value: unknown): value is Primitive {
  return (
    value === null ||
    value === undefined ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  );
}

function isDomElement(value: unknown): value is {
  tagName: string;
  id: string;
  className: string;
} {
  if (!value || typeof value !== 'object') {
    return false;
  }

  if (typeof Element !== 'undefined' && value instanceof Element) {
    return true;
  }

  const candidate = value as {
    nodeType?: unknown;
    tagName?: unknown;
    id?: unknown;
    className?: unknown;
  };

  return (
    candidate.nodeType === 1 &&
    typeof candidate.tagName === 'string' &&
    typeof candidate.id === 'string' &&
    typeof candidate.className === 'string'
  );
}

function capSerializedSize(value: SerializedValue): SerializedValue {
  const json = JSON.stringify(value);
  if (!json || json.length <= SIZE_CAP_BYTES) {
    return value;
  }

  if (typeof value === 'string') {
    return {
      __truncated: true,
      value: `${value.slice(0, SIZE_CAP_BYTES)}...`,
    };
  }

  return {
    __truncated: true,
  };
}

function serializeInternal(
  data: unknown,
  depth: number,
  maxDepth: number,
  seen: WeakSet<object>,
): SerializedValue {
  if (isPrimitive(data)) {
    return capSerializedSize(data);
  }

  if (typeof data === 'function') {
    return capSerializedSize({
      __type: 'Function',
      name: data.name || 'anonymous',
    });
  }

  if (data instanceof Date) {
    return capSerializedSize({
      __type: 'Date',
      value: data.toISOString(),
    });
  }

  if (data instanceof Error) {
    return capSerializedSize({
      __type: 'Error',
      name: data.name,
      message: data.message,
      stack: data.stack,
    });
  }

  if (data instanceof RegExp) {
    return capSerializedSize({
      __type: 'RegExp',
      source: data.source,
      flags: data.flags,
    });
  }

  if (isDomElement(data)) {
    return capSerializedSize({
      __type: 'Element',
      tag: data.tagName,
      id: data.id || '',
      className: data.className || '',
    });
  }

  if (typeof data !== 'object' || data === null) {
    return capSerializedSize(String(data));
  }

  if (seen.has(data)) {
    return {
      __type: 'circular',
    };
  }

  if (depth >= maxDepth) {
    return {
      __type: 'maxDepth',
    };
  }

  seen.add(data);
  try {
    if (Array.isArray(data)) {
      const serializedArray = data.map((entry) =>
        serializeInternal(entry, depth + 1, maxDepth, seen),
      );
      return serializedArray;
    }

    const result: { [key: string]: SerializedValue } = {};
    Object.keys(data).forEach((key) => {
      result[key] = serializeInternal(
        (data as Record<string, unknown>)[key],
        depth + 1,
        maxDepth,
        seen,
      );
    });
    return result;
  } finally {
    seen.delete(data);
  }
}

export function serialize(data: unknown, maxDepth = 3): SerializedValue {
  return serializeInternal(data, 0, maxDepth, new WeakSet<object>());
}
