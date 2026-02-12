# Chrome Extension Conversion - Learnings

## Task 1: Project Scaffold Initialization

### Installation & Build Outcomes

**npm install**: ✅ Succeeded
- All 272 dev dependencies installed successfully
- No vulnerabilities found
- Minor peer dependency warnings for ESLint versions (expected with ESLint 9.x)

**npx tsc --noEmit**: ✅ Passed
- TypeScript strict mode compilation succeeds with empty src/index.ts placeholder
- tsconfig.json correctly configured with ESNext target and DOM libs

**npm run build**: ✅ Produced dist/ structure
- Vite IIFE build generated dist/js/main.js (39 bytes - empty placeholder)
- CSS extraction ready (manifest references css/main.css)
- Build completed in 51ms with no errors

### Directory Structure Created

```
fut-debug-overlay/
├── src/
│   ├── types/
│   ├── core/
│   ├── ui/
│   ├── styles/
│   └── index.ts (placeholder)
├── extension/
│   ├── manifest.json (Manifest V3)
│   └── contentscript.js (plain JS, 10 lines)
├── dist/ (gitignored)
│   └── js/
│       └── main.js
├── package.json (with build, dev, typecheck, lint, lint:fix scripts)
├── tsconfig.json (ESNext, strict mode, DOM libs)
├── vite.config.ts (IIFE output, no minification)
├── .eslintrc (airbnb-typescript rules)
├── .prettierrc (singleQuote: true)
└── .gitignore (updated with dist/, node_modules/)
```

### Configuration Highlights

**Vite Setup**:
- IIFE format (single bundle file, not ES modules)
- Output: dist/js/main.js
- No minification in build (minify: false)
- Target: ESNext
- CSS code split disabled (single CSS file)

**TypeScript**:
- Target: ESNext (for Vite compatibility)
- Module: ESNext (not CommonJS - Vite handles transpilation)
- Strict mode enabled
- DOM lib included for browser APIs

**ESLint**:
- Extends: eslint:recommended, @typescript-eslint/recommended, airbnb-base, airbnb-typescript/base, prettier
- Key overrides: no-underscore-dangle: off, import/prefer-default-export: off, import/no-cycle: off
- Parser: @typescript-eslint/parser with tsconfig.json project reference

**Manifest V3**:
- Content scripts match: https://www.ea.com/*, https://www.easports.com/*
- Web accessible resources: js/main.js, css/main.css
- Permissions: storage only (no background service worker, notifications, or alarms)
- run_at: document_idle

**Content Script**:
- Plain JavaScript (not TypeScript)
- Injects main.js and main.css into page context
- Removes script tag after load (cleanup)
- 10 lines total

### npm Scripts

- `npm run build` - Vite production build
- `npm run dev` - Vite dev server
- `npm run typecheck` - TypeScript strict check
- `npm run lint` - ESLint check
- `npm run lint:fix` - ESLint auto-fix

### Next Steps (Task 2+)

- Task 2: Implement Vite plugin to copy extension/ files to dist/ root
- Task 3+: Implement core overlay logic in src/
- Task 6: Replace placeholder src/index.ts with actual entry point

## Task 1 (Continued): Vite Plugin Configuration

### Extension Files Copy Fix

**Problem**: dist/manifest.json and dist/contentscript.js were missing after build

**Solution**: Installed vite-plugin-static-copy and configured it to copy extension/ files to dist/ root

**Implementation**:
- Installed: `npm install --save-dev vite-plugin-static-copy`
- Updated vite.config.ts:
  - Imported viteStaticCopy from 'vite-plugin-static-copy'
  - Added plugins array with viteStaticCopy configuration
  - Target: copy all files from extension/* to dist/ root (dest: '.')

**Build Verification**:
- ✅ npm run build - Succeeded with "[vite-plugin-static-copy] Copied 2 items."
- ✅ dist/manifest.json - Present and correct
- ✅ dist/contentscript.js - Present and correct
- ✅ dist/js/main.js - Still present

**Final dist/ Structure**:
```
dist/
├── manifest.json (Manifest V3)
├── contentscript.js (10 lines)
└── js/
    └── main.js (39 bytes)
```

This completes the extension scaffold. The dist/ folder is now ready to be loaded as a Chrome extension.
