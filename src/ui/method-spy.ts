/**
 * Method Spy UI module - method call logging and details
 */

import {
  isDebugEnabled,
  isMethodSpyVisible,
  setMethodSpyVisible,
  getMethodSpyWindowEl,
  setMethodSpyWindowEl,
  getMethodSpyListEl,
  setMethodSpyListEl,
  getMethodSpyDetailsEl,
  setMethodSpyDetailsEl,
  getMethodSpyFilterInput,
  setMethodSpyFilterInput,
} from '../core/state';
import { registry } from '../core/registry';
import { escapeHtml } from '../core/helpers';
import { setupClassWindowDragging } from './drag';

/**
 * Create Method Spy window
 */
export function createMethodSpyWindow(): void {
  if (getMethodSpyWindowEl()) return;

  const methodSpyWindowEl = document.createElement('div');
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

  const methodSpyFilterInput = document.createElement('input');
  methodSpyFilterInput.className = 'ut-debug-methodspy-filter';
  methodSpyFilterInput.type = 'text';
  methodSpyFilterInput.placeholder = 'Filter by class / method...';

  const methodSpyListEl = document.createElement('div');
  methodSpyListEl.className = 'ut-debug-methodspy-list';

  listPane.appendChild(methodSpyFilterInput);
  listPane.appendChild(methodSpyListEl);

  const methodSpyDetailsEl = document.createElement('div');
  methodSpyDetailsEl.className = 'ut-debug-methodspy-details';
  methodSpyDetailsEl.textContent = 'No calls yet.';

  body.appendChild(listPane);
  body.appendChild(methodSpyDetailsEl);

  methodSpyWindowEl.appendChild(header);
  methodSpyWindowEl.appendChild(body);
  document.body.appendChild(methodSpyWindowEl);

  setMethodSpyWindowEl(methodSpyWindowEl);
  setMethodSpyListEl(methodSpyListEl);
  setMethodSpyDetailsEl(methodSpyDetailsEl);
  setMethodSpyFilterInput(methodSpyFilterInput);

  setupClassWindowDragging(header, methodSpyWindowEl);

  closeBtn.addEventListener('click', () => {
    setMethodSpyVisible(false);
    methodSpyWindowEl.style.display = 'none';
  });

  methodSpyFilterInput.addEventListener('input', () => {
    updateMethodSpyList();
  });

  methodSpyListEl.addEventListener('click', (e) => {
    let node = e.target as HTMLElement | null;
    while (
      node &&
      node !== methodSpyListEl &&
      !node.hasAttribute('data-call-id')
    ) {
      node = node.parentElement;
    }
    if (!node || node === methodSpyListEl) return;

    const callId = Number(node.getAttribute('data-call-id'));
    showMethodSpyDetails(callId);
  });

  updateMethodSpyList();
}

/**
 * Update method spy list with filtered calls
 */
export function updateMethodSpyList(): void {
  const methodSpyListEl = getMethodSpyListEl();
  if (!methodSpyListEl) return;

  const methodSpyFilterInput = getMethodSpyFilterInput();
  const filter = ((methodSpyFilterInput && methodSpyFilterInput.value) || '')
    .toLowerCase()
    .trim();
  const calls = registry.methodCalls.toArrayNewestFirst();
  let html = '';
  let renderedCount = 0;
  const MAX_RENDERED = 500;

  // Calls already newest-first from ring buffer
  for (let i = 0; i < calls.length; i += 1) {
    const c = calls[i];
    const timeStr = new Date(c.ts).toLocaleTimeString();
    const head = `${c.className}.${c.methodName}`;
    const base = `${head} ${c.argPreviews.join(' ')} ${c.resultPreview || ''} ${c.errorPreview || ''}`;
    const haystack = base.toLowerCase();

    if (filter && !haystack.includes(filter)) continue;

    // Cap rendering at 500 rows
    if (renderedCount >= MAX_RENDERED) {
      const remaining = calls.length - i;
      html += `<div class="ut-debug-methodspy-row" style="font-style: italic; opacity: 0.6;">... ${remaining} more calls (use filter to narrow)</div>`;
      break;
    }

    let tail;
    if (c.threw) {
      tail = ' !! threw';
    } else {
      tail = ` => ${c.resultPreview || 'undefined'}`;
    }

    html +=
      `<div class="ut-debug-methodspy-row" data-call-id="${c.id}">` +
      `[${timeStr}] ${escapeHtml(head)}` +
      ` (${c.argPreviews.length} args)${escapeHtml(tail)}</div>`;

    renderedCount += 1;
  }

  methodSpyListEl.innerHTML =
    html || '<div class="ut-debug-methodspy-row">(no calls logged yet)</div>';
}

/**
 * Show details for a specific method call
 */
export function showMethodSpyDetails(callId: number): void {
  const methodSpyDetailsEl = getMethodSpyDetailsEl();
  if (!methodSpyDetailsEl) return;

  const c = registry.methodCalls.find((call) => call.id === callId);
  if (!c) {
    methodSpyDetailsEl.textContent = 'Call not found (might have been pruned).';
    return;
  }

  const timeStr = new Date(c.ts).toLocaleString();
  let text = '';
  text += `Time: ${timeStr}\n`;
  text += `Class: ${c.className}\n`;
  text += `Method: ${c.methodName}${c.isStatic ? ' [static]' : ' [instance]'}\n`;
  text += `Arguments (${c.argPreviews.length}):\n\n`;

  for (let i = 0; i < c.argPreviews.length; i += 1) {
    text += `  [${i}] ${c.argPreviews[i]}\n`;
  }

  text += '\n';

  if (c.threw) {
    text += `Threw error:\n  ${c.errorPreview || '(unknown error)'}\n`;
  } else {
    text += `Return value:\n  ${c.resultPreview || 'undefined'}\n`;
  }

  methodSpyDetailsEl.textContent = text;
}

/**
 * Toggle Method Spy window visibility
 */
export function toggleMethodSpyWindow(): void {
  const newVisible = !isMethodSpyVisible();
  setMethodSpyVisible(newVisible);

  let methodSpyWindowEl = getMethodSpyWindowEl();
  if (!methodSpyWindowEl) {
    createMethodSpyWindow();
    methodSpyWindowEl = getMethodSpyWindowEl();
  }

  if (methodSpyWindowEl) {
    methodSpyWindowEl.style.display =
      newVisible && isDebugEnabled() ? 'block' : 'none';
  }

  if (newVisible) {
    updateMethodSpyList();
  }
}
