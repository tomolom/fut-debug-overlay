import { describe, it, expect, beforeEach } from 'vitest';
import { originals } from '../originals';

describe('originals registry', () => {
  beforeEach(() => {
    const keys = originals.listAll();
    for (let i = 0; i < keys.length; i += 1) {
      originals.restore(keys[i]);
    }
  });

  it('stores and gets a value', () => {
    const fn = () => 'ok';
    originals.store('window.fetch', fn);

    expect(originals.get('window.fetch')).toBe(fn);
  });

  it('has returns true only when key exists', () => {
    expect(originals.has('Node.prototype.appendChild')).toBe(false);

    const fn = () => null;
    originals.store('Node.prototype.appendChild', fn);

    expect(originals.has('Node.prototype.appendChild')).toBe(true);
  });

  it('restore removes and returns original value', () => {
    const fn = () => 123;
    originals.store('EventTarget.prototype.addEventListener', fn);

    const restored = originals.restore(
      'EventTarget.prototype.addEventListener',
    );
    expect(restored).toBe(fn);
    expect(originals.has('EventTarget.prototype.addEventListener')).toBe(false);
    expect(
      originals.get('EventTarget.prototype.addEventListener'),
    ).toBeUndefined();
  });

  it('listAll returns all stored keys', () => {
    originals.store('a', 1);
    originals.store('b', 2);

    const keys = originals.listAll().sort();
    expect(keys).toEqual(['a', 'b']);
  });

  it('prevents double-store and preserves first value', () => {
    const first = () => 'first';
    const second = () => 'second';

    originals.store('window.fetch', first);
    originals.store('window.fetch', second);

    expect(originals.get('window.fetch')).toBe(first);
  });

  it('returns undefined for missing get/restore', () => {
    expect(originals.get('missing')).toBeUndefined();
    expect(originals.restore('missing')).toBeUndefined();
  });
});
