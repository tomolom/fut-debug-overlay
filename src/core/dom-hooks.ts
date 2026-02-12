/**
 * DOM patching and mutation tracking
 */

import { registry as UTDebugRegistry } from './registry';
import { ensureViewRecord } from './helpers';
import {
  registerClassInfo,
  hookUTClass,
  wrapCtorForDebug,
} from './ut-class-hooks';
import { isDebugEnabled } from './state';

const w = window as any;
const DEBUG_LOGS = false;

export function capture(source: string, node: any): void {
  if (!isDebugEnabled()) return;

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

        if (
          !UTDebugRegistry.classes.has(clsName) &&
          typeof w[clsName] === 'function'
        ) {
          try {
            registerClassInfo(clsName);
            hookUTClass(clsName);
            if (/ViewController$/.test(clsName) || /ViewModel$/.test(clsName)) {
              wrapCtorForDebug(clsName);
            }
            if (DEBUG_LOGS)
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

export function activateDomHook(): void {
  const originalAppend = Node.prototype.appendChild;
  const originalInsertBefore = Node.prototype.insertBefore;
  const originalReplaceChild = Node.prototype.replaceChild;

  Node.prototype.appendChild = function <T extends Node>(child: T): T {
    if (isDebugEnabled()) capture('appendChild', child);
    return originalAppend.call(this, child) as T;
  };

  Node.prototype.insertBefore = function <T extends Node>(
    child: T,
    ref: Node | null,
  ): T {
    if (isDebugEnabled()) capture('insertBefore', child);
    return originalInsertBefore.call(this, child, ref) as T;
  };

  Node.prototype.replaceChild = function <T extends Node>(
    child: Node,
    old: T,
  ): T {
    if (isDebugEnabled()) capture('replaceChild', child);
    return originalReplaceChild.call(this, child, old) as T;
  };

  const mo = new MutationObserver((mutations) => {
    if (!isDebugEnabled()) return;
    for (const m of mutations) {
      for (let i = 0; i < m.addedNodes.length; i++) {
        const node = m.addedNodes[i];
        if (node instanceof Element) capture('mutation', node);
      }
    }
  });

  mo.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  console.log('%cUT DOM Hook active', 'color:#0f0');
}
