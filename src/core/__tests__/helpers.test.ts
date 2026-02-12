import { describe, it, expect } from 'vitest';
import {
  escapeHtml,
  isElementOnCurrentPage,
  summarizeArg,
  looksLikeItem,
} from '../helpers';

describe('escapeHtml', () => {
  it('should escape < to &lt;', () => {
    expect(escapeHtml('<')).toBe('&lt;');
  });

  it('should escape > to &gt;', () => {
    expect(escapeHtml('>')).toBe('&gt;');
  });

  it('should escape & to &amp;', () => {
    expect(escapeHtml('&')).toBe('&amp;');
  });

  it('should escape " to &quot;', () => {
    expect(escapeHtml('"')).toBe('&quot;');
  });

  it("should escape ' to &#39;", () => {
    expect(escapeHtml("'")).toBe('&#39;');
  });

  it('should return empty string unchanged', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('should not double-escape already-escaped input', () => {
    const alreadyEscaped = '&lt;&gt;&amp;&quot;&#39;';
    expect(escapeHtml(alreadyEscaped)).toBe(
      '&amp;lt;&amp;gt;&amp;amp;&amp;quot;&amp;#39;',
    );
  });

  it('should escape combined characters in complex string', () => {
    expect(escapeHtml('<script>&"\'</script>')).toBe(
      '&lt;script&gt;&amp;&quot;&#39;&lt;/script&gt;',
    );
  });

  it('should handle string with only safe characters', () => {
    expect(escapeHtml('Hello World 123')).toBe('Hello World 123');
  });
});

describe('isElementOnCurrentPage', () => {
  it('should return true for connected element', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    expect(isElementOnCurrentPage(el)).toBe(true);
    document.body.removeChild(el);
  });

  it('should return false for disconnected element', () => {
    const el = document.createElement('div');
    expect(isElementOnCurrentPage(el)).toBe(false);
  });

  it('should return false for null', () => {
    expect(isElementOnCurrentPage(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isElementOnCurrentPage(undefined)).toBe(false);
  });

  it('should return false for non-element values', () => {
    expect(isElementOnCurrentPage({})).toBe(false);
    expect(isElementOnCurrentPage('string')).toBe(false);
    expect(isElementOnCurrentPage(123)).toBe(false);
  });
});

describe('summarizeArg', () => {
  it('should return "null" for null', () => {
    expect(summarizeArg(null)).toBe('null');
  });

  it('should return "undefined" for undefined', () => {
    expect(summarizeArg(undefined)).toBe('undefined');
  });

  it('should return JSON-quoted string for short strings', () => {
    expect(summarizeArg('hello')).toBe('"hello"');
    expect(summarizeArg('test string')).toBe('"test string"');
  });

  it('should truncate long strings (>60 chars) with ellipsis', () => {
    const longString = 'a'.repeat(70);
    const result = summarizeArg(longString);
    expect(result).toContain('…');
    expect(result.length).toBeLessThan(longString.length + 3); // +3 for quotes and ellipsis
  });

  it('should return string representation for numbers', () => {
    expect(summarizeArg(42)).toBe('42');
    expect(summarizeArg(0)).toBe('0');
    expect(summarizeArg(-1.5)).toBe('-1.5');
  });

  it('should return string representation for booleans', () => {
    expect(summarizeArg(true)).toBe('true');
    expect(summarizeArg(false)).toBe('false');
  });

  it('should format Element with tag name and classes', () => {
    const el = document.createElement('div');
    el.className = 'foo bar';
    const result = summarizeArg(el);
    expect(result).toBe('<Element div .foo.bar>');
  });

  it('should format Element without classes', () => {
    const el = document.createElement('span');
    const result = summarizeArg(el);
    expect(result).toBe('<Element span>');
  });

  it('should format arrays with length', () => {
    expect(summarizeArg([1, 2, 3])).toBe('[Array(3)]');
    expect(summarizeArg([])).toBe('[Array(0)]');
  });

  it('should format plain objects with first 4 keys', () => {
    expect(summarizeArg({ a: 1, b: 2 })).toBe('{a, b}');
    expect(summarizeArg({ a: 1, b: 2, c: 3, d: 4 })).toBe('{a, b, c, d}');
  });

  it('should truncate object keys after 4 with ellipsis', () => {
    const obj = { a: 1, b: 2, c: 3, d: 4, e: 5, f: 6 };
    expect(summarizeArg(obj)).toBe('{a, b, c, d, …}');
  });

  it('should format objects with constructor name', () => {
    class CustomClass {
      foo = 1;
      bar = 2;
    }
    const instance = new CustomClass();
    const result = summarizeArg(instance);
    expect(result).toContain('CustomClass');
    expect(result).toContain('foo');
    expect(result).toContain('bar');
  });
});

describe('looksLikeItem', () => {
  it('should return true for object with definitionId and rating', () => {
    expect(looksLikeItem({ definitionId: 123, rating: 85 })).toBe(true);
  });

  it('should return true for object with definitionId and name', () => {
    expect(looksLikeItem({ definitionId: 123, name: 'Player' })).toBe(true);
  });

  it('should return true for object with id and rating', () => {
    expect(looksLikeItem({ id: 456, rating: 90 })).toBe(true);
  });

  it('should return true for object with id and name', () => {
    expect(looksLikeItem({ id: 456, name: 'Player' })).toBe(true);
  });

  it('should return true for object with resourceId and overallRating', () => {
    expect(looksLikeItem({ resourceId: 789, overallRating: 88 })).toBe(true);
  });

  it('should return true for object with definitionId and lastName', () => {
    expect(looksLikeItem({ definitionId: 123, lastName: 'Smith' })).toBe(true);
  });

  it('should return false for object missing id field', () => {
    expect(looksLikeItem({ rating: 85, name: 'Player' })).toBe(false);
  });

  it('should return false for object missing rating and name fields', () => {
    expect(looksLikeItem({ definitionId: 123 })).toBe(false);
  });

  it('should return false for null', () => {
    expect(looksLikeItem(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(looksLikeItem(undefined)).toBe(false);
  });

  it('should return false for non-object types', () => {
    expect(looksLikeItem('string')).toBe(false);
    expect(looksLikeItem(123)).toBe(false);
    expect(looksLikeItem(true)).toBe(false);
  });

  it('should return false for arrays', () => {
    expect(looksLikeItem([1, 2, 3])).toBe(false);
  });

  it('should return false for empty object', () => {
    expect(looksLikeItem({})).toBe(false);
  });
});
