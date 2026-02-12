/**
 * Event listener tracking
 */

import { registry as UTDebugRegistry } from './registry';
import { dispatcher } from './hook-dispatcher';
import { originals } from './originals';
import { isDebugEnabled } from './state';

const MAX_LISTENERS = 5000;

export function makeDomSelectorLike(el: any): string {
  if (!(el instanceof Element)) return '';
  let sel = el.tagName.toLowerCase();
  if (el.id) sel += `#${el.id}`;
  const cls = (el.className || '').toString().trim();
  if (cls) sel += `.${cls.split(/\s+/).join('.')}`;
  return sel;
}

export function initEventHooks(): void {
  UTDebugRegistry.listeners = UTDebugRegistry.listeners || []; // safety

  const key = 'EventTarget.prototype.addEventListener';
  const currentAdd = EventTarget.prototype.addEventListener as any;
  if (currentAdd.__utPatched) {
    if (currentAdd.__utOriginal) originals.store(key, currentAdd.__utOriginal);
    return;
  }

  originals.store(key, EventTarget.prototype.addEventListener);
  const originalAddEventListener =
    originals.get<typeof EventTarget.prototype.addEventListener>(key);
  if (!originalAddEventListener) return;

  const patchedAddEventListener = function (
    this: EventTarget,
    type: any,
    listener: any,
    options: any,
  ) {
    let originalResult: any;

    if (isDebugEnabled()) {
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
            utStack: ut,
          };
          UTDebugRegistry.listeners.push(entry);
          if (UTDebugRegistry.listeners.length > MAX_LISTENERS) {
            UTDebugRegistry.listeners =
              UTDebugRegistry.listeners.slice(-MAX_LISTENERS);
          }

          // tag the element so we can spot it
          if (createdBy) {
            const prev = this.getAttribute('data-ut-events') || '';
            const tag = `${type}@${createdBy}`;
            if (!prev.includes(tag)) {
              this.setAttribute(
                'data-ut-events',
                (prev ? `${prev},` : '') + tag,
              );
            }
          }
        }
      } catch (e) {
        // don't let spying break the app
      }
    }

    originalResult = originalAddEventListener.call(
      this,
      type,
      listener,
      options,
    );

    try {
      dispatcher.emit('event:addEventListener', {
        source: 'addEventListener',
        node: this,
        args: [type, listener, options],
        originalResult,
      });
    } catch {}

    return originalResult;
  };

  (patchedAddEventListener as any).__utPatched = true;
  (patchedAddEventListener as any).__utOriginal = originalAddEventListener;
  EventTarget.prototype.addEventListener = patchedAddEventListener;
}
