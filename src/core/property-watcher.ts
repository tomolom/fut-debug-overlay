/**
 * Property Watcher Module
 * Tracks property changes on objects using either defineProperty traps or periodic diffing
 * - Configurable properties: use Object.defineProperty with getter/setter
 * - Non-configurable properties: poll every 500ms to detect changes
 * - Max 50 active watches
 * - Change log bounded to 1000 entries
 * - Feature toggle gated (propertywatcher)
 */

import { isFeatureEnabled } from './feature-toggles';
import { serialize, type SerializedValue } from './serializer';

const MAX_WATCHES = 50;
const MAX_CHANGE_LOG_ENTRIES = 1000;
const POLL_INTERVAL_MS = 500;

/**
 * Strategy for watching a property
 */
type WatchStrategy = 'defineProperty' | 'periodicDiff';

/**
 * Entry for a single property watch
 */
interface WatchEntry {
  id: string;
  instance: object;
  path: string;
  callback: (oldVal: unknown, newVal: unknown) => void;
  strategy: WatchStrategy;
  originalDescriptor?: PropertyDescriptor;
  lastValue?: unknown;
}

/**
 * Entry in the change log
 */
interface ChangeLogEntry {
  watchId: string;
  ts: number;
  path: string;
  oldValue: SerializedValue;
  newValue: SerializedValue;
}

/**
 * Public watch entry (without callback)
 */
export interface WatchEntrySummary {
  id: string;
  path: string;
  strategy: WatchStrategy;
}

// Active watches
const watches = new Map<string, WatchEntry>();

// Change log (FIFO, max 1000 entries)
const changeLog: ChangeLogEntry[] = [];

// Periodic diff interval handle
let pollIntervalHandle: ReturnType<typeof setInterval> | null = null;

// Counter for generating unique watch IDs
let nextWatchId = 1;

/**
 * Generate unique watch ID
 */
function generateWatchId(): string {
  const id = `watch-${nextWatchId}`;
  nextWatchId += 1;
  return id;
}

/**
 * Record a change to the change log
 */
function recordChange(
  watchId: string,
  path: string,
  oldValue: unknown,
  newValue: unknown,
): void {
  const entry: ChangeLogEntry = {
    watchId,
    ts: Date.now(),
    path,
    oldValue: serialize(oldValue),
    newValue: serialize(newValue),
  };

  changeLog.push(entry);

  // Enforce max 1000 entries (FIFO)
  if (changeLog.length > MAX_CHANGE_LOG_ENTRIES) {
    changeLog.shift();
  }
}

/**
 * Install defineProperty watch on a configurable property
 */
function installDefinePropertyWatch(
  watchEntry: WatchEntry,
  descriptor: PropertyDescriptor,
): void {
  const { instance, path, callback, id } = watchEntry;

  let currentValue = descriptor.value;

  Object.defineProperty(instance, path, {
    get() {
      return currentValue;
    },
    set(newValue: unknown) {
      if (!isFeatureEnabled('propertywatcher')) {
        currentValue = newValue;
        return;
      }

      const oldValue = currentValue;
      currentValue = newValue;

      callback(oldValue, newValue);
      recordChange(id, path, oldValue, newValue);
    },
    configurable: true,
    enumerable: descriptor.enumerable ?? true,
  });
}

/**
 * Restore original property descriptor
 */
function restoreOriginalDescriptor(watchEntry: WatchEntry): void {
  const { instance, path, originalDescriptor } = watchEntry;

  if (originalDescriptor) {
    Object.defineProperty(instance, path, originalDescriptor);
  }
}

/**
 * Periodic diff check for non-configurable properties
 */
