/**
 * Overlay UI module - tooltip, highlight, badge, and debug toggle
 */

import {
  isDebugEnabled,
  setDebugEnabled,
  getTooltipEl,
  setTooltipEl,
  getHighlightEl,
  setHighlightEl,
  getBadgeEl,
  setBadgeEl,
  getSidebarEl,
  getClassWindowEl,
  getMethodSpyWindowEl,
  isClassWindowVisible,
  isMethodSpyVisible,
} from '../core/state';
import {
  getViewRecordForElement,
  ensureViewRecord,
  isDomButtonLike,
  makeControlInfo,
  isElementOnCurrentPage,
} from '../core/helpers';
import { updateSidebar } from './sidebar';
import { rescanUTClasses } from '../core/ut-class-hooks';

// Cache last target to avoid re-computing tooltip data when mouse moves within same element
let lastTarget: Element | null = null;

/**
 * Create overlay elements (tooltip, highlight, badge)
 */
export function createOverlayElements(): void {
  if (getTooltipEl()) return;

  const tooltipEl = document.createElement('div');
  tooltipEl.className = 'ut-debug-tooltip';
  tooltipEl.style.display = 'none';

  const highlightEl = document.createElement('div');
  highlightEl.className = 'ut-debug-highlight';
  highlightEl.style.display = 'none';

  const badgeEl = document.createElement('div');
  badgeEl.className = 'ut-debug-badge';
  badgeEl.style.display = 'none';

  document.body.appendChild(tooltipEl);
  document.body.appendChild(highlightEl);
  document.body.appendChild(badgeEl);

  setTooltipEl(tooltipEl);
  setHighlightEl(highlightEl);
  setBadgeEl(badgeEl);
}

/**
 * Get UT class stack from element by walking up DOM tree
 */
export function getUTClassStackFromElement(el: Element): string[] {
  const seen = new Set<string>();
  const stack: string[] = [];
  let cur: Element | null = el;
  while (cur && cur !== document.body) {
    if (typeof cur.getAttribute === 'function') {
      const attr = cur.getAttribute('data-ut-classes');
      if (attr) {
        const parts = attr.split(',');
        for (let i = 0; i < parts.length; i += 1) {
          const p = parts[i];
          if (!seen.has(p)) {
            seen.add(p);
            stack.push(p);
          }
        }
      }
    }
    cur = cur.parentElement;
  }
  return stack;
}

/**
 * Update overlay tooltip/highlight/badge on mousemove
 */
export function updateOverlayForEvent(evt: MouseEvent): void {
  if (!isDebugEnabled()) return;

  const tooltipEl = getTooltipEl();
  const highlightEl = getHighlightEl();
  const badgeEl = getBadgeEl();
  const sidebarEl = getSidebarEl();

  if (!tooltipEl || !highlightEl || !badgeEl) return;

  const { target } = evt;
  if (!target || !(target instanceof Element)) return;

  // Early return if target hasn't changed
  if (target === lastTarget) return;
  lastTarget = target;

  if (sidebarEl && sidebarEl.contains(target)) {
    tooltipEl.style.display = 'none';
    highlightEl.style.display = 'none';
    badgeEl.style.display = 'none';
    return;
  }

  const classes = getUTClassStackFromElement(target);
  const recDirect = getViewRecordForElement(target);
  const createdBy =
    (recDirect && recDirect.createdBy) || target.__utCreatedBy || null;

  if (!classes.length && !createdBy && !isDomButtonLike(target)) {
    tooltipEl.style.display = 'none';
    highlightEl.style.display = 'none';
    badgeEl.style.display = 'none';
    return;
  }

  const highlightTarget = target;
  const rect = highlightTarget.getBoundingClientRect();
  highlightEl.style.display = 'block';
  highlightEl.style.left = `${rect.left}px`;
  highlightEl.style.top = `${rect.top}px`;
  highlightEl.style.width = `${rect.width}px`;
  highlightEl.style.height = `${rect.height}px`;

  const rec = recDirect || ensureViewRecord(target);
  const snippet = rec && rec.lastItemSnippet;
  if (rec && !rec.createdBy && target.__utCreatedBy)
    rec.createdBy = target.__utCreatedBy;

  const ctrl = rec && rec.controlInfo;

  let text = '';
  if (classes.length) text += classes.join('\n');
  if (rec && rec.createdBy) {
    text += `${text ? '\n\n' : ''}createdBy: ${rec.createdBy}`;
  }
  if (snippet) {
    text += `${text ? '\n\n' : ''}item: ${snippet}`;
  }
  if (ctrl) {
    text += `${text ? '\n\n' : ''}control: ${ctrl.className}`;
    if (ctrl.label) text += `  label="${ctrl.label}"`;
    text += ctrl.disabled ? ' [disabled]' : '';
  } else if (isDomButtonLike(target)) {
    const domCtrl = makeControlInfo(target);
    text += `${text ? '\n\n' : ''}control: DOMButton`;
    if (domCtrl && domCtrl.label) text += `  label="${domCtrl.label}"`;
    text += domCtrl && domCtrl.disabled ? ' [disabled]' : '';
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
  tooltipEl.style.left = `${x}px`;
  tooltipEl.style.top = `${y}px`;
  tooltipEl.textContent = text;

  badgeEl.style.display = 'block';
  badgeEl.textContent = classes[0] || rec?.createdBy || 'node';
  badgeEl.style.left = `${rect.left + 4}px`;
  badgeEl.style.top = `${rect.top + 4}px`;
}

/**
 * Flash highlight on element and scroll into view
 */
export function flashViewRecord(rec: any): void {
  if (!rec || !rec.element) return;
  const el = rec.element;
  if (!isElementOnCurrentPage(el)) return;

  try {
    el.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'center',
    });
  } catch {
    // ignore
  }

  el.classList.add('ut-debug-flash');
  setTimeout(() => el.classList.remove('ut-debug-flash'), 800);

  const highlightEl = getHighlightEl();
  if (highlightEl) {
    const rect = el.getBoundingClientRect();
    highlightEl.style.display = 'block';
    highlightEl.style.left = `${rect.left}px`;
    highlightEl.style.top = `${rect.top}px`;
    highlightEl.style.width = `${rect.width}px`;
    highlightEl.style.height = `${rect.height}px`;
    setTimeout(() => {
      highlightEl.style.display = 'none';
    }, 800);
  }
}

/**
 * Toggle debug overlay on/off
 */
export function toggleDebug(): void {
  const newState = !isDebugEnabled();
  setDebugEnabled(newState);
  console.log('[UTDebug] Debug overlay', newState ? 'ENABLED' : 'DISABLED');

  const tooltipEl = getTooltipEl();
  const highlightEl = getHighlightEl();
  const badgeEl = getBadgeEl();
  const sidebarEl = getSidebarEl();
  const classWindowEl = getClassWindowEl();
  const methodSpyWindowEl = getMethodSpyWindowEl();

  if (!newState) {
    if (tooltipEl) tooltipEl.style.display = 'none';
    if (highlightEl) highlightEl.style.display = 'none';
    if (badgeEl) badgeEl.style.display = 'none';
    if (sidebarEl) sidebarEl.style.display = 'none';
    if (classWindowEl) classWindowEl.style.display = 'none';
    if (methodSpyWindowEl) methodSpyWindowEl.style.display = 'none';
  } else {
    if (sidebarEl) sidebarEl.style.display = '';
    if (isClassWindowVisible() && classWindowEl)
      classWindowEl.style.display = 'block';
    if (isMethodSpyVisible() && methodSpyWindowEl)
      methodSpyWindowEl.style.display = 'block';
    updateSidebar();
  }
}
