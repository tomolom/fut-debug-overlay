/**
 * Sidebar UI module - Views/Controllers/ViewModels panel
 */

import {
  isDebugEnabled,
  getSidebarEl,
  setSidebarEl,
  getSidebarContentEl,
  setSidebarContentEl,
  setSidebarFilterInput,
  isSidebarDirty,
  setSidebarDirty,
} from '../core/state';
import { registry } from '../core/registry';
import { pruneViewRegistry, escapeHtml } from '../core/helpers';
import { flashViewRecord } from './overlay';
import { getShadowRoot } from './shadow-host';
import { inspectInstance } from './instance-inspector';

/**
 * Create sidebar panel with filter input
 */
export function createSidebar(): void {
  if (getSidebarEl()) return;

  const sidebarEl = document.createElement('div');
  sidebarEl.className = 'ut-debug-sidebar';
  sidebarEl.style.display = 'none';

  const sidebarFilterInput = document.createElement('input');
  sidebarFilterInput.className = 'ut-debug-sidebar-filter';
  sidebarFilterInput.type = 'text';
  sidebarFilterInput.placeholder = 'Filter (class, createdBy, label, item)...';

  const sidebarContentEl = document.createElement('div');
  sidebarContentEl.style.flex = '1 1 auto';
  sidebarContentEl.style.overflow = 'auto';

  sidebarEl.appendChild(sidebarFilterInput);
  sidebarEl.appendChild(sidebarContentEl);
  getShadowRoot().appendChild(sidebarEl);

  setSidebarEl(sidebarEl);
  setSidebarContentEl(sidebarContentEl);
  setSidebarFilterInput(sidebarFilterInput);

  registry.filterText = '';

  sidebarFilterInput.addEventListener('input', () => {
    registry.filterText = sidebarFilterInput.value || '';
    setSidebarDirty(true);
    updateSidebar();
  });
}

/**
 * Attach click handler to sidebar rows for flash-highlight and inspection
 */
export function attachSidebarClickHandler(): void {
  const sidebarEl = getSidebarEl();
  const sidebarContentEl = getSidebarContentEl();
  if (!sidebarEl || !sidebarContentEl) return;

  sidebarEl.addEventListener('click', (e) => {
    let node = e.target as HTMLElement | null;
    while (
      node &&
      node !== sidebarEl &&
      !node.classList.contains('ut-debug-view-row') &&
      !node.classList.contains('ut-debug-ctrl-row') &&
      !node.classList.contains('ut-debug-vm-row')
    ) {
      node = node.parentElement;
    }
    if (!node || node === sidebarEl) return;

    // View/Node click -> Flash highlight
    if (node.classList.contains('ut-debug-view-row')) {
      const idx = Number(node.getAttribute('data-view-idx'));
      const views = registry._lastViews || [];
      const rec = views[idx];
      if (rec) {
        flashViewRecord(rec);
      }
      return;
    }

    // Controller click -> Inspect
    if (node.classList.contains('ut-debug-ctrl-row')) {
      const idx = Number(node.getAttribute('data-ctrl-idx'));
      const ctrls = registry._lastControllers || [];
      const entry = ctrls[idx];
      if (entry && entry.instance) {
        inspectInstance(entry.instance);
      }
      return;
    }

    // ViewModel click -> Inspect
    if (node.classList.contains('ut-debug-vm-row')) {
      const idx = Number(node.getAttribute('data-vm-idx'));
      const vms = registry._lastViewModels || [];
      const entry = vms[idx];
      if (entry && entry.instance) {
        inspectInstance(entry.instance);
      }
      return;
    }
  });
}

/**
 * Update sidebar content with Views/Controllers/ViewModels
 */
