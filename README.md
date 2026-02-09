# FUT UT View Debug Overlay

A Tampermonkey userscript for inspecting and debugging the EA FC Ultimate Team web app's internal view architecture.

## Features

- **DOM-aware view inspection** — hover over any element to see which UT\* classes created it, along with view/controller/viewmodel info
- **Sidebar panel** — live list of all active UT views, controllers, and viewmodels on the current page, with filtering
- **Class Inspector** — browse all registered UT\* classes and their prototype/static methods
- **Method Spy** — real-time log of UT\* method calls with arguments, return values, and error tracking
- **Event listener tracking** — see which UT\* classes attached event listeners to DOM elements
- **DOM hook** — traces `appendChild`/`insertBefore`/`replaceChild` calls to tag elements with their UT\* creator

## Installation

1. Install [Tampermonkey](https://www.tampermonkey.net/) for your browser
2. Click the link below to install the userscript:

   **[Install FUT UT View Debug Overlay](../../raw/main/FUT%20UT%20View%20Debug%20Overlay%20(DOM-aware)-0.8.user.js)**

   Or manually create a new script in Tampermonkey and paste the contents of the `.user.js` file.

## Usage

| Shortcut | Action |
|---|---|
| `Ctrl+Shift+U` | Toggle the debug overlay on/off |
| `Ctrl+Shift+Y` | Toggle the Class Inspector window |
| `Ctrl+Shift+H` | Toggle the Method Spy window |

Once enabled:
- **Hover** over elements to see a tooltip with UT class info, item data, and creator stack
- **Sidebar** (right side) shows all live views — click a row to scroll to and flash-highlight that element
- **Filter** in the sidebar, Class Inspector, or Method Spy to narrow results

## How It Works

The script hooks into the UT webapp's global class constructors and prototype methods at runtime:

1. **DOM hooks** — patches `Node.prototype.appendChild/insertBefore/replaceChild` to capture stack traces and tag elements with `data-ut-created-by`
2. **Class discovery** — scans `window` for all `UT*` globals and wraps their `rootElement()` and `renderItem()` methods
3. **Method spy wrappers** — wraps every prototype and static method to log calls (only when the Method Spy window is open)
4. **Event listener hook** — wraps `EventTarget.prototype.addEventListener` to track which UT classes attach handlers

## Compatibility

- **Matches**: `https://www.ea.com/*`, `https://www.easports.com/*`
- **Runs at**: `document-idle`
- **Requires**: Tampermonkey (uses `unsafeWindow` and `GM_addStyle`)

## License

MIT
