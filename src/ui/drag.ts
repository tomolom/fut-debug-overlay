/**
 * Drag functionality for draggable windows
 */

/**
 * Setup dragging for a window element using a handle element
 */
export function setupClassWindowDragging(
  handleEl: HTMLElement,
  windowEl: HTMLElement
): void {
  let dragging = false;
  let offsetX = 0;
  let offsetY = 0;

  handleEl.addEventListener('mousedown', (e) => {
    dragging = true;
    const rect = windowEl.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    let x = e.clientX - offsetX;
    let y = e.clientY - offsetY;

    // Optional clamping to viewport
    const maxX = window.innerWidth - windowEl.offsetWidth;
    const maxY = window.innerHeight - windowEl.offsetHeight;
    if (x < 0) x = 0;
    if (y < 0) y = 0;
    if (x > maxX) x = maxX;
    if (y > maxY) y = maxY;

    windowEl.style.left = `${x}px`;
    windowEl.style.top = `${y}px`;
    windowEl.style.right = 'auto'; // so right isn't fighting left
  });

  document.addEventListener('mouseup', () => {
    dragging = false;
  });
}
