# Convert FUT Debug Overlay: Tampermonkey to Chrome Extension

## TL;DR

> **Quick Summary**: Convert the 1,674-line Tampermonkey userscript into a Manifest V3 Chrome extension with TypeScript modularization, Vite build pipeline, and extracted CSS. Functionally identical — no new features, no behavior changes.
> 
> **Deliverables**:
> - Manifest V3 Chrome extension loadable via "Load unpacked"
> - TypeScript source modularized into ~15 files across 4 directories
> - Vite build pipeline producing IIFE bundle + CSS
> - ESLint + Prettier + strict TypeScript quality gates
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 2 waves
> **Critical Path**: Task 1 (scaffold) → Task 2 (types/registry) → Tasks 3,4,5 (parallel: hooks, UI, helpers) → Task 6 (entry + init) → Task 7 (build verification)

---

## Context

### Original Request
Convert the FUT UT View Debug Overlay Tampermonkey script into a Chrome extension that can be loaded unpacked, using TypeScript aligned with the fc-enhancer project.

### Interview Summary
**Key Discussions**:
- **Location**: Standalone in `C:\Users\tomol\WebstormProjects\fut-debug-overlay` (not in fc-enhancer monorepo)
- **Refactoring depth**: Full modularization — typed modules for registry, hooks, UI components, helpers
- **Build**: Vite (not Webpack like fc-enhancer) — user prefers modern/lighter tooling
- **CSS**: Extract to separate `.css` file (currently 290 lines embedded via GM_addStyle)
- **Testing**: No test runner — TypeScript strict mode + ESLint only
- **Extension model**: Manifest V3, following fc-enhancer's content script injection pattern

**Research Findings**:
- fc-enhancer uses `contentscript.js` that injects `<script>` tags for MAIN world access — same pattern needed here
- Script requires page-level `window` access for UT* globals, prototype patching, DOM API hooking
- No background service worker needed (zero background functionality in this debug tool)
- Vite must output **IIFE format** (single bundle, no code splitting) since the script runs via `<script>` injection into page context

### Metis Review
**Identified Gaps** (addressed):
- No background.js needed — omitted from manifest (unlike fc-enhancer which needs one for fetch proxying/alarms)
- IIFE output required — Vite config must use `build.lib` with `iife` format to produce a single non-module bundle
- Match patterns should stay broad (`ea.com/*`, `easports.com/*`) — the script is harmless on non-FUT pages (polls then falls back)
- contentscript.js should remain plain JS (not TypeScript) — it's 10 lines of `<script>` injection, no benefit from TS
- CSS injection via `<link>` tag from contentscript.js (not content_scripts CSS array) to avoid isolated world scoping issues

---

## Work Objectives

### Core Objective
Produce a working Chrome extension (Manifest V3, loadable unpacked) that replicates 100% of the Tampermonkey script's functionality, with the codebase modularized into typed TypeScript modules and built via Vite.

### Concrete Deliverables
- `dist/` folder loadable via `chrome://extensions` → "Load unpacked"
- `manifest.json` (Manifest V3)
- `extension/contentscript.js` (plain JS, injects bundle + CSS)
- `src/` with ~15 TypeScript modules across `types/`, `core/`, `ui/`, root
- `src/styles/overlay.css` extracted stylesheet
- `vite.config.ts` build configuration
- `tsconfig.json`, `.eslintrc`, `.prettierrc` quality configs
- `package.json` with build/dev scripts

### Definition of Done
- [ ] `npm run build` produces `dist/` with manifest.json, contentscript.js, js/main.js, css/overlay.css
- [ ] Extension loads in Chrome via "Load unpacked" without errors
- [ ] On EA FC web app: Ctrl+Shift+U toggles overlay, Ctrl+Shift+Y toggles Class Inspector, Ctrl+Shift+H toggles Method Spy
- [ ] Hover inspection shows UT class stack, createdBy, item data, button detection
- [ ] Sidebar shows Views/Nodes, Controllers, ViewModels with filtering
- [ ] Class Inspector shows prototype and static methods
- [ ] Method Spy logs calls in real-time when open
- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] `npx eslint src/` passes with zero errors

### Must Have
- 100% functional parity with the v0.8 Tampermonkey script
- MAIN world execution (UT* class access, prototype patching)
- All three keyboard shortcuts working
- Polling init (up to 60s for UT classes, fallback to DOM hook only)
- View pruning (1s interval)
- Method Spy performance gate (only records when window is open)

### Must NOT Have (Guardrails)
- **No new features** — this is a conversion, not an enhancement
- **No UT type definitions beyond what's needed** — do NOT create comprehensive UT* type stubs. Use `any` or minimal interfaces for the `window` globals. The UT classes are EA's internals and change unpredictably.
- **No UI redesign** — the overlay must look and behave identically to the current version
- **No background service worker** — this extension has zero background needs
- **No popup page or options page** — not needed for a debug overlay
- **No class/method renaming beyond module boundaries** — internal function names (e.g., `hookUTClass`, `pruneViewRegistry`) should stay recognizable from the original
- **No over-abstraction** — don't create abstract base classes for UI panels, don't add event emitter patterns, don't introduce state management libraries
- **No additional dependencies beyond build tooling** — zero runtime dependencies

---

## Verification Strategy (MANDATORY)

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> ALL tasks in this plan MUST be verifiable WITHOUT any human action.

### Test Decision
- **Infrastructure exists**: NO
- **Automated tests**: None (TypeScript strict + ESLint only)
- **Framework**: None

