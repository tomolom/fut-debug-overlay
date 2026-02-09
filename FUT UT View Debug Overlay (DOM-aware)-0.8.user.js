// ==UserScript==
// @name         FUT UT View Debug Overlay (DOM-aware)
// @namespace    https://github.com/tomolom/fut-debug-overlay
// @version      0.8
// @description  Inspect UT* views, controllers, viewmodels & DOM with UT-created-by info
// @match        https://www.ea.com/*
// @match        https://www.easports.com/*
// @run-at       document-idle
// @grant        unsafeWindow
// @grant        GM_addStyle
// ==/UserScript==

(function () {
    'use strict';

    const w = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

    GM_addStyle(`
      .ut-debug-tooltip {
          position: fixed;
          max-width: 50vw;
          max-height: 50vh;
          background: rgba(10,10,10,0.9);
          color: #e0e8ff;
          font-size: 11px;
          font-family: monospace;
          padding: 6px 8px;
          border-radius: 4px;
          border: 1px solid #4db8ff;
          z-index: 999999;
          pointer-events: none;
          white-space: pre-wrap;
          overflow: auto;
      }
      .ut-debug-highlight {
          position: fixed;
          border: 2px dashed #4db8ff;
          box-sizing: border-box;
          z-index: 999998;
          pointer-events: none;
      }
      .ut-debug-badge {
          position: fixed;
          font-size: 11px;
          font-family: monospace;
          background: rgba(77, 184, 255, 0.9);
          color: #0b1020;
          padding: 2px 4px;
          border-radius: 3px;
          z-index: 999999;
          pointer-events: none;
      }

      .ut-debug-sidebar {
          position: fixed;
          top: 0;
          right: 0;
          bottom: 0;
          width: 280px;
          background: rgba(5,5,20,0.95);
          border-left: 1px solid #4db8ff;
          color: #e0e8ff;
          font-family: monospace;
          font-size: 11px;
          z-index: 999997;
          box-sizing: border-box;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          padding: 6px 8px;
      }

      .ut-debug-sidebar-filter {
          width: 100%;
          box-sizing: border-box;
          margin-bottom: 6px;
          padding: 4px 6px;
          border-radius: 3px;
          border: 1px solid #4db8ff;
          background: #050819;
          color: #e0e8ff;
          font-size: 11px;
          font-family: monospace;
      }

      .ut-debug-sidebar-section-title {
          margin-top: 4px;
          font-weight: bold;
      }

      .ut-debug-view-row {
          padding: 4px 2px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          cursor: pointer;
      }
      .ut-debug-view-row:hover {
          background: rgba(77,184,255,0.1);
      }
      .ut-debug-view-row-title {
          font-weight: bold;
          color: #4db8ff;
          margin-bottom: 2px;
          word-break: break-all;
      }
      .ut-debug-view-row-snippet {
          color: #aab3d4;
          font-size: 10px;
          white-space: pre-wrap;
          word-break: break-all;
      }

      @keyframes ut-debug-flash {
          0%   { box-shadow: 0 0 0 0 rgba(77,184,255,0.9); }
          100% { box-shadow: 0 0 0 10px rgba(77,184,255,0); }
      }
      .ut-debug-flash {
          animation: ut-debug-flash 0.6s ease-out 0s 2;
      }

      .ut-debug-class-window {
          position: fixed;
          top: 80px;
          right: 300px;
          width: 380px;
          height: 420px;
          background: rgba(5,5,20,0.98);
          border: 1px solid #4db8ff;
          border-radius: 4px;
          box-sizing: border-box;
          display: none;
          z-index: 999996;
          color: #e0e8ff;
          font-family: monospace;
          font-size: 11px;
          display: none;
          box-shadow: 0 4px 16px rgba(0,0,0,0.5);
          display: none;
      }

      .ut-debug-class-window-header {
          height: 22px;
          line-height: 22px;
          padding: 0 6px;
          background: rgba(77,184,255,0.2);
          border-bottom: 1px solid #4db8ff;
          cursor: move;
          display: flex;
          align-items: center;
          justify-content: space-between;
          user-select: none;
      }

      .ut-debug-class-window-title {
          font-weight: bold;
      }

      .ut-debug-class-window-close {
          cursor: pointer;
          padding: 0 4px;
      }

      .ut-debug-class-window-body {
          display: flex;
          height: calc(100% - 22px);
      }

      .ut-debug-class-list {
          width: 45%;
          border-right: 1px solid rgba(255,255,255,0.1);
          display: flex;
          flex-direction: column;
      }

      .ut-debug-class-filter {
          margin: 4px;
          padding: 2px 4px;
          border-radius: 3px;
          border: 1px solid #4db8ff;
          background: #050819;
          color: #e0e8ff;
          font-size: 11px;
          box-sizing: border-box;
      }

      .ut-debug-class-list-inner {
          flex: 1 1 auto;
          overflow: auto;
          padding: 2px 4px;
      }

      .ut-debug-class-row {
          padding: 2px 2px;
          border-bottom: 1px solid rgba(255,255,255,0.04);
          cursor: pointer;
          word-break: break-all;
      }
      .ut-debug-class-row:hover {
          background: rgba(77,184,255,0.12);
      }
      .ut-debug-class-row-selected {
          background: rgba(77,184,255,0.25);
      }

      .ut-debug-method-list {
          flex: 1 1 auto;
          padding: 4px;
          overflow: auto;
      }

      .ut-debug-method-section-title {
          font-weight: bold;
          margin-top: 2px;
      }

      .ut-debug-method-name {
          padding-left: 4px;
          white-space: pre;
      }

            .ut-debug-methodspy-window {
          position: fixed;
          top: 80px;
          left: 40px;
          width: 480px;
          height: 460px;
          background: rgba(5,5,20,0.98);
          border: 1px solid #4db8ff;
          border-radius: 4px;
          box-sizing: border-box;
          display: none;
          z-index: 999996;
          color: #e0e8ff;
          font-family: monospace;
          font-size: 11px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.5);
      }

      .ut-debug-methodspy-header {
          height: 22px;
          line-height: 22px;
          padding: 0 6px;
          background: rgba(77,184,255,0.2);
          border-bottom: 1px solid #4db8ff;
          cursor: move;
          display: flex;
          align-items: center;
          justify-content: space-between;
          user-select: none;
      }

      .ut-debug-methodspy-title {
          font-weight: bold;
      }

      .ut-debug-methodspy-close {
          cursor: pointer;
          padding: 0 4px;
      }

      .ut-debug-methodspy-body {
          display: flex;
          height: calc(100% - 22px);
      }

      .ut-debug-methodspy-list-pane {
          width: 55%;
          border-right: 1px solid rgba(255,255,255,0.1);
          display: flex;
          flex-direction: column;
      }

      .ut-debug-methodspy-filter {
          margin: 4px;
          padding: 2px 4px;
          border-radius: 3px;
          border: 1px solid #4db8ff;
          background: #050819;
          color: #e0e8ff;
          font-size: 11px;
          box-sizing: border-box;
      }

      .ut-debug-methodspy-list {
          flex: 1 1 auto;
          overflow: auto;
          padding: 2px 4px;
      }

      .ut-debug-methodspy-row {
          padding: 2px 2px;
          border-bottom: 1px solid rgba(255,255,255,0.04);
          cursor: pointer;
          white-space: nowrap;
          text-overflow: ellipsis;
          overflow: hidden;
      }
      .ut-debug-methodspy-row:hover {
          background: rgba(77,184,255,0.12);
      }

      .ut-debug-methodspy-details {
          flex: 1 1 auto;
          padding: 4px;
          overflow: auto;
          white-space: pre-wrap;
          font-size: 10px;
      }

    `);

    const UTDebugRegistry = {
        views: new Set(),
        viewMap: new WeakMap(),
        controllers: [],
        viewModels: [],
        filterText: '',
        _lastViews: [],
        classes: new Map(),
        methodCalls: [] // { ts, className, methodName, isStatic, argPreviews }
    };



    let debugEnabled = false;

    let tooltipEl;
    let highlightEl;
    let badgeEl;
    let sidebarEl;
    let sidebarContentEl;
    let sidebarFilterInput;

    let classWindowEl;
    let classWindowClassListEl;
    let classWindowMethodListEl;
    let classWindowFilterInput;
    let classWindowVisible = false;
    let selectedClassName = null;

    let methodSpyWindowEl;
    let methodSpyVisible = false;
    let methodSpyListEl;
    let methodSpyDetailsEl;
    let methodSpyFilterInput;
    let methodSpyNeedsRefresh = false;
    let methodSpyNextId = 1;




    // ---------- Helpers ----------

    function getFunctionSignature(name, fn) {
        if (typeof fn !== 'function') return name + '()';

        try {
            const src = Function.prototype.toString.call(fn);

            let args = '';

            // 1) Normal / method / class method forms:
            //    function foo(a,b)
            //    foo(a,b) { ... }
            let m = src.match(/^[\s\(]*[a-zA-Z0-9_$]*\s*\(([^)]*)\)/);
            if (!m) {
                // 2) Arrow function forms:
                //    (a,b) => ...
                //    a => ...
                m = src.match(/^\s*\(([^)]*)\)\s*=>/) ||
                    src.match(/^\s*([^=\s\(\)]+)\s*=>/);
                if (m) {
                    args = (m[1] || '').trim();
                }
            } else {
                args = (m[1] || '').trim();
            }

            if (!args) {
                return name + '()';
            }

            // strip block comments and line comments
            args = args
                .replace(/\/\*.*?\*\//g, '')
                .replace(/\/\/.*$/mg, '')
                .trim()
                .replace(/\s+/g, ' ');

            return name + '(' + args + ')';
        } catch {
            return name + '()';
        }
    }

    function isDomButtonLike(el) {
        if (!el || !(el instanceof Element)) return false;
        const tag = el.tagName;
        if (tag === 'BUTTON') return true;
        const role = el.getAttribute && el.getAttribute('role');
        if (role && role.toLowerCase() === 'button') return true;
        const cls = (el.className || '').toString();
        if (/btn\b/i.test(cls) || /\bbutton\b/i.test(cls)) return true;
        return false;
    }

    function makeItemSnippet(item) {
        if (!item) return null;
        try {
            const out = {};
            const keys = [
                'definitionId', 'resourceId', 'id',
                'rating', 'overallRating',
                'preferredPosition', 'position',
                'name', 'firstName', 'lastName'
            ];
            for (let i = 0; i < keys.length; i++) {
                const k = keys[i];
                if (item[k] != null) out[k] = item[k];
            }
            if (Object.keys(out).length === 0) {
                const rawKeys = Object.keys(item).slice(0, 6);
                out._keys = rawKeys;
            }
            return JSON.stringify(out);
        } catch {
            return '[item snippet error]';
        }
    }

    function makeControlInfo(el) {
        if (!el) return null;

        let label = '';
        try { label = (el.innerText || el.textContent || '').trim(); } catch {}

        if (!label && el.getAttribute) {
            const tt = el.getAttribute('title') || el.getAttribute('aria-label');
            if (tt) label = tt.trim();
        }

        const domClass = (el.className || '').toString();
        const disabled = /\bdisabled\b/i.test(domClass) ||
              (el.getAttribute && el.getAttribute('aria-disabled') === 'true');

        return {
            type: 'button',
            className: 'DOMButton',
            label,
            disabled,
            domClass
        };
    }

    function ensureViewRecord(element) {
        if (!element || !(element instanceof Element)) return null;
        let rec = UTDebugRegistry.viewMap.get(element);
        if (!rec) {
            rec = {
                element,
                classes: new Set(),
                lastItemSnippet: null,
                controlInfo: null,
                createdBy: element.__utCreatedBy || null,
                createdStack: element.__utStack || null
            };
            UTDebugRegistry.viewMap.set(element, rec);
            UTDebugRegistry.views.add(rec);
        } else {
            // refresh createdBy/stack if newly set
            if (!rec.createdBy && element.__utCreatedBy)
                rec.createdBy = element.__utCreatedBy;
            if (!rec.createdStack && element.__utStack)
                rec.createdStack = element.__utStack;
        }
        return rec;
    }

    function getViewRecordForElement(el) {
        if (!el) return null;
        return UTDebugRegistry.viewMap.get(el) || null;
    }

    function tagElementWithClass(el, className) {
        if (!el || !(el instanceof Element)) return;
        const existing = el.getAttribute('data-ut-classes');
        if (existing) {
            const parts = existing.split(',');
            if (!parts.includes(className)) {
                el.setAttribute('data-ut-classes', existing + ',' + className);
            }
        } else {
            el.setAttribute('data-ut-classes', className);
        }
    }

    function wrapCtorForDebug(name) {
        const Original = w[name];
        if (typeof Original !== 'function') return;
        if (Original.__utCtorWrapped) return;

        function WrappedCtor() {
            const instance = Original.apply(this, arguments) || this;
            const entry = { className: name, instance, createdAt: Date.now() };
            if (/ViewController$/.test(name)) {
                UTDebugRegistry.controllers.push(entry);
            } else if (/ViewModel$/.test(name)) {
                UTDebugRegistry.viewModels.push(entry);
            }
            return instance;
        }

        WrappedCtor.prototype = Original.prototype;
        Object.setPrototypeOf(WrappedCtor, Original);
        w[name] = WrappedCtor;
        Original.__utCtorWrapped = true;
    }

    function handleElementForClass(el, name) {
        if (!el) return;
        tagElementWithClass(el, name);
        const rec = ensureViewRecord(el);
        if (!rec) return;
        rec.classes.add(name);
    }

    function hookUTClass(name) {
        const Ctor = w[name];
        if (!Ctor || !Ctor.prototype) return false;
        if (Ctor.prototype.__utDebugHooked) return true;

        let hooked = false;

        if (typeof Ctor.prototype.rootElement === 'function') {
            const origRoot = Ctor.prototype.rootElement;
            Ctor.prototype.rootElement = function () {
                const el = origRoot.apply(this, arguments);
                handleElementForClass(el, name);
                return el;
            };
            hooked = true;
        }

        if (typeof Ctor.prototype.renderItem === 'function') {
            const origRenderItem = Ctor.prototype.renderItem;
            Ctor.prototype.renderItem = function (item) {
                const result = origRenderItem.apply(this, arguments);
                const el = this.__root || (typeof this.rootElement === 'function' && this.rootElement());
                handleElementForClass(el, name);
                const rec = el && getViewRecordForElement(el);
                if (rec && item) {
                    rec.lastItemSnippet = makeItemSnippet(item);
                }
                return result;
            };
            hooked = true;
        }

        if (hooked) Ctor.prototype.__utDebugHooked = true;
        return hooked;
    }

    function hookAllUTClasses() {
        const keys = Object.keys(w).filter(k => /^UT[A-Z].+/.test(k));
        let count = 0;
        for (let i = 0; i < keys.length; i++) {
            const k = keys[i];
            registerClassInfo(k);
            hookUTClass(k);
            if (/ViewController$/.test(k) || /ViewModel$/.test(k)) {
                wrapCtorForDebug(k);
            }
            count++;
        }
        console.log('[UTDebug] Processed UT classes:', count);
    }

    function summarizeArg(arg) {
        try {
            if (arg === null) return 'null';
            if (arg === undefined) return 'undefined';

            const t = typeof arg;
            if (t === 'string') {
                if (arg.length > 60) {
                    return JSON.stringify(arg.slice(0, 57) + '…');
                }
                return JSON.stringify(arg);
            }
            if (t === 'number' || t === 'boolean') {
                return String(arg);
            }

            if (arg instanceof Element) {
                const cls = (arg.className || '').toString().trim();
                return `<Element ${arg.tagName.toLowerCase()}${cls ? ' .' + cls.replace(/\s+/g, '.') : ''}>`;
            }

            if (Array.isArray(arg)) {
                return `[Array(${arg.length})]`;
            }

            if (t === 'object') {
                const ctorName = arg && arg.constructor && arg.constructor.name;
                const keys = Object.keys(arg);
                const headKeys = keys.slice(0, 4).join(', ');
                const suffix = keys.length > 4 ? ', …' : '';
                if (ctorName && ctorName !== 'Object') {
                    return `[${ctorName} {${headKeys}${suffix}}]`;
                }
                return `{${headKeys}${suffix}}`;
            }

            return '[' + t + ']';
        } catch {
            return '[arg]';
        }
    }

    function looksLikeItem(obj) {
        if (!obj || typeof obj !== 'object') return false;
        const hasId = ('definitionId' in obj) || ('resourceId' in obj) || ('id' in obj);
        const hasRating = ('rating' in obj) || ('overallRating' in obj);
        const hasName = ('name' in obj) || ('lastName' in obj);
        return hasId && (hasRating || hasName);
    }


    function recordMethodCall(className, methodName, isStatic, argsLike, resultValue, threw, errorObj) {
        const MAX_CALLS = 50000;

        // 🚀 If the Method Spy isn't visible, do NOTHING.
        if (!methodSpyVisible) return;

        const ts = Date.now();

        const argPreviews = [];
        for (let i = 0; i < argsLike.length; i++) {
            const a = argsLike[i];
            let s = summarizeArg(a);
            if (looksLikeItem(a)) {
                s = '[ITEM] ' + s;
            }
            argPreviews.push(s);
        }


        let resultPreview = '';
        let errorPreview = '';

        if (threw) {
            errorPreview = summarizeArg(errorObj);
        } else {
            resultPreview = summarizeArg(resultValue);
        }

        const call = {
            id: methodSpyNextId++,
            ts,
            className,
            methodName,
            isStatic,
            argPreviews,
            resultPreview,
            errorPreview,
            threw
        };

        UTDebugRegistry.methodCalls.push(call);

        if (UTDebugRegistry.methodCalls.length > MAX_CALLS) {
            UTDebugRegistry.methodCalls.shift();
        }

        methodSpyNeedsRefresh = true;


        if (UTDebugRegistry.methodCalls.length > MAX_CALLS) {
            UTDebugRegistry.methodCalls.shift();
        }

        methodSpyNeedsRefresh = true;
    }

    function registerClassInfo(name) {
        const Ctor = w[name];
        if (typeof Ctor !== 'function') return;

        const protoMethods = [];
        const staticMethods = [];

        // prototype methods
        try {
            const proto = Ctor.prototype || {};
            const pNames = Object.getOwnPropertyNames(proto);
            for (let i = 0; i < pNames.length; i++) {
                const k = pNames[i];

                // don't touch constructor / init / superclass – UT inheritance glue
                if (k === 'constructor' || k === 'init' || k === 'superclass') continue;

                const original = proto[k];
                if (typeof original !== 'function') continue;

                // signature based on original fn
                protoMethods.push(getFunctionSignature(k, original));

                // wrap for spying (only once)
                if (!original.__utSpyWrapped) {
                    const wrapped = function () {
                        let result;
                        let threw = false;
                        let err;

                        try {
                            result = original.apply(this, arguments);
                        } catch (e) {
                            threw = true;
                            err = e;
                            try {
                                recordMethodCall(name, k, false, arguments, undefined, true, e);
                            } catch {}
                            throw e;
                        }

                        try {
                            recordMethodCall(name, k, false, arguments, result, false, null);
                        } catch {}

                        return result;
                    };
                    wrapped.__utSpyWrapped = true;
                    proto[k] = wrapped;
                }

            }
        } catch {}


        // static methods
        try {
            const sNames = Object.getOwnPropertyNames(Ctor);
            for (let i = 0; i < sNames.length; i++) {
                const k = sNames[i];

                // don't touch framework / meta statics
                if (
                    k === 'length' ||
                    k === 'name' ||
                    k === 'prototype' ||
                    k === 'superclass' ||
                    k === 'init'
                ) continue;

                const original = Ctor[k];
                if (typeof original !== 'function') continue;

                staticMethods.push(getFunctionSignature(k, original));

                if (!original.__utSpyWrapped) {
                    const wrappedStatic = function () {
                        let result;
                        let threw = false;
                        let err;

                        try {
                            result = original.apply(this, arguments);
                        } catch (e) {
                            threw = true;
                            err = e;
                            try {
                                recordMethodCall(name, k, true, arguments, undefined, true, e);
                            } catch {}
                            throw e;
                        }

                        try {
                            recordMethodCall(name, k, true, arguments, result, false, null);
                        } catch {}

                        return result;
                    };
                    wrappedStatic.__utSpyWrapped = true;
                    Ctor[k] = wrappedStatic;
                }

            }
        } catch {}


        UTDebugRegistry.classes.set(name, {
            ctor: Ctor,
            protoMethods: protoMethods.sort(),
            staticMethods: staticMethods.sort()
        });
    }


    // ---------- Event listener hook ----------

    const originalAddEventListener = EventTarget.prototype.addEventListener;

    function makeDomSelectorLike(el) {
        if (!(el instanceof Element)) return '';
        let sel = el.tagName.toLowerCase();
        if (el.id) sel += '#' + el.id;
        const cls = (el.className || '').toString().trim();
        if (cls) sel += '.' + cls.split(/\s+/).join('.');
        return sel;
    }

    UTDebugRegistry.listeners = UTDebugRegistry.listeners || []; // safety

    EventTarget.prototype.addEventListener = function (type, listener, options) {
        try {
            if (typeof listener === 'function' && this instanceof Element) {
                const err = new Error();
                const stack = err.stack || '';
                const ut = stack.match(/UT[A-Z][A-Za-z0-9_]+/g) || [];
                const createdBy = ut[0] || null;

                const entry = {
                    ts: Date.now(),
                    type,
                    listener,
                    target: this,
                    selector: makeDomSelectorLike(this),
                    createdBy,
                    utStack: ut
                };
                UTDebugRegistry.listeners.push(entry);

                // tag the element so we can spot it
                if (createdBy) {
                    const prev = this.getAttribute('data-ut-events') || '';
                    const tag = type + '@' + createdBy;
                    if (!prev.includes(tag)) {
                        this.setAttribute('data-ut-events', (prev ? prev + ',' : '') + tag);
                    }
                }
            }
        } catch (e) {
            // don't let spying break the app
        }

        return originalAddEventListener.call(this, type, listener, options);
    };


    // ---------- DOM hook (your working snippet, lightly integrated) ----------

    function activateDomHook() {
        const originalAppend = Node.prototype.appendChild;
        const originalInsertBefore = Node.prototype.insertBefore;
        const originalReplaceChild = Node.prototype.replaceChild;

        function capture(source, node) {
            try {
                if (!(node instanceof Element)) return;

                const err = new Error();
                const stack = err.stack || '';
                const ut = stack.match(/UT[A-Z][A-Za-z0-9_]+/g);

                if (ut && ut.length) {
                    const primary = ut[0];

                    node.__utCreatedBy = node.__utCreatedBy || primary;
                    node.__utStack = node.__utStack || ut;
                    if (!node.hasAttribute('data-ut-created-by')) {
                        node.setAttribute('data-ut-created-by', primary);
                    }

                    // 🔹 Dynamically hook UT* classes we see in the stack
                    for (let i = 0; i < ut.length; i++) {
                        const clsName = ut[i];
                        if (!/^UT[A-Z]/.test(clsName)) continue;

                        if (!UTDebugRegistry.classes.has(clsName) && typeof w[clsName] === 'function') {
                            try {
                                registerClassInfo(clsName);
                                hookUTClass(clsName);
                                if (/ViewController$/.test(clsName) || /ViewModel$/.test(clsName)) {
                                    wrapCtorForDebug(clsName);
                                }
                                console.log('[UTDebug] Dynamically hooked UT class:', clsName);
                            } catch (e2) {
                                console.warn('[UTDebug] Failed to hook dynamic class', clsName, e2);
                            }
                        }
                    }

                    // Register / refresh view record
                    ensureViewRecord(node);

                    // console.log(
                    //     `%c[UTDebug DOM Added] via ${source} -> ${ut[0]}`,
                    //     "color:#4df",
                    //     node,
                    //     ut
                    // );
                }
            } catch (e) {}
        }

        Node.prototype.appendChild = function (child) {
            capture('appendChild', child);
            return originalAppend.call(this, child);
        };

        Node.prototype.insertBefore = function (child, ref) {
            capture('insertBefore', child);
            return originalInsertBefore.call(this, child, ref);
        };

        Node.prototype.replaceChild = function (child, old) {
            capture('replaceChild', child);
            return originalReplaceChild.call(this, child, old);
        };

        const mo = new MutationObserver(mutations => {
            for (const m of mutations) {
                for (const node of m.addedNodes) {
                    if (node instanceof Element) capture('mutation', node);
                }
            }
        });

        mo.observe(document.documentElement, {
            childList: true,
            subtree: true
        });

        console.log('%cUT DOM Hook active', 'color:#0f0');
    }

    // ---------- Pruning ----------

    function isElementOnCurrentPage(el) {
        if (!el) return false;
        if (!document.body.contains(el)) return false;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return false;
        return true;
    }

    function pruneViewRegistry() {
        for (const rec of Array.from(UTDebugRegistry.views)) {
            const el = rec.element;
            if (!isElementOnCurrentPage(el)) {
                UTDebugRegistry.views.delete(rec);
                continue;
            }
            // Refresh createdBy/stack if DOM hook added it later
            if (!rec.createdBy && el.__utCreatedBy)
                rec.createdBy = el.__utCreatedBy;
            if (!rec.createdStack && el.__utStack)
                rec.createdStack = el.__utStack;

            if (!rec.controlInfo && isDomButtonLike(el)) {
                rec.controlInfo = makeControlInfo(el);
            }
        }
    }

    // ---------- Overlay elements ----------

    function createOverlayElements() {
        if (tooltipEl) return;
        tooltipEl = document.createElement('div');
        tooltipEl.className = 'ut-debug-tooltip';
        tooltipEl.style.display = 'none';

        highlightEl = document.createElement('div');
        highlightEl.className = 'ut-debug-highlight';
        highlightEl.style.display = 'none';

        badgeEl = document.createElement('div');
        badgeEl.className = 'ut-debug-badge';
        badgeEl.style.display = 'none';

        document.body.appendChild(tooltipEl);
        document.body.appendChild(highlightEl);
        document.body.appendChild(badgeEl);
    }

    function createSidebar() {
        if (sidebarEl) return;

        sidebarEl = document.createElement('div');
        sidebarEl.className = 'ut-debug-sidebar';
        sidebarEl.style.display = 'none';

        sidebarFilterInput = document.createElement('input');
        sidebarFilterInput.className = 'ut-debug-sidebar-filter';
        sidebarFilterInput.type = 'text';
        sidebarFilterInput.placeholder = 'Filter (class, createdBy, label, item)...';

        sidebarContentEl = document.createElement('div');
        sidebarContentEl.style.flex = '1 1 auto';
        sidebarContentEl.style.overflow = 'auto';

        sidebarEl.appendChild(sidebarFilterInput);
        sidebarEl.appendChild(sidebarContentEl);
        document.body.appendChild(sidebarEl);

        UTDebugRegistry.filterText = '';

        sidebarFilterInput.addEventListener('input', () => {
            UTDebugRegistry.filterText = sidebarFilterInput.value || '';
            updateSidebar();
        });
    }

    function createMethodSpyWindow() {
        if (methodSpyWindowEl) return;

        methodSpyWindowEl = document.createElement('div');
        methodSpyWindowEl.className = 'ut-debug-methodspy-window';
        methodSpyWindowEl.style.display = 'none';

        const header = document.createElement('div');
        header.className = 'ut-debug-methodspy-header';

        const title = document.createElement('div');
        title.className = 'ut-debug-methodspy-title';
        title.textContent = 'UT Method Spy';

        const closeBtn = document.createElement('div');
        closeBtn.className = 'ut-debug-methodspy-close';
        closeBtn.textContent = '×';

        header.appendChild(title);
        header.appendChild(closeBtn);

        const body = document.createElement('div');
        body.className = 'ut-debug-methodspy-body';

        const listPane = document.createElement('div');
        listPane.className = 'ut-debug-methodspy-list-pane';

        methodSpyFilterInput = document.createElement('input');
        methodSpyFilterInput.className = 'ut-debug-methodspy-filter';
        methodSpyFilterInput.type = 'text';
        methodSpyFilterInput.placeholder = 'Filter by class / method...';

        methodSpyListEl = document.createElement('div');
        methodSpyListEl.className = 'ut-debug-methodspy-list';

        listPane.appendChild(methodSpyFilterInput);
        listPane.appendChild(methodSpyListEl);

        methodSpyDetailsEl = document.createElement('div');
        methodSpyDetailsEl.className = 'ut-debug-methodspy-details';
        methodSpyDetailsEl.textContent = 'No calls yet.';

        body.appendChild(listPane);
        body.appendChild(methodSpyDetailsEl);

        methodSpyWindowEl.appendChild(header);
        methodSpyWindowEl.appendChild(body);
        document.body.appendChild(methodSpyWindowEl);

        setupClassWindowDragging(header, methodSpyWindowEl);

        closeBtn.addEventListener('click', () => {
            methodSpyVisible = false;
            methodSpyWindowEl.style.display = 'none';
        });

        methodSpyFilterInput.addEventListener('input', () => {
            updateMethodSpyList();
        });

        methodSpyListEl.addEventListener('click', (e) => {
            let node = e.target;
            while (node && node !== methodSpyListEl && !node.hasAttribute('data-call-id')) {
                node = node.parentElement;
            }
            if (!node || node === methodSpyListEl) return;

            const callId = Number(node.getAttribute('data-call-id'));
            showMethodSpyDetails(callId);
        });


        updateMethodSpyList();
    }

    function updateMethodSpyList() {
        if (!methodSpyListEl) return;

        const filter = (methodSpyFilterInput && methodSpyFilterInput.value || '').toLowerCase().trim();
        const calls = UTDebugRegistry.methodCalls;
        let html = '';

        // Newest at top
        for (let i = calls.length - 1; i >= 0; i--) {
            const c = calls[i];
            const timeStr = new Date(c.ts).toLocaleTimeString();
            const head = c.className + '.' + c.methodName;
            const base = head + ' ' + c.argPreviews.join(' ') + ' ' + (c.resultPreview || '') + ' ' + (c.errorPreview || '');
            const haystack = base.toLowerCase();

            if (filter && !haystack.includes(filter)) continue;

            let tail;
            if (c.threw) {
                tail = ' !! threw';
            } else {
                tail = ' => ' + (c.resultPreview || 'undefined');
            }

            html += '<div class="ut-debug-methodspy-row" data-call-id="' + c.id + '">' +
                '[' + timeStr + '] ' + escapeHtml(head) +
                ' (' + c.argPreviews.length + ' args)' +
                escapeHtml(tail) +
                '</div>';

        }

        methodSpyListEl.innerHTML = html || '<div class="ut-debug-methodspy-row">(no calls logged yet)</div>';
    }


    function showMethodSpyDetails(callId) {
        if (!methodSpyDetailsEl) return;

        const calls = UTDebugRegistry.methodCalls;
        const c = calls.find(call => call.id === callId);
        if (!c) {
            methodSpyDetailsEl.textContent = 'Call not found (might have been pruned).';
            return;
        }

        const timeStr = new Date(c.ts).toLocaleString();
        let text = '';
        text += 'Time: ' + timeStr + '\n';
        text += 'Class: ' + c.className + '\n';
        text += 'Method: ' + c.methodName + (c.isStatic ? ' [static]' : ' [instance]') + '\n';
        text += 'Arguments (' + c.argPreviews.length + '):\n\n';

        for (let i = 0; i < c.argPreviews.length; i++) {
            text += '  [' + i + '] ' + c.argPreviews[i] + '\n';
        }

        text += '\n';

        if (c.threw) {
            text += 'Threw error:\n  ' + (c.errorPreview || '(unknown error)') + '\n';
        } else {
            text += 'Return value:\n  ' + (c.resultPreview || 'undefined') + '\n';
        }

        methodSpyDetailsEl.textContent = text;
    }



    function createClassWindow() {
        if (classWindowEl) return;

        classWindowEl = document.createElement('div');
        classWindowEl.className = 'ut-debug-class-window';
        classWindowEl.style.display = 'none';

        const header = document.createElement('div');
        header.className = 'ut-debug-class-window-header';

        const title = document.createElement('div');
        title.className = 'ut-debug-class-window-title';
        title.textContent = 'UT Class Inspector';

        const closeBtn = document.createElement('div');
        closeBtn.className = 'ut-debug-class-window-close';
        closeBtn.textContent = '×';

        header.appendChild(title);
        header.appendChild(closeBtn);

        const body = document.createElement('div');
        body.className = 'ut-debug-class-window-body';

        // Left side: class list + filter
        const classListPane = document.createElement('div');
        classListPane.className = 'ut-debug-class-list';

        classWindowFilterInput = document.createElement('input');
        classWindowFilterInput.className = 'ut-debug-class-filter';
        classWindowFilterInput.type = 'text';
        classWindowFilterInput.placeholder = 'Filter classes...';

        classWindowClassListEl = document.createElement('div');
        classWindowClassListEl.className = 'ut-debug-class-list-inner';

        classListPane.appendChild(classWindowFilterInput);
        classListPane.appendChild(classWindowClassListEl);

        // Right side: methods
        classWindowMethodListEl = document.createElement('div');
        classWindowMethodListEl.className = 'ut-debug-method-list';

        body.appendChild(classListPane);
        body.appendChild(classWindowMethodListEl);

        classWindowEl.appendChild(header);
        classWindowEl.appendChild(body);
        document.body.appendChild(classWindowEl);

        // Dragging
        setupClassWindowDragging(header, classWindowEl);

        // Close button
        closeBtn.addEventListener('click', () => {
            classWindowVisible = false;
            classWindowEl.style.display = 'none';
        });

        // Filter
        classWindowFilterInput.addEventListener('input', () => {
            renderClassList();
        });

        // Initial render
        renderClassList();
    }

    function setupClassWindowDragging(handleEl, windowEl) {
        let dragging = false;
        let offsetX = 0;
        let offsetY = 0;

        handleEl.addEventListener('mousedown', (e) => {
            dragging = true;
            const rect = windowEl.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!dragging) return;
            let x = e.clientX - offsetX;
            let y = e.clientY - offsetY;

            // Optional clamping to viewport
            const maxX = window.innerWidth - windowEl.offsetWidth;
            const maxY = window.innerHeight - windowEl.offsetHeight;
            if (x < 0) x = 0;
            if (y < 0) y = 0;
            if (x > maxX) x = maxX;
            if (y > maxY) y = maxY;

            windowEl.style.left = x + 'px';
            windowEl.style.top = y + 'px';
            windowEl.style.right = 'auto'; // so right isn't fighting left
        });

        document.addEventListener('mouseup', () => {
            dragging = false;
        });
    }

    function renderClassList() {
        if (!classWindowClassListEl) return;

        const filter = (classWindowFilterInput && classWindowFilterInput.value || '').toLowerCase().trim();
        const entries = Array.from(UTDebugRegistry.classes.keys()).sort();

        let html = '';
        for (let i = 0; i < entries.length; i++) {
            const name = entries[i];
            if (filter && !name.toLowerCase().includes(filter)) continue;

            const selected = (name === selectedClassName);
            html += '<div class="ut-debug-class-row' +
                (selected ? ' ut-debug-class-row-selected' : '') +
                '" data-class="' + name + '">' +
                name +
                '</div>';
        }

        classWindowClassListEl.innerHTML = html;

        // Click handler (delegate)
        classWindowClassListEl.onclick = (e) => {
            let node = e.target;
            while (node && node !== classWindowClassListEl && !node.classList.contains('ut-debug-class-row')) {
                node = node.parentElement;
            }
            if (!node || node === classWindowClassListEl) return;

            const name = node.getAttribute('data-class');
            if (!name) return;

            selectedClassName = name;
            renderClassList();
            renderMethodList(name);
        };

        // If no selection yet but there are entries, select the first visible one
        if (!selectedClassName) {
            const firstRow = classWindowClassListEl.querySelector('.ut-debug-class-row');
            if (firstRow) {
                selectedClassName = firstRow.getAttribute('data-class');
                renderClassList();
                renderMethodList(selectedClassName);
            }
        }
    }

    function renderMethodList(className) {
        if (!classWindowMethodListEl) return;

        const info = UTDebugRegistry.classes.get(className);
        if (!info) {
            classWindowMethodListEl.innerHTML = '<div>No info for ' + escapeHtml(className) + '</div>';
            return;
        }

        let html = '';
        html += '<div><strong>' + escapeHtml(className) + '</strong></div>';

        if (info.protoMethods.length) {
            html += '<div class="ut-debug-method-section-title">Prototype methods</div>';
            for (let i = 0; i < info.protoMethods.length; i++) {
                html += '<div class="ut-debug-method-name">• ' + escapeHtml(info.protoMethods[i]) + '</div>';
            }
        } else {
            html += '<div class="ut-debug-method-section-title">Prototype methods</div>';
            html += '<div class="ut-debug-method-name">(none)</div>';
        }

        if (info.staticMethods.length) {
            html += '<div class="ut-debug-method-section-title" style="margin-top:4px;">Static methods</div>';
            for (let i = 0; i < info.staticMethods.length; i++) {
                html += '<div class="ut-debug-method-name">• ' + escapeHtml(info.staticMethods[i]) + '</div>';
            }
        }

        classWindowMethodListEl.innerHTML = html;
    }

    function toggleMethodSpyWindow() {
        methodSpyVisible = !methodSpyVisible;
        if (!methodSpyWindowEl) createMethodSpyWindow();
        methodSpyWindowEl.style.display = (methodSpyVisible && debugEnabled) ? 'block' : 'none';
        if (methodSpyVisible) {
            updateMethodSpyList();
        }
    }


    function toggleClassWindow() {
        classWindowVisible = !classWindowVisible;
        if (!classWindowEl) createClassWindow();
        classWindowEl.style.display = (classWindowVisible && debugEnabled) ? 'block' : 'none';
        if (classWindowVisible) {
            renderClassList();
        }
    }



    function getUTClassStackFromElement(el) {
        const stack = [];
        let cur = el;
        while (cur && cur !== document.body) {
            if (typeof cur.getAttribute === 'function') {
                const attr = cur.getAttribute('data-ut-classes');
                if (attr) {
                    const parts = attr.split(',');
                    for (let i = 0; i < parts.length; i++) {
                        const p = parts[i];
                        if (!stack.includes(p)) stack.push(p);
                    }
                }
            }
            cur = cur.parentElement;
        }
        return stack;
    }

    function updateOverlayForEvent(evt) {
        if (!debugEnabled) return;

        const target = evt.target;
        if (!target || !(target instanceof Element)) return;

        if (sidebarEl && sidebarEl.contains(target)) {
            tooltipEl.style.display = 'none';
            highlightEl.style.display = 'none';
            badgeEl.style.display = 'none';
            return;
        }

        const classes = getUTClassStackFromElement(target);
        const recDirect = getViewRecordForElement(target);
        const createdBy = (recDirect && recDirect.createdBy) || target.__utCreatedBy || null;

        if (!classes.length && !createdBy && !isDomButtonLike(target)) {
            tooltipEl.style.display = 'none';
            highlightEl.style.display = 'none';
            badgeEl.style.display = 'none';
            return;
        }

        const highlightTarget = target;
        const rect = highlightTarget.getBoundingClientRect();
        highlightEl.style.display = 'block';
        highlightEl.style.left = rect.left + 'px';
        highlightEl.style.top = rect.top + 'px';
        highlightEl.style.width = rect.width + 'px';
        highlightEl.style.height = rect.height + 'px';

        const rec = recDirect || ensureViewRecord(target);
        const snippet = rec && rec.lastItemSnippet;
        if (rec && !rec.createdBy && target.__utCreatedBy)
            rec.createdBy = target.__utCreatedBy;

        const ctrl = rec && rec.controlInfo;

        let text = '';
        if (classes.length) text += classes.join('\n');
        if (rec && rec.createdBy) {
            text += (text ? '\n\n' : '') + 'createdBy: ' + rec.createdBy;
        }
        if (snippet) {
            text += (text ? '\n\n' : '') + 'item: ' + snippet;
        }
        if (ctrl) {
            text += (text ? '\n\n' : '') + 'control: ' + ctrl.className;
            if (ctrl.label) text += '  label="' + ctrl.label + '"';
            text += ctrl.disabled ? ' [disabled]' : '';
        } else if (isDomButtonLike(target)) {
            const domCtrl = makeControlInfo(target);
            text += (text ? '\n\n' : '') + 'control: DOMButton';
            if (domCtrl.label) text += '  label="' + domCtrl.label + '"';
            text += domCtrl.disabled ? ' [disabled]' : '';
        }

        if (!text) {
            tooltipEl.style.display = 'none';
            badgeEl.style.display = 'none';
            return;
        }

        tooltipEl.style.display = 'block';
        const margin = 10;
        let x = evt.clientX + margin;
        let y = evt.clientY + margin;
        if (x + 300 > window.innerWidth) x = evt.clientX - 310;
        if (y + 200 > window.innerHeight) y = evt.clientY - 210;
        tooltipEl.style.left = x + 'px';
        tooltipEl.style.top = y + 'px';
        tooltipEl.textContent = text;

        badgeEl.style.display = 'block';
        badgeEl.textContent = classes[0] || rec?.createdBy || 'node';
        badgeEl.style.left = (rect.left + 4) + 'px';
        badgeEl.style.top = (rect.top + 4) + 'px';
    }

    function flashViewRecord(rec) {
        if (!rec || !rec.element) return;
        const el = rec.element;
        if (!isElementOnCurrentPage(el)) return;

        try {
            el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        } catch {}

        el.classList.add('ut-debug-flash');
        setTimeout(() => el.classList.remove('ut-debug-flash'), 800);

        if (highlightEl) {
            const rect = el.getBoundingClientRect();
            highlightEl.style.display = 'block';
            highlightEl.style.left = rect.left + 'px';
            highlightEl.style.top = rect.top + 'px';
            highlightEl.style.width = rect.width + 'px';
            highlightEl.style.height = rect.height + 'px';
            setTimeout(() => { highlightEl.style.display = 'none'; }, 800);
        }
    }

    function attachSidebarClickHandler() {
        if (!sidebarEl || !sidebarContentEl) return;
        sidebarEl.addEventListener('click', (e) => {
            let node = e.target;
            while (node && node !== sidebarEl && !node.classList.contains('ut-debug-view-row')) {
                node = node.parentElement;
            }
            if (!node || node === sidebarEl) return;

            const idx = Number(node.getAttribute('data-view-idx'));
            const views = UTDebugRegistry._lastViews || [];
            const rec = views[idx];
            if (!rec) return;
            flashViewRecord(rec);
        });
    }

    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    function updateSidebar() {
        if (!sidebarEl || !sidebarContentEl) return;

        if (!debugEnabled) {
            sidebarEl.style.display = 'none';
            return;
        }

        pruneViewRegistry();

        sidebarEl.style.display = '';

        const views = Array.from(UTDebugRegistry.views);
        UTDebugRegistry._lastViews = views;

        const controllers = UTDebugRegistry.controllers;
        const vms = UTDebugRegistry.viewModels;

        const filter = (UTDebugRegistry.filterText || '').toLowerCase().trim();

        let html = '';

        // VIEWS / DOM nodes
        html += '<div class="ut-debug-sidebar-section-title">VIEWS / NODES (' + views.length + ')</div>';
        html += '<hr/>';
        for (let i = 0; i < views.length; i++) {
            const rec = views[i];
            const classList = Array.from(rec.classes).join(', ');
            const snippet = rec.lastItemSnippet || '';
            const ctrl = rec.controlInfo;
            const createdBy = rec.createdBy || '';

            let extra = '';
            if (createdBy) {
                extra += '[createdBy ' + createdBy + '] ';
            }
            if (ctrl) {
                extra += '[control ' + ctrl.className;
                if (ctrl.label) extra += ' label="' + ctrl.label + '"';
                extra += ctrl.disabled ? ' disabled]' : ']';
            }

            const haystack = (classList + ' ' + snippet + ' ' + extra).toLowerCase();
            if (filter && !haystack.includes(filter)) continue;

            html += (
                '<div class="ut-debug-view-row" data-view-idx="' + i + '">' +
                '<div class="ut-debug-view-row-title">' + escapeHtml(classList || createdBy || 'node') + '</div>' +
                (snippet ? '<div class="ut-debug-view-row-snippet">' + escapeHtml(snippet) + '</div>' : '') +
                (extra ? '<div class="ut-debug-view-row-snippet">' + escapeHtml(extra) + '</div>' : '') +
                '</div>'
            );
        }

        // CONTROLLERS
        html += '<div class="ut-debug-sidebar-section-title" style="margin-top:8px;">VIEW CONTROLLERS (' + controllers.length + ')</div>';
        html += '<hr/>';
        const groupedControllers = {};
        for (let i = 0; i < controllers.length; i++) {
            const c = controllers[i];
            groupedControllers[c.className] = (groupedControllers[c.className] || 0) + 1;
        }
        for (const name in groupedControllers) {
            if (!Object.prototype.hasOwnProperty.call(groupedControllers, name)) continue;
            if (filter && !name.toLowerCase().includes(filter)) continue;
            html += '<div>' + escapeHtml(name) + ' x' + groupedControllers[name] + '</div>';
        }

        // VIEW MODELS
        html += '<div class="ut-debug-sidebar-section-title" style="margin-top:8px;">VIEW MODELS (' + vms.length + ')</div>';
        html += '<hr/>';
        const groupedVMs = {};
        for (let i = 0; i < vms.length; i++) {
            const vm = vms[i];
            groupedVMs[vm.className] = (groupedVMs[vm.className] || 0) + 1;
        }
        for (const name in groupedVMs) {
            if (!Object.prototype.hasOwnProperty.call(groupedVMs, name)) continue;
            if (filter && !name.toLowerCase().includes(filter)) continue;
            html += '<div>' + escapeHtml(name) + ' x' + groupedVMs[name] + '</div>';
        }

        sidebarContentEl.innerHTML = html;
    }

    function toggleDebug() {
        debugEnabled = !debugEnabled;
        console.log('[UTDebug] Debug overlay', debugEnabled ? 'ENABLED' : 'DISABLED');
        if (!debugEnabled) {
            if (tooltipEl) tooltipEl.style.display = 'none';
            if (highlightEl) highlightEl.style.display = 'none';
            if (badgeEl) badgeEl.style.display = 'none';
            if (sidebarEl) sidebarEl.style.display = 'none';
            if (classWindowEl) classWindowEl.style.display = 'none';
            if (methodSpyWindowEl) methodSpyWindowEl.style.display = 'none';
        } else {
            if (sidebarEl) sidebarEl.style.display = '';
            if (classWindowVisible && classWindowEl) classWindowEl.style.display = 'block';
            if (methodSpyVisible && methodSpyWindowEl) methodSpyWindowEl.style.display = 'block';
            updateSidebar();
        }
    }



    function setupDebugOverlay() {
        createOverlayElements();
        createSidebar();
        attachSidebarClickHandler();
        createClassWindow();
        createMethodSpyWindow();

        // Toggle with Ctrl+Shift+U
        window.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'u') {
                toggleDebug();
            }

            if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'y') {
                toggleClassWindow();
            }

            if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'h') {
                toggleMethodSpyWindow();
            }
        });

        window.addEventListener('mousemove', updateOverlayForEvent);

        setInterval(() => {
            updateSidebar();

            if (methodSpyVisible && methodSpyNeedsRefresh) {
                updateMethodSpyList();
                methodSpyNeedsRefresh = false;
            }
        }, 1000);

    }

    // ---------- Init ----------

    function init() {
        activateDomHook();      // your working hook
        hookAllUTClasses();     // UT view/controller discovery
        setupDebugOverlay();
        console.log('[UTDebug] Ready. Press Ctrl+Shift+U to toggle.');
    }

    const start = Date.now();
    const maxMs = 60000;

    const interval = setInterval(() => {
        if (typeof w.UTRootView !== 'undefined' || typeof w.UTPlayerItemView !== 'undefined') {
            clearInterval(interval);
            init();
        } else if (Date.now() - start > maxMs) {
            clearInterval(interval);
            console.warn('[UTDebug] Timed out waiting for UT classes, starting with DOM hook only');
            activateDomHook();
            setupDebugOverlay();
        }
    }, 500);
})();
