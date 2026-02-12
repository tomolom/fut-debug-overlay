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

const w = window as any;

export function wrapCtorForDebug(name: string): void {
  const Original = w[name];
  if (typeof Original !== 'function') return;
  if (Original.__utCtorWrapped) return;

  function WrappedCtor(this: any) {
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

export function hookUTClass(name: string): boolean {
  const Ctor = w[name];
  if (!Ctor || !Ctor.prototype) return false;
  if (Ctor.prototype.__utDebugHooked) return true;

  let hooked = false;

  if (typeof Ctor.prototype.rootElement === 'function') {
    const origRoot = Ctor.prototype.rootElement;
    Ctor.prototype.rootElement = function (this: any) {
      const el = origRoot.apply(this, arguments);
      handleElementForClass(el, name);
      return el;
    };
    hooked = true;
  }

  if (typeof Ctor.prototype.renderItem === 'function') {
    const origRenderItem = Ctor.prototype.renderItem;
    Ctor.prototype.renderItem = function (this: any, item: any) {
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
        const wrapped = function (this: any) {
          let result;

          try {
            result = original.apply(this, arguments);
          } catch (e) {
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
      )
        continue;

      const original = Ctor[k];
      if (typeof original !== 'function') continue;

      staticMethods.push(getFunctionSignature(k, original));

      if (!original.__utSpyWrapped) {
        const wrappedStatic = function (this: any) {
          let result;

          try {
            result = original.apply(this, arguments);
          } catch (e) {
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
    staticMethods: staticMethods.sort(),
  });
}
