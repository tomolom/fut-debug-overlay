const CHANNEL = '__FUT_DEBUG_MSG';
const RECONNECT_DELAY_MS = 1000;

let port = null;

function connectPort() {
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
    setTimeout(connectPort, RECONNECT_DELAY_MS);
  });

  port = nextPort;
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

  if (Array.isArray(data.messages)) {
    port.postMessage({ messages: data.messages });
    return;
  }

  if (data.message) {
    port.postMessage({ message: data.message });
  }
});

connectPort();
