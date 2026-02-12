import { MethodCall, NetworkRequestRecord } from '../types/index';

// --- Types for internal panel state ---
interface PerfRecord {
  className: string;
  methodName: string;
  callCount: number;
  totalMs: number;
  avgMs: number;
  minMs: number;
  maxMs: number;
  p95Ms: number;
}

interface NavRecord {
  ts: number;
  type: string;
  from: string | null;
  to: string | null;
  utClass: string | null;
  controllersSnapshot: string[];
  viewModelsSnapshot: string[];
}

interface SnapshotRecord {
  id: number;
  timestamp: number;
  classCount: number;
  version: string;
  classes: string[]; // store full list for diffing
}

// --- State ---
const state = {
  activeTab: 'methodspy',
  features: {} as Record<string, boolean>,
  methodSpy: {
    data: [] as MethodCall[],
    filter: '',
    sortCol: 'ts',
    sortDir: 'desc',
    selectedId: -1,
  },
  network: {
    data: [] as NetworkRequestRecord[],
    filter: '',
    sortCol: 'ts',
    sortDir: 'desc',
    selectedId: -1,
  },
  performance: {
    data: [] as PerfRecord[],
    filter: '',
    sortCol: 'totalMs',
    sortDir: 'desc',
  },
  navigation: {
    data: [] as NavRecord[],
  },
  snapshots: {
    data: [] as SnapshotRecord[],
    selectedIds: [] as number[],
  },
};

let port: chrome.runtime.Port | null = null;
const BATCH_UPDATE_MS = 500;
let updatePending = false;

// Read tabId from URL query param (passed by devtools.ts)
const urlParams = new URLSearchParams(window.location.search);
const tabId = urlParams.get('tabId') || '0';

// --- DOM Elements ---
const tabsHeader = document.getElementById('tabs-header')!;
const tabContents = {
  methodspy: document.getElementById('methodspy-content')!,
  network: document.getElementById('network-content')!,
  performance: document.getElementById('performance-content')!,
  navigation: document.getElementById('navigation-content')!,
  snapshots: document.getElementById('snapshots-content')!,
};

// --- Initialization ---
function init() {
  setupTabs();
  setupFilters();
  setupSorting();
  setupActions();
  connectToBackground();

  // Start render loop
  requestAnimationFrame(renderLoop);
}

let contextInvalidated = false;

function isContextInvalid(): boolean {
  try {
    return !chrome.runtime?.id;
  } catch {
    return true;
  }
}

function showDisconnected(reason: string) {
  const body = document.body;
  const banner = document.createElement('div');
  banner.style.cssText =
    'position:fixed;top:0;left:0;right:0;padding:12px;background:#1a0a0a;color:#ff6b6b;text-align:center;font-family:monospace;font-size:12px;z-index:9999;border-bottom:1px solid #ff6b6b';
  banner.textContent = reason;
  body.prepend(banner);
}

function connectToBackground() {
  if (contextInvalidated || isContextInvalid()) {
    contextInvalidated = true;
    showDisconnected(
      'Extension was reloaded. Close and reopen DevTools to reconnect.',
    );
    return;
  }

  try {
    port = chrome.runtime.connect({ name: `fut-debug-devtools:${tabId}` });

    port.onMessage.addListener((msg) => {
      handleMessage(msg);
    });

    port.onDisconnect.addListener(() => {
      port = null;
      if (isContextInvalid()) {
        contextInvalidated = true;
        showDisconnected(
          'Extension was reloaded. Close and reopen DevTools to reconnect.',
        );
      } else {
        setTimeout(connectToBackground, 1000);
      }
    });

    // Request initial state
    port.postMessage({ type: 'GET_INITIAL_STATE' });
    port.postMessage({ type: 'GET_FEATURE_STATES' });
  } catch (e) {
    if (String(e).includes('Extension context invalidated')) {
      contextInvalidated = true;
      showDisconnected(
        'Extension was reloaded. Close and reopen DevTools to reconnect.',
      );
    }
  }
}

