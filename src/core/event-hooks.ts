/**
 * Event listener tracking
 */

import { registry as UTDebugRegistry } from './registry';
import { isDebugEnabled } from './state';

const originalAddEventListener = EventTarget.prototype.addEventListener;

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

  EventTarget.prototype.addEventListener = function (
    type: any,
    listener: any,
    options: any,
  ) {
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

    return originalAddEventListener.call(this, type, listener, options);
  };
}
