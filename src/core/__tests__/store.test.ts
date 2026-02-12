import { describe, it, expect } from 'vitest';
import { createDebugStore } from '../store';

describe('DebugStore', () => {
  it('gets initial state and keyed values', () => {
    const store = createDebugStore();
    const state = store.getState();

    expect(state.debugEnabled).toBe(false);
    expect(store.get('methodSpyNextId')).toBe(1);
  });

  it('supports batch set and changed-key notifications only', () => {
    const store = createDebugStore();
    const calledKeys: string[] = [];
    const calledGlobal: Array<ReadonlyArray<string>> = [];

    store.subscribe('debugEnabled', () => {
      calledKeys.push('debugEnabled');
    });
    store.subscribe('sidebarDirty', () => {
      calledKeys.push('sidebarDirty');
    });
    store.subscribe((_, changedKeys) => {
      calledGlobal.push(changedKeys);
    });

    store.set({ debugEnabled: true, sidebarDirty: false });

    expect(calledKeys).toEqual(['debugEnabled', 'sidebarDirty']);
    expect(calledGlobal).toEqual([['debugEnabled', 'sidebarDirty']]);
  });

  it('supports keyed unsubscribe', () => {
    const store = createDebugStore();
    let calls = 0;
    const unsubscribe = store.subscribe('debugEnabled', () => {
      calls += 1;
    });

    store.set({ debugEnabled: true });
    unsubscribe();
    store.set({ debugEnabled: false });

    expect(calls).toBe(1);
  });

  it('supports global unsubscribe', () => {
    const store = createDebugStore();
    let calls = 0;
    const unsubscribe = store.subscribe(() => {
      calls += 1;
    });

    store.set({ debugEnabled: true });
    unsubscribe();
    store.set({ debugEnabled: false });

    expect(calls).toBe(1);
  });

  it('does not notify subscriptions when no values change', () => {
    const store = createDebugStore();
    let calls = 0;
    store.subscribe(() => {
      calls += 1;
    });

    store.set({ debugEnabled: false });

    expect(calls).toBe(0);
  });

  it('cleans up subscribers correctly', () => {
    const store = createDebugStore();
    const unsubscribers = [
      store.subscribe('debugEnabled', () => {}),
      store.subscribe('debugEnabled', () => {}),
      store.subscribe(() => {}),
    ];

    unsubscribers.forEach((unsubscribe) => unsubscribe());

    expect(store.getSubscriberCounts()).toEqual({
      keyed: 0,
      global: 0,
    });
  });

  it('uses expected per-feature toggle defaults', () => {
    const store = createDebugStore();

    expect(store.get('overlayEnabled')).toBe(true);
    expect(store.get('sidebarEnabled')).toBe(true);
    expect(store.get('networkMonitorEnabled')).toBe(false);
    expect(store.get('conditionalLoggingEnabled')).toBe(false);
    expect(store.get('perfProfilerEnabled')).toBe(false);
    expect(store.get('navTimelineEnabled')).toBe(false);
    expect(store.get('propertyWatcherEnabled')).toBe(false);
  });
});
