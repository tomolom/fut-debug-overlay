/**
 * Snapshot module tests (TDD - RED phase)
 * Tests for snapshot creation, diff logic, chrome.storage persistence, max 5 enforcement
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  takeSnapshot,
  saveSnapshot,
  loadSnapshots,
  diffSnapshots,
  exportSnapshot,
  type ClassSnapshot,
} from '../snapshot';
import { registry } from '../registry';

describe('snapshot', () => {
  beforeEach(() => {
    // Clear registry before each test
    registry.classes.clear();

    // Mock chrome.storage.local API
    globalThis.chrome = {
      storage: {
        local: {
          get: vi.fn(),
          set: vi.fn(),
        },
      },
    } as any;
  });

  describe('takeSnapshot', () => {
    it('should capture all registered class names', () => {
      // Setup: Register 3 classes
      registry.classes.set('UTPlayerItemView', {
        ctor: class UTPlayerItemView {} as any,
        protoMethods: ['render', 'update'],
        staticMethods: ['create'],
      });
      registry.classes.set('UTButtonControl', {
        ctor: class UTButtonControl {} as any,
        protoMethods: ['onClick'],
        staticMethods: [],
      });
      registry.classes.set('UTViewController', {
        ctor: class UTViewController {} as any,
        protoMethods: ['init', 'destroy'],
        staticMethods: ['getInstance'],
      });

      const snapshot = takeSnapshot();

      expect(snapshot.classes).toHaveLength(3);
      expect(snapshot.classes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'UTPlayerItemView' }),
          expect.objectContaining({ name: 'UTButtonControl' }),
          expect.objectContaining({ name: 'UTViewController' }),
        ]),
      );
    });

    it('should capture method signatures (proto + static) per class', () => {
      registry.classes.set('UTPlayerItemView', {
        ctor: class UTPlayerItemView {} as any,
        protoMethods: ['render', 'update', 'destroy'],
        staticMethods: ['create', 'fromId'],
      });

      const snapshot = takeSnapshot();

      const playerItemClass = snapshot.classes.find(
        (c) => c.name === 'UTPlayerItemView',
      );
      expect(playerItemClass).toBeDefined();
      expect(playerItemClass!.protoMethods).toEqual([
        'render',
        'update',
        'destroy',
      ]);
      expect(playerItemClass!.staticMethods).toEqual(['create', 'fromId']);
    });

    it('should include timestamp as number (Date.now())', () => {
      const before = Date.now();
      const snapshot = takeSnapshot();
      const after = Date.now();

      expect(snapshot.timestamp).toBeGreaterThanOrEqual(before);
      expect(snapshot.timestamp).toBeLessThanOrEqual(after);
      expect(typeof snapshot.timestamp).toBe('number');
    });

    it('should include extension version string', () => {
      const snapshot = takeSnapshot();

      expect(snapshot.version).toBeDefined();
      expect(typeof snapshot.version).toBe('string');
      expect(snapshot.version).toMatch(/^\d+\.\d+\.\d+$/); // Semver format
    });

    it('should return empty classes array when registry is empty', () => {
      const snapshot = takeSnapshot();

      expect(snapshot.classes).toEqual([]);
      expect(snapshot.timestamp).toBeDefined();
      expect(snapshot.version).toBeDefined();
    });
  });

  describe('diffSnapshots', () => {
    it('should detect added classes', () => {
      const snapshotA: ClassSnapshot = {
        classes: [
          {
            name: 'UTPlayerItemView',
            protoMethods: ['render'],
            staticMethods: [],
          },
        ],
        timestamp: Date.now(),
        version: '1.0.0',
      };

      const snapshotB: ClassSnapshot = {
        classes: [
          {
            name: 'UTPlayerItemView',
            protoMethods: ['render'],
            staticMethods: [],
          },
          {
            name: 'UTButtonControl',
            protoMethods: ['onClick'],
            staticMethods: [],
          },
        ],
        timestamp: Date.now(),
        version: '1.0.0',
      };

      const diff = diffSnapshots(snapshotA, snapshotB);

      expect(diff.addedClasses).toEqual(['UTButtonControl']);
      expect(diff.removedClasses).toEqual([]);
      expect(diff.changedClasses).toEqual([]);
    });

    it('should detect removed classes', () => {
      const snapshotA: ClassSnapshot = {
        classes: [
          {
            name: 'UTPlayerItemView',
            protoMethods: ['render'],
            staticMethods: [],
          },
          {
            name: 'UTButtonControl',
            protoMethods: ['onClick'],
            staticMethods: [],
          },
        ],
        timestamp: Date.now(),
        version: '1.0.0',
      };

      const snapshotB: ClassSnapshot = {
        classes: [
          {
            name: 'UTPlayerItemView',
            protoMethods: ['render'],
            staticMethods: [],
          },
        ],
        timestamp: Date.now(),
        version: '1.0.0',
      };

      const diff = diffSnapshots(snapshotA, snapshotB);

      expect(diff.addedClasses).toEqual([]);
      expect(diff.removedClasses).toEqual(['UTButtonControl']);
      expect(diff.changedClasses).toEqual([]);
    });

    it('should detect changed classes (added methods)', () => {
      const snapshotA: ClassSnapshot = {
        classes: [
          {
            name: 'UTPlayerItemView',
            protoMethods: ['render'],
            staticMethods: [],
          },
        ],
        timestamp: Date.now(),
        version: '1.0.0',
      };

      const snapshotB: ClassSnapshot = {
        classes: [
          {
            name: 'UTPlayerItemView',
            protoMethods: ['render', 'update'],
            staticMethods: ['create'],
          },
        ],
        timestamp: Date.now(),
        version: '1.0.0',
      };

      const diff = diffSnapshots(snapshotA, snapshotB);

      expect(diff.addedClasses).toEqual([]);
      expect(diff.removedClasses).toEqual([]);
      expect(diff.changedClasses).toHaveLength(1);
      expect(diff.changedClasses[0]).toEqual({
        name: 'UTPlayerItemView',
        addedMethods: ['update', 'create'],
        removedMethods: [],
      });
    });

    it('should detect changed classes (removed methods)', () => {
      const snapshotA: ClassSnapshot = {
        classes: [
          {
            name: 'UTPlayerItemView',
            protoMethods: ['render', 'update', 'destroy'],
            staticMethods: ['create'],
          },
        ],
        timestamp: Date.now(),
        version: '1.0.0',
      };

      const snapshotB: ClassSnapshot = {
        classes: [
          {
            name: 'UTPlayerItemView',
            protoMethods: ['render'],
            staticMethods: [],
          },
        ],
        timestamp: Date.now(),
        version: '1.0.0',
      };

      const diff = diffSnapshots(snapshotA, snapshotB);

      expect(diff.addedClasses).toEqual([]);
      expect(diff.removedClasses).toEqual([]);
      expect(diff.changedClasses).toHaveLength(1);
      expect(diff.changedClasses[0]).toEqual({
        name: 'UTPlayerItemView',
        addedMethods: [],
        removedMethods: ['update', 'destroy', 'create'],
      });
    });

    it('should detect changed classes (both added and removed methods)', () => {
      const snapshotA: ClassSnapshot = {
        classes: [
          {
            name: 'UTPlayerItemView',
            protoMethods: ['render', 'destroy'],
            staticMethods: [],
          },
        ],
        timestamp: Date.now(),
        version: '1.0.0',
      };

      const snapshotB: ClassSnapshot = {
        classes: [
          {
            name: 'UTPlayerItemView',
            protoMethods: ['render', 'update'],
            staticMethods: ['create'],
          },
        ],
        timestamp: Date.now(),
        version: '1.0.0',
      };

      const diff = diffSnapshots(snapshotA, snapshotB);

      expect(diff.changedClasses).toHaveLength(1);
      expect(diff.changedClasses[0]).toEqual({
        name: 'UTPlayerItemView',
        addedMethods: ['update', 'create'],
        removedMethods: ['destroy'],
      });
    });

    it('should return empty diff for identical snapshots', () => {
      const snapshot: ClassSnapshot = {
        classes: [
          {
            name: 'UTPlayerItemView',
            protoMethods: ['render'],
            staticMethods: [],
          },
        ],
        timestamp: Date.now(),
        version: '1.0.0',
      };

      const diff = diffSnapshots(snapshot, snapshot);

      expect(diff.addedClasses).toEqual([]);
      expect(diff.removedClasses).toEqual([]);
      expect(diff.changedClasses).toEqual([]);
    });

    it('should handle complex multi-class diff correctly', () => {
      const snapshotA: ClassSnapshot = {
        classes: [
          {
            name: 'UTPlayerItemView',
            protoMethods: ['render'],
            staticMethods: [],
          },
          {
            name: 'UTButtonControl',
            protoMethods: ['onClick'],
            staticMethods: [],
          },
          {
            name: 'UTViewController',
            protoMethods: ['init', 'destroy'],
            staticMethods: [],
          },
        ],
        timestamp: Date.now(),
        version: '1.0.0',
      };

      const snapshotB: ClassSnapshot = {
        classes: [
          {
            name: 'UTPlayerItemView',
            protoMethods: ['render', 'update'],
            staticMethods: [],
          },
          {
            name: 'UTViewController',
            protoMethods: ['init'],
            staticMethods: [],
          },
          {
            name: 'UTNewClass',
            protoMethods: ['newMethod'],
            staticMethods: [],
          },
        ],
        timestamp: Date.now(),
        version: '1.0.0',
      };

      const diff = diffSnapshots(snapshotA, snapshotB);

      expect(diff.addedClasses).toEqual(['UTNewClass']);
      expect(diff.removedClasses).toEqual(['UTButtonControl']);
      expect(diff.changedClasses).toHaveLength(2);

      const playerItemChange = diff.changedClasses.find(
        (c) => c.name === 'UTPlayerItemView',
      );
      expect(playerItemChange).toEqual({
        name: 'UTPlayerItemView',
        addedMethods: ['update'],
        removedMethods: [],
      });

      const viewControllerChange = diff.changedClasses.find(
        (c) => c.name === 'UTViewController',
      );
      expect(viewControllerChange).toEqual({
        name: 'UTViewController',
        addedMethods: [],
        removedMethods: ['destroy'],
      });
    });
  });

  describe('saveSnapshot and loadSnapshots', () => {
    it('should save snapshot to chrome.storage.local under futdbg_snapshots key', async () => {
      const snapshot: ClassSnapshot = {
        classes: [
          {
            name: 'UTPlayerItemView',
            protoMethods: ['render'],
            staticMethods: [],
          },
        ],
        timestamp: Date.now(),
        version: '1.0.0',
      };

      (chrome.storage.local.get as any).mockResolvedValue({});
      (chrome.storage.local.set as any).mockResolvedValue(undefined);

      await saveSnapshot(snapshot);

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        futdbg_snapshots: [snapshot],
      });
    });

    it('should load all saved snapshots from chrome.storage.local', async () => {
      const snapshots: ClassSnapshot[] = [
        {
          classes: [
            {
              name: 'UTPlayerItemView',
              protoMethods: ['render'],
              staticMethods: [],
            },
          ],
          timestamp: 1000,
          version: '1.0.0',
        },
        {
          classes: [
            {
              name: 'UTButtonControl',
              protoMethods: ['onClick'],
              staticMethods: [],
            },
          ],
          timestamp: 2000,
          version: '1.0.0',
        },
      ];

      (chrome.storage.local.get as any).mockResolvedValue({
        futdbg_snapshots: snapshots,
      });

      const loaded = await loadSnapshots();

      expect(loaded).toEqual(snapshots);
      expect(chrome.storage.local.get).toHaveBeenCalledWith('futdbg_snapshots');
    });

    it('should return empty array when no snapshots are saved', async () => {
      (chrome.storage.local.get as any).mockResolvedValue({});

      const loaded = await loadSnapshots();

      expect(loaded).toEqual([]);
    });

    it('should enforce max 5 snapshots (auto-evict oldest)', async () => {
      const existingSnapshots: ClassSnapshot[] = [
        {
          classes: [],
          timestamp: 1000,
          version: '1.0.0',
        },
        {
          classes: [],
          timestamp: 2000,
          version: '1.0.0',
        },
        {
          classes: [],
          timestamp: 3000,
          version: '1.0.0',
        },
        {
          classes: [],
          timestamp: 4000,
          version: '1.0.0',
        },
        {
          classes: [],
          timestamp: 5000,
          version: '1.0.0',
        },
      ];

      const newSnapshot: ClassSnapshot = {
        classes: [],
        timestamp: 6000,
        version: '1.0.0',
      };

      (chrome.storage.local.get as any).mockResolvedValue({
        futdbg_snapshots: existingSnapshots,
      });
      (chrome.storage.local.set as any).mockResolvedValue(undefined);

      await saveSnapshot(newSnapshot);

      // Should have evicted the oldest (timestamp 1000) and kept 5 snapshots
      const savedCall = (chrome.storage.local.set as any).mock.calls[0][0];
      expect(savedCall.futdbg_snapshots).toHaveLength(5);
      expect(savedCall.futdbg_snapshots[0].timestamp).toBe(2000); // Oldest kept
      expect(savedCall.futdbg_snapshots[4].timestamp).toBe(6000); // Newest added
    });

    it('should preserve order when saving under max 5', async () => {
      const existingSnapshots: ClassSnapshot[] = [
        {
          classes: [],
          timestamp: 1000,
          version: '1.0.0',
        },
        {
          classes: [],
          timestamp: 2000,
          version: '1.0.0',
        },
      ];

      const newSnapshot: ClassSnapshot = {
        classes: [],
        timestamp: 3000,
        version: '1.0.0',
      };

      (chrome.storage.local.get as any).mockResolvedValue({
        futdbg_snapshots: existingSnapshots,
      });
      (chrome.storage.local.set as any).mockResolvedValue(undefined);

      await saveSnapshot(newSnapshot);

      const savedCall = (chrome.storage.local.set as any).mock.calls[0][0];
      expect(savedCall.futdbg_snapshots).toHaveLength(3);
      expect(savedCall.futdbg_snapshots[0].timestamp).toBe(1000);
      expect(savedCall.futdbg_snapshots[1].timestamp).toBe(2000);
      expect(savedCall.futdbg_snapshots[2].timestamp).toBe(3000);
    });
  });

  describe('exportSnapshot', () => {
    it('should return JSON string with pretty formatting', () => {
      const snapshot: ClassSnapshot = {
        classes: [
          {
            name: 'UTPlayerItemView',
            protoMethods: ['render'],
            staticMethods: [],
          },
        ],
        timestamp: 1234567890,
        version: '1.0.0',
      };

      const json = exportSnapshot(snapshot);

      expect(typeof json).toBe('string');
      expect(json).toContain('"classes"');
      expect(json).toContain('"UTPlayerItemView"');
      expect(json).toContain('"render"');
      expect(json).toContain('"timestamp": 1234567890');
      expect(json).toContain('"version": "1.0.0"');

      // Verify it's valid JSON
      const parsed = JSON.parse(json);
      expect(parsed).toEqual(snapshot);
    });

    it('should export snapshot with indentation (pretty print)', () => {
      const snapshot: ClassSnapshot = {
        classes: [
          {
            name: 'UTPlayerItemView',
            protoMethods: ['render'],
            staticMethods: [],
          },
        ],
        timestamp: 1234567890,
        version: '1.0.0',
      };

      const json = exportSnapshot(snapshot);

      // Check for indentation (JSON.stringify with indent=2)
      expect(json).toContain('  '); // Has 2-space indentation
      expect(json).toContain('\n'); // Has newlines
    });
  });
});
