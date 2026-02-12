import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  initNavTracker,
  recordNavEvent,
  getNavEvents,
  resetNavTracker,
  type NavEvent,
} from '../nav-tracker';
import { originals } from '../originals';
import { registry } from '../registry';
import { setFeatureEnabled } from '../feature-toggles';

describe('Navigation Tracker', () => {
  // Store original history methods
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  beforeEach(() => {
    // Enable navtimeline feature for tests
    setFeatureEnabled('navtimeline', true);

    // Restore history methods to originals
    history.pushState = originalPushState;
    history.replaceState = originalReplaceState;

    // Clear originals registry
    originals.restore('history.pushState');
    originals.restore('history.replaceState');

    // Clear registry controllers/viewModels
    registry.controllers = [];
    registry.viewModels = [];

    // Reset navigation tracker state
    resetNavTracker();
  });

  describe('recordNavEvent', () => {
    it('records pushState navigation event', () => {
      recordNavEvent(
        'pushState',
        'http://example.com/from',
        'http://example.com/to',
      );

      const events = getNavEvents();
      expect(events.length).toBe(1);
      expect(events[0].type).toBe('pushState');
      expect(events[0].from).toBe('http://example.com/from');
      expect(events[0].to).toBe('http://example.com/to');
      expect(events[0].ts).toBeGreaterThan(0);
    });

    it('records replaceState navigation event', () => {
      recordNavEvent(
        'replaceState',
        'http://example.com/a',
        'http://example.com/b',
      );

      const events = getNavEvents();
      expect(events.length).toBe(1);
      expect(events[0].type).toBe('replaceState');
      expect(events[0].from).toBe('http://example.com/a');
      expect(events[0].to).toBe('http://example.com/b');
    });

    it('records popstate navigation event', () => {
      recordNavEvent(
        'popstate',
        'http://example.com/old',
        'http://example.com/new',
      );

      const events = getNavEvents();
      expect(events.length).toBe(1);
      expect(events[0].type).toBe('popstate');
    });

    it('records hashchange navigation event', () => {
      recordNavEvent(
        'hashchange',
        'http://example.com/#old',
        'http://example.com/#new',
      );

      const events = getNavEvents();
      expect(events.length).toBe(1);
      expect(events[0].type).toBe('hashchange');
    });

    it('records utRouter navigation event with class name', () => {
      recordNavEvent(
        'utRouter',
        'http://example.com/x',
        'http://example.com/y',
        'UTNavigationController',
      );

      const events = getNavEvents();
      expect(events.length).toBe(1);
      expect(events[0].type).toBe('utRouter');
      expect(events[0].utClass).toBe('UTNavigationController');
    });

    it('snapshots controllers at time of navigation', () => {
      registry.controllers.push({
        className: 'UTTestViewController',
        instance: {},
        createdAt: Date.now(),
      });
      registry.controllers.push({
        className: 'UTAnotherViewController',
        instance: {},
        createdAt: Date.now(),
      });

      recordNavEvent(
        'pushState',
        'http://example.com/a',
        'http://example.com/b',
      );

      const events = getNavEvents();
      expect(events[0].controllersSnapshot).toEqual([
        'UTTestViewController',
        'UTAnotherViewController',
      ]);
    });

    it('snapshots viewModels at time of navigation', () => {
      registry.viewModels.push({
        className: 'UTTestViewModel',
        instance: {},
        createdAt: Date.now(),
      });
      registry.viewModels.push({
        className: 'UTAnotherViewModel',
        instance: {},
        createdAt: Date.now(),
      });

      recordNavEvent(
        'pushState',
        'http://example.com/a',
        'http://example.com/b',
      );

      const events = getNavEvents();
      expect(events[0].viewModelsSnapshot).toEqual([
        'UTTestViewModel',
        'UTAnotherViewModel',
      ]);
    });

    it('records multiple events in order', () => {
      recordNavEvent(
        'pushState',
        'http://example.com/1',
        'http://example.com/2',
      );
      recordNavEvent(
        'pushState',
        'http://example.com/2',
        'http://example.com/3',
      );
      recordNavEvent(
        'hashchange',
        'http://example.com/3',
        'http://example.com/3#hash',
      );

      const events = getNavEvents();
      expect(events.length).toBe(3);
      // Newest first
      expect(events[0].to).toBe('http://example.com/3#hash');
      expect(events[1].to).toBe('http://example.com/3');
      expect(events[2].to).toBe('http://example.com/2');
    });

    it('enforces max 500 events (bounded array)', () => {
      // Record 501 events
      for (let i = 0; i < 501; i++) {
        recordNavEvent(
          'pushState',
          `http://example.com/${i}`,
          `http://example.com/${i + 1}`,
        );
      }

      const events = getNavEvents(1000); // Request more than max
      expect(events.length).toBe(500); // Should be capped at 500

      // Verify oldest was removed (FIFO)
      // Newest is index 0, so oldest should be at the end
      expect(events[499].to).toBe('http://example.com/2'); // First event was 0->1, should be removed
    });

    it('does not record when feature toggle is disabled', () => {
      setFeatureEnabled('navtimeline', false);

      recordNavEvent(
        'pushState',
        'http://example.com/a',
        'http://example.com/b',
      );

      const events = getNavEvents();
      expect(events.length).toBe(0);
    });
  });

  describe('getNavEvents', () => {
    beforeEach(() => {
      // Record some events for retrieval tests
      recordNavEvent(
        'pushState',
        'http://example.com/1',
        'http://example.com/2',
      );
      recordNavEvent(
        'pushState',
        'http://example.com/2',
        'http://example.com/3',
      );
      recordNavEvent(
        'hashchange',
        'http://example.com/3',
        'http://example.com/3#hash',
      );
    });

    it('returns newest events first', () => {
      const events = getNavEvents();
      expect(events[0].to).toBe('http://example.com/3#hash');
      expect(events[1].to).toBe('http://example.com/3');
      expect(events[2].to).toBe('http://example.com/2');
    });

    it('defaults to 50 events max', () => {
      // Record 60 events
      for (let i = 0; i < 60; i++) {
        recordNavEvent(
          'pushState',
          `http://example.com/${i}`,
          `http://example.com/${i + 1}`,
        );
      }

      const events = getNavEvents();
      expect(events.length).toBe(50); // Default limit
    });

    it('respects custom limit parameter', () => {
      const events = getNavEvents(2);
      expect(events.length).toBe(2);
      expect(events[0].to).toBe('http://example.com/3#hash');
      expect(events[1].to).toBe('http://example.com/3');
    });

    it('returns all events if limit exceeds total', () => {
      const events = getNavEvents(100);
      expect(events.length).toBe(3); // Only 3 events recorded
    });

    it('returns empty array when no events recorded', () => {
      resetNavTracker();
      const events = getNavEvents();
      expect(events).toEqual([]);
    });
  });

  describe('initNavTracker', () => {
    it('hooks history.pushState', () => {
      const originalPushState = history.pushState;
      initNavTracker();

      expect(history.pushState).not.toBe(originalPushState);
      expect(originals.has('history.pushState')).toBe(true);
    });

    it('hooks history.replaceState', () => {
      const originalReplaceState = history.replaceState;
      initNavTracker();

      expect(history.replaceState).not.toBe(originalReplaceState);
      expect(originals.has('history.replaceState')).toBe(true);
    });

    it('hooked pushState records navigation event', () => {
      initNavTracker();

      const beforeUrl = window.location.href;
      history.pushState({}, '', '/test-path');

      const events = getNavEvents();
      expect(events.length).toBeGreaterThanOrEqual(1);

      const lastEvent = events[0];
      expect(lastEvent.type).toBe('pushState');
      expect(lastEvent.from).toBe(beforeUrl);

      // Cleanup
      history.back();
    });

    it('hooked replaceState records navigation event', () => {
      initNavTracker();

      const beforeUrl = window.location.href;
      history.replaceState({}, '', '/test-replace');

      const events = getNavEvents();
      expect(events.length).toBeGreaterThanOrEqual(1);

      const lastEvent = events[0];
      expect(lastEvent.type).toBe('replaceState');
      expect(lastEvent.from).toBe(beforeUrl);
    });

    it('sets up popstate event listener', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

      // Reset before calling init to ensure clean state
      resetNavTracker();
      initNavTracker();

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'popstate',
        expect.any(Function),
      );

      addEventListenerSpy.mockRestore();
    });

    it('sets up hashchange event listener', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

      // Reset before calling init to ensure clean state
      resetNavTracker();
      initNavTracker();

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'hashchange',
        expect.any(Function),
      );

      addEventListenerSpy.mockRestore();
    });

    it('sets up hashchange event listener', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

      initNavTracker();

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'hashchange',
        expect.any(Function),
      );

      addEventListenerSpy.mockRestore();
    });

    it('does not double-hook if called multiple times', () => {
      initNavTracker();
      const firstPushState = history.pushState;

      initNavTracker();
      const secondPushState = history.pushState;

      expect(firstPushState).toBe(secondPushState);
    });
  });

  describe('NavEvent structure', () => {
    it('includes all required fields', () => {
      registry.controllers.push({
        className: 'UTTestController',
        instance: {},
        createdAt: Date.now(),
      });
      registry.viewModels.push({
        className: 'UTTestViewModel',
        instance: {},
        createdAt: Date.now(),
      });

      recordNavEvent(
        'pushState',
        'http://example.com/a',
        'http://example.com/b',
        'UTRouter',
      );

      const events = getNavEvents();
      const event = events[0];

      expect(event).toHaveProperty('ts');
      expect(event).toHaveProperty('type');
      expect(event).toHaveProperty('from');
      expect(event).toHaveProperty('to');
      expect(event).toHaveProperty('utClass');
      expect(event).toHaveProperty('controllersSnapshot');
      expect(event).toHaveProperty('viewModelsSnapshot');

      expect(typeof event.ts).toBe('number');
      expect(typeof event.type).toBe('string');
      expect(typeof event.from).toBe('string');
      expect(typeof event.to).toBe('string');
      expect(Array.isArray(event.controllersSnapshot)).toBe(true);
      expect(Array.isArray(event.viewModelsSnapshot)).toBe(true);
    });

    it('utClass is optional and can be undefined', () => {
      recordNavEvent(
        'pushState',
        'http://example.com/a',
        'http://example.com/b',
      );

      const events = getNavEvents();
      expect(events[0].utClass).toBeUndefined();
    });
  });
});
