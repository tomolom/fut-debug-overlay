import { describe, it, expect } from 'vitest';
import { createUiRefsStore } from '../ui-refs';

describe('ui-refs store', () => {
  it('sets and gets refs', () => {
    const uiRefs = createUiRefsStore();
    const tooltipEl = document.createElement('div');

    uiRefs.set('tooltipEl', tooltipEl);

    expect(uiRefs.get('tooltipEl')).toBe(tooltipEl);
  });

  it('returns null for unset refs', () => {
    const uiRefs = createUiRefsStore();

    expect(uiRefs.get('highlightEl')).toBeNull();
  });

  it('handles null refs', () => {
    const uiRefs = createUiRefsStore();
    const sidebarEl = document.createElement('div');
    uiRefs.set('sidebarEl', sidebarEl);

    uiRefs.set('sidebarEl', null);

    expect(uiRefs.get('sidebarEl')).toBeNull();
  });
});
