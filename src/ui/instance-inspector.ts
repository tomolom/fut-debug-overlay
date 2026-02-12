/**
 * Instance/Property Inspector
 * Displays properties of a selected class instance with safe getter handling.
 */

import { summarizeArg, escapeHtml } from '../core/helpers';
import { setupClassWindowDragging } from './drag';
import { getShadowRoot } from './shadow-host';
import { watchProperty } from '../core/property-watcher';

/**
 * Property info structure
 */
export interface PropertyInfo {
  key: string;
  type: string; // 'string', 'number', 'boolean', 'object', 'undefined', 'function', etc.
  value: unknown;
  valuePreview: string;
  isGetter: boolean;
  descriptor: PropertyDescriptor;
}

/**
 * Extract own properties from an instance
 * Does not traverse prototype chain for properties, only own properties.
 * Handles getters safely (does not invoke them).
 */
export function extractOwnProperties(instance: any): PropertyInfo[] {
  if (
    !instance ||
    (typeof instance !== 'object' && typeof instance !== 'function')
  ) {
    return [];
  }

  const props: PropertyInfo[] = [];
  const descriptors = Object.getOwnPropertyDescriptors(instance);

  for (const key of Object.keys(descriptors)) {
    const desc = descriptors[key];
    const isGetter = !!desc.get;
    let value = desc.value;
    let valuePreview = '';
    let type: string = typeof value;

    if (isGetter) {
      valuePreview = '[getter]';
      type = 'getter'; // special type
    } else {
      valuePreview = summarizeArg(value);
    }

    props.push({
      key,
      type,
      value,
      valuePreview,
      isGetter,
      descriptor: desc,
    });
  }

  return props;
}

/**
 * Extract prototype chain as list of constructor names
 */
export function extractPrototypeChain(instance: any): string[] {
  const chain: string[] = [];
  let proto = Object.getPrototypeOf(instance);

  // Add instance constructor name if available
  if (instance && instance.constructor && instance.constructor.name) {
    chain.push(instance.constructor.name);
  }

  while (proto) {
    if (proto.constructor && proto.constructor.name) {
      // Avoid duplicates if instance.constructor === proto.constructor
      if (chain[chain.length - 1] !== proto.constructor.name) {
        chain.push(proto.constructor.name);
      }
    }
    proto = Object.getPrototypeOf(proto);
  }

  return chain;
}

/**
 * Safely get value of a property, potentially invoking getter if requested (manual invocation)
 * If invokeGetter is false, returns placeholder if it's a getter.
 */
export function safeGetValue(
  instance: any,
  key: string,
  invokeGetter = false,
): unknown {
  const desc = Object.getOwnPropertyDescriptor(instance, key);
  if (desc && desc.get) {
    if (invokeGetter) {
      try {
        return desc.get.call(instance);
      } catch (e) {
        return e;
      }
    } else {
      return '[getter]';
    }
  }
  return instance[key];
}

// UI State
let instanceInspectorEl: HTMLElement | null = null;
let contentEl: HTMLElement | null = null;
let currentInstance: any = null;

/**
 * Open the inspector for a specific instance
 */
export function inspectInstance(instance: any): void {
  currentInstance = instance;
  ensureInstanceInspector();
  renderInstanceInspector();
  if (instanceInspectorEl) {
    instanceInspectorEl.style.display = 'block';
  }
}

/**
 * Ensure the inspector window exists in the DOM
 */
function ensureInstanceInspector(): void {
  if (instanceInspectorEl) return;

  instanceInspectorEl = document.createElement('div');
  instanceInspectorEl.className = 'ut-debug-instance-window';
  instanceInspectorEl.style.display = 'none';

  const header = document.createElement('div');
  header.className = 'ut-debug-instance-header';

  const title = document.createElement('div');
  title.className = 'ut-debug-instance-title';
  title.textContent = 'Instance Inspector';

  const closeBtn = document.createElement('div');
  closeBtn.className = 'ut-debug-instance-close';
  closeBtn.textContent = '×';

  header.appendChild(title);
  header.appendChild(closeBtn);

  contentEl = document.createElement('div');
  contentEl.className = 'ut-debug-instance-content';

  instanceInspectorEl.appendChild(header);
  instanceInspectorEl.appendChild(contentEl);
  getShadowRoot().appendChild(instanceInspectorEl);

  setupClassWindowDragging(header, instanceInspectorEl);

  closeBtn.addEventListener('click', () => {
    if (instanceInspectorEl) {
      instanceInspectorEl.style.display = 'none';
    }
  });
}

/**
 * Render the current instance details
 */