export function updateSidebar(): void {
  const sidebarEl = getSidebarEl();
  const sidebarContentEl = getSidebarContentEl();
  if (!sidebarEl || !sidebarContentEl) return;

  if (!isDebugEnabled()) {
    sidebarEl.style.display = 'none';
    return;
  }

  if (!isSidebarDirty()) {
    return;
  }

  pruneViewRegistry();

  sidebarEl.style.display = '';

  const views = Array.from(registry.views);
  registry._lastViews = views;

  // Use copies for rendering to match indices
  const controllers = [...registry.controllers];
  const vms = [...registry.viewModels];
  registry._lastControllers = controllers;
  registry._lastViewModels = vms;

  const filter = (registry.filterText || '').toLowerCase().trim();

  let html = '';

  // VIEWS / DOM nodes
  const MAX_ROWS = 200; // Reduced to balance multiple sections
  let renderedViewCount = 0;
  let totalMatchingViews = 0;

  html += `<div class="ut-debug-sidebar-section-title">VIEWS / NODES (${views.length})</div>`;
  html += '<hr/>';
  for (let i = 0; i < views.length; i += 1) {
    const rec = views[i];
    const classList = Array.from(rec.classes).join(', ');
    const snippet = rec.lastItemSnippet || '';
    const ctrl = rec.controlInfo;
    const createdBy = rec.createdBy || '';

    let extra = '';
    if (createdBy) {
      extra += `[createdBy ${createdBy}] `;
    }
    if (ctrl) {
      extra += `[control ${ctrl.className}`;
      if (ctrl.label) extra += ` label="${ctrl.label}"`;
      extra += ctrl.disabled ? ' disabled]' : ']';
    }

    const haystack = `${classList} ${snippet} ${extra}`.toLowerCase();
    if (filter && !haystack.includes(filter)) continue;

    totalMatchingViews += 1;

    if (renderedViewCount >= MAX_ROWS) continue;

    html +=
      `<div class="ut-debug-view-row" data-view-idx="${i}">` +
      `<div class="ut-debug-view-row-title">${escapeHtml(
        classList || createdBy || 'node',
      )}</div>${
        snippet
          ? `<div class="ut-debug-view-row-snippet">${escapeHtml(snippet)}</div>`
          : ''
      }${
        extra
          ? `<div class="ut-debug-view-row-snippet">${escapeHtml(extra)}</div>`
          : ''
      }</div>`;

    renderedViewCount += 1;
  }

  if (totalMatchingViews > MAX_ROWS) {
    const remaining = totalMatchingViews - MAX_ROWS;
    html += `<div style="padding:4px 8px;color:#888;font-style:italic;">... and ${remaining} more</div>`;
  }

  // CONTROLLERS
  html += `<div class="ut-debug-sidebar-section-title" style="margin-top:8px;">VIEW CONTROLLERS (${controllers.length})</div>`;
  html += '<hr/>';

  let renderedCtrlCount = 0;
  let totalMatchingCtrls = 0;

  for (let i = 0; i < controllers.length; i += 1) {
    const c = controllers[i];
    if (filter && !c.className.toLowerCase().includes(filter)) continue;

    totalMatchingCtrls += 1;
    if (renderedCtrlCount >= MAX_ROWS) continue;

    html += `<div class="ut-debug-view-row ut-debug-ctrl-row" data-ctrl-idx="${i}">
      <div class="ut-debug-view-row-title">${escapeHtml(c.className)}</div>
    </div>`;
    renderedCtrlCount += 1;
  }

  if (totalMatchingCtrls > MAX_ROWS) {
    const remaining = totalMatchingCtrls - MAX_ROWS;
    html += `<div style="padding:4px 8px;color:#888;font-style:italic;">... and ${remaining} more</div>`;
  }

  // VIEW MODELS
  html += `<div class="ut-debug-sidebar-section-title" style="margin-top:8px;">VIEW MODELS (${vms.length})</div>`;
  html += '<hr/>';

  let renderedVmCount = 0;
  let totalMatchingVms = 0;

  for (let i = 0; i < vms.length; i += 1) {
    const vm = vms[i];
    if (filter && !vm.className.toLowerCase().includes(filter)) continue;

    totalMatchingVms += 1;
    if (renderedVmCount >= MAX_ROWS) continue;

    html += `<div class="ut-debug-view-row ut-debug-vm-row" data-vm-idx="${i}">
      <div class="ut-debug-view-row-title">${escapeHtml(vm.className)}</div>
    </div>`;
    renderedVmCount += 1;
  }

  if (totalMatchingVms > MAX_ROWS) {
    const remaining = totalMatchingVms - MAX_ROWS;
    html += `<div style="padding:4px 8px;color:#888;font-style:italic;">... and ${remaining} more</div>`;
  }

  sidebarContentEl.innerHTML = html;
  setSidebarDirty(false);
}
