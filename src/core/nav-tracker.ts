/**
 * Navigation/Routing Timeline Tracker
 * Hooks into browser history API and navigation events to track route changes
 * Records navigation events with timestamps, types, URLs, and snapshots of controllers/viewModels
 */

import { originals } from './originals';
import { registry } from './registry';
import { isFeatureEnabled } from './feature-toggles';

/**
 * Navigation event types
 */
export type NavEventType =
  | 'pushState'
  | 'replaceState'
  | 'popstate'
  | 'hashchange'
  | 'utRouter';

/**
 * Navigation event record
 */
export interface NavEvent {
  /** Timestamp when navigation occurred */
  ts: number;
  /** Type of navigation event */
  type: NavEventType;
  /** URL before navigation */
  from: string;
  /** URL after navigation */
  to: string;
  /** UT router class name (if navigation triggered by UT router) */
  utClass?: string;
  /** Snapshot of controller class names at time of navigation */
  controllersSnapshot: string[];
  /** Snapshot of viewModel class names at time of navigation */
  viewModelsSnapshot: string[];
}

/**
 * Maximum number of navigation events to retain (bounded array)
 */
const MAX_NAV_EVENTS = 500;

/**
 * Storage for navigation events (newest at end)
 */
let navEvents: NavEvent[] = [];

/**
 * Flag to prevent double-initialization
 */
let initialized = false;

/**
 * Record a navigation event
 * @param type - Type of navigation event
 * @param from - URL before navigation
 * @param to - URL after navigation
 * @param utClass - Optional UT router class name
 */
export function recordNavEvent(
  type: NavEventType,
  from: string,
  to: string,
  utClass?: string,
): void {
  // Check feature toggle
  if (!isFeatureEnabled('navtimeline')) {
    return;
  }

  // Snapshot current controllers and viewModels
  const controllersSnapshot = registry.controllers.map((c) => c.className);
  const viewModelsSnapshot = registry.viewModels.map((vm) => vm.className);

  // Create event record
  const event: NavEvent = {
    ts: Date.now(),
    type,
    from,
    to,
    utClass,
    controllersSnapshot,
    viewModelsSnapshot,
  };

  // Add to array
  navEvents.push(event);

  // Enforce bounded array (max 500, FIFO)
  if (navEvents.length > MAX_NAV_EVENTS) {
    navEvents.shift(); // Remove oldest
  }
}

/**
 * Get navigation events (newest first)
 * @param limit - Maximum number of events to return (default 50)
 * @returns Array of navigation events, newest first
 */
export function getNavEvents(limit = 50): NavEvent[] {
  // Return newest first
  return navEvents.slice(-limit).reverse();
}

/**
 * Reset navigation tracker state (for testing)
 * @internal
 */
export function resetNavTracker(): void {
  navEvents = [];
  initialized = false;
}

/**
 * Hook history.pushState to track navigation
 */
function hookPushState(): void {
  const pushStateKey = 'history.pushState';

  // Check if already hooked
  if (originals.has(pushStateKey)) {
    return;
  }

  // Store original
  const originalPushState = history.pushState.bind(history);
  originals.store(pushStateKey, originalPushState);

  // Wrap with tracking
  history.pushState = function (
    this: History,
    data: unknown,
    unused: string,
    url?: string | URL | null,
  ): void {
    const from = window.location.href;

    // Call original
    originalPushState(data, unused, url);

    const to = window.location.href;

    // Record navigation event
    recordNavEvent('pushState', from, to);
  };
}

/**
 * Hook history.replaceState to track navigation
 */
function hookReplaceState(): void {
  const replaceStateKey = 'history.replaceState';

  // Check if already hooked
  if (originals.has(replaceStateKey)) {
    return;
  }

  // Store original
  const originalReplaceState = history.replaceState.bind(history);
  originals.store(replaceStateKey, originalReplaceState);

  // Wrap with tracking
  history.replaceState = function (
    this: History,
    data: unknown,
    unused: string,
    url?: string | URL | null,
  ): void {
    const from = window.location.href;

    // Call original
    originalReplaceState(data, unused, url);

    const to = window.location.href;

    // Record navigation event
    recordNavEvent('replaceState', from, to);
  };
}

/**
 * Set up popstate event listener
 */
function setupPopstateListener(): void {
  window.addEventListener('popstate', () => {
    recordNavEvent(
      'popstate',
      document.referrer || window.location.href,
      window.location.href,
    );
  });
}

/**
 * Set up hashchange event listener
 */
function setupHashchangeListener(): void {
  window.addEventListener('hashchange', (e: HashChangeEvent) => {
    recordNavEvent('hashchange', e.oldURL, e.newURL);
  });
}

/**
 * Scan for UT router classes and hook their navigation methods
 * This is a placeholder for future implementation when UT router classes are identified
 */
function scanAndHookUTRouters(): void {
  // Scan window for *NavigationController* or *Router* classes
  // This is speculative - actual implementation would depend on FUT app structure

  const routerPatterns = [/NavigationController/, /Router/];

  Object.keys(window).forEach((key) => {
    if (
      key.startsWith('UT') &&
      routerPatterns.some((pattern) => pattern.test(key))
    ) {
      const RouterClass = (window as any)[key];

      if (typeof RouterClass === 'function' && RouterClass.prototype) {
        // Hook potential navigation methods
        const navMethods = ['navigate', 'navigateTo', 'goTo', 'route'];

        navMethods.forEach((methodName) => {
          if (typeof RouterClass.prototype[methodName] === 'function') {
            const originalMethod = RouterClass.prototype[methodName];

            RouterClass.prototype[methodName] = function (
              this: any,
              ...args: any[]
            ) {
              const from = window.location.href;
              const result = originalMethod.apply(this, args);
              const to = window.location.href;

              if (from !== to) {
                recordNavEvent('utRouter', from, to, key);
              }

              return result;
            };
          }
        });
      }
    }
  });
}

/**
 * Initialize navigation tracker
 * Hooks history API, sets up event listeners, and scans for UT routers
 */
export function initNavTracker(): void {
  // Prevent double-initialization
  if (initialized) {
    return;
  }

  initialized = true;

  // Hook history API
  hookPushState();
  hookReplaceState();

  // Set up event listeners
  setupPopstateListener();
  setupHashchangeListener();

  // Scan for UT router classes
  scanAndHookUTRouters();
}
