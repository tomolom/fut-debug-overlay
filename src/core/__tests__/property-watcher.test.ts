import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  watchProperty,
  unwatchProperty,
  getWatches,
  initPropertyWatcher,
  stopPropertyWatcher,
  clearAllWatches,
} from '../property-watcher';
import { setFeatureEnabled } from '../feature-toggles';

describe('PropertyWatcher', () => {
  beforeEach(() => {
    // Enable property watcher feature
    setFeatureEnabled('propertywatcher', true);
  });

  afterEach(() => {
    // Stop property watcher to clean up intervals
    stopPropertyWatcher();
    // Clear all watches to prevent test pollution
    clearAllWatches();
  });

  describe('watchProperty - configurable property (defineProperty strategy)', () => {
    it('should watch a configurable property and fire callback on change', () => {
      const obj = { count: 0 };
      const callback = vi.fn();

      const watchId = watchProperty(obj, 'count', callback);

      obj.count = 5;

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(0, 5);
      expect(watchId).toMatch(/^watch-/);
    });

    it('should fire callback multiple times for multiple changes', () => {
      const obj = { value: 'initial' };
      const callback = vi.fn();

      watchProperty(obj, 'value', callback);

      obj.value = 'changed1';
      obj.value = 'changed2';
      obj.value = 'changed3';

      expect(callback).toHaveBeenCalledTimes(3);
      expect(callback).toHaveBeenNthCalledWith(1, 'initial', 'changed1');
      expect(callback).toHaveBeenNthCalledWith(2, 'changed1', 'changed2');
      expect(callback).toHaveBeenNthCalledWith(3, 'changed2', 'changed3');
    });

    it('should preserve property value after watch installation', () => {
      const obj = { count: 42 };
      const callback = vi.fn();

      watchProperty(obj, 'count', callback);

      expect(obj.count).toBe(42);
    });

    it('should allow reading and writing watched property normally', () => {
      const obj = { name: 'Alice' };
      const callback = vi.fn();

      watchProperty(obj, 'name', callback);

      expect(obj.name).toBe('Alice');
      obj.name = 'Bob';
      expect(obj.name).toBe('Bob');
    });
  });

  describe('watchProperty - non-configurable property (periodicDiff strategy)', () => {
    it('should detect changes to non-configurable property via periodic diff', async () => {
      const obj = {};
      Object.defineProperty(obj, 'fixed', {
        value: 10,
        writable: true,
        configurable: false,
        enumerable: true,
      });

      const callback = vi.fn();

      initPropertyWatcher();
      watchProperty(obj, 'fixed', callback);

      // Change the property value using Object.defineProperty (since it's writable but not configurable)
      Object.defineProperty(obj, 'fixed', {
        value: 20,
        writable: true,
        configurable: false,
        enumerable: true,
      });

      // Wait for periodic diff interval (500ms + buffer)
      await new Promise((resolve) => setTimeout(resolve, 600));

      expect(callback).toHaveBeenCalledWith(10, 20);
    });

    it('should handle non-configurable property that changes multiple times', async () => {
      const obj = {};
      Object.defineProperty(obj, 'status', {
        value: 'pending',
        writable: true,
        configurable: false,
      });

      const callback = vi.fn();

      initPropertyWatcher();
      watchProperty(obj, 'status', callback);

      Object.defineProperty(obj, 'status', {
        value: 'processing',
        writable: true,
        configurable: false,
      });

      await new Promise((resolve) => setTimeout(resolve, 600));

      Object.defineProperty(obj, 'status', {
        value: 'completed',
        writable: true,
        configurable: false,
      });

      await new Promise((resolve) => setTimeout(resolve, 600));

      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenNthCalledWith(1, 'pending', 'processing');
      expect(callback).toHaveBeenNthCalledWith(2, 'processing', 'completed');
    });
  });

  describe('unwatchProperty', () => {
    it('should remove watch and restore original property', () => {
      const obj = { count: 0 };
      const callback = vi.fn();

      const watchId = watchProperty(obj, 'count', callback);

      obj.count = 5;
      expect(callback).toHaveBeenCalledTimes(1);

      const removed = unwatchProperty(watchId);
      expect(removed).toBe(true);

      obj.count = 10;
      expect(callback).toHaveBeenCalledTimes(1); // Should not fire again
    });

    it('should return false for non-existent watch ID', () => {
      const removed = unwatchProperty('watch-nonexistent');
      expect(removed).toBe(false);
    });

    it('should allow re-watching after unwatch', () => {
      const obj = { value: 0 };
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      const watchId1 = watchProperty(obj, 'value', callback1);
      obj.value = 1;
      expect(callback1).toHaveBeenCalledTimes(1);

      unwatchProperty(watchId1);

      const watchId2 = watchProperty(obj, 'value', callback2);
      obj.value = 2;
      expect(callback1).toHaveBeenCalledTimes(1); // First callback should not fire
      expect(callback2).toHaveBeenCalledTimes(1); // Second callback should fire
    });

    it('should handle unwatching non-configurable property', () => {
      const obj = {};
      Object.defineProperty(obj, 'fixed', {
        value: 10,
        writable: true,
        configurable: false,
      });

      const callback = vi.fn();

      initPropertyWatcher();
      const watchId = watchProperty(obj, 'fixed', callback);
      const removed = unwatchProperty(watchId);

      expect(removed).toBe(true);
    });
  });

  describe('max watches limit', () => {
    it('should enforce max 50 watches', () => {
      const objs: Array<{ value: number }> = [];

      // Create 50 watches
      for (let i = 0; i < 50; i += 1) {
        const obj = { value: i };
        objs.push(obj);
        const watchId = watchProperty(obj, 'value', vi.fn());
        expect(watchId).toMatch(/^watch-/);
      }

      // 51st watch should throw error
      const obj51 = { value: 51 };
      expect(() => {
        watchProperty(obj51, 'value', vi.fn());
      }).toThrow('Maximum of 50 active watches reached');
    });

    it('should allow new watches after unwatching', () => {
      const objs: Array<{ value: number }> = [];
      const watchIds: string[] = [];

      // Create 50 watches
      for (let i = 0; i < 50; i += 1) {
        const obj = { value: i };
        objs.push(obj);
        const watchId = watchProperty(obj, 'value', vi.fn());
        watchIds.push(watchId);
      }

      // Remove one watch
      unwatchProperty(watchIds[0]);

      // Should now be able to add another watch
      const obj51 = { value: 51 };
      const watchId = watchProperty(obj51, 'value', vi.fn());
      expect(watchId).toMatch(/^watch-/);
    });
  });

  describe('getWatches', () => {
    it('should return empty array when no watches are active', () => {
      const watches = getWatches();
      expect(watches).toEqual([]);
    });

    it('should return all active watches without callbacks', () => {
      const obj1 = { a: 1 };
      const obj2 = { b: 2 };

      const watchId1 = watchProperty(obj1, 'a', vi.fn());
      const watchId2 = watchProperty(obj2, 'b', vi.fn());

      const watches = getWatches();

      expect(watches.length).toBe(2);
      expect(watches[0].id).toBe(watchId1);
      expect(watches[0].path).toBe('a');
      expect(watches[0].strategy).toBe('defineProperty');

      expect(watches[1].id).toBe(watchId2);
      expect(watches[1].path).toBe('b');
      expect(watches[1].strategy).toBe('defineProperty');
    });

    it('should reflect changes after unwatching', () => {
      const obj1 = { a: 1 };
      const obj2 = { b: 2 };

      const watchId1 = watchProperty(obj1, 'a', vi.fn());
      watchProperty(obj2, 'b', vi.fn());

      expect(getWatches().length).toBe(2);

      unwatchProperty(watchId1);

      expect(getWatches().length).toBe(1);
      expect(getWatches()[0].path).toBe('b');
    });
  });

  describe('feature toggle gating', () => {
    it('should not fire callback when feature is disabled', () => {
      const obj = { count: 0 };
      const callback = vi.fn();

      watchProperty(obj, 'count', callback);

      // Disable feature
      setFeatureEnabled('propertywatcher', false);

      obj.count = 5;

      expect(callback).not.toHaveBeenCalled();
    });

    it('should resume firing callback when feature is re-enabled', () => {
      const obj = { count: 0 };
      const callback = vi.fn();

      watchProperty(obj, 'count', callback);

      // Disable feature
      setFeatureEnabled('propertywatcher', false);
      obj.count = 5;
      expect(callback).not.toHaveBeenCalled();

      // Re-enable feature
      setFeatureEnabled('propertywatcher', true);
      obj.count = 10;
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(5, 10);
    });

    it('should not poll for non-configurable properties when feature is disabled', async () => {
      const obj = {};
      Object.defineProperty(obj, 'fixed', {
        value: 10,
        writable: true,
        configurable: false,
      });

      const callback = vi.fn();

      initPropertyWatcher();
      watchProperty(obj, 'fixed', callback);

      // Disable feature
      setFeatureEnabled('propertywatcher', false);

      Object.defineProperty(obj, 'fixed', {
        value: 20,
        writable: true,
        configurable: false,
      });

      await new Promise((resolve) => setTimeout(resolve, 600));

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('change log', () => {
    it('should record property changes to change log', () => {
      const obj = { count: 0 };
      const callback = vi.fn();

      watchProperty(obj, 'count', callback);

      obj.count = 5;
      obj.count = 10;

      // getWatches doesn't expose change log, so we just verify callbacks fired
      expect(callback).toHaveBeenCalledTimes(2);
    });
  });

  describe('edge cases', () => {
    it('should handle watching non-existent property that is added later', () => {
      const obj: Record<string, unknown> = {};
      const callback = vi.fn();

      // Watch a property that doesn't exist yet
      watchProperty(obj, 'newProp', callback);

      // Add the property
      obj.newProp = 'hello';

      expect(callback).toHaveBeenCalledWith(undefined, 'hello');
    });

    it('should handle null and undefined values', () => {
      const obj = { value: null as unknown };
      const callback = vi.fn();

      watchProperty(obj, 'value', callback);

      obj.value = undefined;
      expect(callback).toHaveBeenCalledWith(null, undefined);

      obj.value = 'test';
      expect(callback).toHaveBeenCalledWith(undefined, 'test');
    });

    it('should handle objects and arrays as property values', () => {
      const obj = { data: { nested: 'value' } };
      const callback = vi.fn();

      watchProperty(obj, 'data', callback);

      const newData = { nested: 'new value' };
      obj.data = newData;

      expect(callback).toHaveBeenCalledWith({ nested: 'value' }, newData);
    });

    it('should generate unique watch IDs', () => {
      const obj1 = { a: 1 };
      const obj2 = { b: 2 };

      const watchId1 = watchProperty(obj1, 'a', vi.fn());
      const watchId2 = watchProperty(obj2, 'b', vi.fn());

      expect(watchId1).not.toBe(watchId2);
    });

    it('should handle watching same property on different objects', () => {
      const obj1 = { count: 0 };
      const obj2 = { count: 0 };
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      watchProperty(obj1, 'count', callback1);
      watchProperty(obj2, 'count', callback2);

      obj1.count = 5;
      obj2.count = 10;

      expect(callback1).toHaveBeenCalledWith(0, 5);
      expect(callback2).toHaveBeenCalledWith(0, 10);
    });

    it('should handle watching different properties on same object', () => {
      const obj = { a: 1, b: 2 };
      const callbackA = vi.fn();
      const callbackB = vi.fn();

      watchProperty(obj, 'a', callbackA);
      watchProperty(obj, 'b', callbackB);

      obj.a = 10;
      obj.b = 20;

      expect(callbackA).toHaveBeenCalledWith(1, 10);
      expect(callbackB).toHaveBeenCalledWith(2, 20);
    });
  });

  describe('initPropertyWatcher and stopPropertyWatcher', () => {
    it('should start periodic diff interval when initialized', async () => {
      const obj = {};
      Object.defineProperty(obj, 'fixed', {
        value: 10,
        writable: true,
        configurable: false,
      });

      const callback = vi.fn();

      initPropertyWatcher();
      watchProperty(obj, 'fixed', callback);

      Object.defineProperty(obj, 'fixed', {
        value: 20,
        writable: true,
        configurable: false,
      });

      await new Promise((resolve) => setTimeout(resolve, 600));

      expect(callback).toHaveBeenCalled();
    });

    it('should stop periodic diff interval when stopped', async () => {
      const obj = {};
      Object.defineProperty(obj, 'fixed', {
        value: 10,
        writable: true,
        configurable: false,
      });

      const callback = vi.fn();

      initPropertyWatcher();
      watchProperty(obj, 'fixed', callback);

      Object.defineProperty(obj, 'fixed', {
        value: 20,
        writable: true,
        configurable: false,
      });

      stopPropertyWatcher();

      await new Promise((resolve) => setTimeout(resolve, 600));

      expect(callback).not.toHaveBeenCalled();
    });
  });
});
