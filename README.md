# FUT UT View Debug Overlay

Chrome extension (Manifest V3) for real-time debugging of EA FC Ultimate Team web app. It hooks into the app's internal `UT*` class architecture to expose views, controllers, viewmodels, method calls, network activity, and DOM ownership — from an in-browser overlay, a browser console API, and a dedicated DevTools panel.

Built for developers and reverse engineers who need to understand how the FUT web app is structured at runtime.

> **v2.0.0** (Feature Expansion & Architecture Hardening) — [Changelog](#changelog)

## Quick Start

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer mode** in the top right corner
3. Click **Load unpacked**
4. Select the `dist/` folder of this project
5. Open the FUT Web App at [ea.com/ea-sports-fc/ultimate-team/web-app](https://www.ea.com/ea-sports-fc/ultimate-team/web-app)
6. Press **Ctrl+Shift+U** to toggle the overlay on
7. Open DevTools (**F12**) and select the **"FUT Debug"** tab for the advanced panel

## Features

### Hover Inspection

Hover over any element to see a tooltip showing:

- The **UT\* class stack** responsible for that DOM node (walked up from the element through its ancestors)
- The **`createdBy`** attribution — which UT class inserted this element into the DOM
- **Item data** — if the element is rendering a FUT player item, shows key fields (`definitionId`, `rating`, `name`, `position`, etc.)
- **Button detection** — identifies `<button>` elements, `role="button"`, or elements with `btn`/`button` CSS classes, showing label and disabled state

A **dashed blue highlight box** appears around the hovered element, and a **badge** is pinned to its top-left corner with the primary class name. All visual elements render inside a **closed Shadow DOM** to prevent CSS collisions with the FUT webapp.

### Sidebar Panel

A 280px panel fixed to the right side of the screen, showing three sections:

- **Views / Nodes** — all tracked DOM elements with their UT class associations, item snippets, `createdBy` info, and control metadata. Click any row to **scroll to and flash-highlight** that element on the page.
- **View Controllers** — all instantiated `*ViewController` classes with clickable instances for inspection
- **View Models** — all instantiated `*ViewModel` classes with clickable instances for inspection

All sections support **text filtering** by class name, createdBy, label, or item data. The sidebar **auto-prunes every 1 second**, removing entries for elements that are no longer in the DOM or have zero dimensions.

### Class Inspector

A draggable, filterable window that lists every registered `UT*` class with:

- **Prototype methods** — with full function signatures (parameter names extracted from source)
- **Static methods** — same treatment

Select a class on the left to see its methods on the right.

### Method Spy

A draggable, filterable window that logs `UT*` method calls in real time:

- Shows **timestamp, class, method name, argument count, return value** (or thrown error)
- Click any call to see **full details**: all argument previews, return value preview, static/instance indicator
- Arguments that look like FUT player items are tagged with `[ITEM]`
- Calls are displayed **newest-first**
- Retains up to **50,000 calls** before oldest entries are discarded

**Important**: The Method Spy **only records calls while the Method Spy window is open**. This is a deliberate performance optimization — when closed, the spy wrappers short-circuit immediately.

### Console API (`window.FUTDBG`)

A global namespace exposing every internal system for programmatic use from the browser console. Supports class discovery, method call queries, conditional logging rules, feature toggles, performance stats, navigation history, property watching, network inspection, and snapshot management. All returned data are copies — never live references. See the [Console API Reference](#console-api-reference) for the full command list.

### Conditional Logging / Rules Engine

Define rules to filter the Method Spy output and trigger actions on matching calls. Rules support:

- **Glob patterns** for class and method names (e.g., `UTTransferMarket*`, `render*`, `on*`)
- **Argument content matching** via substring search across serialized arguments
- **Three actions**: `log` (grouped console output), `debugger` (pauses execution if DevTools is open), `highlight` (flashes the associated DOM element)
- **AND logic**: all specified criteria must match for a rule to trigger
- Up to **20 rules** active simultaneously

```
FUTDBG.addRule({ className: 'UTPlayer*', methodName: 'render*', action: 'log' })
FUTDBG.addRule({ methodName: 'onSubmit*', action: 'debugger' })
FUTDBG.addRule({ argContains: 'definitionId', action: 'log' })
```

### Per-Feature Toggle System

Every monitoring feature can be independently enabled or disabled at runtime via `FUTDBG.toggle(feature)`. Disabled features add **zero overhead** — hooks short-circuit before any recording or computation.

Available features: `overlay`, `sidebar`, `classinspector`, `methodspy`, `network`, `conditionallog`, `perfprofiler`, `navtimeline`, `propertywatcher`

```
FUTDBG.toggle('network')        // -> true (enabled)
FUTDBG.toggle('network')        // -> false (disabled)
FUTDBG.features()               // -> { overlay: true, sidebar: true, network: false, ... }
```

### Performance Profiler

Tracks method execution time for every wrapped `UT*` method. Records call count, total/average/min/max/p95 durations per method. After 1,000 calls to a single method, switches to **1-in-10 sampling** to reduce overhead on hot paths.

```
FUTDBG.perf()                        // Top 20 methods by total time
FUTDBG.perf('UTPlayerItemView')      // All stats for matching classes
```

Output columns: Class, Method, Calls, Total (ms), Avg (ms), Min (ms), Max (ms), P95 (ms).

### Navigation/Routing Timeline

Hooks `history.pushState`, `history.replaceState`, `popstate`, and `hashchange` to build a chronological timeline of SPA navigation events. Each event records:

- Timestamp, event type, from/to URLs
- The `UT*` router class that triggered it (if detectable)
- A snapshot of all active controllers and view models at that moment

```
FUTDBG.nav()                         // Last 50 navigation events
```

Retains up to **500 events** before oldest are discarded.

### Property Watcher

Observe value changes on any object property using a dual-strategy approach:

- **Configurable properties**: uses `Object.defineProperty` getter/setter traps for immediate notification on every write
- **Non-configurable properties**: falls back to **periodic dirty-checking** every 500ms

Up to **50 simultaneous watches**. Change history bounded to 1,000 entries per session.

```
FUTDBG.watch(someInstance, 'rating')  // -> 'watch-1'
FUTDBG.watch(someInstance, 'name')    // -> 'watch-2'
FUTDBG.watches()                      // -> [{ id: 'watch-1', path: 'rating', strategy: 'defineProperty' }, ...]
FUTDBG.unwatch('watch-1')             // -> true
```

### Instance/Property Inspector

A draggable window for exploring `UT*` object instances. Shows:

- **Own properties** with type, value preview, and a "Watch" button (eye icon) for each property
- **Prototype chain** displayed as breadcrumbs at the top
- **Safe getter handling** — getters show `[getter]` placeholder and can be invoked on-demand by clicking
- **Depth-1 limit** — nested objects show a summary, not a recursive tree

Open from the sidebar (click a controller/viewmodel instance) or from the console:

```
FUTDBG.inspect(someInstance)
```

### Network/API Monitor

Intercepts `fetch` and `XMLHttpRequest` to capture all HTTP activity. For each request:

- **URL, method, status code, duration, response size**
- **UT\* class correlation** — identifies which class and method initiated the request via stack trace analysis
- **Safe header capture** — records content-type, accept, user-agent; redacts authorization headers
- **Correlation IDs** for tracking request lifecycles

Retains up to **5,000 requests** in a ring buffer.

```
FUTDBG.net()                         // Last 50 requests
FUTDBG.net('/ut/game/fc25')          // Filter by URL substring
```

### Export/Snapshot + Diff

Capture the full class signature of every registered `UT*` class (name, prototype methods, static methods) as a snapshot. Snapshots are persisted to `chrome.storage.local` (max 5 stored, FIFO eviction). Use diffing to detect changes after EA updates.

```
FUTDBG.snapshot()                    // Capture and save current state
FUTDBG.snapshots()                   // List all saved snapshots
FUTDBG.diff()                        // Compare most recent vs previous
FUTDBG.export()                      // Print latest as JSON for external use
```

Diff output shows added classes, removed classes, and changed classes (with specific added/removed methods).

### DevTools Panel

A dedicated Chrome DevTools panel (**F12 -> "FUT Debug"** tab) with 5 specialized tabs for data-heavy views that don't fit in the lightweight in-page overlay:

- **Method Spy** — sortable table with filter, click any row for full argument/result details
- **Network** — sortable request table with URL/status filter, click for headers and metadata
- **Performance** — method stats table sortable by any metric (calls, total, avg, min, max, p95)
- **Navigation** — chronological timeline with controller/viewModel snapshots at each event
- **Snapshots** — list of saved snapshots with "Take Snapshot" and "Diff" buttons

The panel connects to the in-page extension via a message bridge through the background service worker. Data is batched (500ms) and rendered via `requestAnimationFrame` to prevent UI freezing under high-volume method calls.

### Event Listener Tracking

Wraps `EventTarget.prototype.addEventListener` to record which `UT*` classes attach event listeners to DOM elements. Elements are tagged with `data-ut-events` attributes (e.g. `click@UTPlayerItemView`).

### DOM Ownership Tracking

Patches `Node.prototype.appendChild`, `insertBefore`, and `replaceChild`, plus a `MutationObserver`, to capture stack traces when elements are added to the DOM. Elements are tagged with `data-ut-created-by` attributes identifying which `UT*` class inserted them.

New `UT*` classes discovered in these stack traces are **dynamically hooked on-the-fly** — not just those found during the initial scan.

## Keyboard Shortcuts

| Shortcut       | Action                                             |
| -------------- | -------------------------------------------------- |
| `Ctrl+Shift+U` | Toggle the entire debug overlay on/off             |
| `Ctrl+Shift+Y` | Toggle the Class Inspector window                  |
| `Ctrl+Shift+H` | Toggle the Method Spy window                       |
| `Ctrl+Shift+T` | Log feature toggle instructions and current states |

## Console API Reference

All commands are available on `window.FUTDBG` after the extension initializes. All returned data are copies — mutations do not affect internal state.

| Command                        | Return Type               | Description                                                                                     |
| ------------------------------ | ------------------------- | ----------------------------------------------------------------------------------------------- |
| `FUTDBG.classes()`             | `string[]`                | List all registered UT\* class names, sorted alphabetically                                     |
| `FUTDBG.find(className)`       | `ClassInfo \| null`       | Get class constructor, prototype methods, and static methods                                    |
| `FUTDBG.views()`               | `ViewSummary[]`           | List all tracked views with element metadata (no live DOM refs)                                 |
| `FUTDBG.calls(filter?)`        | `MethodCall[]`            | Query method calls, newest first (max 100). Optional substring filter on `className.methodName` |
| `FUTDBG.addRule(rule)`         | `string`                  | Add conditional logging rule (max 20). Returns rule ID                                          |
| `FUTDBG.removeRule(id)`        | `boolean`                 | Remove rule by ID. Returns true if found                                                        |
| `FUTDBG.rules()`               | `Rule[]`                  | List all active conditional logging rules                                                       |
| `FUTDBG.toggle(feature)`       | `boolean`                 | Toggle a feature on/off. Returns new state                                                      |
| `FUTDBG.features()`            | `Record<string, boolean>` | Get all feature keys and their current enabled/disabled states                                  |
| `FUTDBG.perf(className?)`      | `void`                    | Print method timing stats. No args = top 20 by total time. With className = filter              |
| `FUTDBG.nav()`                 | `void`                    | Print last 50 navigation events with timestamps, types, URLs                                    |
| `FUTDBG.watch(instance, prop)` | `string`                  | Watch a property for changes. Returns watch ID                                                  |
| `FUTDBG.unwatch(watchId)`      | `boolean`                 | Stop watching a property. Returns true if found                                                 |
| `FUTDBG.watches()`             | `WatchEntry[]`            | List all active property watches with ID, path, and strategy                                    |
| `FUTDBG.inspect(instance)`     | `void`                    | Open the Instance Inspector window for the given object                                         |
| `FUTDBG.net(filter?)`          | `NetworkRequest[]`        | Print and return last 50 network requests. Optional URL substring filter                        |
| `FUTDBG.snapshot()`            | `void`                    | Take a snapshot of all class signatures and save to chrome.storage                              |
| `FUTDBG.snapshots()`           | `Snapshot[]`              | List all saved snapshots with timestamps and class counts                                       |
| `FUTDBG.diff()`                | `void`                    | Diff the most recent snapshot against the previous one                                          |
| `FUTDBG.export()`              | `void`                    | Print the most recent snapshot as pretty-printed JSON                                           |
| `FUTDBG.registry`              | `Registry`                | Direct access to the raw internal registry (power users)                                        |
| `FUTDBG.help()`                | `string`                  | Print all available commands with examples                                                      |

## Installation

### Requirements

- Chrome or Chromium-based browser
- Node.js 18+ (only if building from source)

### Option A: Use Built Version

1. Download the latest release
2. Navigate to `chrome://extensions` and enable **Developer mode**
3. Click **Load unpacked** and select the `dist/` directory

### Option B: Build from Source

1. Clone the repository: `git clone https://github.com/tomolom/fut-debug-overlay.git`
2. Install dependencies: `npm install`
3. Build the project: `npm run build`
4. Load the `dist/` folder as an unpacked extension in Chrome

## Development

### Project Structure

```
src/
├── api/
│   └── futdbg.ts              # window.FUTDBG console API (20+ commands)
├── types/
│   └── index.ts               # Shared interfaces + global Window/Element extensions
├── core/
│   ├── originals.ts           # First-write-wins registry for unpatched references
│   ├── hook-dispatcher.ts     # Pub/sub multiplexer for shared hooks
│   ├── store.ts               # Typed reactive state store with subscriptions
│   ├── ui-refs.ts             # UI element reference management
│   ├── registry.ts            # Typed collections (views, controllers, classes, etc.)
│   ├── state.ts               # Backwards-compatible facade over store.ts
│   ├── helpers.ts             # Utility functions
│   ├── ring-buffer.ts         # Fixed-size circular buffer for logs
│   ├── serializer.ts          # Safe cross-context object serialization
│   ├── message-bridge.ts      # MAIN world side of the message bridge
│   ├── rules-engine.ts        # Conditional logging rule matching
│   ├── feature-toggles.ts     # Runtime per-feature enable/disable
│   ├── perf-profiler.ts       # Method timing, stats aggregation, sampling
│   ├── nav-tracker.ts         # History API + hash change tracking
│   ├── property-watcher.ts    # defineProperty + periodic diff watchers
│   ├── network-interceptor.ts # fetch + XHR interception with UT* correlation
│   ├── snapshot.ts            # Class signature capture, storage, diffing
│   ├── ut-class-hooks.ts      # UT* class discovery and prototype wrapping
│   ├── dom-hooks.ts           # DOM insertion patching + MutationObserver
│   └── event-hooks.ts         # EventTarget.addEventListener tracking
├── ui/
│   ├── shadow-host.ts         # Closed Shadow DOM root management
│   ├── overlay.ts             # Tooltip, highlight box, badge
│   ├── sidebar.ts             # Views/Controllers/ViewModels panel
│   ├── class-inspector.ts     # Class browser with method listing
│   ├── method-spy.ts          # Real-time method call logger
│   ├── instance-inspector.ts  # Object property browser with safe getters
│   └── drag.ts                # Draggable window support
├── devtools/
│   ├── devtools.ts            # DevTools page entry point
│   ├── panel.ts               # 5-tab DevTools panel
│   ├── panel.html             # Panel HTML structure
│   └── chrome.d.ts            # Chrome DevTools API type declarations
├── styles/
│   ├── overlay.css            # In-page overlay styles (injected into Shadow DOM)
│   └── devtools.css           # DevTools panel styles (dark theme)
└── index.ts                   # Entry point with polling init + keyboard shortcuts

extension/
├── manifest.json              # Manifest V3 configuration
├── contentscript.js           # Injects bundle into MAIN world
├── contentscript-bridge.js    # ISOLATED world bridge for message passing
├── background.js              # Service worker for DevTools message relay
└── devtools.html              # DevTools extension page (creates panel)
```

### Build Commands

- `npm run build` — Production build via Vite (outputs `dist/js/main.js`, `dist/panel.js`, `dist/devtools.js`)
- `npm run dev` — Watch mode for development
- `npm run test` — Run test suite (337 tests across 16 suites)
- `npm run typecheck` — TypeScript strict mode check
- `npm run lint` — ESLint with airbnb-typescript rules

### Architecture Overview

The project uses a **multi-entry Vite build** producing three bundles:

- `dist/js/main.js` (117 KB) — injected into the page's MAIN world
- `dist/panel.js` (15 KB) — loaded by the DevTools panel
- `dist/devtools.js` (0.1 KB) — DevTools page entry that creates the panel

All in-page UI (overlay, sidebar, inspectors) renders inside a **closed Shadow DOM** root, preventing CSS collisions between the extension and the FUT webapp.

**Message bridge architecture** (4 layers):

```
MAIN world (main.js)
  <-> window.postMessage
Content Script (contentscript-bridge.js, ISOLATED world)
  <-> chrome.runtime.connect (port)
Background Service Worker (background.js)
  <-> chrome.runtime.connect (port)
DevTools Panel (panel.js)
```

Messages are batched every 500ms in the MAIN world before sending. The background worker relays messages between content scripts and DevTools by tab ID.

**Hook dispatcher** — a central pub/sub multiplexer. When a `UT*` method is called, the spy wrapper fires a single `method:call` event through the dispatcher. Multiple subscribers (Method Spy, Performance Profiler, Rules Engine) receive the event without requiring separate monkey-patches.

**Originals registry** — stores unpatched references to `Node.prototype.appendChild`, `window.fetch`, `EventTarget.prototype.addEventListener`, etc. before any wrapping occurs. Uses a first-write-wins pattern to handle extension reloads safely.

## How It Works

### Initialization

The content script runs at `document_idle` and then **polls every 500ms** for up to 60 seconds, waiting for `UTRootView` or `UTPlayerItemView` to exist on the `window` object. Once detected, full initialization proceeds:

1. Originals registry stores unpatched references
2. Hook dispatcher is created
3. DOM, event, and UT class hooks are installed
4. Shadow DOM root is created for UI
5. Feature modules initialize (rules engine, profiler, nav tracker, network interceptor, property watcher)
6. `window.FUTDBG` console API is installed
7. Message bridge connects to the content script
8. UI is rendered inside the Shadow DOM

If the timeout is reached without finding UT classes, the extension **falls back to DOM hook mode only** — hover inspection and DOM tracking will work, but class/controller/viewmodel discovery and method spying will not.

### Hook Architecture

1. **DOM hooks** — patches `Node.prototype.appendChild`/`insertBefore`/`replaceChild` and sets up a `MutationObserver` to capture stack traces on every DOM insertion, tagging elements with `data-ut-created-by`. Shadow DOM mutations are filtered out.
2. **Class discovery** — scans `window` for all globals matching `/^UT[A-Z].+/` and wraps their prototype methods to track DOM element ownership
3. **Dynamic hooking** — when DOM mutations reveal new `UT*` class names in stack traces that weren't found during the initial scan, they are hooked on-the-fly
4. **Constructor wrapping** — classes ending in `ViewController` or `ViewModel` get their constructors wrapped to track instantiation
5. **Method spy wrappers** — every prototype and static method on `UT*` classes is wrapped. The wrapper measures timing (for profiler), fires through the hook dispatcher (for spy, rules, profiler), and records calls
6. **Event listener hook** — wraps `EventTarget.prototype.addEventListener` to track which UT classes attach handlers to DOM elements
7. **Network hooks** — wraps `window.fetch` and `XMLHttpRequest.prototype.open/send` to capture HTTP requests with UT class correlation
8. **Navigation hooks** — wraps `history.pushState/replaceState` and listens to `popstate`/`hashchange` for SPA routing events
9. **Property watchers** — uses `Object.defineProperty` getter/setter traps or periodic polling to observe value changes on watched properties

All hooks are idempotent (checked via `__utPatched` flags) and wrapped in try/catch to ensure hook failures never break the FUT app.

### View Pruning

Every 1 second, the sidebar scans all tracked view records and removes entries whose DOM elements are either:

- No longer in `document.body`
- Have zero width or height (hidden/collapsed)

## Compatibility

|                    |                                                         |
| ------------------ | ------------------------------------------------------- |
| **Intended for**   | EA FC Ultimate Team Web App                             |
| **Tested URL**     | `https://www.ea.com/ea-sports-fc/ultimate-team/web-app` |
| **Match patterns** | `https://www.ea.com/*`, `https://www.easports.com/*`    |
| **Runs at**        | `document_idle`                                         |
| **Platform**       | Chrome/Chromium (Manifest V3)                           |

## Known Limitations

- **Pre-existing DOM elements**: Elements inserted before the extension's hooks activate (during initial page load before `document_idle`) may not have `createdBy` attribution
- **Event listener gaps**: Only captures `addEventListener` calls made _after_ the hook is installed. Cannot detect inline `onclick=` handlers, listeners attached before the extension runs, or `removeEventListener` calls
- **Stack trace attribution is best-effort**: If a UT class calls through several layers of indirection, the first `UT*` name found in the stack trace is used — this may not always be the most semantically meaningful class
- **EA updates can break this**: The extension depends on the FUT web app exposing `UT*` globals on `window`. If EA changes their bundling, naming, or architecture, features may stop working
- **No request/response body viewing**: The Network Monitor captures URLs, headers, status, and timing only — request and response bodies are not recorded
- **No WebSocket interception**: Only `fetch` and `XMLHttpRequest` are intercepted; WebSocket, EventSource, and Service Worker requests are not captured
- **Inspector depth limit**: The Instance Inspector shows properties at depth 1 only — nested objects display a summary, not a recursive tree
- **Snapshots capture signatures only**: Class name, prototype methods, and static methods are recorded. Method call history, instance data, and view state are not included
- **Max 5 snapshots stored**: Chrome storage enforces a FIFO limit of 5 snapshots. Older snapshots are automatically evicted

## Performance Notes

- **Method wrapping overhead**: Every `UT*` prototype and static method is wrapped. The wrapper is lightweight and routes through a single dispatcher, minimizing stack depth
- **Profiler sampling**: After 1,000 calls to any single method, the profiler switches to 1-in-10 sampling to reduce timing overhead on hot paths
- **Network interception**: Adds negligible overhead per request (timing measurement + stack trace for UT class correlation)
- **Property watchers**: `Object.defineProperty` traps are high-performance. Periodic dirty-checking runs at 500ms intervals and only iterates active watches
- **DOM patching**: `appendChild`/`insertBefore`/`replaceChild` and the `MutationObserver` run stack trace extraction on every DOM insertion. On pages with heavy DOM churn, this can add latency
- **Sidebar refresh**: Runs every 1 second, walking all tracked view records. Typically fast, but can accumulate if thousands of elements are tracked
- **Method Spy memory**: Retains up to 50,000 call records. Network monitor retains up to 5,000. Close features when not actively debugging
- **Feature toggles**: Disabled features short-circuit at the earliest possible point, adding zero recording or computation overhead
- **DevTools panel**: Renders via `requestAnimationFrame` with 500ms batch throttling to prevent UI freezing under high-volume data

**Tip**: Use `FUTDBG.toggle()` to disable features you aren't using. The overlay itself (hover tooltip + sidebar) is the lightest mode.

## Privacy & Safety

- **All data stays local** — nothing is sent to any server. The extension operates entirely within your browser
- **Be careful sharing screenshots** — the Method Spy and Network Monitor may display method arguments, URLs, headers, or other data containing session tokens, player IDs, or sensitive information
- **Not affiliated with EA** — this is an independent debugging tool. It is not endorsed by, sponsored by, or associated with Electronic Arts in any way
- **Use at your own risk** — this extension hooks into the FUT web app's internals in ways that may violate EA's Terms of Service. The author is not responsible for any consequences of its use
- **For educational and debugging purposes only**

## Troubleshooting

| Problem                                       | Cause                                               | Fix                                                                                                                             |
| --------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Nothing happens when I press Ctrl+Shift+U     | Extension hasn't loaded or UT classes not found yet | Open browser console (F12) and look for `[UTDebug]` messages. Wait for "Ready" log                                              |
| "Timed out waiting for UT classes" in console | Page loaded but no `UT*` globals found on `window`  | Make sure you're on the FUT Web App, not a different EA page. Try refreshing                                                    |
| Method Spy shows no calls                     | Method Spy window is closed or feature disabled     | Open it with Ctrl+Shift+H. Check `FUTDBG.features()` to ensure `methodspy` is enabled                                           |
| DevTools "FUT Debug" tab is empty             | Message bridge disconnected                         | Close and reopen the DevTools panel. The bridge auto-reconnects on disconnect                                                   |
| Sidebar entries keep disappearing             | View pruning removes elements no longer in DOM      | This is expected. Elements that are removed/hidden are pruned every second                                                      |
| Page feels slow with overlay on               | Multiple features adding overhead                   | Disable features with `FUTDBG.toggle()`. Close Method Spy and Class Inspector. If still slow, toggle overlay off (Ctrl+Shift+U) |
| Extension stopped working after EA update     | EA changed class names or architecture              | Check console for errors. The extension depends on `UT*` globals existing on `window`                                           |
| Extension shows errors in chrome://extensions | Build issue or manifest error                       | Run `npm run build` and reload extension                                                                                        |
| Network Monitor shows no requests             | Feature disabled by default                         | Run `FUTDBG.toggle('network')` to enable it                                                                                     |
| Property watcher not detecting changes        | Non-configurable property using periodic diff       | Wait at least 500ms between changes. Check `FUTDBG.watches()` for the strategy being used                                       |

## Contributing

Bug reports and pull requests are welcome. When reporting issues, please include:

- Chrome version and extension version
- The exact URL you were on
- Whether `[UTDebug] Ready` appeared in the console
- Any console errors
- Steps to reproduce + screenshot if possible

## Changelog

### v2.0.0

**Architecture Hardening**

- Originals registry for safe storage and restoration of all patched globals/prototypes
- Hook dispatcher (pub/sub multiplexer) allowing multiple features to share the same hook
- Typed state store with subscriptions, replacing 199-line getter/setter module
- Shadow DOM isolation — all UI renders inside a closed shadow root
- Multi-entry Vite build producing separate bundles for main, DevTools page, and panel
- Background service worker for message relay between content scripts and DevTools
- Message bridge with 500ms batching for efficient cross-context communication

**New Features**

- Console API (`window.FUTDBG`) with 20+ commands for programmatic debugging
- Conditional Logging / Rules Engine with glob pattern matching and 3 action types
- Per-feature toggle system for 9 independently controllable features
- Performance Profiler with method timing, stats aggregation, and 1-in-10 sampling
- Navigation/Routing Timeline tracking pushState, replaceState, popstate, hashchange
- Property Watcher with dual strategy (defineProperty traps + periodic dirty-checking)
- Instance/Property Inspector with safe getter handling and depth-1 browsing
- Network/API Monitor intercepting fetch + XHR with UT\* class correlation
- Export/Snapshot + Diff for class signature persistence via chrome.storage
- DevTools Panel with 5 tabs (Method Spy, Network, Performance, Navigation, Snapshots)

**Stats**: 337 tests across 16 test suites. Zero runtime dependencies maintained.

### v1.0.0

- Converted from Tampermonkey userscript to Manifest V3 Chrome extension
- Full TypeScript modularization (~15 modules)
- Vite build pipeline with IIFE output
- Extracted CSS to standalone stylesheet
- Zero runtime dependencies

### v0.8

- DOM-aware view inspection with `createdBy` attribution
- Sidebar panel with Views/Nodes, Controllers, ViewModels sections
- Class Inspector with prototype and static method browsing
- Method Spy with real-time call logging and detail view
- Event listener tracking
- Dynamic UT class hooking via DOM mutation stack traces
- MutationObserver integration
- Draggable inspector windows
- Click-to-flash element location from sidebar

## License

[MIT](LICENSE)