function handleMessage(msg: any) {
  switch (msg.type) {
    case 'METHOD_CALL_BATCH':
      state.methodSpy.data = [...msg.payload, ...state.methodSpy.data].slice(
        0,
        10000,
      );
      updatePending = true;
      break;
    case 'NETWORK_REQUEST':
      state.network.data.unshift(msg.payload);
      updatePending = true;
      break;
    case 'PERF_STATS':
      state.performance.data = msg.payload;
      updatePending = true;
      break;
    case 'NAV_EVENT':
      state.navigation.data.unshift(msg.payload);
      updatePending = true;
      break;
    case 'SNAPSHOT_ADDED':
      state.snapshots.data.push({
        id: state.snapshots.data.length + 1,
        timestamp: msg.payload.timestamp,
        classCount: msg.payload.classes.length,
        version: msg.payload.version,
        classes: msg.payload.classes,
      });
      updatePending = true;
      break;
    case 'FEATURE_STATES':
      state.features = msg.payload;
      renderToggles();
      break;
  }
}

function renderLoop() {
  if (updatePending) {
    renderActiveTab();
    updatePending = false;
  }
  setTimeout(() => requestAnimationFrame(renderLoop), BATCH_UPDATE_MS);
}

// --- UI Logic ---

function setupTabs() {
  tabsHeader.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('tab-btn')) {
      const tab = target.getAttribute('data-tab');
      if (tab) switchTab(tab);
    }
  });
}

function switchTab(tabName: string) {
  state.activeTab = tabName;

  // Update Header
  Array.from(tabsHeader.children).forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
  });

  // Update Content
  Object.entries(tabContents).forEach(([name, el]) => {
    el.classList.toggle('active', name === tabName);
  });

  renderActiveTab();
}

function setupFilters() {
  // Method Spy Filter
  const msFilter = document.getElementById(
    'methodspy-filter',
  ) as HTMLInputElement;
  msFilter.addEventListener('input', () => {
    state.methodSpy.filter = msFilter.value.toLowerCase();
    renderMethodSpy();
  });
  document.getElementById('methodspy-clear')?.addEventListener('click', () => {
    state.methodSpy.data = [];
    renderMethodSpy();
  });

  // Network Filter
  const netFilter = document.getElementById(
    'network-filter',
  ) as HTMLInputElement;
  netFilter.addEventListener('input', () => {
    state.network.filter = netFilter.value.toLowerCase();
    renderNetwork();
  });
  document.getElementById('network-clear')?.addEventListener('click', () => {
    state.network.data = [];
    renderNetwork();
  });

  // Perf Filter
  const perfFilter = document.getElementById('perf-filter') as HTMLInputElement;
  perfFilter.addEventListener('input', () => {
    state.performance.filter = perfFilter.value.toLowerCase();
    renderPerformance();
  });
  document.getElementById('perf-refresh')?.addEventListener('click', () => {
    port?.postMessage({ type: 'GET_PERF_STATS' });
  });
}

function setupSorting() {
  document.querySelectorAll('th[data-sort]').forEach((th) => {
    th.addEventListener('click', () => {
      const col = th.getAttribute('data-sort')!;
      const tab = state.activeTab;

      let sortState: any;
      if (tab === 'methodspy') sortState = state.methodSpy;
      else if (tab === 'network') sortState = state.network;
      else if (tab === 'performance') sortState = state.performance;

      if (sortState) {
        if (sortState.sortCol === col) {
          sortState.sortDir = sortState.sortDir === 'asc' ? 'desc' : 'asc';
        } else {
          sortState.sortCol = col;
          sortState.sortDir = 'desc'; // Default to desc for new col
        }
        renderActiveTab();
      }
    });
  });
}

function setupActions() {
  document.getElementById('snapshot-take')?.addEventListener('click', () => {
    port?.postMessage({ type: 'TAKE_SNAPSHOT' });
  });

  document.getElementById('snapshot-diff')?.addEventListener('click', () => {
    renderSnapshotDiff();
  });

  document.getElementById('nav-refresh')?.addEventListener('click', () => {
    port?.postMessage({ type: 'GET_NAV_EVENTS' });
  });
}

