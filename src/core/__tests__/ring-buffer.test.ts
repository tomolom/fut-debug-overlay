import { describe, it, expect } from 'vitest';
import { RingBuffer } from '../ring-buffer';

describe('RingBuffer', () => {
  describe('constructor', () => {
    it('should create buffer with valid capacity', () => {
      const buffer = new RingBuffer<number>(10);
      expect(buffer.length).toBe(0);
    });

    it('should throw error for zero capacity', () => {
      expect(() => new RingBuffer<number>(0)).toThrow(
        'RingBuffer capacity must be positive',
      );
    });

    it('should throw error for negative capacity', () => {
      expect(() => new RingBuffer<number>(-5)).toThrow(
        'RingBuffer capacity must be positive',
      );
    });

    it('should create buffer with capacity 1', () => {
      const buffer = new RingBuffer<number>(1);
      expect(buffer.length).toBe(0);
    });
  });

  describe('push within capacity', () => {
    it('should increase length as items are added', () => {
      const buffer = new RingBuffer<number>(5);
      expect(buffer.length).toBe(0);

      buffer.push(1);
      expect(buffer.length).toBe(1);

      buffer.push(2);
      expect(buffer.length).toBe(2);

      buffer.push(3);
      expect(buffer.length).toBe(3);
    });

    it('should preserve order of items', () => {
      const buffer = new RingBuffer<number>(5);
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);

      const result = buffer.toArrayNewestFirst();
      expect(result).toEqual([3, 2, 1]);
    });

    it('should handle exactly capacity items', () => {
      const buffer = new RingBuffer<number>(3);
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);

      expect(buffer.length).toBe(3);
      expect(buffer.toArrayNewestFirst()).toEqual([3, 2, 1]);
    });
  });

  describe('push beyond capacity', () => {
    it('should evict oldest item when pushing beyond capacity', () => {
      const buffer = new RingBuffer<number>(3);
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);
      buffer.push(4); // This should evict 1

      expect(buffer.length).toBe(3);
      expect(buffer.toArrayNewestFirst()).toEqual([4, 3, 2]);
    });

    it('should maintain length at capacity when overfilling', () => {
      const buffer = new RingBuffer<number>(3);
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);
      buffer.push(4);
      buffer.push(5);
      buffer.push(6);

      expect(buffer.length).toBe(3);
      expect(buffer.toArrayNewestFirst()).toEqual([6, 5, 4]);
    });

    it('should handle continuous eviction correctly', () => {
      const buffer = new RingBuffer<number>(2);
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);
      buffer.push(4);
      buffer.push(5);

      expect(buffer.length).toBe(2);
      expect(buffer.toArrayNewestFirst()).toEqual([5, 4]);
    });
  });

  describe('toArrayNewestFirst', () => {
    it('should return empty array for empty buffer', () => {
      const buffer = new RingBuffer<number>(5);
      expect(buffer.toArrayNewestFirst()).toEqual([]);
    });

    it('should return items in newest-first order', () => {
      const buffer = new RingBuffer<string>(5);
      buffer.push('a');
      buffer.push('b');
      buffer.push('c');

      expect(buffer.toArrayNewestFirst()).toEqual(['c', 'b', 'a']);
    });

    it('should maintain newest-first order after eviction', () => {
      const buffer = new RingBuffer<number>(3);
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);
      buffer.push(4);
      buffer.push(5);

      expect(buffer.toArrayNewestFirst()).toEqual([5, 4, 3]);
    });

    it('should return all items when buffer is at capacity', () => {
      const buffer = new RingBuffer<number>(4);
      buffer.push(10);
      buffer.push(20);
      buffer.push(30);
      buffer.push(40);

      const result = buffer.toArrayNewestFirst();
      expect(result).toEqual([40, 30, 20, 10]);
      expect(result.length).toBe(4);
    });
  });

  describe('find', () => {
    it('should locate existing item', () => {
      const buffer = new RingBuffer<number>(5);
      buffer.push(10);
      buffer.push(20);
      buffer.push(30);

      const result = buffer.find((x) => x === 20);
      expect(result).toBe(20);
    });

    it('should return undefined for non-existent item', () => {
      const buffer = new RingBuffer<number>(5);
      buffer.push(10);
      buffer.push(20);
      buffer.push(30);

      const result = buffer.find((x) => x === 99);
      expect(result).toBeUndefined();
    });

    it('should search newest-first', () => {
      const buffer = new RingBuffer<{ id: number; value: string }>(5);
      buffer.push({ id: 1, value: 'old' });
      buffer.push({ id: 2, value: 'middle' });
      buffer.push({ id: 1, value: 'new' }); // Duplicate id, but newer

      const result = buffer.find((x) => x.id === 1);
      expect(result?.value).toBe('new'); // Should find the newer one first
    });

    it('should return undefined for empty buffer', () => {
      const buffer = new RingBuffer<number>(5);
      const result = buffer.find((x) => x === 1);
      expect(result).toBeUndefined();
    });

    it('should work with complex predicates', () => {
      const buffer = new RingBuffer<{ name: string; age: number }>(5);
      buffer.push({ name: 'Alice', age: 25 });
      buffer.push({ name: 'Bob', age: 30 });
      buffer.push({ name: 'Charlie', age: 35 });

      const result = buffer.find((x) => x.age > 28);
      expect(result?.name).toBe('Charlie'); // Newest matching item
    });

    it('should find items after eviction', () => {
      const buffer = new RingBuffer<number>(3);
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);
      buffer.push(4); // Evicts 1

      expect(buffer.find((x) => x === 1)).toBeUndefined();
      expect(buffer.find((x) => x === 4)).toBe(4);
    });
  });

  describe('clear', () => {
    it('should reset length to 0', () => {
      const buffer = new RingBuffer<number>(5);
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);

      buffer.clear();
      expect(buffer.length).toBe(0);
    });

    it('should allow push after clear', () => {
      const buffer = new RingBuffer<number>(5);
      buffer.push(1);
      buffer.push(2);
      buffer.clear();

      buffer.push(10);
      buffer.push(20);

      expect(buffer.length).toBe(2);
      expect(buffer.toArrayNewestFirst()).toEqual([20, 10]);
    });

    it('should return empty array after clear', () => {
      const buffer = new RingBuffer<number>(5);
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);

      buffer.clear();
      expect(buffer.toArrayNewestFirst()).toEqual([]);
    });

    it('should make find return undefined after clear', () => {
      const buffer = new RingBuffer<number>(5);
      buffer.push(1);
      buffer.push(2);

      buffer.clear();
      expect(buffer.find((x) => x === 1)).toBeUndefined();
    });

    it('should work correctly after clear and refill beyond capacity', () => {
      const buffer = new RingBuffer<number>(3);
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);

      buffer.clear();

      buffer.push(10);
      buffer.push(20);
      buffer.push(30);
      buffer.push(40); // Should evict 10

      expect(buffer.length).toBe(3);
      expect(buffer.toArrayNewestFirst()).toEqual([40, 30, 20]);
    });
  });

  describe('edge cases', () => {
    it('should handle capacity 1 buffer', () => {
      const buffer = new RingBuffer<number>(1);
      buffer.push(1);
      expect(buffer.length).toBe(1);
      expect(buffer.toArrayNewestFirst()).toEqual([1]);

      buffer.push(2); // Should evict 1
      expect(buffer.length).toBe(1);
      expect(buffer.toArrayNewestFirst()).toEqual([2]);
    });

    it('should handle push 0 items (empty buffer)', () => {
      const buffer = new RingBuffer<number>(10);
      expect(buffer.length).toBe(0);
      expect(buffer.toArrayNewestFirst()).toEqual([]);
      expect(buffer.find((x) => x === 1)).toBeUndefined();
    });

    it('should handle push exactly capacity items', () => {
      const buffer = new RingBuffer<number>(5);
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);
      buffer.push(4);
      buffer.push(5);

      expect(buffer.length).toBe(5);
      expect(buffer.toArrayNewestFirst()).toEqual([5, 4, 3, 2, 1]);
    });

    it('should handle different data types', () => {
      const buffer = new RingBuffer<string>(3);
      buffer.push('hello');
      buffer.push('world');
      buffer.push('test');

      expect(buffer.find((x) => x.startsWith('w'))).toBe('world');
      expect(buffer.toArrayNewestFirst()).toEqual(['test', 'world', 'hello']);
    });

    it('should handle objects correctly', () => {
      interface Item {
        id: number;
        data: string;
      }

      const buffer = new RingBuffer<Item>(3);
      const item1 = { id: 1, data: 'first' };
      const item2 = { id: 2, data: 'second' };
      const item3 = { id: 3, data: 'third' };

      buffer.push(item1);
      buffer.push(item2);
      buffer.push(item3);

      const found = buffer.find((x) => x.id === 2);
      expect(found).toBe(item2);
      expect(found?.data).toBe('second');
    });
  });
});
