/**
 * Backward-compatible state API.
 * Reactive state now lives in store.ts and UI element refs in ui-refs.ts.
 */

export * from './store';
export * from './ui-refs';

import { get, set } from './store';
import { getUiRef, setUiRef } from './ui-refs';

export function isDebugEnabled(): boolean {
  return get('debugEnabled');
}

export function setDebugEnabled(enabled: boolean): void {
  set({ debugEnabled: enabled });
}

export function isMethodSpyVisible(): boolean {
  return get('methodSpyVisible');
}

export function setMethodSpyVisible(visible: boolean): void {
  set({ methodSpyVisible: visible });
}

export function getMethodSpyNextId(): number {
  return get('methodSpyNextId');
}

export function incrementMethodSpyNextId(): number {
  const currentId = get('methodSpyNextId');
  set({ methodSpyNextId: currentId + 1 });
  return currentId;
}

export function isMethodSpyNeedsRefresh(): boolean {
  return get('methodSpyNeedsRefresh');
}

export function setMethodSpyNeedsRefresh(needs: boolean): void {
  set({ methodSpyNeedsRefresh: needs });
}

export function isSidebarDirty(): boolean {
  return get('sidebarDirty');
}

export function setSidebarDirty(dirty: boolean): void {
  set({ sidebarDirty: dirty });
}

export function getTooltipEl(): HTMLDivElement | null {
  return getUiRef('tooltipEl');
}

export function setTooltipEl(el: HTMLDivElement | null): void {
  setUiRef('tooltipEl', el);
}

export function getHighlightEl(): HTMLDivElement | null {
  return getUiRef('highlightEl');
}

export function setHighlightEl(el: HTMLDivElement | null): void {
  setUiRef('highlightEl', el);
}

export function getBadgeEl(): HTMLDivElement | null {
  return getUiRef('badgeEl');
}

export function setBadgeEl(el: HTMLDivElement | null): void {
  setUiRef('badgeEl', el);
}

export function getSidebarEl(): HTMLDivElement | null {
  return getUiRef('sidebarEl');
}

export function setSidebarEl(el: HTMLDivElement | null): void {
  setUiRef('sidebarEl', el);
}

export function getSidebarContentEl(): HTMLDivElement | null {
  return getUiRef('sidebarContentEl');
}

export function setSidebarContentEl(el: HTMLDivElement | null): void {
  setUiRef('sidebarContentEl', el);
}

export function getSidebarFilterInput(): HTMLInputElement | null {
  return getUiRef('sidebarFilterInput');
}

export function setSidebarFilterInput(el: HTMLInputElement | null): void {
  setUiRef('sidebarFilterInput', el);
}

export function getClassWindowEl(): HTMLDivElement | null {
  return getUiRef('classWindowEl');
}

export function setClassWindowEl(el: HTMLDivElement | null): void {
  setUiRef('classWindowEl', el);
}

export function getClassWindowClassListEl(): HTMLDivElement | null {
  return getUiRef('classWindowClassListEl');
}

export function setClassWindowClassListEl(el: HTMLDivElement | null): void {
  setUiRef('classWindowClassListEl', el);
}

export function getClassWindowMethodListEl(): HTMLDivElement | null {
  return getUiRef('classWindowMethodListEl');
}

export function setClassWindowMethodListEl(el: HTMLDivElement | null): void {
  setUiRef('classWindowMethodListEl', el);
}

export function getClassWindowFilterInput(): HTMLInputElement | null {
  return getUiRef('classWindowFilterInput');
}

export function setClassWindowFilterInput(el: HTMLInputElement | null): void {
  setUiRef('classWindowFilterInput', el);
}

export function isClassWindowVisible(): boolean {
  return get('classWindowVisible');
}

export function setClassWindowVisible(visible: boolean): void {
  set({ classWindowVisible: visible });
}

export function getSelectedClassName(): string | null {
  return get('selectedClassName');
}

export function setSelectedClassName(name: string | null): void {
  set({ selectedClassName: name });
}

export function getMethodSpyWindowEl(): HTMLDivElement | null {
  return getUiRef('methodSpyWindowEl');
}

export function setMethodSpyWindowEl(el: HTMLDivElement | null): void {
  setUiRef('methodSpyWindowEl', el);
}

export function getMethodSpyListEl(): HTMLDivElement | null {
  return getUiRef('methodSpyListEl');
}

export function setMethodSpyListEl(el: HTMLDivElement | null): void {
  setUiRef('methodSpyListEl', el);
}

export function getMethodSpyDetailsEl(): HTMLDivElement | null {
  return getUiRef('methodSpyDetailsEl');
}

export function setMethodSpyDetailsEl(el: HTMLDivElement | null): void {
  setUiRef('methodSpyDetailsEl', el);
}

export function getMethodSpyFilterInput(): HTMLInputElement | null {
  return getUiRef('methodSpyFilterInput');
}

export function setMethodSpyFilterInput(el: HTMLInputElement | null): void {
  setUiRef('methodSpyFilterInput', el);
}
