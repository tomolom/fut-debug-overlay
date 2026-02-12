const { chromium } = require('playwright');

(async () => {
  const distPath = 'C:\\Users\\tomol\\WebstormProjects\\fut-debug-overlay\\dist';
  
  // Launch browser with extension
  const context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${distPath}`,
      `--load-extension=${distPath}`
    ]
  });
  
  const page = await context.newPage();
  
  // Navigate to chrome://extensions
  await page.goto('chrome://extensions');
  await page.waitForTimeout(2000);
  
  // Take screenshot
  await page.screenshot({ path: '.sisyphus/evidence/task-7-extension-loaded.png' });
  console.log('Screenshot 1: Extension loaded');
  
  // Set up console listener BEFORE navigation
  const consoleLogs = [];
  
  // Navigate to EA FC web app
  await page.goto('https://www.ea.com/ea-sports-fc/ultimate-team/web-app');
  
  // Listen for console messages
  page.on('console', msg => {
    const text = msg.text();
    console.log('[CONSOLE]', text);
    if (text.includes('[UTDebug]')) {
      consoleLogs.push(text);
    }
  });
  
  // Wait for page load and script initialization
  await page.waitForTimeout(20000);
  
  // Check if script elements were injected
  const scriptInjected = await page.evaluate(() => {
    const scripts = Array.from(document.querySelectorAll('script'));
    const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
    return {
      hasMainScript: scripts.some(s => s.src && s.src.includes('main.js')),
      hasCssLink: links.some(l => l.href && l.href.includes('fut-debug-overlay.css')),
      scriptSrcs: scripts.map(s => s.src).filter(Boolean),
      linkHrefs: links.map(l => l.href).filter(Boolean)
    };
  });
  console.log('Script injection check:', scriptInjected);
  
  // Take screenshot of web app
  await page.screenshot({ path: '.sisyphus/evidence/task-7-content-script-injected.png' });
  console.log('Screenshot 2: Content script injected');
  console.log('Console logs:', consoleLogs);
  
  // Test keyboard shortcuts
  // Ctrl+Shift+U - toggle sidebar
  await page.keyboard.press('Control+Shift+U');
  await page.waitForTimeout(500);
  
  // Ctrl+Shift+Y - toggle class window
  await page.keyboard.press('Control+Shift+Y');
  await page.waitForTimeout(500);
  
  // Ctrl+Shift+H - toggle method spy
  await page.keyboard.press('Control+Shift+H');
  await page.waitForTimeout(500);
  
  // Take screenshot with UI toggled
  await page.screenshot({ path: '.sisyphus/evidence/task-7-ui-toggled.png' });
  console.log('Screenshot 3: UI toggled');
  
  // Check if elements exist
  const sidebar = await page.$('.ut-debug-sidebar');
  const classWindow = await page.$('.ut-debug-class-window');
  const methodSpyWindow = await page.$('.ut-debug-methodspy-window');
  
  console.log('Sidebar exists:', !!sidebar);
  console.log('Class window exists:', !!classWindow);
  console.log('Method spy window exists:', !!methodSpyWindow);
  
  // Get visibility states
  if (sidebar) {
    const sidebarVisible = await sidebar.evaluate(el => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none';
    });
    console.log('Sidebar visible:', sidebarVisible);
  }
  
  if (classWindow) {
    const classWindowVisible = await classWindow.evaluate(el => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none';
    });
    console.log('Class window visible:', classWindowVisible);
  }
  
  if (methodSpyWindow) {
    const methodSpyVisible = await methodSpyWindow.evaluate(el => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none';
    });
    console.log('Method spy visible:', methodSpyVisible);
  }
  
  await context.close();
})();