function renderActiveTab() {
  switch (state.activeTab) {
    case 'methodspy':
      renderMethodSpy();
      break;
    case 'network':
      renderNetwork();
      break;
    case 'performance':
      renderPerformance();
      break;
    case 'navigation':
      renderNavigation();
      break;
    case 'snapshots':
      renderSnapshots();
      break;
  }
}

// --- Rendering: Toggles ---
function renderToggles() {
  const container = document.getElementById('toggles-bar')!;
  const features = [
    { key: 'overlay', label: 'Overlay' },
    { key: 'sidebar', label: 'Sidebar' },
    { key: 'classinspector', label: 'Class Insp' },
    { key: 'methodspy', label: 'Method Spy' },
    { key: 'network', label: 'Network' },
    { key: 'conditionallog', label: 'Cond Log' },
    { key: 'perfprofiler', label: 'Perf' },
    { key: 'navtimeline', label: 'Nav' },
    { key: 'propertywatcher', label: 'Prop Watch' },
  ];

  container.innerHTML = features
    .map((f) => {
      const active = state.features[f.key];
      return `
      <div class="toggle-item ${active ? 'active' : ''}" data-key="${f.key}">
        <div class="toggle-switch"></div>
        <span>${f.label}</span>
      </div>
    `;
    })
    .join('');

  container.querySelectorAll('.toggle-item').forEach((el) => {
    el.addEventListener('click', (e) => {
      const target = e.currentTarget as HTMLElement;
      const key = target.getAttribute('data-key');
      if (key && port) {
        // Optimistic update
        state.features[key] = !state.features[key];
        renderToggles();
        port.postMessage({ type: 'TOGGLE_FEATURE', payload: { feature: key } });
      }
    });
  });
}

