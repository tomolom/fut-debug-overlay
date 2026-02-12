/**
 * ViewRecord - Represents a tracked DOM element with its associated UT class metadata
 * Tracks element ownership, control info, and item data snippets
 */
export interface ViewRecord {
  /** The DOM element being tracked */
  element: Element;
  /** Set of UT class names associated with this element */
  classes: Set<string>;
  /** Snippet of item data if this element renders a FUT item (e.g., player card) */
  lastItemSnippet: string | null;
  /** Control metadata if this element is a button or interactive control */
  controlInfo: ControlInfo | null;
  /** Name of the UT class that inserted this element into the DOM */
  createdBy: string | null;
  /** Stack trace lines showing which UT classes were involved in DOM insertion */
  createdStack: string[] | null;
}

/**
 * DebugState - Shared reactive state for debug behavior and feature toggles
 */
export interface DebugState {
  /** Master toggle for debug overlay runtime behavior */
  debugEnabled: boolean;
  /** Feature visibility toggle for core overlay UI */
  overlayEnabled: boolean;
  /** Feature visibility toggle for sidebar panel */
  sidebarEnabled: boolean;
  /** Whether the Method Spy panel is currently visible */
  methodSpyVisible: boolean;
  /** Next monotonically increasing ID for method spy call records */
  methodSpyNextId: number;
  /** Whether method spy list requires re-render */
  methodSpyNeedsRefresh: boolean;
  /** Whether sidebar content is marked dirty and needs refresh */
  sidebarDirty: boolean;
  /** Whether class inspector window is currently visible */
  classWindowVisible: boolean;
  /** Selected class in class inspector */
  selectedClassName: string | null;
  /** Feature toggle for network monitor module */
  networkMonitorEnabled: boolean;
  /** Feature toggle for conditional logging module */
  conditionalLoggingEnabled: boolean;
  /** Feature toggle for performance profiler module */
  perfProfilerEnabled: boolean;
  /** Feature toggle for navigation timeline module */
  navTimelineEnabled: boolean;
  /** Feature toggle for property watcher module */
  propertyWatcherEnabled: boolean;
  /** Feature toggle for class inspector module */
  classInspectorEnabled: boolean;
  /** Feature toggle for method spy module */
  methodSpyEnabled: boolean;
}

/**
 * ControlInfo - Metadata for interactive controls (buttons, inputs, etc.)
 * Extracted from button elements and elements with button-like CSS classes
 */
export interface ControlInfo {
  /** Type of control: 'button', 'input', 'select', etc. */
  type: string;
  /** UT class name associated with this control */
  className: string;
  /** Human-readable label or text content */
  label: string;
  /** Whether the control is disabled */
  disabled: boolean;
  /** CSS class name that identifies this as a button/control */
  domClass: string;
}

/**
 * MethodCall - Record of a single UT class method invocation
 * Captured by the Method Spy when recording is active
 */
export interface MethodCall {
  /** Unique sequential ID for this call */
  id: number;
  /** Timestamp when the call was made (milliseconds since epoch) */
  ts: number;
  /** Name of the UT class (e.g., 'UTPlayerItemView') */
  className: string;
  /** Name of the method that was called */
  methodName: string;
  /** Whether this was a static method (true) or instance method (false) */
  isStatic: boolean;
  /** String previews of all arguments passed to the method */
  argPreviews: string[];
  /** String preview of the return value (empty if threw) */
  resultPreview: string;
  /** String preview of the error thrown (empty if didn't throw) */
  errorPreview: string;
  /** Whether the method threw an exception */
  threw: boolean;
}

/**
 * NetworkRequestRecord - Record of a network/API request captured by fetch/XHR hooks
 */
export interface NetworkRequestRecord {
  /** Unique sequential ID for this request */
  id: number;
  /** Timestamp when the request started (milliseconds since epoch) */
  ts: number;
  /** Request URL */
  url: string;
  /** HTTP method */
  method: string;
  /** HTTP status code (0 for network failures) */
  status: number;
  /** Request duration in milliseconds */
  durationMs: number;
  /** Estimated response size in bytes when available */
  size: number | null;
  /** Name of the UT class found in stack attribution */
  utClass: string | null;
  /** Name of the UT method found in stack attribution */
  utMethod: string | null;
  /** Correlates lifecycle events for the same request */
  correlationId: string;
}

/**
 * ClassInfo - Metadata about a registered UT class
 * Includes constructor reference and method signatures
 */
export interface ClassInfo {
  /** The constructor function for this UT class */
  ctor: { new (...args: unknown[]): unknown };
  /** Array of prototype method signatures (sorted) */
  protoMethods: string[];
  /** Array of static method signatures (sorted) */
  staticMethods: string[];
}

/**
 * ListenerEntry - Record of an event listener attached to a DOM element
 * Captured by wrapping EventTarget.prototype.addEventListener
 */
export interface ListenerEntry {
  /** Timestamp when the listener was attached */
  ts: number;
  /** Event type (e.g., 'click', 'change', 'input') */
  type: string;
  /** The listener function itself */
  listener: EventListener | ((this: Element, ev: Event) => unknown);
  /** The DOM element the listener was attached to */
  target: Element;
  /** CSS selector-like string describing the target element */
  selector: string;
  /** Name of the UT class that attached this listener (if found in stack) */
  createdBy: string | null;
  /** Full array of UT class names found in the attachment stack trace */
  utStack: string[];
}

/**
 * ControllerEntry - Record of an instantiated ViewController
 * Tracks all instances of classes ending in 'ViewController'
 */
export interface ControllerEntry {
  /** Name of the ViewController class */
  className: string;
  /** The actual instance of the controller */
  instance: unknown;
  /** Timestamp when this instance was created */
  createdAt: number;
}

/**
 * ViewModelEntry - Record of an instantiated ViewModel
 * Tracks all instances of classes ending in 'ViewModel'
 */
export interface ViewModelEntry {
  /** Name of the ViewModel class */
  className: string;
  /** The actual instance of the view model */
  instance: unknown;
  /** Timestamp when this instance was created */
  createdAt: number;
}

/**
 * Extend Window interface to allow arbitrary UT* class properties
 * Minimal approach: use index signature to avoid comprehensive type stubs
 */
declare global {
  interface Window {
    [key: string]: unknown;
  }
}

/**
 * Extend Element interface with UT debug tracking properties
 * These are set by the DOM hooks to track element ownership and metadata
 */
declare global {
  interface Element {
    /** Name of the UT class that created this element */
    __utCreatedBy?: string;
    /** Stack trace lines showing UT classes involved in creation */
    __utStack?: string[];
    /** Flag indicating this element has been hooked for debugging */
    __utDebugHooked?: boolean;
    /** Flag indicating this element's methods have been wrapped for spying */
    __utSpyWrapped?: boolean;
  }
}

export {};
