/**
 * Helper utility functions
 */

import { registry } from './registry';
import type { ViewRecord } from '../types';

export function getFunctionSignature(name: string, fn: any): string {
  if (typeof fn !== 'function') return `${name}()`;

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
      m =
        src.match(/^\s*\(([^)]*)\)\s*=>/) ||
        src.match(/^\s*([^=\s\(\)]+)\s*=>/);
      if (m) {
        args = (m[1] || '').trim();
      }
    } else {
      args = (m[1] || '').trim();
    }

    if (!args) {
      return `${name}()`;
    }

    // strip block comments and line comments
    args = args
      .replace(/\/\*.*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')
      .trim()
      .replace(/\s+/g, ' ');

    return `${name}(${args})`;
  } catch {
    return `${name}()`;
  }
}

export function isDomButtonLike(el: any): boolean {
  if (!el || !(el instanceof Element)) return false;
  const tag = el.tagName;
  if (tag === 'BUTTON') return true;
  const role = el.getAttribute && el.getAttribute('role');
  if (role && role.toLowerCase() === 'button') return true;
  const cls = (el.className || '').toString();
  if (/btn\b/i.test(cls) || /\bbutton\b/i.test(cls)) return true;
  return false;
}

export function makeItemSnippet(item: any): string | null {
  if (!item) return null;
  try {
    const out: any = {};
    const keys = [
      'definitionId',
      'resourceId',
      'id',
      'rating',
      'overallRating',
      'preferredPosition',
      'position',
      'name',
      'firstName',
      'lastName',
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

export function makeControlInfo(el: any): any {
  if (!el) return null;

  let label = '';
  try {
    label = (el.innerText || el.textContent || '').trim();
  } catch {}

  if (!label && el.getAttribute) {
    const tt = el.getAttribute('title') || el.getAttribute('aria-label');
    if (tt) label = tt.trim();
  }

  const domClass = (el.className || '').toString();
  const disabled =
    /\bdisabled\b/i.test(domClass) ||
    (el.getAttribute && el.getAttribute('aria-disabled') === 'true');

  return {
    type: 'button',
    className: 'DOMButton',
    label,
    disabled,
    domClass,
  };
}

export function ensureViewRecord(element: any): ViewRecord | null {
  if (!element || !(element instanceof Element)) return null;
  let rec = registry.viewMap.get(element);
  if (!rec) {
    rec = {
      element,
      classes: new Set(),
      lastItemSnippet: null,
      controlInfo: null,
      createdBy: element.__utCreatedBy || null,
      createdStack: element.__utStack || null,
    };
    registry.viewMap.set(element, rec);
    registry.views.add(rec);
  } else {
    // refresh createdBy/stack if newly set
    if (!rec.createdBy && element.__utCreatedBy)
      rec.createdBy = element.__utCreatedBy;
    if (!rec.createdStack && element.__utStack)
      rec.createdStack = element.__utStack;
  }
  return rec;
}

export function getViewRecordForElement(el: any): ViewRecord | null {
  if (!el) return null;
  return registry.viewMap.get(el) || null;
}

export function tagElementWithClass(el: any, className: string): void {
  if (!el || !(el instanceof Element)) return;
  const existing = el.getAttribute('data-ut-classes');
  if (existing) {
    const parts = existing.split(',');
    if (!parts.includes(className)) {
      el.setAttribute('data-ut-classes', `${existing},${className}`);
    }
  } else {
    el.setAttribute('data-ut-classes', className);
  }
}

export function handleElementForClass(el: any, name: string): void {
  if (!el) return;
  tagElementWithClass(el, name);
  const rec = ensureViewRecord(el);
  if (!rec) return;
  rec.classes.add(name);
}

export function summarizeArg(arg: any): string {
  try {
    if (arg === null) return 'null';
    if (arg === undefined) return 'undefined';

    const t = typeof arg;
    if (t === 'string') {
      if (arg.length > 60) {
        return JSON.stringify(`${arg.slice(0, 57)}…`);
      }
      return JSON.stringify(arg);
    }
    if (t === 'number' || t === 'boolean') {
      return String(arg);
    }

    if (arg instanceof Element) {
      const cls = (arg.className || '').toString().trim();
      return `<Element ${arg.tagName.toLowerCase()}${cls ? ` .${cls.replace(/\s+/g, '.')}` : ''}>`;
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

    return `[${t}]`;
  } catch {
    return '[arg]';
  }
}

export function looksLikeItem(obj: any): boolean {
  if (!obj || typeof obj !== 'object') return false;
  const hasId = 'definitionId' in obj || 'resourceId' in obj || 'id' in obj;
  const hasRating = 'rating' in obj || 'overallRating' in obj;
  const hasName = 'name' in obj || 'lastName' in obj;
  return hasId && (hasRating || hasName);
}

const ESC_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (c) => ESC_MAP[c]);
}

export function isElementOnCurrentPage(el: any): boolean {
  if (!el) return false;
  if (!document.body.contains(el)) return false;
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return false;
  return true;
}

export function pruneViewRegistry(): void {
  for (const rec of Array.from(registry.views)) {
    const el = rec.element;
    if (!isElementOnCurrentPage(el)) {
      registry.views.delete(rec);
      continue;
    }
    // Refresh createdBy/stack if DOM hook added it later
    if (!rec.createdBy && el.__utCreatedBy) rec.createdBy = el.__utCreatedBy;
    if (!rec.createdStack && el.__utStack) rec.createdStack = el.__utStack;

    if (!rec.controlInfo && isDomButtonLike(el)) {
      rec.controlInfo = makeControlInfo(el);
    }
  }
}
