/**
 * FUTDBG Console API - window.FUTDBG namespace
 * Exposes registry queries for debugging UT classes, views, and method calls
 * All returned data are copies/summaries, never live references
 */

import { registry } from '../core/registry';
import type { ClassInfo, MethodCall, ViewRecord } from '../types';
import {
  addRule as addRuleEngine,
  removeRule as removeRuleEngine,
  getRules as getRulesEngine,
} from '../core/rules-engine';
import type { Rule } from '../core/rules-engine';
import {
  toggleFeature as toggleFeatureImpl,
  getFeatures as getFeaturesImpl,
  type FeatureKey,
} from '../core/feature-toggles';
import {
  getStats as getPerfStats,
  getTopN as getPerfTopN,
  resetStats as resetPerfStats,
  type MethodStats,
} from '../core/perf-profiler';
import { getNavEvents, type NavEvent } from '../core/nav-tracker';
import {
  watchProperty,
  unwatchProperty,
  getWatches as getPropertyWatches,
  type WatchEntrySummary,
} from '../core/property-watcher';
import { inspectInstance } from '../ui/instance-inspector';

/**
 * Summary of a view without live DOM references
 */
interface ViewSummary {
  element: {
    tag: string;
    id: string;
    className: string;
  };
  classes: string[];
  createdBy: string | null;
  itemSnippet: string | null;
  controlInfo?: {
    type: string;
    className: string;
    label: string;
    disabled: boolean;
    domClass: string;
  } | null;
}

/**
 * Summary of a class info
 */
interface ClassInfoSummary {
  ctor: { new (...args: unknown[]): unknown };
  protoMethods: string[];
  staticMethods: string[];
}

/**
 * Summary of a method call
 */
interface MethodCallSummary {
  id: number;
  ts: number;
  className: string;
  methodName: string;
  isStatic: boolean;
  argPreviews: string[];
  resultPreview: string;
  errorPreview: string;
  threw: boolean;
}

/**
 * FUTDBG namespace object
 */
interface FUTDBG {
  /**
   * Get all registered UT class names, sorted alphabetically
   */
  classes(): string[];

  /**
   * Find a class by name and return its info (constructor, methods)
   * Returns null if not found
   */
  find(className: string): ClassInfoSummary | null;

  /**
   * Get all tracked views with summaries (no live DOM refs)
   */
  views(): ViewSummary[];

  /**
   * Get method calls (newest first, max 100)
   * Optional filter: substring match on "className.methodName"
   */
  calls(filter?: string): MethodCallSummary[];

  /**
   * Access raw registry for power users
   */
  readonly registry: typeof registry;

  /**
   * Add a conditional logging rule
   * Returns rule ID
   */
  addRule(rule: Omit<Rule, 'id'>): string;

  /**
   * Remove a rule by ID
   * Returns true if removed, false if not found
   */
  removeRule(id: string): boolean;

  /**
   * Get all active rules
   */
  rules(): Rule[];

  /**
   * Print help text describing all available commands
   */
  help(): string;

  /**
   * Toggle a feature on/off and return the new state
   * @param feature - Feature key to toggle
   * @returns The new state (true if enabled, false if disabled)
   */
  toggle(feature: FeatureKey): boolean;

  /**
   * Get all features and their current states
   * @returns Object mapping feature keys to their boolean states
   */
  features(): Record<FeatureKey, boolean>;

  /**
   * Get performance profiler stats
   * If no className provided, prints top 20 methods by totalMs
   * If className provided, filters stats by className and prints all matching
   * @param className - Optional class name filter
   */
  perf(className?: string): void;

  /**
   * Display navigation timeline (newest first, max 50 events)
   * Shows timestamp, type, URLs, UT router class, and controller/viewModel counts
   */
  nav(): void;

  /**
   * Watch a property on an object for changes
   * Logs changes to console and returns a watch ID
   * @param instance - Object instance to watch
   * @param propName - Property name to watch
   * @returns Watch ID (use with unwatch to remove)
   */
  watch(instance: object, propName: string): string;

  /**
   * Stop watching a property
   * @param watchId - Watch ID returned from watch()
   * @returns true if watch was removed, false if not found
   */
  unwatch(watchId: string): boolean;

  /**
   * Get all active property watches
   * @returns Array of watch summaries
   */
  watches(): WatchEntrySummary[];

