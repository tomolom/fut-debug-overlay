/**
 * Shadow DOM host management - CSS isolation for overlay UI
 */

import overlayCSS from '../styles/overlay.css?raw';

let shadowRoot: ShadowRoot | null = null;

/**
 * Create shadow host element and return shadow root.
 * Idempotent - returns existing shadow root if already created.
 */
export function createShadowHost(): ShadowRoot {
  if (shadowRoot) return shadowRoot;

  // Create host element
  const hostEl = document.createElement('div');
  hostEl.id = 'ut-debug-shadow-host';

  // Attach closed shadow root
  shadowRoot = hostEl.attachShadow({ mode: 'closed' });

  // Inject CSS into shadow root
  if ('adoptedStyleSheets' in shadowRoot) {
    // Preferred: use CSSStyleSheet API (modern browsers)
    try {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(overlayCSS);
      shadowRoot.adoptedStyleSheets = [sheet];
    } catch (e) {
      // Fallback if CSSStyleSheet API fails
      console.warn(
        '[UTDebug] CSSStyleSheet API failed, using <style> fallback',
        e,
      );
      injectStyleElement(shadowRoot, overlayCSS);
    }
  } else {
    // Fallback: inject <style> element
    injectStyleElement(shadowRoot, overlayCSS);
  }

  // Append host to document root
  document.documentElement.appendChild(hostEl);

  return shadowRoot;
}

/**
 * Get existing shadow root. Throws if not created yet.
 */
export function getShadowRoot(): ShadowRoot {
  if (!shadowRoot) {
    throw new Error(
      '[UTDebug] Shadow root not created. Call createShadowHost() first.',
    );
  }
  return shadowRoot;
}

/**
 * Inject CSS via <style> element (fallback)
 */
function injectStyleElement(root: ShadowRoot, css: string): void {
  const style = document.createElement('style');
  style.textContent = css;
  root.appendChild(style);
}