### Agent-Executed QA Scenarios (MANDATORY — ALL tasks)

**Verification Tool by Deliverable Type:**

| Type | Tool | How Agent Verifies |
|------|------|-------------------|
| Build output | Bash | Run `npm run build`, check `dist/` contents |
| TypeScript | Bash | Run `npx tsc --noEmit`, assert zero errors |
| ESLint | Bash | Run `npx eslint src/`, assert zero errors |
| Extension load | Playwright | Load unpacked in Chrome, check for errors |
| Functional test | Playwright | Navigate to EA FC web app, toggle overlay, verify UI |

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
└── Task 1: Project scaffolding (manifest, vite, tsconfig, eslint, package.json, contentscript)

Wave 2 (After Task 1):
└── Task 2: Types & registry module

Wave 3 (After Task 2):
├── Task 3: Core hooks (DOM, prototype, event listener)
├── Task 4: UI components (tooltip, sidebar, class inspector, method spy)
└── Task 5: Helpers module + CSS extraction

Wave 4 (After Wave 3):
└── Task 6: Entry point, init sequence, keyboard shortcuts

Wave 5 (After Task 6):
└── Task 7: Build verification & extension load test
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 2, 3, 4, 5 | None (first) |
| 2 | 1 | 3, 4, 5, 6 | None |
| 3 | 2 | 6 | 4, 5 |
| 4 | 2 | 6 | 3, 5 |
| 5 | 2 | 6 | 3, 4 |
| 6 | 3, 4, 5 | 7 | None |
| 7 | 6 | None | None (final) |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 1 | 1 | task(category="quick", load_skills=[], ...) |
| 2 | 2 | task(category="quick", load_skills=[], ...) |
| 3 | 3, 4, 5 | 3x parallel task(category="unspecified-low", load_skills=[], ...) |
| 4 | 6 | task(category="unspecified-low", load_skills=[], ...) |
| 5 | 7 | task(category="unspecified-low", load_skills=["playwright"], ...) |

---

## TODOs

