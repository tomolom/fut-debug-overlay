/**
 * Fixed-capacity ring buffer with O(1) push and automatic eviction of oldest entries.
 * Designed to replace array.shift() pattern which is O(n) on large arrays.
 */
export class RingBuffer<T> {
  private buffer: T[];

  private head: number = 0; // Index where next item will be written

  private size: number = 0; // Current number of items

  private readonly capacity: number;

  constructor(capacity: number) {
    if (capacity <= 0) {
      throw new Error('RingBuffer capacity must be positive');
    }
    this.capacity = capacity;
    this.buffer = new Array(capacity);
  }

  /**
   * Add item to buffer. If at capacity, overwrites oldest entry.
   * O(1) operation.
   */
  push(item: T): void {
    this.buffer[this.head] = item;
    this.head = (this.head + 1) % this.capacity;
    if (this.size < this.capacity) {
      this.size += 1;
    }
  }

  /**
   * Current number of items in buffer (0 to capacity).
   */
  get length(): number {
    return this.size;
  }

  /**
   * Returns all items as array with newest entries first.
   * O(n) operation where n = current size.
   */
  toArrayNewestFirst(): T[] {
    if (this.size === 0) return [];

    const result: T[] = new Array(this.size);
    let writeIdx = 0;

    // Start from most recently written item (head - 1) and walk backwards
    for (let i = 0; i < this.size; i += 1) {
      const readIdx = (this.head - 1 - i + this.capacity) % this.capacity;
      result[writeIdx] = this.buffer[readIdx];
      writeIdx += 1;
    }

    return result;
  }

  /**
   * Find first item matching predicate, searching newest-first.
   * Returns undefined if no match found.
   * O(n) operation where n = current size.
   */
  find(predicate: (item: T) => boolean): T | undefined {
    if (this.size === 0) return undefined;

    // Search newest-first
    for (let i = 0; i < this.size; i += 1) {
      const readIdx = (this.head - 1 - i + this.capacity) % this.capacity;
      const item = this.buffer[readIdx];
      if (predicate(item)) {
        return item;
      }
    }

    return undefined;
  }

  /**
   * Remove all items from buffer.
   * O(1) operation (does not clear array, just resets pointers).
   */
  clear(): void {
    this.head = 0;
    this.size = 0;
  }
}
