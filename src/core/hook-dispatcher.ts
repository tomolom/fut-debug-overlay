export type HookEventName =
  | 'dom:appendChild'
  | 'dom:insertBefore'
  | 'dom:replaceChild'
  | 'event:addEventListener'
  | 'method:call';

export interface HookDispatchPayload {
  source: string;
  node: unknown;
  args: unknown[];
  originalResult: unknown;
}

export type HookCallback = (payload: HookDispatchPayload) => void;

export interface HookDispatcher {
  on(eventName: HookEventName, callback: HookCallback): void;
  off(eventName: HookEventName, callback: HookCallback): void;
  emit(eventName: HookEventName, payload: HookDispatchPayload): void;
}

export function createHookDispatcher(): HookDispatcher {
  const listeners = new Map<HookEventName, Set<HookCallback>>();

  return {
    on(eventName, callback) {
      const current = listeners.get(eventName) || new Set<HookCallback>();
      current.add(callback);
      listeners.set(eventName, current);
    },
    off(eventName, callback) {
      const current = listeners.get(eventName);
      if (!current) return;
      current.delete(callback);
      if (current.size === 0) listeners.delete(eventName);
    },
    emit(eventName, payload) {
      const current = listeners.get(eventName);
      if (!current || current.size === 0) return;

      const callbacks = Array.from(current);
      for (let i = 0; i < callbacks.length; i += 1) {
        try {
          callbacks[i](payload);
        } catch {
          // Subscriber failures must never break hook execution.
        }
      }
    },
  };
}

export const dispatcher = createHookDispatcher();
