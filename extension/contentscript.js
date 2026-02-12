const mainScript = document.createElement('script');
mainScript.src = chrome.runtime.getURL('js/main.js');

// Message bridge runs as a separate content script via manifest.json.
// CSS is now injected into shadow DOM via shadow-host.ts module.

(document.head || document.documentElement).appendChild(mainScript);

mainScript.onload = function () {
  mainScript.parentNode.removeChild(mainScript);
};
