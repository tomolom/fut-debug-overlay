import { describe, it, expect } from 'vitest';
import { serialize } from '../serializer';

describe('serialize', () => {
  it('passes through primitives unchanged', () => {
    expect(serialize('hello')).toBe('hello');
    expect(serialize(42)).toBe(42);
    expect(serialize(true)).toBe(true);
    expect(serialize(null)).toBeNull();
    expect(serialize(undefined)).toBeUndefined();
  });

  it('limits object depth and marks over-depth nodes', () => {
    const value = {
      level1: {
        level2: {
          level3: {
            level4: 'too deep',
          },
        },
      },
    };

    expect(serialize(value, 2)).toEqual({
      level1: {
        level2: {
          __type: 'maxDepth',
        },
      },
    });
  });

  it('serializes arrays recursively with mixed types', () => {
    const fn = function namedFn() {};
    const el = document.createElement('button');
    el.id = 'cta';
    el.className = 'primary action';

    const value = [1, 'two', { nested: [fn, el] }];

    expect(serialize(value)).toEqual([
      1,
      'two',
      {
        nested: [
          { __type: 'Function', name: 'namedFn' },
          {
            __type: 'Element',
            tag: 'BUTTON',
            id: 'cta',
            className: 'primary action',
          },
        ],
      },
    ]);
  });

  it('strips DOM elements to transferable metadata', () => {
    const el = document.createElement('div');
    el.id = 'root';
    el.className = 'foo bar';

    expect(serialize(el)).toEqual({
      __type: 'Element',
      tag: 'DIV',
      id: 'root',
      className: 'foo bar',
    });
  });

  it('strips functions to name metadata', () => {
    function testFunction() {}

    expect(serialize(testFunction)).toEqual({
      __type: 'Function',
      name: 'testFunction',
    });
  });

  it('marks circular references', () => {
    const value: Record<string, unknown> = { a: 1 };
    value.self = value;

    expect(serialize(value)).toEqual({
      a: 1,
      self: {
        __type: 'circular',
      },
    });
  });

  it('caps large serialized payloads at 10KB and marks truncation', () => {
    const large = 'x'.repeat(11 * 1024);

    expect(serialize(large)).toEqual({
      __truncated: true,
      value: `${'x'.repeat(10 * 1024)}...`,
    });

    expect(serialize({ large })).toEqual({
      large: {
        __truncated: true,
        value: `${'x'.repeat(10 * 1024)}...`,
      },
    });
  });

  it('serializes Date, Error, and RegExp into transferable forms', () => {
    const date = new Date('2024-01-02T03:04:05.000Z');
    const error = new TypeError('boom');
    error.stack = 'stack-here';
    const regex = /abc/gi;

    expect(serialize(date)).toEqual({
      __type: 'Date',
      value: '2024-01-02T03:04:05.000Z',
    });

    expect(serialize(error)).toEqual({
      __type: 'Error',
      name: 'TypeError',
      message: 'boom',
      stack: 'stack-here',
    });

    expect(serialize(regex)).toEqual({
      __type: 'RegExp',
      source: 'abc',
      flags: 'gi',
    });
  });
});
