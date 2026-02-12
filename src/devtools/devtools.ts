chrome.devtools.panels.create(
  'FUT Debug',
  '', // icon path (empty for now)
  `panel.html?tabId=${chrome.devtools.inspectedWindow.tabId}`,
  (panel) => {
    // Panel created callback
  },
);
