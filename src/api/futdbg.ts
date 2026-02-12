/**
 * FUTDBG Console API - window.FUTDBG namespace
 * Exposes registry queries for debugging UT classes, views, and method calls
 * All returned data are copies/summaries, never live references
 */

import { registry } from '../core/registry';
import type { ClassInfo, MethodCall, ViewRecord } from '../types';

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
   * Print help text describing all available commands
   */
  help(): string;
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

    help(): string {
      return `FUT Debug Console API:
- FUTDBG.classes() - List all registered UT* class names (sorted)
- FUTDBG.find(className) - Get class info (constructor, methods) or null
- FUTDBG.views() - List all tracked DOM views with summaries
- FUTDBG.calls(filter?) - Get method calls (newest first, max 100, optional filter)
- FUTDBG.registry - Access raw registry object for power users
- FUTDBG.help() - Show this help text

Examples:
  FUTDBG.classes()                    // ['UTButtonControl', 'UTPlayerItemView', ...]
  FUTDBG.find('UTPlayerItemView')     // { ctor, protoMethods, staticMethods }
  FUTDBG.views()                      // [{ element, classes, createdBy, ... }, ...]
  FUTDBG.calls()                      // [{ id, ts, className, methodName, ... }, ...]
  FUTDBG.calls('PlayerItem.render')   // Filter by substring
  FUTDBG.registry.classes             // Direct access to registry`;
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