function checkPeriodicDiff(): void {
  if (!isFeatureEnabled('propertywatcher')) {
    return;
  }

  watches.forEach((watch) => {
    if (watch.strategy !== 'periodicDiff') {
      return;
    }

    const currentValue = (watch.instance as Record<string, unknown>)[
      watch.path
    ];

    if (currentValue !== watch.lastValue) {
      const oldValue = watch.lastValue;
      watch.lastValue = currentValue;

      watch.callback(oldValue, currentValue);
      recordChange(watch.id, watch.path, oldValue, currentValue);
    }
  });
}

/**
 * Watch a property on an object
 * @param instance - Object to watch
 * @param path - Property name to watch
 * @param callback - Callback fired when property changes (oldVal, newVal)
 * @returns Watch ID
 * @throws Error if max watches (50) reached
 */
export function watchProperty(
  instance: object,
  path: string,
  callback: (oldVal: unknown, newVal: unknown) => void,
): string {
  // Check max watches limit
  if (watches.size >= MAX_WATCHES) {
    throw new Error('Maximum of 50 active watches reached');
  }

  const id = generateWatchId();
  const descriptor = Object.getOwnPropertyDescriptor(instance, path);

  let strategy: WatchStrategy;
  let originalDescriptor: PropertyDescriptor | undefined;
  let lastValue: unknown;

  // Determine strategy
  if (!descriptor || descriptor.configurable) {
    // Configurable property: use defineProperty
    strategy = 'defineProperty';
    originalDescriptor = descriptor;
  } else {
    // Non-configurable property: use periodic diff
    strategy = 'periodicDiff';
    lastValue = (instance as Record<string, unknown>)[path];
  }

  const watchEntry: WatchEntry = {
    id,
    instance,
    path,
    callback,
    strategy,
    originalDescriptor,
    lastValue,
  };

  watches.set(id, watchEntry);

  // Install watch based on strategy
  if (strategy === 'defineProperty') {
    installDefinePropertyWatch(
      watchEntry,
      originalDescriptor || {
        value: (instance as Record<string, unknown>)[path],
        writable: true,
        enumerable: true,
        configurable: true,
      },
    );
  }

  return id;
}

/**
 * Remove a watch by ID
 * @param watchId - Watch ID to remove
 * @returns true if watch was removed, false if not found
 */
export function unwatchProperty(watchId: string): boolean {
  const watch = watches.get(watchId);
  if (!watch) {
    return false;
  }

  // Restore original descriptor if using defineProperty
  if (watch.strategy === 'defineProperty') {
    restoreOriginalDescriptor(watch);
  }

  watches.delete(watchId);
  return true;
}

/**
 * Get all active watches (without callbacks)
 * @returns Array of watch summaries
 */
export function getWatches(): WatchEntrySummary[] {
  return Array.from(watches.values()).map((watch) => ({
    id: watch.id,
    path: watch.path,
    strategy: watch.strategy,
  }));
}

/**
 * Initialize property watcher
 * Starts periodic diff interval for non-configurable properties
 */
export function initPropertyWatcher(): void {
  if (pollIntervalHandle) {
    return; // Already initialized
  }

  pollIntervalHandle = setInterval(checkPeriodicDiff, POLL_INTERVAL_MS);
}

/**
 * Stop property watcher
 * Stops periodic diff interval
 */
export function stopPropertyWatcher(): void {
  if (pollIntervalHandle) {
    clearInterval(pollIntervalHandle);
    pollIntervalHandle = null;
  }
}

/**
 * Get change log entries (max 100, newest first)
 * Internal use only - not exposed in public API yet
 */
export function getChangeLog(limit = 100): ChangeLogEntry[] {
  return changeLog.slice(-limit).reverse();
}

/**
 * Clear all watches (for testing purposes)
 * @internal
 */
export function clearAllWatches(): void {
  // Restore all original descriptors first
  watches.forEach((watch) => {
    if (watch.strategy === 'defineProperty') {
      restoreOriginalDescriptor(watch);
    }
  });

  // Clear the map
  watches.clear();

  // Clear change log
  changeLog.length = 0;

  // Reset watch ID counter
  nextWatchId = 1;
}
