/**
 * UT class discovery and wrapping functions
 */

import { registry as UTDebugRegistry } from './registry';
import {
  getFunctionSignature,
  makeItemSnippet,
  getViewRecordForElement,
  handleElementForClass,
  summarizeArg,
  looksLikeItem,
} from './helpers';
import {
  isMethodSpyVisible,
  incrementMethodSpyNextId,
  setMethodSpyNeedsRefresh,
} from './state';
import { dispatcher } from './hook-dispatcher';
import { originals } from './originals';

const w = window as any;
const MAX_CONTROLLERS = 1000;
const MAX_VIEW_MODELS = 1000;

interface MethodCallDispatchMeta {
  className: string;
  methodName: string;
  isStatic: boolean;
  threw: boolean;
  errorObj: unknown;
  durationMs: number;
}

let methodCallDispatcherBound = false;

function dispatchMethodCall(
  className: string,
  methodName: string,
  isStatic: boolean,
  argsLike: IArguments,
  resultValue: any,
  threw: boolean,
  errorObj: any,
  durationMs: number,
): void {
  try {
    const meta: MethodCallDispatchMeta = {
      className,
      methodName,
      isStatic,
      threw,
      errorObj,
      durationMs,
    };

    dispatcher.emit('method:call', {
      source: `${className}.${methodName}`,
      node: meta,
      args: Array.from(argsLike),
      originalResult: resultValue,
    });
  } catch {}
}

function ensureMethodCallDispatcherBinding(): void {
  if (methodCallDispatcherBound) return;

  dispatcher.on('method:call', (payload) => {
    const meta = payload.node as MethodCallDispatchMeta;
    if (!meta || !meta.className || !meta.methodName) return;

    recordMethodCall(
      meta.className,
      meta.methodName,
      !!meta.isStatic,
      payload.args as unknown as IArguments,
      payload.originalResult,
      !!meta.threw,
      meta.errorObj,
    );
  });

  methodCallDispatcherBound = true;
}

export function wrapCtorForDebug(name: string): void {
  const currentCtor = w[name];
  if (typeof currentCtor !== 'function') return;
  if (currentCtor.__utCtorWrapped) return;

  const ctorKey = `window.${name}`;
  const ctorToStore = currentCtor.__utOriginalCtor || currentCtor;
  originals.store(ctorKey, ctorToStore);
  const Original = originals.get<any>(ctorKey) || currentCtor;

  function WrappedCtor(this: any) {
    const instance = Original.apply(this, arguments) || this;
    const entry = { className: name, instance, createdAt: Date.now() };
    if (/ViewController$/.test(name)) {
      UTDebugRegistry.controllers.push(entry);
      if (UTDebugRegistry.controllers.length > MAX_CONTROLLERS) {
        UTDebugRegistry.controllers =
          UTDebugRegistry.controllers.slice(-MAX_CONTROLLERS);
      }
    } else if (/ViewModel$/.test(name)) {
      UTDebugRegistry.viewModels.push(entry);
      if (UTDebugRegistry.viewModels.length > MAX_VIEW_MODELS) {
        UTDebugRegistry.viewModels =
          UTDebugRegistry.viewModels.slice(-MAX_VIEW_MODELS);
      }
    }
    return instance;
  }

  WrappedCtor.prototype = Original.prototype;
  Object.setPrototypeOf(WrappedCtor, Original);
  WrappedCtor.__utCtorWrapped = true;
  WrappedCtor.__utOriginalCtor = Original;
  w[name] = WrappedCtor;
  Original.__utCtorWrapped = true;
}

export function hookUTClass(name: string): boolean {
  const Ctor = w[name];
  if (!Ctor || !Ctor.prototype) return false;
  if (Ctor.prototype.__utDebugHooked) return true;

  let hooked = false;

  if (typeof Ctor.prototype.rootElement === 'function') {
    const rootKey = `${name}.prototype.rootElement`;
    const currentRoot = Ctor.prototype.rootElement;
    const rootToStore = currentRoot.__utOriginalMethod || currentRoot;
    originals.store(rootKey, rootToStore);
    const origRoot = originals.get<any>(rootKey) || currentRoot;

    const wrappedRoot = function (this: any) {
      const el = origRoot.apply(this, arguments);
      handleElementForClass(el, name);
      return el;
    };
    wrappedRoot.__utDebugHooked = true;
    wrappedRoot.__utOriginalMethod = origRoot;
    Ctor.prototype.rootElement = wrappedRoot;
    hooked = true;
  }

  if (typeof Ctor.prototype.renderItem === 'function') {
    const renderKey = `${name}.prototype.renderItem`;
    const currentRender = Ctor.prototype.renderItem;
    const renderToStore = currentRender.__utOriginalMethod || currentRender;
    originals.store(renderKey, renderToStore);
    const origRenderItem = originals.get<any>(renderKey) || currentRender;

    const wrappedRenderItem = function (this: any, item: any) {
      const result = origRenderItem.apply(this, arguments);
      const el =
        this.__root ||
        (typeof this.rootElement === 'function' && this.rootElement());
      handleElementForClass(el, name);
      const rec = el && getViewRecordForElement(el);
      if (rec && item) {
        rec.lastItemSnippet = makeItemSnippet(item);
      }
      return result;
    };
    wrappedRenderItem.__utDebugHooked = true;
    wrappedRenderItem.__utOriginalMethod = origRenderItem;
    Ctor.prototype.renderItem = wrappedRenderItem;
    hooked = true;
  }

  if (hooked) Ctor.prototype.__utDebugHooked = true;
  return hooked;
}

