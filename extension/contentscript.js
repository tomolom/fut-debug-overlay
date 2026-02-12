const mainScript = document.createElement('script');
mainScript.src = chrome.runtime.getURL('js/main.js');

const cssLink = document.createElement('link');
cssLink.rel = 'stylesheet';
cssLink.href = chrome.runtime.getURL('fut-debug-overlay.css');

(document.head ?? document.documentElement).appendChild(cssLink);
(document.head || document.documentElement).appendChild(mainScript);

mainScript.onload = function () {
  mainScript.parentNode.removeChild(mainScript);
};
