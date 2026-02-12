# FUT UT View Debug Overlay

Chrome extension (Manifest V3) for real-time debugging of EA FC Ultimate Team web app. It hooks into the app's internal `UT*` class architecture to expose views, controllers, viewmodels, method calls, and DOM ownership — all from an in-browser overlay.

Built for developers and reverse engineers who need to understand how the FUT web app is structured at runtime.

> **v1.0.0** (Converted from v0.8 Tampermonkey script) — [Changelog](#changelog)

## Quick Start

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer mode** in the top right corner
3. Click **Load unpacked**
4. Select the `dist/` folder of this project
5. Open the FUT Web App at [ea.com/ea-sports-fc/ultimate-team/web-app](https://www.ea.com/ea-sports-fc/ultimate-team/web-app)
6. Press **Ctrl+Shift+U** to toggle the overlay on

## Features

### Hover Inspection
Hover over any element to see a tooltip showing:
- The **UT\* class stack** responsible for that DOM node (walked up from the element through its ancestors)
- The **`createdBy`** attribution — which UT class inserted this element into the DOM
- **Item data** — if the element is rendering a FUT player item, shows key fields (`definitionId`, `rating`, `name`, `position`, etc.)
- **Button detection** — identifies `<button>` elements, `role="button"`, or elements with `btn`/`button` CSS classes, showing label and disabled state

A **dashed blue highlight box** appears around the hovered element, and a **badge** is pinned to its top-left corner with the primary class name.

### Sidebar Panel
A 280px panel fixed to the right side of the screen, showing three sections:

- **Views / Nodes** — all tracked DOM elements with their UT class associations, item snippets, `createdBy` info, and control metadata. Click any row to **scroll to and flash-highlight** that element on the page.
- **View Controllers** — all instantiated `*ViewController` classes, grouped by name with instance counts
- **View Models** — all instantiated `*ViewModel` classes, grouped by name with instance counts

All sections support **text filtering** by class name, createdBy, label, or item data.

The sidebar **auto-prunes every 1 second**, removing entries for elements that are no longer in the DOM or have zero dimensions.

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

### Event Listener Tracking
Wraps `EventTarget.prototype.addEventListener` to record which `UT*` classes attach event listeners to DOM elements. Elements are tagged with `data-ut-events` attributes (e.g. `click@UTPlayerItemView`).

### DOM Ownership Tracking
Patches `Node.prototype.appendChild`, `insertBefore`, and `replaceChild`, plus a `MutationObserver`, to capture stack traces when elements are added to the DOM. Elements are tagged with `data-ut-created-by` attributes identifying which `UT*` class inserted them.

New `UT*` classes discovered in these stack traces are **dynamically hooked on-the-fly** — not just those found during the initial scan.

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+Shift+U` | Toggle the entire debug overlay on/off |
| `Ctrl+Shift+Y` | Toggle the Class Inspector window |
| `Ctrl+Shift+H` | Toggle the Method Spy window |

These are the only keyboard shortcuts. All other interaction is via mouse (hover, click sidebar rows, drag windows, type in filter inputs).

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
├── types/
│   └── index.ts          # 7 interfaces + global Window/Element extensions
├── core/
│   ├── registry.ts       # Typed collections (views, controllers, viewModels, classes, etc.)
│   ├── state.ts           # Shared state (debug flags, UI element references)
│   ├── helpers.ts         # 13 utility functions
│   ├── ut-class-hooks.ts  # UT class discovery and prototype wrapping
│   ├── dom-hooks.ts       # DOM insertion patching + MutationObserver
│   └── event-hooks.ts     # EventTarget.addEventListener tracking
├── ui/
│   ├── overlay.ts         # Tooltip, highlight box, badge, toggleDebug
│   ├── sidebar.ts         # Views/Controllers/ViewModels panel
│   ├── class-inspector.ts # Class browser with method listing
│   ├── method-spy.ts      # Real-time method call logger
│   └── drag.ts            # Draggable window support
├── styles/
│   └── overlay.css        # 287 lines, 36 CSS classes
└── index.ts               # Entry point with polling init + keyboard shortcuts

extension/
├── manifest.json          # Manifest V3 configuration
└── contentscript.js       # Injects bundle + CSS into page context (MAIN world)
```

### Build Commands
- `npm run build` — Production build via Vite
- `npm run dev` — Watch mode for development
- `npm run typecheck` — TypeScript strict mode check
- `npm run lint` — ESLint with airbnb-typescript rules

### Architecture Overview
The project uses a Vite IIFE build. The `contentscript.js` runs at `document_idle` in the **ISOLATED** world and injects the following into the **MAIN** world:
1. A `<script>` tag pointing to `js/main.js` (has access to page's window object and `UT*` globals)
2. A `<link>` tag pointing to `fut-debug-overlay.css`

## How It Works

### Initialization
The content script runs at `document_idle` and then **polls every 500ms** for up to 60 seconds, waiting for `UTRootView` or `UTPlayerItemView` to exist on the `window` object. Once detected, full initialization proceeds. If the timeout is reached without finding UT classes, the extension **falls back to DOM hook mode only** — hover inspection and DOM tracking will work, but class/controller/viewmodel discovery and method spying will not.

### Hook Architecture
1. **DOM hooks** — patches `Node.prototype.appendChild`/`insertBefore`/`replaceChild` and sets up a `MutationObserver` to capture stack traces on every DOM insertion, tagging elements with `data-ut-created-by`
2. **Class discovery** — scans `window` for all globals matching `/^UT[A-Z].+/` and wraps their `rootElement()` and `renderItem()` prototype methods to track DOM element ownership
3. **Dynamic hooking** — when DOM mutations reveal new `UT*` class names in stack traces that weren't found during the initial scan, they are hooked on-the-fly
4. **Constructor wrapping** — classes ending in `ViewController` or `ViewModel` get their constructors wrapped to track instantiation
5. **Method spy wrappers** — every prototype and static method on `UT*` classes is wrapped to log calls (recording is gated on the Method Spy window being open)
6. **Event listener hook** — wraps `EventTarget.prototype.addEventListener` to track which UT classes attach handlers to DOM elements

### View Pruning
Every 1 second, the sidebar scans all tracked view records and removes entries whose DOM elements are either:
- No longer in `document.body`
- Have zero width or height (hidden/collapsed)

## Compatibility

| | |
|---|---|
| **Intended for** | EA FC Ultimate Team Web App |
| **Tested URL** | `https://www.ea.com/ea-sports-fc/ultimate-team/web-app` |
| **Match patterns** | `https://www.ea.com/*`, `https://www.easports.com/*` |
| **Runs at** | `document_idle` |
| **Platform** | Chrome/Chromium (Manifest V3) |

## Known Limitations

- **Pre-existing DOM elements**: Elements inserted before the extension's hooks activate (during initial page load before `document_idle`) may not have `createdBy` attribution
- **Event listener gaps**: Only captures `addEventListener` calls made *after* the hook is installed. Cannot detect inline `onclick=` handlers, listeners attached before the extension runs, or `removeEventListener` calls
- **Stack trace attribution is best-effort**: If a UT class calls through several layers of indirection, the first `UT*` name found in the stack trace is used — this may not always be the most semantically meaningful class
- **EA updates can break this**: The extension depends on the FUT web app exposing `UT*` globals on `window`. If EA changes their bundling, naming, or architecture, features may stop working
- **No persistence**: All data is in-memory and lost on page refresh

## Performance Notes

- **Method wrapping overhead**: Every `UT*` prototype and static method is wrapped. The wrapper is lightweight (records only when Method Spy is open), but the sheer number of wrapped functions adds baseline cost
- **DOM patching**: `appendChild`/`insertBefore`/`replaceChild` and the `MutationObserver` run stack trace extraction on every DOM insertion. On pages with heavy DOM churn, this can add latency
- **Sidebar refresh**: Runs every 1 second, walking all tracked view records. Typically fast, but can accumulate if thousands of elements are tracked
- **Method Spy memory**: Retains up to 50,000 call records. If you leave it open for extended sessions, memory usage will grow. Close the Method Spy when not actively debugging to prevent recording

**Tip**: Keep the Method Spy and Class Inspector closed when not needed. The overlay itself (hover tooltip + sidebar) is the lightest mode.

## Privacy & Safety

- **All data stays local** — nothing is sent to any server. The extension operates entirely within your browser
- **Be careful sharing screenshots** — the Method Spy may display method arguments that contain session tokens, player IDs, or other sensitive data
- **Not affiliated with EA** — this is an independent debugging tool. It is not endorsed by, sponsored by, or associated with Electronic Arts in any way
- **Use at your own risk** — this extension hooks into the FUT web app's internals in ways that may violate EA's Terms of Service. The author is not responsible for any consequences of its use
- **For educational and debugging purposes only**

## Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| Nothing happens when I press Ctrl+Shift+U | Extension hasn't loaded or UT classes not found yet | Open browser console (F12) and look for `[UTDebug]` messages. Wait for "Ready" log |
| "Timed out waiting for UT classes" in console | Page loaded but no `UT*` globals found on `window` | Make sure you're on the FUT Web App, not a different EA page. Try refreshing |
| Method Spy shows no calls | Method Spy window is closed | Open it with Ctrl+Shift+H — calls are only recorded while the window is visible |
| Sidebar entries keep disappearing | View pruning removes elements no longer in DOM | This is expected. Elements that are removed/hidden are pruned every second |
| Page feels slow with overlay on | DOM patching + method wrappers add overhead | Close Method Spy and Class Inspector. If still slow, toggle overlay off (Ctrl+Shift+U) |
| Extension stopped working after EA update | EA changed class names or architecture | Check console for errors. The extension depends on `UT*` globals existing on `window` |
| Extension shows errors in chrome://extensions | Build issue or manifest error | Run `npm run build` and reload extension |

## Contributing

Bug reports and pull requests are welcome. When reporting issues, please include:
- Chrome version and extension version
- The exact URL you were on
- Whether `[UTDebug] Ready` appeared in the console
- Any console errors
- Steps to reproduce + screenshot if possible

## Changelog

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

