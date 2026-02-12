import { describe, it, expect, vi } from 'vitest';
import { createHookDispatcher } from '../hook-dispatcher';

describe('hook dispatcher', () => {
  it('on registers and emit notifies subscriber', () => {
    const dispatcher = createHookDispatcher();
    const callback = vi.fn();

    dispatcher.on('dom:appendChild', callback);
    dispatcher.emit('dom:appendChild', {
      source: 'appendChild',
      node: document.createElement('div'),
      args: [],
      originalResult: null,
    });

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('off unregisters subscriber', () => {
    const dispatcher = createHookDispatcher();
    const callback = vi.fn();

    dispatcher.on('dom:appendChild', callback);
    dispatcher.off('dom:appendChild', callback);
    dispatcher.emit('dom:appendChild', {
      source: 'appendChild',
      node: null,
      args: [],
      originalResult: null,
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it('emit supports multiple subscribers', () => {
    const dispatcher = createHookDispatcher();
    const first = vi.fn();
    const second = vi.fn();

    dispatcher.on('event:addEventListener', first);
    dispatcher.on('event:addEventListener', second);

    dispatcher.emit('event:addEventListener', {
      source: 'addEventListener',
      node: document.createElement('button'),
      args: ['click', () => null],
      originalResult: undefined,
    });

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('isolates subscriber errors and continues notifying others', () => {
    const dispatcher = createHookDispatcher();
    const erroring = vi.fn(() => {
      throw new Error('boom');
    });
    const safe = vi.fn();

    dispatcher.on('method:call', erroring);
    dispatcher.on('method:call', safe);

    expect(() => {
      dispatcher.emit('method:call', {
        source: 'method-spy',
        node: null,
        args: ['a'],
        originalResult: 1,
      });
    }).not.toThrow();

    expect(erroring).toHaveBeenCalledTimes(1);
    expect(safe).toHaveBeenCalledTimes(1);
  });

  it('emit with no subscribers is a no-op', () => {
    const dispatcher = createHookDispatcher();

    expect(() => {
      dispatcher.emit('dom:insertBefore', {
        source: 'insertBefore',
        node: null,
        args: [],
        originalResult: null,
      });
    }).not.toThrow();
  });
});
