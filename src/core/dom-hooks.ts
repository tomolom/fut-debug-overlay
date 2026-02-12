/**
 * DOM patching and mutation tracking
 */

import { registry as UTDebugRegistry } from './registry';
import { ensureViewRecord } from './helpers';
import { dispatcher } from './hook-dispatcher';
import { originals } from './originals';
import {
  registerClassInfo,
  hookUTClass,
  wrapCtorForDebug,
} from './ut-class-hooks';
import { isDebugEnabled } from './state';

const w = window as any;
const DEBUG_LOGS = false;

function isInsideDebugShadowHost(node: Node): boolean {
  if (!(node instanceof Element)) return false;
  if (node.id === 'ut-debug-shadow-host') return true;
  if (node.closest('#ut-debug-shadow-host')) return true;

  const rootNode = node.getRootNode();
  if (rootNode instanceof ShadowRoot) {
    return (rootNode.host as Element | null)?.id === 'ut-debug-shadow-host';
  }

  return false;
}

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
  const appendKey = 'Node.prototype.appendChild';
  const insertBeforeKey = 'Node.prototype.insertBefore';
  const replaceChildKey = 'Node.prototype.replaceChild';

  if ((Node.prototype.appendChild as any).__utPatched) {
    const existingAppend = Node.prototype.appendChild as any;
    const existingInsertBefore = Node.prototype.insertBefore as any;
    const existingReplaceChild = Node.prototype.replaceChild as any;

    if (existingAppend.__utOriginal)
      originals.store(appendKey, existingAppend.__utOriginal);
    if (existingInsertBefore.__utOriginal)
      originals.store(insertBeforeKey, existingInsertBefore.__utOriginal);
    if (existingReplaceChild.__utOriginal)
      originals.store(replaceChildKey, existingReplaceChild.__utOriginal);
    return;
  }

  originals.store(appendKey, Node.prototype.appendChild);
  originals.store(insertBeforeKey, Node.prototype.insertBefore);
  originals.store(replaceChildKey, Node.prototype.replaceChild);

  const originalAppend =
    originals.get<typeof Node.prototype.appendChild>(appendKey);
  const originalInsertBefore =
    originals.get<typeof Node.prototype.insertBefore>(insertBeforeKey);
  const originalReplaceChild =
    originals.get<typeof Node.prototype.replaceChild>(replaceChildKey);

  if (!originalAppend || !originalInsertBefore || !originalReplaceChild) {
    return;
  }

  const patchedAppend = function <T extends Node>(this: Node, child: T): T {
    try {
      if (isDebugEnabled()) capture('appendChild', child);
    } catch {}

    const result = originalAppend.call(this, child) as T;

    try {
      dispatcher.emit('dom:appendChild', {
        source: 'appendChild',
        node: child,
        args: [child],
        originalResult: result,
      });
    } catch {}

    return result;
  };
  (patchedAppend as any).__utPatched = true;
  (patchedAppend as any).__utOriginal = originalAppend;
  Node.prototype.appendChild = patchedAppend;

  const patchedInsertBefore = function <T extends Node>(
    this: Node,
    child: T,
    ref: Node | null,
  ): T {
    try {
      if (isDebugEnabled()) capture('insertBefore', child);
    } catch {}

    const result = originalInsertBefore.call(this, child, ref) as T;

    try {
      dispatcher.emit('dom:insertBefore', {
        source: 'insertBefore',
        node: child,
        args: [child, ref],
        originalResult: result,
      });
    } catch {}

    return result;
  };
  (patchedInsertBefore as any).__utPatched = true;
  (patchedInsertBefore as any).__utOriginal = originalInsertBefore;
  Node.prototype.insertBefore = patchedInsertBefore;

  const patchedReplaceChild = function <T extends Node>(
    this: Node,
    child: Node,
    old: T,
  ): T {
    try {
      if (isDebugEnabled()) capture('replaceChild', child);
    } catch {}

    const result = originalReplaceChild.call(this, child, old) as T;

    try {
      dispatcher.emit('dom:replaceChild', {
        source: 'replaceChild',
        node: child,
        args: [child, old],
        originalResult: result,
      });
    } catch {}

    return result;
  };
  (patchedReplaceChild as any).__utPatched = true;
  (patchedReplaceChild as any).__utOriginal = originalReplaceChild;
  Node.prototype.replaceChild = patchedReplaceChild;

  const mo = new MutationObserver((mutations) => {
    if (!isDebugEnabled()) return;
    for (const m of mutations) {
      for (let i = 0; i < m.addedNodes.length; i++) {
        const node = m.addedNodes[i];
        if (!(node instanceof Element)) continue;
        if (isInsideDebugShadowHost(node)) continue;
        capture('mutation', node);
      }
    }
  });

  mo.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  console.log('%cUT DOM Hook active', 'color:#0f0');
}
