import { describe, it, expect, beforeEach } from 'vitest';
import {
  isFeatureEnabled,
  toggleFeature,
  setFeatureEnabled,
  getFeatures,
} from '../feature-toggles';
import { createDebugStore, set } from '../store';
import type { DebugState } from '../../types';

describe('Feature Toggles', () => {
  beforeEach(() => {
    // Reset store to defaults before each test
    set({
      overlayEnabled: true,
      sidebarEnabled: true,
      classInspectorEnabled: false,
      methodSpyEnabled: false,
      networkMonitorEnabled: false,
      conditionalLoggingEnabled: false,
      perfProfilerEnabled: false,
      navTimelineEnabled: false,
      propertyWatcherEnabled: false,
    });
  });

  describe('isFeatureEnabled', () => {
    it('returns true for overlay feature by default', () => {
      expect(isFeatureEnabled('overlay')).toBe(true);
    });

    it('returns true for sidebar feature by default', () => {
      expect(isFeatureEnabled('sidebar')).toBe(true);
    });

    it('returns false for classinspector feature by default', () => {
      expect(isFeatureEnabled('classinspector')).toBe(false);
    });

    it('returns false for methodspy feature by default', () => {
      expect(isFeatureEnabled('methodspy')).toBe(false);
    });

    it('returns false for network feature by default', () => {
      expect(isFeatureEnabled('network')).toBe(false);
    });

    it('returns false for conditionallog feature by default', () => {
      expect(isFeatureEnabled('conditionallog')).toBe(false);
    });

    it('returns false for perfprofiler feature by default', () => {
      expect(isFeatureEnabled('perfprofiler')).toBe(false);
    });

    it('returns false for navtimeline feature by default', () => {
      expect(isFeatureEnabled('navtimeline')).toBe(false);
    });

    it('returns false for propertywatcher feature by default', () => {
      expect(isFeatureEnabled('propertywatcher')).toBe(false);
    });
  });

  describe('toggleFeature', () => {
    it('flips overlay from true to false and returns new state', () => {
      const newState = toggleFeature('overlay');
      expect(newState).toBe(false);
      expect(isFeatureEnabled('overlay')).toBe(false);
    });

    it('flips overlay from false to true and returns new state', () => {
      toggleFeature('overlay'); // First toggle: true -> false
      const newState = toggleFeature('overlay'); // Second toggle: false -> true
      expect(newState).toBe(true);
      expect(isFeatureEnabled('overlay')).toBe(true);
    });

    it('flips network from false to true and returns new state', () => {
      const newState = toggleFeature('network');
      expect(newState).toBe(true);
      expect(isFeatureEnabled('network')).toBe(true);
    });

    it('flips network from true to false and returns new state', () => {
      toggleFeature('network'); // First toggle: false -> true
      const newState = toggleFeature('network'); // Second toggle: true -> false
      expect(newState).toBe(false);
      expect(isFeatureEnabled('network')).toBe(false);
    });

    it('returns the new state value', () => {
      const result = toggleFeature('conditionallog');
      expect(typeof result).toBe('boolean');
      expect(result).toBe(true);
    });
  });

  describe('setFeatureEnabled', () => {
    it('sets overlay to false', () => {
      setFeatureEnabled('overlay', false);
      expect(isFeatureEnabled('overlay')).toBe(false);
    });

    it('sets overlay to true', () => {
      setFeatureEnabled('overlay', false);
      setFeatureEnabled('overlay', true);
      expect(isFeatureEnabled('overlay')).toBe(true);
    });

    it('sets network to true', () => {
      setFeatureEnabled('network', true);
      expect(isFeatureEnabled('network')).toBe(true);
    });

    it('sets network to false', () => {
      setFeatureEnabled('network', true);
      setFeatureEnabled('network', false);
      expect(isFeatureEnabled('network')).toBe(false);
    });

    it('sets methodspy to true', () => {
      setFeatureEnabled('methodspy', true);
      expect(isFeatureEnabled('methodspy')).toBe(true);
    });

    it('sets perfprofiler to true', () => {
      setFeatureEnabled('perfprofiler', true);
      expect(isFeatureEnabled('perfprofiler')).toBe(true);
    });

    it('sets navtimeline to false', () => {
      setFeatureEnabled('navtimeline', true);
      setFeatureEnabled('navtimeline', false);
      expect(isFeatureEnabled('navtimeline')).toBe(false);
    });

    it('sets propertywatcher to true', () => {
      setFeatureEnabled('propertywatcher', true);
      expect(isFeatureEnabled('propertywatcher')).toBe(true);
    });

    it('sets classinspector to true', () => {
      setFeatureEnabled('classinspector', true);
      expect(isFeatureEnabled('classinspector')).toBe(true);
    });

    it('sets conditionallog to true', () => {
      setFeatureEnabled('conditionallog', true);
      expect(isFeatureEnabled('conditionallog')).toBe(true);
    });

    it('sets sidebar to false', () => {
      setFeatureEnabled('sidebar', false);
      expect(isFeatureEnabled('sidebar')).toBe(false);
    });
  });

  describe('getFeatures', () => {
    it('returns object with all 9 feature keys', () => {
      const features = getFeatures();
      const keys = Object.keys(features).sort();
      expect(keys).toEqual([
        'classinspector',
        'conditionallog',
        'methodspy',
        'navtimeline',
        'network',
        'overlay',
        'perfprofiler',
        'propertywatcher',
        'sidebar',
      ]);
    });

    it('returns correct default states', () => {
      const features = getFeatures();
      expect(features.overlay).toBe(true);
      expect(features.sidebar).toBe(true);
      expect(features.classinspector).toBe(false);
      expect(features.methodspy).toBe(false);
      expect(features.network).toBe(false);
      expect(features.conditionallog).toBe(false);
      expect(features.perfprofiler).toBe(false);
      expect(features.navtimeline).toBe(false);
      expect(features.propertywatcher).toBe(false);
    });

    it('reflects changes after setFeatureEnabled', () => {
      setFeatureEnabled('network', true);
      setFeatureEnabled('overlay', false);
      const features = getFeatures();
      expect(features.network).toBe(true);
      expect(features.overlay).toBe(false);
    });

    it('reflects changes after toggleFeature', () => {
      toggleFeature('methodspy');
      toggleFeature('perfprofiler');
      const features = getFeatures();
      expect(features.methodspy).toBe(true);
      expect(features.perfprofiler).toBe(true);
    });

    it('returns a copy, not a live reference', () => {
      const features1 = getFeatures();
      setFeatureEnabled('network', true);
      const features2 = getFeatures();
      expect(features1.network).toBe(false);
      expect(features2.network).toBe(true);
    });

    it('returns all features as booleans', () => {
      const features = getFeatures();
      Object.values(features).forEach((value) => {
        expect(typeof value).toBe('boolean');
      });
    });
  });

  describe('Feature key mapping', () => {
    it('maps overlay to overlayEnabled in store', () => {
      setFeatureEnabled('overlay', false);
      expect(isFeatureEnabled('overlay')).toBe(false);
    });

    it('maps sidebar to sidebarEnabled in store', () => {
      setFeatureEnabled('sidebar', false);
      expect(isFeatureEnabled('sidebar')).toBe(false);
    });

    it('maps network to networkMonitorEnabled in store', () => {
      setFeatureEnabled('network', true);
      expect(isFeatureEnabled('network')).toBe(true);
    });

    it('maps conditionallog to conditionalLoggingEnabled in store', () => {
      setFeatureEnabled('conditionallog', true);
      expect(isFeatureEnabled('conditionallog')).toBe(true);
    });

    it('maps perfprofiler to perfProfilerEnabled in store', () => {
      setFeatureEnabled('perfprofiler', true);
      expect(isFeatureEnabled('perfprofiler')).toBe(true);
    });

    it('maps navtimeline to navTimelineEnabled in store', () => {
      setFeatureEnabled('navtimeline', true);
      expect(isFeatureEnabled('navtimeline')).toBe(true);
    });

    it('maps propertywatcher to propertyWatcherEnabled in store', () => {
      setFeatureEnabled('propertywatcher', true);
      expect(isFeatureEnabled('propertywatcher')).toBe(true);
    });

    it('maps classinspector to classInspectorEnabled in store', () => {
      setFeatureEnabled('classinspector', true);
      expect(isFeatureEnabled('classinspector')).toBe(true);
    });

    it('maps methodspy to methodSpyEnabled in store', () => {
      setFeatureEnabled('methodspy', true);
      expect(isFeatureEnabled('methodspy')).toBe(true);
    });
  });

  describe('Integration with store', () => {
    it('persists state changes through store', () => {
      setFeatureEnabled('network', true);
      setFeatureEnabled('overlay', false);
      expect(isFeatureEnabled('network')).toBe(true);
      expect(isFeatureEnabled('overlay')).toBe(false);
    });

    it('reads from store correctly', () => {
      set({
        networkMonitorEnabled: true,
        overlayEnabled: false,
      });
      expect(isFeatureEnabled('network')).toBe(true);
      expect(isFeatureEnabled('overlay')).toBe(false);
    });
  });
});