// --- Rendering: Method Spy ---
function renderMethodSpy() {
  const tbody = document.querySelector('#methodspy-table tbody')!;
  const countEl = document.getElementById('methodspy-count')!;

  const filtered = state.methodSpy.data.filter(
    (c) =>
      !state.methodSpy.filter ||
      c.className.toLowerCase().includes(state.methodSpy.filter) ||
      c.methodName.toLowerCase().includes(state.methodSpy.filter) ||
      (c.argPreviews &&
        c.argPreviews.some((a) =>
          a.toLowerCase().includes(state.methodSpy.filter),
        )),
  );

  countEl.textContent = `${filtered.length} calls`;

  // Sort
  const { sortCol, sortDir } = state.methodSpy;
  filtered.sort((a, b) => {
    let valA = (a as any)[sortCol];
    let valB = (b as any)[sortCol];
    // Special handling for args which is an array
    if (sortCol === 'args') {
      valA = a.argPreviews.join(' ');
      valB = b.argPreviews.join(' ');
    }
    if (sortCol === 'result') {
      valA = a.resultPreview || a.errorPreview || '';
      valB = b.resultPreview || b.errorPreview || '';
    }

    if (valA < valB) return sortDir === 'asc' ? -1 : 1;
    if (valA > valB) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  // Limit rendering for performance
  const toRender = filtered.slice(0, 500);

  tbody.innerHTML = toRender
    .map(
      (c) => `
    <tr class="${c.id === state.methodSpy.selectedId ? 'selected' : ''} ${c.threw ? 'text-error' : ''}" data-id="${c.id}">
      <td>${new Date(c.ts).toLocaleTimeString().split(' ')[0]}.${(c.ts % 1000).toString().padStart(3, '0')}</td>
      <td>${c.className}</td>
      <td>${c.methodName}</td>
      <td>${escapeHtml(c.argPreviews.join(', '))}</td>
      <td>${escapeHtml(c.threw ? c.errorPreview : c.resultPreview)}</td>
    </tr>
  `,
    )
    .join('');

  // Row click handler
  tbody.querySelectorAll('tr').forEach((tr) => {
    tr.addEventListener('click', () => {
      const id = parseInt(tr.getAttribute('data-id')!);
      state.methodSpy.selectedId = id;
      renderMethodSpyDetails(id);
      renderMethodSpy(); // Re-render to update selection highlight
    });
  });
}

function renderMethodSpyDetails(id: number) {
  const container = document.getElementById('methodspy-details')!;
  const call = state.methodSpy.data.find((c) => c.id === id);

  if (!call) {
    container.innerHTML =
      '<div class="text-dim text-center">Call not found</div>';
    return;
  }

  container.innerHTML = `
    <div class="detail-section">
      <div class="detail-title">Method Call Info</div>
      <div class="detail-content">
        <div>ID: ${call.id}</div>
        <div>Time: ${new Date(call.ts).toISOString()}</div>
        <div>Class: ${call.className}</div>
        <div>Method: ${call.methodName}</div>
        <div>Type: ${call.isStatic ? 'Static' : 'Instance'}</div>
      </div>
    </div>
    <div class="detail-section">
      <div class="detail-title">Arguments (${call.argPreviews.length})</div>
      <div class="detail-content">${call.argPreviews.map((a, i) => `[${i}]: ${escapeHtml(a)}`).join('\n')}</div>
    </div>
    <div class="detail-section">
      <div class="detail-title">${call.threw ? 'Error' : 'Result'}</div>
      <div class="detail-content ${call.threw ? 'text-error' : ''}">${escapeHtml(call.threw ? call.errorPreview : call.resultPreview)}</div>
    </div>
  `;
}

// --- Rendering: Network ---
function renderNetwork() {
  const tbody = document.querySelector('#network-table tbody')!;

  const filtered = state.network.data.filter(
    (r) =>
      !state.network.filter ||
      r.url.toLowerCase().includes(state.network.filter) ||
      r.status.toString().includes(state.network.filter),
  );

  // Sort
  const { sortCol, sortDir } = state.network;
  filtered.sort((a, b) => {
    const valA = (a as any)[sortCol];
    const valB = (b as any)[sortCol];
    if (valA < valB) return sortDir === 'asc' ? -1 : 1;
    if (valA > valB) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  tbody.innerHTML = filtered
    .slice(0, 200)
    .map(
      (r) => `
    <tr class="${r.id === state.network.selectedId ? 'selected' : ''}" data-id="${r.id}">
      <td>${new Date(r.ts).toLocaleTimeString()}</td>
      <td>${r.method}</td>
      <td title="${r.url}">${r.url.split('/').pop()?.split('?')[0] || r.url}</td>
      <td class="${r.status >= 400 ? 'text-error' : 'text-success'}">${r.status}</td>
      <td>${r.durationMs}</td>
      <td>${r.utClass || '-'}</td>
    </tr>
  `,
    )
    .join('');

  tbody.querySelectorAll('tr').forEach((tr) => {
    tr.addEventListener('click', () => {
      const id = parseInt(tr.getAttribute('data-id')!);
      state.network.selectedId = id;
      renderNetworkDetails(id);
      renderNetwork();
    });
  });
}

function renderNetworkDetails(id: number) {
  const container = document.getElementById('network-details')!;
  const req = state.network.data.find((r) => r.id === id);

  if (!req) return;

  container.innerHTML = `
    <div class="detail-section">
      <div class="detail-title">Request Info</div>
      <div class="detail-content">
        <div>URL: ${req.url}</div>
        <div>Method: ${req.method}</div>
        <div>Status: ${req.status}</div>
        <div>Duration: ${req.durationMs}ms</div>
        <div>Size: ${req.size ? req.size + ' bytes' : 'N/A'}</div>
      </div>
    </div>
    <div class="detail-section">
      <div class="detail-title">Initiator</div>
      <div class="detail-content">
        <div>Class: ${req.utClass || 'Unknown'}</div>
        <div>Method: ${req.utMethod || 'Unknown'}</div>
        <div>Correlation ID: ${req.correlationId}</div>
      </div>
    </div>
  `;
}

// --- Rendering: Performance ---
function renderPerformance() {
  const tbody = document.querySelector('#perf-table tbody')!;

  const filtered = state.performance.data.filter(
    (p) =>
      !state.performance.filter ||
      p.className.toLowerCase().includes(state.performance.filter) ||
      p.methodName.toLowerCase().includes(state.performance.filter),
  );

  const { sortCol, sortDir } = state.performance;
  filtered.sort((a, b) => {
    const valA = (a as any)[sortCol];
    const valB = (b as any)[sortCol];
    if (valA < valB) return sortDir === 'asc' ? -1 : 1;
    if (valA > valB) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  tbody.innerHTML = filtered
    .map(
      (p) => `
    <tr>
      <td>${p.className}</td>
      <td>${p.methodName}</td>
      <td class="text-right">${p.callCount}</td>
      <td class="text-right">${p.totalMs.toFixed(2)}</td>
      <td class="text-right">${p.avgMs.toFixed(2)}</td>
      <td class="text-right">${p.p95Ms.toFixed(2)}</td>
      <td class="text-right">${p.maxMs.toFixed(2)}</td>
    </tr>
  `,
    )
    .join('');
}

// --- Rendering: Navigation ---
function renderNavigation() {
  const tbody = document.querySelector('#nav-table tbody')!;

  tbody.innerHTML = state.navigation.data
    .map(
      (n) => `
    <tr>
      <td>${new Date(n.ts).toLocaleTimeString()}</td>
      <td>${n.type}</td>
      <td>${n.from || '-'}</td>
      <td>${n.to || '-'}</td>
      <td>${n.controllersSnapshot.length}</td>
      <td>${n.viewModelsSnapshot.length}</td>
    </tr>
  `,
    )
    .join('');
}

// --- Rendering: Snapshots ---
function renderSnapshots() {
  const tbody = document.querySelector('#snapshot-table tbody')!;

  tbody.innerHTML = state.snapshots.data
    .map(
      (s) => `
    <tr class="${state.snapshots.selectedIds.includes(s.id) ? 'selected' : ''}" data-id="${s.id}">
      <td>${s.id}</td>
      <td>${new Date(s.timestamp).toLocaleTimeString()}</td>
      <td>${s.classCount} classes</td>
      <td>${s.version}</td>
    </tr>
  `,
    )
    .join('');

  tbody.querySelectorAll('tr').forEach((tr) => {
    tr.addEventListener('click', (e) => {
      const id = parseInt(tr.getAttribute('data-id')!);

      // Multi-select logic for diffing
      if ((e as MouseEvent).ctrlKey || (e as MouseEvent).metaKey) {
        if (state.snapshots.selectedIds.includes(id)) {
          state.snapshots.selectedIds = state.snapshots.selectedIds.filter(
            (i) => i !== id,
          );
        } else {
          if (state.snapshots.selectedIds.length < 2) {
            state.snapshots.selectedIds.push(id);
          }
        }
      } else {
        state.snapshots.selectedIds = [id];
      }
      renderSnapshots();
    });
  });
}

function renderSnapshotDiff() {
  const container = document.getElementById('snapshot-details')!;
  if (state.snapshots.selectedIds.length !== 2) {
    container.innerHTML =
      '<div class="text-error text-center" style="margin-top:20px">Select exactly 2 snapshots to diff (Ctrl+Click)</div>';
    return;
  }

  const [id1, id2] = state.snapshots.selectedIds.sort((a, b) => a - b);
  const snap1 = state.snapshots.data.find((s) => s.id === id1)!;
  const snap2 = state.snapshots.data.find((s) => s.id === id2)!;

  const set1 = new Set(snap1.classes);
  const set2 = new Set(snap2.classes);

  const added = snap2.classes.filter((c) => !set1.has(c));
  const removed = snap1.classes.filter((c) => !set2.has(c));

  container.innerHTML = `
        <div class="detail-section">
            <div class="detail-title">Diff: #${id1} vs #${id2}</div>
            <div class="detail-content">
                <div class="text-success">Added: ${added.length}</div>
                ${added.map((c) => `<div>+ ${c}</div>`).join('')}
                <br>
                <div class="text-error">Removed: ${removed.length}</div>
                 ${removed.map((c) => `<div>- ${c}</div>`).join('')}
            </div>
        </div>
    `;
}

// --- Utilities ---
function escapeHtml(unsafe: string | null): string {
  if (unsafe == null) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Boot
init();
