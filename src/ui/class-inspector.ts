/**
 * Class Inspector UI module - UT class browser with methods
 */

import {
  isDebugEnabled,
  getClassWindowEl,
  setClassWindowEl,
  getClassWindowClassListEl,
  setClassWindowClassListEl,
  getClassWindowMethodListEl,
  setClassWindowMethodListEl,
  getClassWindowFilterInput,
  setClassWindowFilterInput,
  isClassWindowVisible,
  setClassWindowVisible,
  getSelectedClassName,
  setSelectedClassName,
} from '../core/state';
import { registry } from '../core/registry';
import { escapeHtml } from '../core/helpers';
import { setupClassWindowDragging } from './drag';

/**
 * Create Class Inspector window
 */
export function createClassWindow(): void {
  if (getClassWindowEl()) return;

  const classWindowEl = document.createElement('div');
  classWindowEl.className = 'ut-debug-class-window';
  classWindowEl.style.display = 'none';

  const header = document.createElement('div');
  header.className = 'ut-debug-class-window-header';

  const title = document.createElement('div');
  title.className = 'ut-debug-class-window-title';
  title.textContent = 'UT Class Inspector';

  const closeBtn = document.createElement('div');
  closeBtn.className = 'ut-debug-class-window-close';
  closeBtn.textContent = '×';

  header.appendChild(title);
  header.appendChild(closeBtn);

  const body = document.createElement('div');
  body.className = 'ut-debug-class-window-body';

  // Left side: class list + filter
  const classListPane = document.createElement('div');
  classListPane.className = 'ut-debug-class-list';

  const classWindowFilterInput = document.createElement('input');
  classWindowFilterInput.className = 'ut-debug-class-filter';
  classWindowFilterInput.type = 'text';
  classWindowFilterInput.placeholder = 'Filter classes...';

  const classWindowClassListEl = document.createElement('div');
  classWindowClassListEl.className = 'ut-debug-class-list-inner';

  classListPane.appendChild(classWindowFilterInput);
  classListPane.appendChild(classWindowClassListEl);

  // Right side: methods
  const classWindowMethodListEl = document.createElement('div');
  classWindowMethodListEl.className = 'ut-debug-method-list';

  body.appendChild(classListPane);
  body.appendChild(classWindowMethodListEl);

  classWindowEl.appendChild(header);
  classWindowEl.appendChild(body);
  document.body.appendChild(classWindowEl);

  setClassWindowEl(classWindowEl);
  setClassWindowClassListEl(classWindowClassListEl);
  setClassWindowMethodListEl(classWindowMethodListEl);
  setClassWindowFilterInput(classWindowFilterInput);

  // Dragging
  setupClassWindowDragging(header, classWindowEl);

  // Close button
  closeBtn.addEventListener('click', () => {
    setClassWindowVisible(false);
    classWindowEl.style.display = 'none';
  });

  // Filter
  classWindowFilterInput.addEventListener('input', () => {
    renderClassList();
  });

  // Initial render
  renderClassList();
}

/**
 * Render class list in left pane
 */
export function renderClassList(): void {
  const classWindowClassListEl = getClassWindowClassListEl();
  if (!classWindowClassListEl) return;

  const classWindowFilterInput = getClassWindowFilterInput();
  const filter = (classWindowFilterInput && classWindowFilterInput.value || '').toLowerCase().trim();
  const entries = Array.from(registry.classes.keys()).sort();

  let html = '';
  for (let i = 0; i < entries.length; i += 1) {
    const name = entries[i];
    if (filter && !name.toLowerCase().includes(filter)) continue;

    const selected = name === getSelectedClassName();
    html +=
      `<div class="ut-debug-class-row${selected ? ' ut-debug-class-row-selected' : ''}" data-class="${name}">${ 
      name 
      }</div>`;
  }

  classWindowClassListEl.innerHTML = html;

  // Click handler (delegate)
  classWindowClassListEl.onclick = (e) => {
    let node = e.target as HTMLElement | null;
    while (
      node &&
      node !== classWindowClassListEl &&
      !node.classList.contains('ut-debug-class-row')
    ) {
      node = node.parentElement;
    }
    if (!node || node === classWindowClassListEl) return;

    const name = node.getAttribute('data-class');
    if (!name) return;

    setSelectedClassName(name);
    renderClassList();
    renderMethodList(name);
  };

  // If no selection yet but there are entries, select the first visible one
  if (!getSelectedClassName()) {
    const firstRow = classWindowClassListEl.querySelector('.ut-debug-class-row');
    if (firstRow) {
      const firstClassName = firstRow.getAttribute('data-class');
      if (firstClassName) {
        setSelectedClassName(firstClassName);
        renderClassList();
        renderMethodList(firstClassName);
      }
    }
  }
}

/**
 * Render method list in right pane for selected class
 */
export function renderMethodList(className: string): void {
  const classWindowMethodListEl = getClassWindowMethodListEl();
  if (!classWindowMethodListEl) return;

  const info = registry.classes.get(className);
  if (!info) {
    classWindowMethodListEl.innerHTML = `<div>No info for ${escapeHtml(className)}</div>`;
    return;
  }

  let html = '';
  html += `<div><strong>${escapeHtml(className)}</strong></div>`;

  if (info.protoMethods.length) {
    html += '<div class="ut-debug-method-section-title">Prototype methods</div>';
    for (let i = 0; i < info.protoMethods.length; i += 1) {
      html += `<div class="ut-debug-method-name">• ${escapeHtml(info.protoMethods[i])}</div>`;
    }
  } else {
    html += '<div class="ut-debug-method-section-title">Prototype methods</div>';
    html += '<div class="ut-debug-method-name">(none)</div>';
  }

  if (info.staticMethods.length) {
    html += '<div class="ut-debug-method-section-title" style="margin-top:4px;">Static methods</div>';
    for (let i = 0; i < info.staticMethods.length; i += 1) {
      html += `<div class="ut-debug-method-name">• ${escapeHtml(info.staticMethods[i])}</div>`;
    }
  }

  classWindowMethodListEl.innerHTML = html;
}

/**
 * Toggle Class Inspector window visibility
 */
export function toggleClassWindow(): void {
  const newVisible = !isClassWindowVisible();
  setClassWindowVisible(newVisible);

  let classWindowEl = getClassWindowEl();
  if (!classWindowEl) {
    createClassWindow();
    classWindowEl = getClassWindowEl();
  }

  if (classWindowEl) {
    classWindowEl.style.display = newVisible && isDebugEnabled() ? 'block' : 'none';
  }

  if (newVisible) {
    renderClassList();
  }
}
