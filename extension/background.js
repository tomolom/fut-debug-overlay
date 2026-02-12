const contentPortsByTabId = new Map();
const devtoolsPortsByTabId = new Map();

function parseTabIdFromPortName(name) {
  const parts = name.split(':');
  if (parts.length < 2) {
    return undefined;
  }

  const parsed = Number(parts[1]);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function resolveTabId(port) {
  return port.sender?.tab?.id ?? parseTabIdFromPortName(port.name);
}

function relayMessage(message, senderRole, tabId) {
  if (!Number.isFinite(tabId)) {
    return;
  }

  const baseMessage = {
    ...message,
    tabId,
  };

  if (senderRole === 'content') {
    const devtoolsPort = devtoolsPortsByTabId.get(tabId);
    if (devtoolsPort) {
      devtoolsPort.postMessage(baseMessage);
    }
    return;
  }

  const contentPort = contentPortsByTabId.get(tabId);
  if (contentPort) {
    contentPort.postMessage(baseMessage);
  }
}

function registerPort(role, tabId, port) {
  if (role === 'content') {
    contentPortsByTabId.set(tabId, port);
    return;
  }

  devtoolsPortsByTabId.set(tabId, port);
}

function unregisterPort(role, tabId, port) {
  const map = role === 'content' ? contentPortsByTabId : devtoolsPortsByTabId;
  const current = map.get(tabId);
  if (current === port) {
    map.delete(tabId);
  }
}

chrome.runtime.onConnect.addListener((port) => {
  const isContentPort = port.name === 'fut-debug-content';
  const isDevtoolsPort = port.name.startsWith('fut-debug-devtools');
  if (!isContentPort && !isDevtoolsPort) {
    return;
  }

  const tabId = resolveTabId(port);
  if (!Number.isFinite(tabId)) {
    return;
  }

  const role = isContentPort ? 'content' : 'devtools';
  registerPort(role, tabId, port);

  port.onMessage.addListener((incoming) => {
    if (Array.isArray(incoming?.messages)) {
      incoming.messages.forEach((message) =>
        relayMessage(message, role, tabId),
      );
      return;
    }

    if (incoming?.message) {
      relayMessage(incoming.message, role, tabId);
      return;
    }

    relayMessage(incoming, role, tabId);
  });

  port.onDisconnect.addListener(() => {
    unregisterPort(role, tabId, port);
  });
});