export function hookAllUTClasses(): void {
  const keys = Object.keys(w).filter((k) => /^UT[A-Z].+/.test(k));
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

export function rescanUTClasses(): void {
  const keys = Object.keys(w).filter((k) => /^UT[A-Z].+/.test(k));
  let newCount = 0;
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    // Only process if not already in registry
    if (!UTDebugRegistry.classes.has(k)) {
      registerClassInfo(k);
      hookUTClass(k);
      if (/ViewController$/.test(k) || /ViewModel$/.test(k)) {
        wrapCtorForDebug(k);
      }
      newCount++;
    }
  }
  if (newCount > 0) {
    console.log('[UTDebug] Rescanned and found new UT classes:', newCount);
  }
}

export function recordMethodCall(
  className: string,
  methodName: string,
  isStatic: boolean,
  argsLike: IArguments,
  resultValue: any,
  threw: boolean,
  errorObj: any,
): void {
  // 🚀 If the Method Spy isn't visible, do NOTHING.
  if (!isMethodSpyVisible()) return;

  const ts = Date.now();

  const argPreviews: string[] = [];
  for (let i = 0; i < argsLike.length; i++) {
    const a = argsLike[i];
    let s = summarizeArg(a);
    if (looksLikeItem(a)) {
      s = `[ITEM] ${s}`;
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
    id: incrementMethodSpyNextId(),
    ts,
    className,
    methodName,
    isStatic,
    argPreviews,
    resultPreview,
    errorPreview,
    threw,
  };

  UTDebugRegistry.methodCalls.push(call);

  setMethodSpyNeedsRefresh(true);
}

export function registerClassInfo(name: string): void {
  const Ctor = w[name];
  if (typeof Ctor !== 'function') return;

  ensureMethodCallDispatcherBinding();

  const protoMethods: string[] = [];
  const staticMethods: string[] = [];

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
        const protoKey = `${name}.prototype.${k}`;
        const originalMethod = original.__utOriginalMethod || original;
        originals.store(protoKey, originalMethod);
        const storedOriginal = originals.get<any>(protoKey) || originalMethod;

        const wrapped = function (this: any) {
          if (!isMethodSpyVisible())
            return storedOriginal.apply(this, arguments);

          const startTime = performance.now();
          let result;

          try {
            result = storedOriginal.apply(this, arguments);
          } catch (e) {
            const durationMs = performance.now() - startTime;
            try {
              dispatchMethodCall(
                name,
                k,
                false,
                arguments,
                undefined,
                true,
                e,
                durationMs,
              );
            } catch {}
            throw e;
          }

          const durationMs = performance.now() - startTime;
          try {
            dispatchMethodCall(
              name,
              k,
              false,
              arguments,
              result,
              false,
              null,
              durationMs,
            );
          } catch {}

          return result;
        };
        wrapped.__utSpyWrapped = true;
        wrapped.__utOriginalMethod = storedOriginal;
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
      )
        continue;

      const original = Ctor[k];
      if (typeof original !== 'function') continue;

      staticMethods.push(getFunctionSignature(k, original));

      if (!original.__utSpyWrapped) {
        const staticKey = `${name}.static.${k}`;
        const originalMethod = original.__utOriginalMethod || original;
        originals.store(staticKey, originalMethod);
        const storedOriginal = originals.get<any>(staticKey) || originalMethod;

        const wrappedStatic = function (this: any) {
          if (!isMethodSpyVisible())
            return storedOriginal.apply(this, arguments);

          const startTime = performance.now();
          let result;

          try {
            result = storedOriginal.apply(this, arguments);
          } catch (e) {
            const durationMs = performance.now() - startTime;
            try {
              dispatchMethodCall(
                name,
                k,
                true,
                arguments,
                undefined,
                true,
                e,
                durationMs,
              );
            } catch {}
            throw e;
          }

          const durationMs = performance.now() - startTime;
          try {
            dispatchMethodCall(
              name,
              k,
              true,
              arguments,
              result,
              false,
              null,
              durationMs,
            );
          } catch {}

          return result;
        };
        wrappedStatic.__utSpyWrapped = true;
        wrappedStatic.__utOriginalMethod = storedOriginal;
        Ctor[k] = wrappedStatic;
      }
    }
  } catch {}

  UTDebugRegistry.classes.set(name, {
    ctor: Ctor,
    protoMethods: protoMethods.sort(),
    staticMethods: staticMethods.sort(),
  });
}
