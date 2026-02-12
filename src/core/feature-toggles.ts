/**
 * Per-Feature Toggle System
 * Provides a unified API for enabling/disabling individual features
 * Uses the store for reactive state management
 */

import { get, set } from './store';
import type { DebugState } from '../types';

/**
 * Feature key type - all available features that can be toggled
 */
export type FeatureKey =
  | 'overlay'
  | 'sidebar'
  | 'classinspector'
  | 'methodspy'
  | 'network'
  | 'conditionallog'
  | 'perfprofiler'
  | 'navtimeline'
  | 'propertywatcher';

/**
 * Map feature keys to their corresponding store keys
 */
const FEATURE_KEY_MAP: Record<FeatureKey, keyof DebugState> = {
  overlay: 'overlayEnabled',
  sidebar: 'sidebarEnabled',
  classinspector: 'classInspectorEnabled',
  methodspy: 'methodSpyEnabled',
  network: 'networkMonitorEnabled',
  conditionallog: 'conditionalLoggingEnabled',
  perfprofiler: 'perfProfilerEnabled',
  navtimeline: 'navTimelineEnabled',
  propertywatcher: 'propertyWatcherEnabled',
};

/**
 * Check if a feature is currently enabled
 * @param feature - The feature key to check
 * @returns true if the feature is enabled, false otherwise
 */
export function isFeatureEnabled(feature: FeatureKey): boolean {
  const storeKey = FEATURE_KEY_MAP[feature];
  return get(storeKey) as boolean;
}

/**
 * Toggle a feature on/off and return the new state
 * @param feature - The feature key to toggle
 * @returns The new state (true if now enabled, false if now disabled)
 */
export function toggleFeature(feature: FeatureKey): boolean {
  const storeKey = FEATURE_KEY_MAP[feature];
  const currentState = get(storeKey) as boolean;
  const newState = !currentState;
  set({ [storeKey]: newState } as Partial<DebugState>);
  return newState;
}

/**
 * Set a feature to a specific enabled/disabled state
 * @param feature - The feature key to set
 * @param enabled - Whether the feature should be enabled
 */
export function setFeatureEnabled(feature: FeatureKey, enabled: boolean): void {
  const storeKey = FEATURE_KEY_MAP[feature];
  set({ [storeKey]: enabled } as Partial<DebugState>);
}

/**
 * Get all features and their current states
 * @returns Object mapping feature keys to their boolean states
 */
export function getFeatures(): Record<FeatureKey, boolean> {
  return {
    overlay: isFeatureEnabled('overlay'),
    sidebar: isFeatureEnabled('sidebar'),
    classinspector: isFeatureEnabled('classinspector'),
    methodspy: isFeatureEnabled('methodspy'),
    network: isFeatureEnabled('network'),
    conditionallog: isFeatureEnabled('conditionallog'),
    perfprofiler: isFeatureEnabled('perfprofiler'),
    navtimeline: isFeatureEnabled('navtimeline'),
    propertywatcher: isFeatureEnabled('propertywatcher'),
  };
}