  /**
   * Open the Instance Inspector for a specific object
   * @param instance - The object to inspect
   */
  inspect(instance: any): void;
}

/**
 * Create a summary of a view without live DOM references
 */
function summarizeView(viewRecord: ViewRecord): ViewSummary {
  const summary: ViewSummary = {
    element: {
      tag: viewRecord.element.tagName.toLowerCase(),
      id: viewRecord.element.id || '',
      className: viewRecord.element.className || '',
    },
    classes: Array.from(viewRecord.classes).sort(),
    createdBy: viewRecord.createdBy,
    itemSnippet: viewRecord.lastItemSnippet,
  };

  if (viewRecord.controlInfo) {
    summary.controlInfo = {
      type: viewRecord.controlInfo.type,
      className: viewRecord.controlInfo.className,
      label: viewRecord.controlInfo.label,
      disabled: viewRecord.controlInfo.disabled,
      domClass: viewRecord.controlInfo.domClass,
    };
  }

  return summary;
}

/**
 * Create a summary of a class info
 */
function summarizeClassInfo(classInfo: ClassInfo): ClassInfoSummary {
  return {
    ctor: classInfo.ctor,
    protoMethods: [...classInfo.protoMethods],
    staticMethods: [...classInfo.staticMethods],
  };
}

/**
 * Create a summary of a method call
 */
function summarizeMethodCall(call: MethodCall): MethodCallSummary {
  return {
    id: call.id,
    ts: call.ts,
    className: call.className,
    methodName: call.methodName,
    isStatic: call.isStatic,
    argPreviews: [...call.argPreviews],
    resultPreview: call.resultPreview,
    errorPreview: call.errorPreview,
    threw: call.threw,
  };
}

/**
 * Create the FUTDBG namespace object
 */
