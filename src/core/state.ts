/**
 * Shared state module for debug flags and UI element references
 */

let debugEnabled = false;
let methodSpyVisible = false;
let methodSpyNextId = 1;
let methodSpyNeedsRefresh = false;
let sidebarDirty = true;

// UI element references
let tooltipEl: HTMLDivElement | null = null;
let highlightEl: HTMLDivElement | null = null;
let badgeEl: HTMLDivElement | null = null;
let sidebarEl: HTMLDivElement | null = null;
let sidebarContentEl: HTMLDivElement | null = null;
let sidebarFilterInput: HTMLInputElement | null = null;

let classWindowEl: HTMLDivElement | null = null;
let classWindowClassListEl: HTMLDivElement | null = null;
let classWindowMethodListEl: HTMLDivElement | null = null;
let classWindowFilterInput: HTMLInputElement | null = null;
let classWindowVisible = false;
let selectedClassName: string | null = null;

let methodSpyWindowEl: HTMLDivElement | null = null;
let methodSpyListEl: HTMLDivElement | null = null;
let methodSpyDetailsEl: HTMLDivElement | null = null;
let methodSpyFilterInput: HTMLInputElement | null = null;

export function isDebugEnabled(): boolean {
  return debugEnabled;
}

export function setDebugEnabled(enabled: boolean): void {
  debugEnabled = enabled;
}

export function isMethodSpyVisible(): boolean {
  return methodSpyVisible;
}

export function setMethodSpyVisible(visible: boolean): void {
  methodSpyVisible = visible;
}

export function getMethodSpyNextId(): number {
  return methodSpyNextId;
}

export function incrementMethodSpyNextId(): number {
  return methodSpyNextId++;
}

export function isMethodSpyNeedsRefresh(): boolean {
  return methodSpyNeedsRefresh;
}

export function setMethodSpyNeedsRefresh(needs: boolean): void {
  methodSpyNeedsRefresh = needs;
}

export function isSidebarDirty(): boolean {
  return sidebarDirty;
}

export function setSidebarDirty(dirty: boolean): void {
  sidebarDirty = dirty;
}

// UI element getters/setters
export function getTooltipEl(): HTMLDivElement | null {
  return tooltipEl;
}

export function setTooltipEl(el: HTMLDivElement | null): void {
  tooltipEl = el;
}

export function getHighlightEl(): HTMLDivElement | null {
  return highlightEl;
}

export function setHighlightEl(el: HTMLDivElement | null): void {
  highlightEl = el;
}

export function getBadgeEl(): HTMLDivElement | null {
  return badgeEl;
}

export function setBadgeEl(el: HTMLDivElement | null): void {
  badgeEl = el;
}

export function getSidebarEl(): HTMLDivElement | null {
  return sidebarEl;
}

export function setSidebarEl(el: HTMLDivElement | null): void {
  sidebarEl = el;
}

export function getSidebarContentEl(): HTMLDivElement | null {
  return sidebarContentEl;
}

export function setSidebarContentEl(el: HTMLDivElement | null): void {
  sidebarContentEl = el;
}

export function getSidebarFilterInput(): HTMLInputElement | null {
  return sidebarFilterInput;
}

export function setSidebarFilterInput(el: HTMLInputElement | null): void {
  sidebarFilterInput = el;
}

export function getClassWindowEl(): HTMLDivElement | null {
  return classWindowEl;
}

export function setClassWindowEl(el: HTMLDivElement | null): void {
  classWindowEl = el;
}

export function getClassWindowClassListEl(): HTMLDivElement | null {
  return classWindowClassListEl;
}

export function setClassWindowClassListEl(el: HTMLDivElement | null): void {
  classWindowClassListEl = el;
}

export function getClassWindowMethodListEl(): HTMLDivElement | null {
  return classWindowMethodListEl;
}

export function setClassWindowMethodListEl(el: HTMLDivElement | null): void {
  classWindowMethodListEl = el;
}

export function getClassWindowFilterInput(): HTMLInputElement | null {
  return classWindowFilterInput;
}

export function setClassWindowFilterInput(el: HTMLInputElement | null): void {
  classWindowFilterInput = el;
}

export function isClassWindowVisible(): boolean {
  return classWindowVisible;
}

export function setClassWindowVisible(visible: boolean): void {
  classWindowVisible = visible;
}

export function getSelectedClassName(): string | null {
  return selectedClassName;
}

export function setSelectedClassName(name: string | null): void {
  selectedClassName = name;
}

export function getMethodSpyWindowEl(): HTMLDivElement | null {
  return methodSpyWindowEl;
}

export function setMethodSpyWindowEl(el: HTMLDivElement | null): void {
  methodSpyWindowEl = el;
}

export function getMethodSpyListEl(): HTMLDivElement | null {
  return methodSpyListEl;
}

export function setMethodSpyListEl(el: HTMLDivElement | null): void {
  methodSpyListEl = el;
}

export function getMethodSpyDetailsEl(): HTMLDivElement | null {
  return methodSpyDetailsEl;
}

export function setMethodSpyDetailsEl(el: HTMLDivElement | null): void {
  methodSpyDetailsEl = el;
}

export function getMethodSpyFilterInput(): HTMLInputElement | null {
  return methodSpyFilterInput;
}

export function setMethodSpyFilterInput(el: HTMLInputElement | null): void {
  methodSpyFilterInput = el;
}
