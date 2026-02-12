import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  recordTiming,
  getStats,
  getTopN,
  resetStats,
  initPerfProfiler,
} from '../perf-profiler';
import { dispatcher } from '../hook-dispatcher';
import { setFeatureEnabled } from '../feature-toggles';

describe('PerfProfiler', () => {
  beforeEach(() => {
    resetStats();
    // Enable feature toggle for all tests
    setFeatureEnabled('perfprofiler', true);
  });

  describe('recordTiming', () => {
    it('should create new stats entry for first call', () => {
      recordTiming('UTPlayerView', 'renderItem', 10.5);

      const stats = getStats();
      const key = 'UTPlayerView.renderItem';
      expect(stats.has(key)).toBe(true);

      const entry = stats.get(key);
      expect(entry?.className).toBe('UTPlayerView');
      expect(entry?.methodName).toBe('renderItem');
      expect(entry?.callCount).toBe(1);
      expect(entry?.totalMs).toBe(10.5);
      expect(entry?.minMs).toBe(10.5);
      expect(entry?.maxMs).toBe(10.5);
      expect(entry?.avgMs).toBe(10.5);
    });

    it('should update existing stats entry for subsequent calls', () => {
      recordTiming('UTPlayerView', 'renderItem', 10);
      recordTiming('UTPlayerView', 'renderItem', 20);
      recordTiming('UTPlayerView', 'renderItem', 30);

      const stats = getStats();
      const entry = stats.get('UTPlayerView.renderItem');

      expect(entry?.callCount).toBe(3);
      expect(entry?.totalMs).toBe(60);
      expect(entry?.minMs).toBe(10);
      expect(entry?.maxMs).toBe(30);
      expect(entry?.avgMs).toBe(20);
    });

    it('should correctly calculate min and max across multiple calls', () => {
      recordTiming('Test', 'method', 50);
      recordTiming('Test', 'method', 5);
      recordTiming('Test', 'method', 100);
      recordTiming('Test', 'method', 25);

      const entry = getStats().get('Test.method');

      expect(entry?.minMs).toBe(5);
      expect(entry?.maxMs).toBe(100);
      expect(entry?.avgMs).toBe((50 + 5 + 100 + 25) / 4);
    });

    it('should track multiple methods independently', () => {
      recordTiming('ClassA', 'methodX', 10);
      recordTiming('ClassA', 'methodY', 20);
      recordTiming('ClassB', 'methodX', 30);

      const stats = getStats();

      expect(stats.size).toBe(3);
      expect(stats.get('ClassA.methodX')?.totalMs).toBe(10);
      expect(stats.get('ClassA.methodY')?.totalMs).toBe(20);
      expect(stats.get('ClassB.methodX')?.totalMs).toBe(30);
    });

    it('should calculate p95 correctly for single call', () => {
      recordTiming('Test', 'method', 100);

      const entry = getStats().get('Test.method');
      expect(entry?.p95Ms).toBe(100);
    });

    it('should calculate p95 correctly for multiple calls', () => {
      const timings = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      timings.forEach((t) => recordTiming('Test', 'method', t));

      const entry = getStats().get('Test.method');
      // p95 of 10 items = 95th percentile = index 9 (0-indexed) = 100
      expect(entry?.p95Ms).toBe(100);
    });

    it('should calculate p95 correctly for 100 calls', () => {
      // Create 100 calls with timings 1-100ms
      for (let i = 1; i <= 100; i++) {
        recordTiming('Test', 'method', i);
      }

      const entry = getStats().get('Test.method');
      // p95 of 100 items = 95th value = 95ms
      expect(entry?.p95Ms).toBe(95);
    });

    it('should calculate p95 correctly with unsorted timings', () => {
      const timings = [50, 10, 90, 20, 100, 30, 80, 40, 70, 60];
      timings.forEach((t) => recordTiming('Test', 'method', t));

      const entry = getStats().get('Test.method');
      expect(entry?.p95Ms).toBe(100);
    });
  });

  describe('getStats', () => {
    it('should return empty map when no stats recorded', () => {
      const stats = getStats();
      expect(stats.size).toBe(0);
    });

    it('should return copy of stats map (not live reference)', () => {
      recordTiming('Test', 'method', 10);

      const stats1 = getStats();
      const stats2 = getStats();

      expect(stats1).not.toBe(stats2);
      expect(stats1.get('Test.method')).toEqual(stats2.get('Test.method'));
    });

    it('should return all recorded stats', () => {
      recordTiming('ClassA', 'method1', 10);
      recordTiming('ClassB', 'method2', 20);
      recordTiming('ClassC', 'method3', 30);

      const stats = getStats();

      expect(stats.size).toBe(3);
      expect(stats.has('ClassA.method1')).toBe(true);
      expect(stats.has('ClassB.method2')).toBe(true);
      expect(stats.has('ClassC.method3')).toBe(true);
    });
  });

  describe('getTopN', () => {
    beforeEach(() => {
      // Create test data
      recordTiming('ClassA', 'method1', 10); // totalMs: 10
      recordTiming('ClassA', 'method1', 20); // totalMs: 30, avgMs: 15, callCount: 2

      recordTiming('ClassB', 'method2', 50); // totalMs: 50, avgMs: 50, callCount: 1

      recordTiming('ClassC', 'method3', 5); // totalMs: 15
      recordTiming('ClassC', 'method3', 5); // totalMs: 15
      recordTiming('ClassC', 'method3', 5); // totalMs: 15, avgMs: 5, callCount: 3
    });

    it('should sort by totalMs descending', () => {
      const top = getTopN(3, 'totalMs');

      expect(top.length).toBe(3);
      expect(top[0].className).toBe('ClassB');
      expect(top[0].totalMs).toBe(50);
      expect(top[1].className).toBe('ClassA');
      expect(top[1].totalMs).toBe(30);
      expect(top[2].className).toBe('ClassC');
      expect(top[2].totalMs).toBe(15);
    });

    it('should sort by callCount descending', () => {
      const top = getTopN(3, 'callCount');

      expect(top.length).toBe(3);
      expect(top[0].className).toBe('ClassC');
      expect(top[0].callCount).toBe(3);
      expect(top[1].className).toBe('ClassA');
      expect(top[1].callCount).toBe(2);
      expect(top[2].className).toBe('ClassB');
      expect(top[2].callCount).toBe(1);
    });

    it('should sort by avgMs descending', () => {
      const top = getTopN(3, 'avgMs');

      expect(top.length).toBe(3);
      expect(top[0].className).toBe('ClassB');
      expect(top[0].avgMs).toBe(50);
      expect(top[1].className).toBe('ClassA');
      expect(top[1].avgMs).toBe(15);
      expect(top[2].className).toBe('ClassC');
      expect(top[2].avgMs).toBe(5);
    });

    it('should limit results to N items', () => {
      const top = getTopN(2, 'totalMs');
      expect(top.length).toBe(2);
    });

    it('should return empty array when no stats', () => {
      resetStats();
      const top = getTopN(10, 'totalMs');
      expect(top).toEqual([]);
    });

    it('should return all items when N exceeds total count', () => {
      const top = getTopN(100, 'totalMs');
      expect(top.length).toBe(3);
    });

    it('should return 0 items when N is 0', () => {
      const top = getTopN(0, 'totalMs');
      expect(top.length).toBe(0);
    });
  });

  describe('resetStats', () => {
    it('should clear all stats', () => {
      recordTiming('ClassA', 'method1', 10);
      recordTiming('ClassB', 'method2', 20);
      recordTiming('ClassC', 'method3', 30);

      expect(getStats().size).toBe(3);

      resetStats();

      expect(getStats().size).toBe(0);
    });

    it('should allow new stats after reset', () => {
      recordTiming('Test', 'method', 10);
      resetStats();
      recordTiming('Test', 'method', 20);

      const entry = getStats().get('Test.method');
      expect(entry?.callCount).toBe(1);
      expect(entry?.totalMs).toBe(20);
    });
  });

  describe('initPerfProfiler', () => {
    it('should subscribe to method:call events from dispatcher', () => {
      const spy = vi.spyOn(dispatcher, 'on');
      initPerfProfiler();

      expect(spy).toHaveBeenCalledWith('method:call', expect.any(Function));
    });

    it('should record timing from dispatcher events', () => {
      initPerfProfiler();

      // Emit a mock method:call event
      dispatcher.emit('method:call', {
        source: 'TestClass.testMethod',
        node: {
          className: 'TestClass',
          methodName: 'testMethod',
          isStatic: false,
          threw: false,
          errorObj: null,
          durationMs: 25.5,
        },
        args: [],
        originalResult: undefined,
      });

      const entry = getStats().get('TestClass.testMethod');
      expect(entry?.callCount).toBe(1);
      expect(entry?.totalMs).toBe(25.5);
    });

    it('should not record when feature toggle is disabled', () => {
      setFeatureEnabled('perfprofiler', false);
      initPerfProfiler();

      dispatcher.emit('method:call', {
        source: 'TestClass.testMethod',
        node: {
          className: 'TestClass',
          methodName: 'testMethod',
          isStatic: false,
          threw: false,
          errorObj: null,
          durationMs: 25.5,
        },
        args: [],
        originalResult: undefined,
      });

      expect(getStats().size).toBe(0);
    });

    it('should handle missing durationMs gracefully', () => {
      initPerfProfiler();

      dispatcher.emit('method:call', {
        source: 'TestClass.testMethod',
        node: {
          className: 'TestClass',
          methodName: 'testMethod',
          isStatic: false,
          threw: false,
          errorObj: null,
          // durationMs missing
        },
        args: [],
        originalResult: undefined,
      });

      // Should not throw, should just skip recording
      expect(getStats().size).toBe(0);
    });

    it('should handle malformed events gracefully', () => {
      initPerfProfiler();

      // Missing node
      dispatcher.emit('method:call', {
        source: 'test',
        node: null,
        args: [],
        originalResult: undefined,
      });

      // Missing className
      dispatcher.emit('method:call', {
        source: 'test',
        node: { methodName: 'test', durationMs: 10 },
        args: [],
        originalResult: undefined,
      });

      expect(getStats().size).toBe(0);
    });
  });

  describe('sampling', () => {
    it('should sample 1-in-10 when method called >1000 times in a second', () => {
      // Simulate 2000 calls in rapid succession
      const startTime = Date.now();

      for (let i = 0; i < 2000; i++) {
        recordTiming('HighFreq', 'method', 0.1);
      }

      const entry = getStats().get('HighFreq.method');

      // After 1000 calls, should start sampling 1-in-10
      // First 1000 calls: all recorded
      // Next 1000 calls: 1-in-10 = 100 recorded
      // Total: ~1100 calls recorded
      expect(entry?.callCount).toBeGreaterThan(1000);
      expect(entry?.callCount).toBeLessThan(1200);
    });

    it('should not sample when method called <1000 times', () => {
      for (let i = 0; i < 500; i++) {
        recordTiming('LowFreq', 'method', 0.1);
      }

      const entry = getStats().get('LowFreq.method');
      expect(entry?.callCount).toBe(500);
    });

    it('should track sampling per method independently', () => {
      // Method A: high frequency
      for (let i = 0; i < 2000; i++) {
        recordTiming('ClassA', 'method', 0.1);
      }

      // Method B: low frequency
      for (let i = 0; i < 500; i++) {
        recordTiming('ClassB', 'method', 0.1);
      }

      const entryA = getStats().get('ClassA.method');
      const entryB = getStats().get('ClassB.method');

      // A should be sampled
      expect(entryA?.callCount).toBeGreaterThan(1000);
      expect(entryA?.callCount).toBeLessThan(1200);

      // B should not be sampled
      expect(entryB?.callCount).toBe(500);
    });
  });

  describe('edge cases', () => {
    it('should handle zero duration', () => {
      recordTiming('Test', 'method', 0);

      const entry = getStats().get('Test.method');
      expect(entry?.totalMs).toBe(0);
      expect(entry?.minMs).toBe(0);
      expect(entry?.maxMs).toBe(0);
      expect(entry?.avgMs).toBe(0);
    });

    it('should handle negative duration (clock skew)', () => {
      recordTiming('Test', 'method', -5);

      const entry = getStats().get('Test.method');
      expect(entry?.totalMs).toBe(-5);
      expect(entry?.minMs).toBe(-5);
    });

    it('should handle very large duration', () => {
      recordTiming('Test', 'method', 999999.99);

      const entry = getStats().get('Test.method');
      expect(entry?.totalMs).toBe(999999.99);
      expect(entry?.maxMs).toBe(999999.99);
    });

    it('should handle method names with special characters', () => {
      recordTiming('Test', '__init__', 10);
      recordTiming('Test', '$render', 20);

      const stats = getStats();
      expect(stats.has('Test.__init__')).toBe(true);
      expect(stats.has('Test.$render')).toBe(true);
    });

    it('should handle empty class or method names', () => {
      recordTiming('', 'method', 10);
      recordTiming('Class', '', 10);

      const stats = getStats();
      expect(stats.has('.method')).toBe(true);
      expect(stats.has('Class.')).toBe(true);
    });
  });
});