function createFUTDBG(): FUTDBG {
  return {
    classes(): string[] {
      return Array.from(registry.classes.keys()).sort();
    },

    find(className: string): ClassInfoSummary | null {
      const classInfo = registry.classes.get(className);
      if (!classInfo) return null;
      return summarizeClassInfo(classInfo);
    },

    views(): ViewSummary[] {
      return Array.from(registry.views).map(summarizeView);
    },

    calls(filter?: string): MethodCallSummary[] {
      const allCalls = registry.methodCalls.toArrayNewestFirst();

      // Limit to max 100
      const limited = allCalls.slice(0, 100);

      // Filter if provided
      if (!filter) {
        return limited.map(summarizeMethodCall);
      }

      const filtered = limited.filter((call) => {
        const fullName = `${call.className}.${call.methodName}`;
        return fullName.includes(filter);
      });

      return filtered.map(summarizeMethodCall);
    },

    get registry() {
      return registry;
    },

    addRule(rule: Omit<Rule, 'id'>): string {
      return addRuleEngine(rule);
    },

    removeRule(id: string): boolean {
      return removeRuleEngine(id);
    },

    rules(): Rule[] {
      return getRulesEngine();
    },

    help(): string {
      return `FUT Debug Console API:
- FUTDBG.classes() - List all registered UT* class names (sorted)
- FUTDBG.find(className) - Get class info (constructor, methods) or null
- FUTDBG.views() - List all tracked DOM views with summaries
- FUTDBG.calls(filter?) - Get method calls (newest first, max 100, optional filter)
- FUTDBG.addRule(rule) - Add conditional logging rule (max 20), returns rule ID
- FUTDBG.removeRule(id) - Remove rule by ID, returns true if removed
- FUTDBG.rules() - Get all active rules
- FUTDBG.toggle(feature) - Toggle a feature on/off, returns new state
- FUTDBG.features() - Get all features and their current states
- FUTDBG.perf(className?) - Show performance stats (top 20 or filtered by className)
- FUTDBG.nav() - Display navigation timeline (newest first, max 50)
- FUTDBG.watch(instance, propName) - Watch a property for changes, returns watch ID
- FUTDBG.unwatch(watchId) - Stop watching a property, returns true if removed
- FUTDBG.watches() - Get all active property watches
- FUTDBG.inspect(instance) - Open Instance Inspector window for an object
- FUTDBG.registry - Access raw registry object for power users
- FUTDBG.help() - Show this help text

Examples:
  FUTDBG.classes()                    // ['UTButtonControl', 'UTPlayerItemView', ...]
  FUTDBG.find('UTPlayerItemView')     // { ctor, protoMethods, staticMethods }
  FUTDBG.views()                      // [{ element, classes, createdBy, ... }, ...]
  FUTDBG.calls()                      // [{ id, ts, className, methodName, ... }, ...]
  FUTDBG.calls('PlayerItem.render')   // Filter by substring
  FUTDBG.addRule({ className: 'UT*View', action: 'log' })  // Add rule with glob
  FUTDBG.addRule({ methodName: 'render*', action: 'debugger' })  // Debugger on render*
  FUTDBG.rules()                      // [{ id, className, methodName, action, ... }, ...]
  FUTDBG.removeRule('rule-123')       // Remove rule by ID
  FUTDBG.toggle('network')            // Toggle network monitor, returns new state
  FUTDBG.features()                   // { overlay: true, sidebar: true, network: false, ... }
  FUTDBG.perf()                       // Top 20 methods by total time
  FUTDBG.perf('UTPlayerItemView')     // All stats for classes matching 'UTPlayerItemView'
  FUTDBG.nav()                        // Show navigation events with timestamps, types, URLs
  FUTDBG.watch(playerItem, 'rating')  // Watch playerItem.rating for changes
  FUTDBG.unwatch('watch-1')           // Stop watching
  FUTDBG.watches()                    // [{ id, path, strategy }, ...]
  FUTDBG.registry.classes             // Direct access to registry`;
    },

    toggle(feature: FeatureKey): boolean {
      return toggleFeatureImpl(feature);
    },

    features(): Record<FeatureKey, boolean> {
      return getFeaturesImpl();
    },

    perf(className?: string): void {
      if (!className) {
        // Print top 20 by totalMs
        const top20 = getPerfTopN(20, 'totalMs');
        if (top20.length === 0) {
          console.log('No performance stats available');
          return;
        }

        console.table(
          top20.map((stat) => ({
            Class: stat.className,
            Method: stat.methodName,
            Calls: stat.callCount,
            'Total (ms)': stat.totalMs.toFixed(2),
            'Avg (ms)': stat.avgMs.toFixed(2),
            'Min (ms)': stat.minMs.toFixed(2),
            'Max (ms)': stat.maxMs.toFixed(2),
            'P95 (ms)': stat.p95Ms.toFixed(2),
          })),
        );
      } else {
        // Filter by className
        const allStats = getPerfStats();
        const filtered: MethodStats[] = [];

        allStats.forEach((stat) => {
          if (stat.className.includes(className)) {
            filtered.push(stat);
          }
        });

        if (filtered.length === 0) {
          console.log(`No performance stats found for class: ${className}`);
          return;
        }

        // Sort by totalMs descending
        filtered.sort((a, b) => b.totalMs - a.totalMs);

        console.table(
          filtered.map((stat) => ({
            Class: stat.className,
            Method: stat.methodName,
            Calls: stat.callCount,
            'Total (ms)': stat.totalMs.toFixed(2),
            'Avg (ms)': stat.avgMs.toFixed(2),
            'Min (ms)': stat.minMs.toFixed(2),
            'Max (ms)': stat.maxMs.toFixed(2),
            'P95 (ms)': stat.p95Ms.toFixed(2),
          })),
        );
      }
    },

    nav(): void {
      const events = getNavEvents(50);
      if (events.length === 0) {
        console.log('No navigation events recorded');
        return;
      }

      console.table(
        events.map((e) => ({
          Time: new Date(e.ts).toLocaleTimeString(),
          Type: e.type,
          From: e.from,
          To: e.to,
          UTClass: e.utClass || '-',
          Controllers: e.controllersSnapshot.length,
          ViewModels: e.viewModelsSnapshot.length,
        })),
      );
    },

    watch(instance: object, propName: string): string {
      return watchProperty(instance, propName, (oldVal, newVal) => {
        console.log(`[Property Changed] ${propName}:`, oldVal, '→', newVal);
      });
    },

    unwatch(watchId: string): boolean {
      return unwatchProperty(watchId);
    },

    watches(): WatchEntrySummary[] {
      return getPropertyWatches();
    },

    inspect(instance: any): void {
      inspectInstance(instance);
    },
  };
}

/**
 * Install FUTDBG on window.FUTDBG
 * Called during initialization after registry is populated
 */
export function installFUTDBG(): void {
  const futdbg = createFUTDBG();
  (window as any).FUTDBG = futdbg;
}
