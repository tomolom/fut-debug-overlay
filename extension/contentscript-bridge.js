const CHANNEL = '__FUT_DEBUG_MSG';
const RECONNECT_DELAY_MS = 1000;

let port = null;
let contextInvalidated = false;

function isContextInvalid() {
  try {
    return !chrome.runtime?.id;
  } catch {
    return true;
  }
}

function connectPort() {
  if (contextInvalidated || isContextInvalid()) {
    contextInvalidated = true;
    return;
  }

  try {
    const nextPort = chrome.runtime.connect({ name: 'fut-debug-content' });

    nextPort.onMessage.addListener((message) => {
      if (!message || typeof message.type !== 'string') {
        return;
      }

      window.postMessage(
        {
          channel: CHANNEL,
          direction: 'CONTENT_TO_MAIN',
          message,
        },
        '*',
      );
    });

    nextPort.onDisconnect.addListener(() => {
      if (port === nextPort) {
        port = null;
      }
      if (!isContextInvalid()) {
        setTimeout(connectPort, RECONNECT_DELAY_MS);
      }
    });

    port = nextPort;
  } catch (e) {
    if (String(e).includes('Extension context invalidated')) {
      contextInvalidated = true;
    }
  }
}

window.addEventListener('message', (event) => {
  if (event.source !== window) {
    return;
  }

  const data = event.data;
  if (
    !data ||
    data.channel !== CHANNEL ||
    data.direction !== 'MAIN_TO_CONTENT'
  ) {
    return;
  }

  if (!port) {
    return;
  }

  try {
    if (Array.isArray(data.messages)) {
      port.postMessage({ messages: data.messages });
      return;
    }

    if (data.message) {
      port.postMessage({ message: data.message });
    }
  } catch {
    port = null;
  }
});

connectPort();