- [x] 1. Project Scaffolding & Build Configuration

  **What to do**:
  - Initialize npm project: `npm init -y`
  - Install dev dependencies: `typescript`, `vite`, `eslint`, `@typescript-eslint/parser`, `@typescript-eslint/eslint-plugin`, `eslint-config-airbnb-base`, `eslint-config-airbnb-typescript`, `eslint-config-prettier`, `eslint-plugin-import`, `prettier`
  - Create directory structure:
    ```
    src/
      types/
      core/
      ui/
      styles/
      index.ts
    extension/
      manifest.json
      contentscript.js
    dist/           (gitignored)
    ```
  - Create `manifest.json` (Manifest V3):
    ```json
    {
      "manifest_version": 3,
      "name": "FUT UT View Debug Overlay",
      "version": "0.8.0",
      "description": "Inspect UT* views, controllers, viewmodels & DOM with UT-created-by info",
      "content_scripts": [{
        "js": ["contentscript.js"],
        "matches": [
          "https://www.ea.com/*",
          "https://www.easports.com/*"
        ],
        "run_at": "document_idle"
      }],
      "web_accessible_resources": [{
        "resources": ["js/main.js", "css/overlay.css"],
        "matches": ["https://www.ea.com/*", "https://www.easports.com/*"]
      }]
    }
    ```
  - Create `extension/contentscript.js` (plain JS — NOT TypeScript):
    ```js
    // Inject main bundle into page context (MAIN world)
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('js/main.js');
    (document.head || document.documentElement).appendChild(script);
    script.onload = () => script.remove();

    // Inject CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = chrome.runtime.getURL('css/overlay.css');
    (document.head || document.documentElement).appendChild(link);
    ```
  - Create `vite.config.ts`:
    - Entry: `src/index.ts`
    - Output: `dist/js/main.js` as IIFE format (single file, no code splitting)
    - CSS extracted to `dist/css/overlay.css`
    - Copy `extension/` files to `dist/` root via `vite-plugin-static-copy` or manual copy script
    - Build target: `esnext`
    - No minification in dev (for debugging), minify in production
  - Create `tsconfig.json`:
    ```json
    {
      "compilerOptions": {
        "target": "ESNext",
        "module": "ESNext",
        "moduleResolution": "bundler",
        "strict": true,
        "esModuleInterop": true,
        "skipLibCheck": true,
        "forceConsistentCasingInFileNames": true,
        "outDir": "dist",
        "declaration": false,
        "sourceMap": true,
        "lib": ["ESNext", "DOM", "DOM.Iterable"]
      },
      "include": ["src"],
      "exclude": ["node_modules", "dist"]
    }
    ```
  - Create `.eslintrc` (aligned with fc-enhancer):
    ```json
    {
      "extends": [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "airbnb-base",
        "airbnb-typescript/base",
        "prettier"
      ],
      "parser": "@typescript-eslint/parser",
      "parserOptions": { "project": "./tsconfig.json" },
      "plugins": ["@typescript-eslint"],
      "rules": {
        "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
        "no-underscore-dangle": "off",
        "import/prefer-default-export": "off",
        "no-param-reassign": "off",
        "no-bitwise": "off",
        "class-methods-use-this": "off",
        "@typescript-eslint/naming-convention": "off",
        "no-restricted-syntax": ["error", "ForInStatement", "LabeledStatement", "WithStatement"]
      }
    }
    ```
  - Create `.prettierrc`: `{ "singleQuote": true }`
  - Add to `package.json` scripts:
    ```json
    {
      "build": "vite build",
      "dev": "vite build --watch",
      "typecheck": "tsc --noEmit",
      "lint": "eslint src/ --ext .ts",
      "lint:fix": "eslint src/ --ext .ts --fix"
    }
    ```
  - Update `.gitignore` to include `dist/`, `node_modules/`

  **Must NOT do**:
  - Do NOT create a background.js or service worker
  - Do NOT create popup.html or options.html
  - Do NOT add any runtime dependencies
  - Do NOT use TypeScript for contentscript.js

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`
    - No special skills needed — straightforward file creation and npm setup

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 1 (solo)
  - **Blocks**: Tasks 2, 3, 4, 5, 6, 7
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `C:\Users\tomol\Documents\GitHub\fc-enhancer\packages\app-entry\extension\manifest.json` — Manifest V3 structure reference (adapt: remove background, notifications, host_permissions, alarms — this extension needs none of that)
  - `C:\Users\tomol\Documents\GitHub\fc-enhancer\packages\app-entry\extension\contentscript.js` — Content script injection pattern (simplify: only inject 1 script + 1 CSS link, no vendor.js/index.js)
  - `C:\Users\tomol\Documents\GitHub\fc-enhancer\packages\app-entry\tsconfig.json` — TypeScript config reference (adapt: change module to ESNext for Vite, add DOM lib)
  - `C:\Users\tomol\Documents\GitHub\fc-enhancer\.eslintrc` — ESLint config reference (copy rules, adjust parserOptions.project path)
  - `C:\Users\tomol\Documents\GitHub\fc-enhancer\.prettierrc` — Prettier config reference (copy as-is: `{ "singleQuote": true }`)

  **Source References**:
  - `FUT UT View Debug Overlay (DOM-aware)-0.8.user.js:1-11` — Tampermonkey metadata block showing match patterns (`ea.com/*`, `easports.com/*`) and run-at (`document-idle`) — use these in manifest.json

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: npm install succeeds
    Tool: Bash
    Preconditions: None
    Steps:
      1. Run: npm install
      2. Assert: exit code 0
      3. Assert: node_modules/ directory exists
    Expected Result: All dev dependencies installed
    Evidence: Terminal output captured

  Scenario: Directory structure is correct
    Tool: Bash
    Preconditions: npm install completed
    Steps:
      1. Verify src/index.ts exists
      2. Verify src/types/ directory exists
      3. Verify src/core/ directory exists
      4. Verify src/ui/ directory exists
      5. Verify src/styles/ directory exists
      6. Verify extension/manifest.json exists
      7. Verify extension/contentscript.js exists
      8. Verify vite.config.ts exists
      9. Verify tsconfig.json exists
      10. Verify .eslintrc exists
      11. Verify .prettierrc exists
    Expected Result: All scaffold files present
    Evidence: ls output captured

  Scenario: TypeScript compiles empty project
    Tool: Bash
    Preconditions: Scaffold complete, src/index.ts exists (can be empty or minimal)
    Steps:
      1. Run: npx tsc --noEmit
      2. Assert: exit code 0
    Expected Result: Zero TypeScript errors
    Evidence: Terminal output captured

  Scenario: Vite build produces correct output structure
    Tool: Bash
    Preconditions: Scaffold complete
    Steps:
      1. Run: npm run build
      2. Assert: dist/manifest.json exists
      3. Assert: dist/contentscript.js exists
      4. Assert: dist/js/main.js exists
      5. Assert: dist/js/main.js is IIFE format (grep for opening pattern, no import/export statements)
    Expected Result: Build succeeds with correct output
    Evidence: dist/ listing + main.js head captured
  ```

  **Commit**: YES
  - Message: `feat: scaffold Chrome extension with Vite, TypeScript, ESLint, Manifest V3`
  - Files: `package.json, vite.config.ts, tsconfig.json, .eslintrc, .prettierrc, .gitignore, extension/manifest.json, extension/contentscript.js, src/index.ts, src/types/, src/core/, src/ui/, src/styles/`
  - Pre-commit: `npx tsc --noEmit`

---

- [x] 2. Types & Registry Module

  **What to do**:
  - Create `src/types/index.ts` — TypeScript interfaces and types:
    - `ViewRecord` interface: `{ element: Element; classes: Set<string>; lastItemSnippet: string | null; controlInfo: ControlInfo | null; createdBy: string | null; createdStack: string[] | null; }`
    - `ControlInfo` interface: `{ type: string; className: string; label: string; disabled: boolean; domClass: string; }`
    - `MethodCall` interface: `{ id: number; ts: number; className: string; methodName: string; isStatic: boolean; argPreviews: string[]; resultPreview: string; errorPreview: string; threw: boolean; }`
    - `ClassInfo` interface: `{ ctor: Function; protoMethods: string[]; staticMethods: string[]; }`
    - `ListenerEntry` interface: `{ ts: number; type: string; listener: Function; target: Element; selector: string; createdBy: string | null; utStack: string[]; }`
    - `ControllerEntry` / `ViewModelEntry` interface: `{ className: string; instance: unknown; createdAt: number; }`
    - Type for the extended `window` with UT* globals: use `declare global { interface Window { [key: string]: any; } }` or a minimal approach — do NOT attempt to type every UT class
    - Type for extended Element with `__utCreatedBy`, `__utStack`, `__utDebugHooked`, `__utSpyWrapped` etc.

  - Create `src/core/registry.ts` — the `UTDebugRegistry` singleton:
    - Port the registry object (lines 311-320 of original) into a typed module export
    - `views: Set<ViewRecord>`, `viewMap: WeakMap<Element, ViewRecord>`, `controllers: ControllerEntry[]`, `viewModels: ViewModelEntry[]`, `filterText: string`, `_lastViews: ViewRecord[]`, `classes: Map<string, ClassInfo>`, `methodCalls: MethodCall[]`, `listeners: ListenerEntry[]`
    - Export as a single `registry` object (not a class — keep it simple like the original)

  **Must NOT do**:
  - Do NOT create comprehensive UT* type stubs — use `any` or minimal interfaces for window globals
  - Do NOT add generic type parameters or complex type hierarchies
  - Do NOT make the registry a class with getters/setters — keep it a plain object like the original

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (solo — other tasks import from this)
  - **Blocks**: Tasks 3, 4, 5, 6
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `FUT UT View Debug Overlay (DOM-aware)-0.8.user.js:311-320` — Original `UTDebugRegistry` object definition — port this to typed module
  - `FUT UT View Debug Overlay (DOM-aware)-0.8.user.js:454-476` — `ensureViewRecord` function shows the `ViewRecord` shape
  - `FUT UT View Debug Overlay (DOM-aware)-0.8.user.js:628-682` — `recordMethodCall` function shows the `MethodCall` shape
  - `FUT UT View Debug Overlay (DOM-aware)-0.8.user.js:684-795` — `registerClassInfo` shows `ClassInfo` shape (protoMethods, staticMethods)
  - `FUT UT View Debug Overlay (DOM-aware)-0.8.user.js:811-846` — Event listener hook shows `ListenerEntry` shape

  **Acceptance Criteria**:

  ```
  Scenario: Types compile without errors
    Tool: Bash
    Steps:
      1. Run: npx tsc --noEmit
      2. Assert: exit code 0
    Expected Result: All type definitions are valid TypeScript
    Evidence: Terminal output

  Scenario: Registry module exports correctly
    Tool: Bash
    Steps:
      1. Run: npx tsc --noEmit
      2. Grep src/core/registry.ts for export statement
      3. Grep src/types/index.ts for export statements
    Expected Result: Both modules export their public API
    Evidence: Grep output
  ```

  **Commit**: YES
  - Message: `feat: add TypeScript types and registry module`
  - Files: `src/types/index.ts, src/core/registry.ts`
  - Pre-commit: `npx tsc --noEmit`

---

- [x] 3. Core Hooks (DOM, Prototype, Event Listener)

  **What to do**:
  - Create `src/core/dom-hooks.ts` — DOM insertion tracking:
    - Port `activateDomHook()` (lines 851-934): patches `appendChild`, `insertBefore`, `replaceChild` + `MutationObserver`
    - Port `capture()` (lines 856-903): stack trace extraction, `__utCreatedBy`/`__utStack` tagging, dynamic class hooking
    - Import `registry` from `./registry`, types from `../types`
    - Import `registerClassInfo`, `hookUTClass`, `wrapCtorForDebug` from `./ut-class-hooks`

  - Create `src/core/ut-class-hooks.ts` — UT class discovery and prototype wrapping:
    - Port `hookUTClass()` (lines 526-560): wraps `rootElement()` and `renderItem()` on prototypes
    - Port `hookAllUTClasses()` (lines 562-575): scans `window` for `UT*` globals
    - Port `registerClassInfo()` (lines 684-795): discovers prototype/static methods, wraps them for spy
    - Port `wrapCtorForDebug()` (lines 496-516): wraps ViewController/ViewModel constructors
    - Port `recordMethodCall()` (lines 628-682): records method calls to registry (gated on methodSpyVisible)
    - The `methodSpyVisible` flag must be importable — export a getter/setter or use a shared state module

  - Create `src/core/event-hooks.ts` — Event listener tracking:
    - Port the `EventTarget.prototype.addEventListener` hook (lines 800-846)
    - Port `makeDomSelectorLike()` (lines 802-809)

  - Create `src/core/helpers.ts` — Shared utility functions used by hooks and UI:
    - Port `getFunctionSignature()` (lines 353-393)
    - Port `isDomButtonLike()` (lines 395-404)
    - Port `makeItemSnippet()` (lines 406-428)
    - Port `makeControlInfo()` (lines 430-452)
    - Port `ensureViewRecord()` (lines 454-476)
    - Port `getViewRecordForElement()` (lines 478-481)
    - Port `tagElementWithClass()` (lines 483-494)
    - Port `handleElementForClass()` (lines 518-524)
    - Port `summarizeArg()` (lines 577-617)
    - Port `looksLikeItem()` (lines 619-625)
    - Port `escapeHtml()` (lines 1503-1508)
    - Port `isElementOnCurrentPage()` (lines 938-944)
    - Port `pruneViewRegistry()` (lines 946-963)

  **Must NOT do**:
  - Do NOT rename internal function names — keep them recognizable from the original
  - Do NOT change the hooking behavior (e.g., don't add error boundaries that swallow errors differently)
  - Do NOT add TypeScript types for the UT* prototypes being patched — use `any` for those

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 4, 5)
  - **Blocks**: Task 6
  - **Blocked By**: Task 2

  **References**:

  **Pattern References**:
  - `FUT UT View Debug Overlay (DOM-aware)-0.8.user.js:851-934` — `activateDomHook()` — the core DOM patching logic, port verbatim
  - `FUT UT View Debug Overlay (DOM-aware)-0.8.user.js:526-575` — `hookUTClass()` and `hookAllUTClasses()` — UT prototype wrapping
  - `FUT UT View Debug Overlay (DOM-aware)-0.8.user.js:684-795` — `registerClassInfo()` — method discovery and spy wrapping. NOTE: lines 709-733 wrap prototype methods, lines 759-784 wrap static methods — both use the same `recordMethodCall` pattern
  - `FUT UT View Debug Overlay (DOM-aware)-0.8.user.js:496-516` — `wrapCtorForDebug()` — constructor wrapping
  - `FUT UT View Debug Overlay (DOM-aware)-0.8.user.js:628-682` — `recordMethodCall()` — NOTE: lines 677-681 are duplicated in the original (double shift + double needsRefresh), only include once
  - `FUT UT View Debug Overlay (DOM-aware)-0.8.user.js:800-846` — Event listener hook
  - `FUT UT View Debug Overlay (DOM-aware)-0.8.user.js:353-625` — All helper functions
  - `FUT UT View Debug Overlay (DOM-aware)-0.8.user.js:938-963` — Pruning logic

  **WHY Each Reference Matters**:
  - The DOM hooks are the most critical code — they patch Node.prototype methods and must preserve exact call semantics (return values, error propagation)
  - `registerClassInfo` has spy wrappers that MUST preserve `this` context and exception propagation (try/catch/throw pattern)
  - The duplicated code in `recordMethodCall` (lines 677-681) is a bug in the original — fix during port by including only once

  **Acceptance Criteria**:

  ```
  Scenario: All core modules compile
    Tool: Bash
    Steps:
      1. Run: npx tsc --noEmit
      2. Assert: exit code 0
    Expected Result: Zero TypeScript errors across all core modules
    Evidence: Terminal output

  Scenario: No circular imports
    Tool: Bash
    Steps:
      1. Run: npx eslint src/core/ --ext .ts
      2. Assert: no circular dependency warnings
    Expected Result: Clean module graph
    Evidence: ESLint output

  Scenario: All original functions are ported
    Tool: Bash (grep)
    Steps:
      1. Grep src/core/ for each function name: activateDomHook, hookUTClass, hookAllUTClasses, registerClassInfo, wrapCtorForDebug, recordMethodCall, getFunctionSignature, isDomButtonLike, makeItemSnippet, makeControlInfo, ensureViewRecord, getViewRecordForElement, tagElementWithClass, handleElementForClass, summarizeArg, looksLikeItem, escapeHtml, isElementOnCurrentPage, pruneViewRegistry, makeDomSelectorLike
      2. Assert: each function exists in exactly one file
    Expected Result: All 20 functions ported
    Evidence: Grep results
  ```

  **Commit**: YES
  - Message: `feat: port core hooks and helpers to TypeScript modules`
  - Files: `src/core/dom-hooks.ts, src/core/ut-class-hooks.ts, src/core/event-hooks.ts, src/core/helpers.ts`
  - Pre-commit: `npx tsc --noEmit`

---

- [x] 4. UI Components

  **What to do**:
  - Create `src/ui/overlay.ts` — Tooltip, highlight box, and badge:
    - Port `createOverlayElements()` (lines 967-984): creates tooltip, highlight, badge divs
    - Port `updateOverlayForEvent()` (lines 1383-1461): mousemove handler showing tooltip
    - Port `getUTClassStackFromElement()` (lines 1364-1381): walks DOM ancestors for data-ut-classes
    - Port `flashViewRecord()` (lines 1463-1484): scrollIntoView + flash animation

  - Create `src/ui/sidebar.ts` — Sidebar panel:
    - Port `createSidebar()` (lines 986-1012): creates sidebar with filter input
    - Port `attachSidebarClickHandler()` (lines 1486-1501): click-to-flash delegation
    - Port `updateSidebar()` (lines 1510-1593): renders Views/Nodes, Controllers, ViewModels sections

  - Create `src/ui/class-inspector.ts` — Class Inspector window:
    - Port `createClassWindow()` (lines 1159-1225): draggable window with class list + methods
    - Port `renderClassList()` (lines 1263-1309): filtered class list rendering
    - Port `renderMethodList()` (lines 1311-1341): method display for selected class
    - Port `toggleClassWindow()` (lines 1353-1360)

  - Create `src/ui/method-spy.ts` — Method Spy window:
    - Port `createMethodSpyWindow()` (lines 1014-1087): draggable window with call list + details
    - Port `updateMethodSpyList()` (lines 1089-1122): filtered call list rendering
    - Port `showMethodSpyDetails()` (lines 1125-1155): detail view for a selected call
    - Port `toggleMethodSpyWindow()` (lines 1343-1350)

  - Create `src/ui/drag.ts` — Shared dragging utility:
    - Port `setupClassWindowDragging()` (lines 1227-1261) — used by both Class Inspector and Method Spy

  - All UI modules must export their toggle/create functions for use by the entry point
  - The `debugEnabled` and `methodSpyVisible` flags must be accessible across modules — use a shared state approach (e.g., export from a `src/core/state.ts` module or pass via function parameters)

  **Must NOT do**:
  - Do NOT redesign the UI — keep identical DOM structure and behavior
  - Do NOT introduce a UI framework (React, Lit, etc.)
  - Do NOT use Shadow DOM (the original injects directly into the page)
  - Do NOT create abstract base classes for draggable windows
  - Do NOT change innerHTML rendering to createElement — keep the existing approach for parity

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 3, 5)
  - **Blocks**: Task 6
  - **Blocked By**: Task 2

  **References**:

  **Pattern References**:
  - `FUT UT View Debug Overlay (DOM-aware)-0.8.user.js:967-984` — `createOverlayElements()` — tooltip/highlight/badge creation
  - `FUT UT View Debug Overlay (DOM-aware)-0.8.user.js:1383-1461` — `updateOverlayForEvent()` — mousemove tooltip logic with positioning
  - `FUT UT View Debug Overlay (DOM-aware)-0.8.user.js:986-1012` — `createSidebar()` — sidebar DOM creation
  - `FUT UT View Debug Overlay (DOM-aware)-0.8.user.js:1510-1593` — `updateSidebar()` — sidebar rendering with Views/Controllers/VMs
  - `FUT UT View Debug Overlay (DOM-aware)-0.8.user.js:1159-1225` — `createClassWindow()` — Class Inspector DOM
  - `FUT UT View Debug Overlay (DOM-aware)-0.8.user.js:1014-1087` — `createMethodSpyWindow()` — Method Spy DOM
  - `FUT UT View Debug Overlay (DOM-aware)-0.8.user.js:1227-1261` — `setupClassWindowDragging()` — shared drag handler
  - `FUT UT View Debug Overlay (DOM-aware)-0.8.user.js:1595-1611` — `toggleDebug()` — visibility toggling for all UI elements
  - `FUT UT View Debug Overlay (DOM-aware)-0.8.user.js:323-346` — State variables (debugEnabled, tooltipEl, sidebarEl, etc.) — these need to be module-scoped or in shared state

  **WHY Each Reference Matters**:
  - The UI code is the largest portion (~600 lines). Each panel has create + update + toggle functions that must be preserved exactly.
  - The sidebar `updateSidebar()` calls `pruneViewRegistry()` (from helpers) — ensure this cross-module import works.
  - `toggleDebug()` controls visibility of ALL UI elements — the entry point needs access to all toggle functions.

  **Acceptance Criteria**:

  ```
  Scenario: All UI modules compile
    Tool: Bash
    Steps:
      1. Run: npx tsc --noEmit
      2. Assert: exit code 0
    Expected Result: Zero TypeScript errors across all UI modules
    Evidence: Terminal output

  Scenario: All UI functions are ported
    Tool: Bash (grep)
    Steps:
      1. Grep src/ui/ for: createOverlayElements, updateOverlayForEvent, getUTClassStackFromElement, flashViewRecord, createSidebar, attachSidebarClickHandler, updateSidebar, createClassWindow, renderClassList, renderMethodList, toggleClassWindow, createMethodSpyWindow, updateMethodSpyList, showMethodSpyDetails, toggleMethodSpyWindow, setupClassWindowDragging, toggleDebug
      2. Assert: each function exists
    Expected Result: All 17 UI functions ported
    Evidence: Grep results
  ```

  **Commit**: YES
  - Message: `feat: port UI components to TypeScript modules`
  - Files: `src/ui/overlay.ts, src/ui/sidebar.ts, src/ui/class-inspector.ts, src/ui/method-spy.ts, src/ui/drag.ts`
  - Pre-commit: `npx tsc --noEmit`

---

- [x] 5. CSS Extraction

  **What to do**:
  - Create `src/styles/overlay.css`:
    - Extract the entire CSS block from lines 18-309 of the original script (the `GM_addStyle` template literal)
    - Clean up: remove JS template literal backticks, fix any escaped characters
    - Keep all class names identical (`.ut-debug-tooltip`, `.ut-debug-highlight`, etc.)
    - Fix the triple `display: none` on `.ut-debug-class-window` (lines 130-138) — only one is needed
  - Import the CSS from `src/index.ts` (Vite will handle extraction):
    - Add `import './styles/overlay.css';` to entry point (handled in Task 6)
    - OR configure Vite to extract CSS to `dist/css/overlay.css` separately

  **Must NOT do**:
  - Do NOT rename any CSS classes
  - Do NOT change any visual styles (colors, sizes, positions, z-indexes)
  - Do NOT add CSS preprocessor (Sass, PostCSS, etc.)
  - Do NOT convert to CSS modules or CSS-in-JS

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 3, 4)
  - **Blocks**: Task 6
  - **Blocked By**: Task 2 (technically just Task 1, but grouped with Wave 3)

  **References**:

  **Pattern References**:
  - `FUT UT View Debug Overlay (DOM-aware)-0.8.user.js:18-309` — The complete CSS block inside `GM_addStyle()`. Extract verbatim, removing only the JS template literal wrapper.

  **WHY This Reference Matters**:
  - This is a direct extraction — every line of CSS must be preserved identically. The CSS classes are referenced by name throughout the UI TypeScript modules.

  **Acceptance Criteria**:

  ```
  Scenario: CSS file exists and contains all classes
    Tool: Bash (grep)
    Steps:
      1. Assert src/styles/overlay.css exists
      2. Grep for key class names: .ut-debug-tooltip, .ut-debug-highlight, .ut-debug-badge, .ut-debug-sidebar, .ut-debug-class-window, .ut-debug-methodspy-window, .ut-debug-flash
      3. Assert all 7 class names found
    Expected Result: All CSS classes present
    Evidence: Grep results

  Scenario: No JavaScript artifacts in CSS
    Tool: Bash (grep)
    Steps:
      1. Grep overlay.css for backticks, ${, template literal syntax
      2. Assert: zero matches
    Expected Result: Clean CSS with no JS remnants
    Evidence: Grep results
  ```

  **Commit**: YES (groups with Task 4)
  - Message: `feat: extract CSS to standalone stylesheet`
  - Files: `src/styles/overlay.css`
  - Pre-commit: `npx tsc --noEmit`

---

- [x] 6. Entry Point & Init Sequence

  **What to do**:
  - Create `src/index.ts` — the main entry point:
    - Port `init()` (lines 1652-1657): calls `activateDomHook()`, `hookAllUTClasses()`, `setupDebugOverlay()`
    - Port `setupDebugOverlay()` (lines 1615-1648): creates all UI, attaches keyboard listener, attaches mousemove, starts 1s interval
    - Port the polling init (lines 1659-1672): polls every 500ms for up to 60s, falls back to DOM hook only
    - Port keyboard shortcuts (lines 1623-1635): Ctrl+Shift+U (toggle), Ctrl+Shift+Y (class inspector), Ctrl+Shift+H (method spy)
    - Import and wire all modules:
      - `import './styles/overlay.css'`
      - Import from `./core/dom-hooks`: `activateDomHook`
      - Import from `./core/ut-class-hooks`: `hookAllUTClasses`
      - Import from `./core/event-hooks`: (side effect import — hooks install on import or via explicit init)
      - Import from `./ui/overlay`: `createOverlayElements`, `updateOverlayForEvent`
      - Import from `./ui/sidebar`: `createSidebar`, `attachSidebarClickHandler`, `updateSidebar`
      - Import from `./ui/class-inspector`: `createClassWindow`, `toggleClassWindow`
      - Import from `./ui/method-spy`: `createMethodSpyWindow`, `toggleMethodSpyWindow`, `updateMethodSpyList`
      - Import from `./ui/overlay`: `toggleDebug` (or define here if it touches all UI modules)
    - Wrap everything in an IIFE or top-level self-executing block (Vite IIFE output handles this)

  **Must NOT do**:
  - Do NOT change the init polling interval (500ms) or timeout (60s)
  - Do NOT change the keyboard shortcuts
  - Do NOT change the sidebar refresh interval (1s)
  - Do NOT add new initialization steps or logging beyond what the original has

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (solo — needs all prior modules)
  - **Blocks**: Task 7
  - **Blocked By**: Tasks 3, 4, 5

  **References**:

  **Pattern References**:
  - `FUT UT View Debug Overlay (DOM-aware)-0.8.user.js:1615-1648` — `setupDebugOverlay()` — wiring: creates all UI, attaches event listeners, starts interval
  - `FUT UT View Debug Overlay (DOM-aware)-0.8.user.js:1652-1672` — `init()` + polling init — the startup sequence
  - `FUT UT View Debug Overlay (DOM-aware)-0.8.user.js:1623-1635` — Keyboard shortcut handlers
  - `FUT UT View Debug Overlay (DOM-aware)-0.8.user.js:1639-1646` — Interval handler (sidebar update + method spy refresh)
  - `FUT UT View Debug Overlay (DOM-aware)-0.8.user.js:13-16` — Original IIFE wrapper and `unsafeWindow` fallback — REMOVE: in Chrome extension, we're already in page context via script injection

  **WHY Each Reference Matters**:
  - The init sequence order is critical: DOM hooks MUST activate before UT class discovery (so DOM mutations during discovery are captured)
  - The `unsafeWindow` line (line 16) MUST be removed — in the Chrome extension, the injected script already runs in the page context, so `window` is the real `window`
  - The 1s interval in setupDebugOverlay calls both `updateSidebar()` and conditionally `updateMethodSpyList()` — both cross-module calls

  **Acceptance Criteria**:

  ```
  Scenario: Full project compiles
    Tool: Bash
    Steps:
      1. Run: npx tsc --noEmit
      2. Assert: exit code 0
    Expected Result: All modules compile together without errors
    Evidence: Terminal output

  Scenario: Vite build succeeds
    Tool: Bash
    Steps:
      1. Run: npm run build
      2. Assert: exit code 0
      3. Assert: dist/js/main.js exists and is > 10KB (the original is ~50KB)
      4. Assert: dist/css/overlay.css exists
      5. Assert: dist/manifest.json exists
      6. Assert: dist/contentscript.js exists
    Expected Result: Complete build output
    Evidence: dist/ listing + file sizes

  Scenario: ESLint passes on full project
    Tool: Bash
    Steps:
      1. Run: npx eslint src/ --ext .ts
      2. Assert: exit code 0
    Expected Result: Zero lint errors
    Evidence: Terminal output

  Scenario: Bundle is IIFE format
    Tool: Bash
    Steps:
      1. Read first 5 lines of dist/js/main.js
      2. Assert: no `import` or `export` statements
      3. Assert: wrapped in function scope (IIFE pattern)
    Expected Result: Bundle runs in page context without module system
    Evidence: Head of main.js captured
  ```

  **Commit**: YES
  - Message: `feat: wire entry point and init sequence, complete Chrome extension`
  - Files: `src/index.ts`
  - Pre-commit: `npm run build && npx tsc --noEmit && npx eslint src/ --ext .ts`

---

- [x] 7. Build Verification & Extension Load Test

  **What to do**:
  - Run full build: `npm run build`
  - Verify dist/ structure:
    ```
    dist/
      manifest.json
      contentscript.js
      js/
        main.js
      css/
        overlay.css
    ```
  - Load the extension in Chrome via `chrome://extensions` → "Load unpacked" → select `dist/`
  - Navigate to `https://www.ea.com/ea-sports-fc/ultimate-team/web-app`
  - Verify:
    1. No extension errors in `chrome://extensions`
    2. Console shows `[UTDebug]` messages (polling, then "Ready" or timeout fallback)
    3. Ctrl+Shift+U toggles the sidebar and hover overlay
    4. Hover over elements shows tooltip with UT class info (if UT classes loaded)
    5. Ctrl+Shift+Y opens/closes Class Inspector
    6. Ctrl+Shift+H opens/closes Method Spy
    7. Sidebar filter input works
    8. Class Inspector filter and class selection works
    9. Method Spy records calls when open
    10. Clicking sidebar rows flashes the element
  - If any issues found, fix and rebuild

  **Must NOT do**:
  - Do NOT add new features during verification
  - Do NOT change behavior to "fix" things that worked differently in the original

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
  - **Skills**: `["playwright"]`
    - `playwright`: Required for loading unpacked extension in Chrome and navigating to EA FC web app to test functionality

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 5 (final)
  - **Blocks**: None
  - **Blocked By**: Task 6

  **References**:

  **Pattern References**:
  - `FUT UT View Debug Overlay (DOM-aware)-0.8.user.js:1659-1672` — Init polling behavior (what console output to expect)
  - `README.md` — Keyboard shortcuts table and feature descriptions (use as acceptance checklist)

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Extension loads without errors
    Tool: Playwright (playwright skill)
    Preconditions: npm run build completed, dist/ folder exists
    Steps:
      1. Launch Chrome with --load-extension=dist/ flag
      2. Navigate to chrome://extensions
      3. Assert: FUT UT View Debug Overlay extension is listed
      4. Assert: No "Errors" button/badge on the extension card
      5. Screenshot: .sisyphus/evidence/task-7-extension-loaded.png
    Expected Result: Extension loads cleanly
    Evidence: .sisyphus/evidence/task-7-extension-loaded.png

  Scenario: Content script injects on EA domain
    Tool: Playwright (playwright skill)
    Preconditions: Extension loaded
    Steps:
      1. Navigate to https://www.ea.com/ea-sports-fc/ultimate-team/web-app
      2. Wait for page load (timeout: 15s)
      3. Open browser console
      4. Assert: console contains "[UTDebug]" message (either "Ready" or "Timed out" — both are valid, depends on whether UT classes load)
      5. Screenshot: .sisyphus/evidence/task-7-content-script-injected.png
    Expected Result: Script injects and runs
    Evidence: .sisyphus/evidence/task-7-content-script-injected.png

  Scenario: Keyboard shortcuts toggle UI
    Tool: Playwright (playwright skill)
    Preconditions: On EA FC web app page, script has initialized
    Steps:
      1. Press Ctrl+Shift+U
      2. Assert: .ut-debug-sidebar element is visible in DOM
      3. Press Ctrl+Shift+U again
      4. Assert: .ut-debug-sidebar element is hidden
      5. Press Ctrl+Shift+Y
      6. Assert: .ut-debug-class-window element is visible
      7. Press Ctrl+Shift+H
      8. Assert: .ut-debug-methodspy-window element is visible
      9. Screenshot: .sisyphus/evidence/task-7-ui-toggled.png
    Expected Result: All keyboard shortcuts work
    Evidence: .sisyphus/evidence/task-7-ui-toggled.png
  ```

  **Commit**: YES (if fixes were needed)
  - Message: `fix: address issues found during extension load testing`
  - Files: (whatever needed fixing)
  - Pre-commit: `npm run build`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `feat: scaffold Chrome extension with Vite, TypeScript, ESLint, Manifest V3` | package.json, vite.config.ts, tsconfig.json, .eslintrc, .prettierrc, .gitignore, extension/*, src/index.ts placeholder | `npx tsc --noEmit` |
| 2 | `feat: add TypeScript types and registry module` | src/types/index.ts, src/core/registry.ts | `npx tsc --noEmit` |
| 3 | `feat: port core hooks and helpers to TypeScript modules` | src/core/dom-hooks.ts, src/core/ut-class-hooks.ts, src/core/event-hooks.ts, src/core/helpers.ts | `npx tsc --noEmit` |
| 4 | `feat: port UI components to TypeScript modules` | src/ui/overlay.ts, src/ui/sidebar.ts, src/ui/class-inspector.ts, src/ui/method-spy.ts, src/ui/drag.ts | `npx tsc --noEmit` |
| 5 | `feat: extract CSS to standalone stylesheet` | src/styles/overlay.css | `npx tsc --noEmit` |
| 6 | `feat: wire entry point and init sequence, complete Chrome extension` | src/index.ts | `npm run build` |
| 7 | `fix: address issues found during extension load testing` (if needed) | varies | `npm run build` |

---

## Success Criteria

### Verification Commands
```bash
npm run build          # Expected: exit 0, dist/ folder with manifest.json + js/main.js + css/overlay.css + contentscript.js
npx tsc --noEmit       # Expected: exit 0, zero errors
npx eslint src/ --ext .ts  # Expected: exit 0, zero errors
```

### Final Checklist
- [ ] `dist/` loadable as unpacked Chrome extension without errors
- [ ] All three keyboard shortcuts functional (Ctrl+Shift+U/Y/H)
- [ ] Hover inspection shows UT class info, createdBy, item data
- [ ] Sidebar renders Views/Nodes, Controllers, ViewModels with filter
- [ ] Class Inspector shows prototype + static methods per class
- [ ] Method Spy logs calls in real-time when open, pauses when closed
- [ ] No runtime dependencies (zero `dependencies` in package.json)
- [ ] TypeScript strict mode passes
- [ ] ESLint passes with fc-enhancer-aligned rules
- [ ] Original `.user.js` file preserved (not deleted — still useful as reference)
