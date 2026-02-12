import type { DebugState } from '../types';

export type StateKeyCallback<K extends keyof DebugState> = (
  value: DebugState[K],
  state: Readonly<DebugState>,
) => void;

export type GlobalStateCallback = (
  state: Readonly<DebugState>,
  changedKeys: ReadonlyArray<keyof DebugState>,
) => void;

const DEFAULT_DEBUG_STATE: DebugState = {
  debugEnabled: false,
  overlayEnabled: true,
  sidebarEnabled: true,
  methodSpyVisible: false,
  methodSpyNextId: 1,
  methodSpyNeedsRefresh: false,
  sidebarDirty: true,
  classWindowVisible: false,
  selectedClassName: null,
  networkMonitorEnabled: false,
  conditionalLoggingEnabled: false,
  perfProfilerEnabled: false,
  navTimelineEnabled: false,
  propertyWatcherEnabled: false,
};

export class DebugStore {
  private state: DebugState;

  private readonly keyedSubscribers: Map<
    keyof DebugState,
    Set<StateKeyCallback<keyof DebugState>>
  >;

  private readonly globalSubscribers: Set<GlobalStateCallback> = new Set();

  constructor(initialState?: Partial<DebugState>) {
    this.state = {
      ...DEFAULT_DEBUG_STATE,
      ...(initialState || {}),
    };
    this.keyedSubscribers = new Map();
    (Object.keys(this.state) as Array<keyof DebugState>).forEach((key) => {
      this.keyedSubscribers.set(key, new Set());
    });
  }

  getState(): DebugState {
    return { ...this.state };
  }

  get<K extends keyof DebugState>(key: K): DebugState[K] {
    return this.state[key];
  }

  set(partial: Partial<DebugState>): void {
    const changedKeys: Array<keyof DebugState> = [];
    const nextState = { ...this.state } as DebugState;

    (Object.keys(partial) as Array<keyof DebugState>).forEach((key) => {
      const nextValue = partial[key] as DebugState[typeof key];
      if (!Object.is(this.state[key], nextValue)) {
        (nextState as Record<keyof DebugState, DebugState[keyof DebugState]>)[
          key
        ] = nextValue as DebugState[keyof DebugState];
        changedKeys.push(key);
      }
    });

    if (changedKeys.length === 0) {
      return;
    }

    this.state = nextState;

    changedKeys.forEach((key) => {
      const callbacks = this.keyedSubscribers.get(key);
      if (!callbacks || callbacks.size === 0) return;
      Array.from(callbacks).forEach((callback) => {
        callback(this.state[key], this.state);
      });
    });

    if (this.globalSubscribers.size === 0) {
      return;
    }

    Array.from(this.globalSubscribers).forEach((callback) => {
      callback(this.state, changedKeys);
    });
  }

  subscribe<K extends keyof DebugState>(
    key: K,
    callback: StateKeyCallback<K>,
  ): () => void;

  subscribe(callback: GlobalStateCallback): () => void;

  subscribe<K extends keyof DebugState>(
    keyOrCallback: K | GlobalStateCallback,
    maybeCallback?: StateKeyCallback<K>,
  ): () => void {
    if (typeof keyOrCallback === 'function') {
      const globalCallback = keyOrCallback;
      this.globalSubscribers.add(globalCallback);
      return () => {
        this.globalSubscribers.delete(globalCallback);
      };
    }

    const key = keyOrCallback;
    const callback = maybeCallback as StateKeyCallback<keyof DebugState>;
    const callbacks = this.keyedSubscribers.get(key);
    if (!callbacks) {
      return () => {};
    }

    callbacks.add(callback);
    return () => {
      callbacks.delete(callback);
    };
  }

  getSubscriberCounts(): { keyed: number; global: number } {
    let keyed = 0;
    this.keyedSubscribers.forEach((callbacks) => {
      keyed += callbacks.size;
    });
    return {
      keyed,
      global: this.globalSubscribers.size,
    };
  }
}

export function createDebugStore(
  initialState?: Partial<DebugState>,
): DebugStore {
  return new DebugStore(initialState);
}

const debugStore = createDebugStore();

export function getState(): DebugState {
  return debugStore.getState();
}

export function get<K extends keyof DebugState>(key: K): DebugState[K] {
  return debugStore.get(key);
}

export function set(partial: Partial<DebugState>): void {
  debugStore.set(partial);
}

export function subscribe<K extends keyof DebugState>(
  key: K,
  callback: StateKeyCallback<K>,
): () => void;

export function subscribe(callback: GlobalStateCallback): () => void;

export function subscribe<K extends keyof DebugState>(
  keyOrCallback: K | GlobalStateCallback,
  maybeCallback?: StateKeyCallback<K>,
): () => void {
  if (typeof keyOrCallback === 'function') {
    return debugStore.subscribe(keyOrCallback);
  }
  return debugStore.subscribe(
    keyOrCallback,
    maybeCallback as StateKeyCallback<K>,
  );
}
