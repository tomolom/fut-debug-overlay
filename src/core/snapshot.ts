/**
 * Snapshot module - Capture, diff, and persist UT class signatures
 * Enables version tracking and change detection across extension updates
 */

import { registry } from './registry';

const STORAGE_KEY = 'futdbg_snapshots';
const MAX_SNAPSHOTS = 5;
const EXTENSION_VERSION = '1.0.0'; // Read from manifest.json

/**
 * ClassInfo snapshot entry - captures class name and method signatures
 */
export interface ClassSnapshotEntry {
  name: string;
  protoMethods: string[];
  staticMethods: string[];
}

/**
 * ClassSnapshot - full snapshot of all registered classes at a point in time
 */
export interface ClassSnapshot {
  classes: ClassSnapshotEntry[];
  timestamp: number;
  version: string;
}

/**
 * SnapshotDiff - comparison result between two snapshots
 */
export interface SnapshotDiff {
  addedClasses: string[];
  removedClasses: string[];
  changedClasses: {
    name: string;
    addedMethods: string[];
    removedMethods: string[];
  }[];
}

/**
 * Take a snapshot of all currently registered classes
 * Returns snapshot with classes, methods, timestamp, and version
 */
export function takeSnapshot(): ClassSnapshot {
  const classes: ClassSnapshotEntry[] = [];

  registry.classes.forEach((classInfo, className) => {
    classes.push({
      name: className,
      protoMethods: [...classInfo.protoMethods],
      staticMethods: [...classInfo.staticMethods],
    });
  });

  return {
    classes,
    timestamp: Date.now(),
    version: EXTENSION_VERSION,
  };
}

/**
 * Compare two snapshots and return the differences
 * Returns added/removed/changed classes and methods
 */
export function diffSnapshots(
  a: ClassSnapshot,
  b: ClassSnapshot,
): SnapshotDiff {
  const diff: SnapshotDiff = {
    addedClasses: [],
    removedClasses: [],
    changedClasses: [],
  };

  // Build lookup maps
  const aMap = new Map(a.classes.map((c) => [c.name, c]));
  const bMap = new Map(b.classes.map((c) => [c.name, c]));

  // Find added classes (in B but not in A)
  b.classes.forEach((bClass) => {
    if (!aMap.has(bClass.name)) {
      diff.addedClasses.push(bClass.name);
    }
  });

  // Find removed classes (in A but not in B)
  a.classes.forEach((aClass) => {
    if (!bMap.has(aClass.name)) {
      diff.removedClasses.push(aClass.name);
    }
  });

  // Find changed classes (in both, but with different methods)
  a.classes.forEach((aClass) => {
    const bClass = bMap.get(aClass.name);
    if (!bClass) {
      return; // Already counted as removed
    }

    // Combine proto and static methods for comparison
    const aAllMethods = [...aClass.protoMethods, ...aClass.staticMethods];
    const bAllMethods = [...bClass.protoMethods, ...bClass.staticMethods];

    const aMethodsSet = new Set(aAllMethods);
    const bMethodsSet = new Set(bAllMethods);

    const addedMethods = bAllMethods.filter((m) => !aMethodsSet.has(m));
    const removedMethods = aAllMethods.filter((m) => !bMethodsSet.has(m));

    if (addedMethods.length > 0 || removedMethods.length > 0) {
      diff.changedClasses.push({
        name: aClass.name,
        addedMethods,
        removedMethods,
      });
    }
  });

  return diff;
}

/**
 * Save a snapshot to chrome.storage.local
 * Enforces max 5 snapshots: auto-evicts oldest when saving the 6th
 */
export async function saveSnapshot(snapshot: ClassSnapshot): Promise<void> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const existing: ClassSnapshot[] =
    (result[STORAGE_KEY] as ClassSnapshot[]) || [];

  // Add new snapshot
  existing.push(snapshot);

  // Enforce max 5: evict oldest if we have more than 5
  while (existing.length > MAX_SNAPSHOTS) {
    existing.shift(); // Remove oldest (first element)
  }

  await chrome.storage.local.set({ [STORAGE_KEY]: existing });
}

/**
 * Load all saved snapshots from chrome.storage.local
 * Returns empty array if none exist
 */
export async function loadSnapshots(): Promise<ClassSnapshot[]> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return (result[STORAGE_KEY] as ClassSnapshot[]) || [];
}

/**
 * Export a snapshot as a formatted JSON string
 * Useful for manual copying to clipboard or saving to file
 */
export function exportSnapshot(snapshot: ClassSnapshot): string {
  return JSON.stringify(snapshot, null, 2);
}
