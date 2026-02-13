// Entry point for FUT UT View Debug Overlay Chrome Extension
import { onMessage, sendMessage, MessageType } from './core/message-bridge';

// Import all modules
import { activateDomHook } from './core/dom-hooks';
import { hookAllUTClasses } from './core/ut-class-hooks';
import { initEventHooks } from './core/event-hooks';
import { initRulesEngine } from './core/rules-engine';
import { initPerfProfiler } from './core/perf-profiler';
import { initNavTracker } from './core/nav-tracker';
import { initPropertyWatcher } from './core/property-watcher';
import { initNetworkInterceptor } from './core/network-interceptor';
import { installFUTDBG } from './api/futdbg';
import { createShadowHost } from './ui/shadow-host';
import {
  createOverlayElements,
  updateOverlayForEvent,
  toggleDebug,
} from './ui/overlay';
import {
  createSidebar,
  attachSidebarClickHandler,
  updateSidebar,
} from './ui/sidebar';
import { createClassWindow, toggleClassWindow } from './ui/class-inspector';
import {
  createMethodSpyWindow,
  toggleMethodSpyWindow,
  updateMethodSpyList,
} from './ui/method-spy';
import { isMethodSpyVisible } from './core/state';
import { toggleFeature, getFeatures, FeatureKey } from './core/feature-toggles';
import { getStats } from './core/perf-profiler';
import { getNavEvents } from './core/nav-tracker';
import { takeSnapshot } from './core/snapshot';

/**
 * Sets up the debug overlay UI and event listeners
 */
function setupDebugOverlay(): void {
  // Create shadow DOM host FIRST - all UI elements will be appended here
  createShadowHost();

  createOverlayElements();
  createSidebar();
  attachSidebarClickHandler();
  createClassWindow();
  createMethodSpyWindow();

  // Keyboard shortcuts
  window.addEventListener('keydown', (e: KeyboardEvent) => {
    // Ctrl+Shift+U: Toggle debug overlay
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'u') {
      toggleDebug();
    }

    // Ctrl+Shift+Y: Toggle class inspector
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'y') {
      toggleClassWindow();
    }

    // Ctrl+Shift+H: Toggle method spy
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'h') {
      toggleMethodSpyWindow();
    }

    // Ctrl+Shift+T: Cycle through features or show toggle instructions
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 't') {
      e.preventDefault();
      console.log(
        '[UTDebug] Feature Toggle - Use FUTDBG.toggle(feature) or FUTDBG.features() in console',
      );
      console.log('[UTDebug] Available features:', [
        'overlay',
        'sidebar',
        'classinspector',
        'methodspy',
        'network',
        'conditionallog',
        'perfprofiler',
        'navtimeline',
        'propertywatcher',
      ]);
    }
  });

  // Mousemove for hover inspection (throttled to rAF)
  let pendingMouseMove = false;
  let lastMouseEvent: MouseEvent | null = null;
  window.addEventListener('mousemove', (e: MouseEvent) => {
    lastMouseEvent = e;
    if (!pendingMouseMove) {
      pendingMouseMove = true;
      requestAnimationFrame(() => {
        pendingMouseMove = false;
        if (lastMouseEvent) updateOverlayForEvent(lastMouseEvent);
      });
    }
  });

  // 1s interval for sidebar and method spy updates
  setInterval(() => {
    updateSidebar();

    if (isMethodSpyVisible()) {
      updateMethodSpyList();
    }
  }, 1000);
}

// Register DevTools control-plane handlers EARLY (before polling/init)
// so the panel can sync feature state even while waiting for UT classes.
onMessage(MessageType.TOGGLE_FEATURE, (payload: any) => {
  if (payload && payload.feature) {
    toggleFeature(payload.feature as FeatureKey);
    sendMessage(MessageType.FEATURE_STATES, getFeatures());
  }
});

onMessage(MessageType.GET_FEATURE_STATES, () => {
  sendMessage(MessageType.FEATURE_STATES, getFeatures());
});

onMessage(MessageType.GET_PERF_DATA, () => {
  const snapshot = Array.from(getStats().values()).map((s) => ({
    className: s.className,
    methodName: s.methodName,
    callCount: s.callCount,
    totalMs: s.totalMs,
    avgMs: s.avgMs,
    minMs: s.minMs,
    maxMs: s.maxMs,
    p95Ms: s.p95Ms,
  }));
  sendMessage(MessageType.PERF_DATA, snapshot);
});

onMessage(MessageType.GET_NAV_EVENTS, () => {
  const events = getNavEvents(500);
  // Send each event individually so panel's NAV_EVENT handler can process them
  events.forEach((evt) => sendMessage(MessageType.NAV_EVENT, evt));
});

onMessage(MessageType.SNAPSHOT_REQUEST, () => {
  const snap = takeSnapshot();
  sendMessage(MessageType.SNAPSHOT_DATA, snap);
});

/**
 * Main initialization function
 */
function init(): void {
  activateDomHook(); // DOM ownership tracking
  hookAllUTClasses(); // UT class discovery and method wrapping
  initEventHooks(); // Event listener tracking
  initRulesEngine(); // Conditional logging rules engine
  initPerfProfiler(); // Performance profiler
  initNavTracker(); // Navigation/routing timeline tracker
  initPropertyWatcher(); // Property watcher for object change tracking
  initNetworkInterceptor(); // Network/API monitor (fetch + XHR)
  installFUTDBG(); // Install window.FUTDBG console API

  setupDebugOverlay(); // UI setup
  console.log('[UTDebug] Ready. Press Ctrl+Shift+U to toggle.');
}

// Polling initialization: wait for UT classes to be available
const start = Date.now();
const maxMs = 60000; // 60 seconds timeout

const interval = setInterval(() => {
  // Check if UT classes are available on window
  if (
    typeof (window as any).UTRootView !== 'undefined' ||
    typeof (window as any).UTPlayerItemView !== 'undefined'
  ) {
    clearInterval(interval);
    init();
  } else if (Date.now() - start > maxMs) {
    // Timeout: fall back to DOM hook only
    clearInterval(interval);
    console.warn(
      '[UTDebug] Timed out waiting for UT classes, starting with DOM hook only',
    );
    activateDomHook();
    setupDebugOverlay();
  }
}, 500); // Poll every 500ms
