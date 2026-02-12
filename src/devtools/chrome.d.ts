// Minimal Chrome DevTools API type declarations
declare namespace chrome {
  namespace devtools {
    namespace panels {
      interface Panel {
        onShown: chrome.events.Event<(window: Window) => void>;
        onHidden: chrome.events.Event<() => void>;
      }

      function create(
        title: string,
        iconPath: string,
        pagePath: string,
        callback: (panel: Panel) => void,
      ): void;
    }
  }

  namespace events {
    interface Event<T extends Function> {
      addListener(callback: T): void;
      removeListener(callback: T): void;
    }
  }
}