function renderInstanceInspector(): void {
  if (!contentEl || !currentInstance) return;

  const chain = extractPrototypeChain(currentInstance);
  const props = extractOwnProperties(currentInstance);

  let html = '';

  // Header: Class Name + Chain
  html += `<div class="ut-debug-instance-chain">
    <strong>Prototype Chain:</strong> ${chain.map(escapeHtml).join(' → ')}
  </div>`;

  // Properties
  html += '<div class="ut-debug-instance-props">';
  if (props.length === 0) {
    html += '<div class="ut-debug-instance-empty">(no own properties)</div>';
  } else {
    // Sort props alphabetically
    props.sort((a, b) => a.key.localeCompare(b.key));

    for (const p of props) {
      const isExpandable =
        !p.isGetter &&
        typeof p.value === 'object' &&
        p.value !== null &&
        Object.keys(p.value as object).length > 0;

      html += `<div class="ut-debug-instance-prop-row" data-key="${escapeHtml(
        p.key,
      )}">`;

      // Watch Button
      html += `<button class="ut-debug-watch-btn" title="Watch property changes">👁️</button>`;

      // Key
      html += `<span class="ut-debug-prop-key">${escapeHtml(p.key)}:</span> `;

      // Value
      if (p.isGetter) {
        html += `<span class="ut-debug-prop-value ut-debug-prop-getter" title="Click to invoke getter">[getter]</span>`;
      } else {
        html += `<span class="ut-debug-prop-value">${escapeHtml(
          p.valuePreview,
        )}</span>`;
      }

      // Tags
      if (!p.descriptor.enumerable)
        html += ` <span class="ut-debug-prop-tag">non-enum</span>`;
      if (!p.descriptor.writable && !p.isGetter)
        html += ` <span class="ut-debug-prop-tag">readonly</span>`;

      // Expand container (initially empty)
      if (isExpandable) {
        html += `<div class="ut-debug-prop-expand" style="display:none"></div>`;
      }

      html += `</div>`;
    }
  }
  html += '</div>';

  contentEl.innerHTML = html;

  // Attach event listeners
  const rows = contentEl.querySelectorAll('.ut-debug-instance-prop-row');
  rows.forEach((row) => {
    const key = row.getAttribute('data-key');
    if (!key) return;

    // Watch handler
    const watchBtn = row.querySelector('.ut-debug-watch-btn');
    if (watchBtn) {
      watchBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleWatch(currentInstance, key);
      });
    }

    // Getter invocation
    const getterSpan = row.querySelector('.ut-debug-prop-getter');
    if (getterSpan) {
      getterSpan.addEventListener('click', (e) => {
        e.stopPropagation();
        invokeGetter(row as HTMLElement, currentInstance, key);
      });
    }

    // Expansion
    const valueSpan = row.querySelector('.ut-debug-prop-value');
    if (valueSpan && !valueSpan.classList.contains('ut-debug-prop-getter')) {
      valueSpan.addEventListener('click', () => {
        toggleExpand(row as HTMLElement, currentInstance, key);
      });
    }
  });
}

function handleWatch(instance: any, key: string): void {
  try {
    const id = watchProperty(instance, key, (oldVal, newVal) => {
      console.log(`[UTDebug] Property Changed: ${key}`, oldVal, '→', newVal);
    });
    console.log(`[UTDebug] Watching property '${key}' (ID: ${id})`);
    alert(`Watching property '${key}'. Changes will be logged to console.`);
  } catch (err: any) {
    console.error('[UTDebug] Failed to watch property:', err);
    alert(`Failed to watch: ${err.message}`);
  }
}

function invokeGetter(row: HTMLElement, instance: any, key: string): void {
  const val = safeGetValue(instance, key, true);
  const preview = summarizeArg(val);
  const valSpan = row.querySelector('.ut-debug-prop-value');
  if (valSpan) {
    valSpan.textContent = preview;
    valSpan.classList.remove('ut-debug-prop-getter');
    valSpan.removeAttribute('title');
    // Allow expansion if it's an object now
    if (
      typeof val === 'object' &&
      val !== null &&
      Object.keys(val as object).length > 0
    ) {
      // We need to re-bind click listener for expansion if we want to support it after invoking getter
      // For simplicity, we just show the value preview for now.
    }
  }
}

function toggleExpand(row: HTMLElement, instance: any, key: string): void {
  const expandContainer = row.querySelector(
    '.ut-debug-prop-expand',
  ) as HTMLElement;
  if (!expandContainer) return;

  if (expandContainer.style.display !== 'none') {
    expandContainer.style.display = 'none';
    return;
  }

  // Expand
  const val = instance[key];
  if (!val || typeof val !== 'object') return;

  const subProps = extractOwnProperties(val);
  let html = '';
  for (const p of subProps) {
    html += `<div class="ut-debug-sub-prop">
        <span class="ut-debug-prop-key">${escapeHtml(p.key)}:</span>
        <span class="ut-debug-prop-value">${escapeHtml(p.valuePreview)}</span>
      </div>`;
  }

  expandContainer.innerHTML = html;
  expandContainer.style.display = 'block';
}
