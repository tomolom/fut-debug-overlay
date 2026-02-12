export interface UiRefsState {
  tooltipEl: HTMLDivElement | null;
  highlightEl: HTMLDivElement | null;
  badgeEl: HTMLDivElement | null;
  sidebarEl: HTMLDivElement | null;
  sidebarContentEl: HTMLDivElement | null;
  sidebarFilterInput: HTMLInputElement | null;
  classWindowEl: HTMLDivElement | null;
  classWindowClassListEl: HTMLDivElement | null;
  classWindowMethodListEl: HTMLDivElement | null;
  classWindowFilterInput: HTMLInputElement | null;
  methodSpyWindowEl: HTMLDivElement | null;
  methodSpyListEl: HTMLDivElement | null;
  methodSpyDetailsEl: HTMLDivElement | null;
  methodSpyFilterInput: HTMLInputElement | null;
}

export class UiRefsStore {
  private readonly refs: Map<
    keyof UiRefsState,
    UiRefsState[keyof UiRefsState]
  > = new Map();

  get<K extends keyof UiRefsState>(key: K): UiRefsState[K] {
    return (this.refs.get(key) ?? null) as UiRefsState[K];
  }

  set<K extends keyof UiRefsState>(key: K, value: UiRefsState[K]): void {
    if (value === null) {
      this.refs.delete(key);
      return;
    }
    this.refs.set(key, value);
  }
}

export function createUiRefsStore(): UiRefsStore {
  return new UiRefsStore();
}

const uiRefsStore = createUiRefsStore();

export function getUiRef<K extends keyof UiRefsState>(key: K): UiRefsState[K] {
  return uiRefsStore.get(key);
}

export function setUiRef<K extends keyof UiRefsState>(
  key: K,
  value: UiRefsState[K],
): void {
  uiRefsStore.set(key, value);
}
