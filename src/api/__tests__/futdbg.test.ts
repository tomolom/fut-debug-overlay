import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { registry } from '../../core/registry';
import type { ClassInfo, MethodCall, ViewRecord } from '../../types';
import { installFUTDBG } from '../futdbg';

describe('FUTDBG Console API', () => {
  beforeEach(() => {
    // Clear registry before each test
    registry.classes.clear();
    registry.views.clear();
    registry.controllers = [];
    registry.viewModels = [];
    registry.methodCalls.clear();
    registry.listeners = [];

    // Install FUTDBG
    installFUTDBG();
  });

  afterEach(() => {
    // Clean up window.FUTDBG
    delete (window as any).FUTDBG;
  });

  describe('FUTDBG.classes()', () => {
    it('should return empty array when no classes registered', () => {
      const result = (window as any).FUTDBG.classes();
      expect(result).toEqual([]);
    });

    it('should return sorted array of class names', () => {
      const classInfo: ClassInfo = {
        ctor: class UTPlayerItemView {},
        protoMethods: ['render', 'update'],
        staticMethods: [],
      };
      registry.classes.set('UTPlayerItemView', classInfo);
      registry.classes.set('UTRootView', {
        ctor: class UTRootView {},
        protoMethods: [],
        staticMethods: [],
      });
      registry.classes.set('UTButtonControl', {
        ctor: class UTButtonControl {},
        protoMethods: [],
        staticMethods: [],
      });

      const result = (window as any).FUTDBG.classes();
      expect(result).toEqual([
        'UTButtonControl',
        'UTPlayerItemView',
        'UTRootView',
      ]);
    });

    it('should return a copy, not the original Map keys', () => {
      registry.classes.set('UTTest', {
        ctor: class UTTest {},
        protoMethods: [],
        staticMethods: [],
      });

      const result1 = (window as any).FUTDBG.classes();
      const result2 = (window as any).FUTDBG.classes();

      expect(result1).toEqual(result2);
      expect(result1).not.toBe(result2); // Different array instances
    });
  });

  describe('FUTDBG.find(className)', () => {
    it('should return null for non-existent class', () => {
      const result = (window as any).FUTDBG.find('UTNonExistent');
      expect(result).toBeNull();
    });

    it('should return ClassInfo for existing class', () => {
      const classInfo: ClassInfo = {
        ctor: class UTPlayerItemView {},
        protoMethods: ['render', 'update'],
        staticMethods: ['create'],
      };
      registry.classes.set('UTPlayerItemView', classInfo);

      const result = (window as any).FUTDBG.find('UTPlayerItemView');
      expect(result).not.toBeNull();
      expect(result.ctor).toBe(classInfo.ctor);
      expect(result.protoMethods).toEqual(['render', 'update']);
      expect(result.staticMethods).toEqual(['create']);
    });

    it('should return a copy of ClassInfo, not live reference', () => {
      const classInfo: ClassInfo = {
        ctor: class UTTest {},
        protoMethods: ['method1'],
        staticMethods: ['staticMethod1'],
      };
      registry.classes.set('UTTest', classInfo);

      const result = (window as any).FUTDBG.find('UTTest');
      expect(result.protoMethods).not.toBe(classInfo.protoMethods);
      expect(result.staticMethods).not.toBe(classInfo.staticMethods);
    });

    it('should handle case-sensitive class names', () => {
      registry.classes.set('UTPlayerItemView', {
        ctor: class UTPlayerItemView {},
        protoMethods: [],
        staticMethods: [],
      });

      expect((window as any).FUTDBG.find('UTPlayerItemView')).not.toBeNull();
      expect((window as any).FUTDBG.find('utplayeritemview')).toBeNull();
      expect((window as any).FUTDBG.find('UTPLAYERITEMVIEW')).toBeNull();
    });
  });

  describe('FUTDBG.views()', () => {
    it('should return empty array when no views tracked', () => {
      const result = (window as any).FUTDBG.views();
      expect(result).toEqual([]);
    });

    it('should return view summaries without live DOM references', () => {
      const element = document.createElement('div');
      element.className = 'test-class another-class';
      element.id = 'test-id';

      const viewRecord: ViewRecord = {
        element,
        classes: new Set(['UTPlayerItemView', 'UTView']),
        lastItemSnippet: 'Player: Messi',
        controlInfo: null,
        createdBy: 'UTPlayerItemView',
        createdStack: ['UTPlayerItemView', 'UTRootView'],
      };

      registry.views.add(viewRecord);

      const result = (window as any).FUTDBG.views();
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('element');
      expect(result[0]).toHaveProperty('classes');
      expect(result[0]).toHaveProperty('createdBy');
      expect(result[0]).toHaveProperty('itemSnippet');

      // Verify element is summarized, not live reference
      expect(typeof result[0].element).toBe('object');
      expect(result[0].element).not.toBe(element);
    });

    it('should include control info when present', () => {
      const element = document.createElement('button');
      const viewRecord: ViewRecord = {
        element,
        classes: new Set(['UTButtonControl']),
        lastItemSnippet: null,
        controlInfo: {
          type: 'button',
          className: 'UTButtonControl',
          label: 'Click Me',
          disabled: false,
          domClass: 'btn-primary',
        },
        createdBy: 'UTButtonControl',
        createdStack: null,
      };

      registry.views.add(viewRecord);

      const result = (window as any).FUTDBG.views();
      expect(result[0].controlInfo).toBeDefined();
      expect(result[0].controlInfo.label).toBe('Click Me');
    });

    it('should return a copy, not live references', () => {
      const element = document.createElement('div');
      const viewRecord: ViewRecord = {
        element,
        classes: new Set(['UTTest']),
        lastItemSnippet: null,
        controlInfo: null,
        createdBy: null,
        createdStack: null,
      };

      registry.views.add(viewRecord);

      const result1 = (window as any).FUTDBG.views();
      const result2 = (window as any).FUTDBG.views();

      expect(result1).not.toBe(result2);
      expect(result1[0]).not.toBe(result2[0]);
    });
  });

  describe('FUTDBG.calls(filter?)', () => {
    it('should return empty array when no calls recorded', () => {
      const result = (window as any).FUTDBG.calls();
      expect(result).toEqual([]);
    });

    it('should return calls in newest-first order', () => {
      const call1: MethodCall = {
        id: 1,
        ts: 1000,
        className: 'UTPlayerItemView',
        methodName: 'render',
        isStatic: false,
        argPreviews: [],
        resultPreview: 'undefined',
        errorPreview: '',
        threw: false,
      };
      const call2: MethodCall = {
        id: 2,
        ts: 2000,
        className: 'UTRootView',
        methodName: 'update',
        isStatic: false,
        argPreviews: [],
        resultPreview: 'undefined',
        errorPreview: '',
        threw: false,
      };

      registry.methodCalls.push(call1);
      registry.methodCalls.push(call2);

      const result = (window as any).FUTDBG.calls();
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(2); // Newest first
      expect(result[1].id).toBe(1);
    });

    it('should filter calls by className.methodName substring', () => {
      const call1: MethodCall = {
        id: 1,
        ts: 1000,
        className: 'UTPlayerItemView',
        methodName: 'render',
        isStatic: false,
        argPreviews: [],
        resultPreview: 'undefined',
        errorPreview: '',
        threw: false,
      };
      const call2: MethodCall = {
        id: 2,
        ts: 2000,
        className: 'UTRootView',
        methodName: 'update',
        isStatic: false,
        argPreviews: [],
        resultPreview: 'undefined',
        errorPreview: '',
        threw: false,
      };
      const call3: MethodCall = {
        id: 3,
        ts: 3000,
        className: 'UTPlayerItemView',
        methodName: 'update',
        isStatic: false,
        argPreviews: [],
        resultPreview: 'undefined',
        errorPreview: '',
        threw: false,
      };

      registry.methodCalls.push(call1);
      registry.methodCalls.push(call2);
      registry.methodCalls.push(call3);

      const result = (window as any).FUTDBG.calls('PlayerItem');
      expect(result).toHaveLength(2);
      expect(result[0].className).toBe('UTPlayerItemView');
      expect(result[1].className).toBe('UTPlayerItemView');
    });

    it('should filter by method name', () => {
      const call1: MethodCall = {
        id: 1,
        ts: 1000,
        className: 'UTPlayerItemView',
        methodName: 'render',
        isStatic: false,
        argPreviews: [],
        resultPreview: 'undefined',
        errorPreview: '',
        threw: false,
      };
      const call2: MethodCall = {
        id: 2,
        ts: 2000,
        className: 'UTRootView',
        methodName: 'update',
        isStatic: false,
        argPreviews: [],
        resultPreview: 'undefined',
        errorPreview: '',
        threw: false,
      };

      registry.methodCalls.push(call1);
      registry.methodCalls.push(call2);

      const result = (window as any).FUTDBG.calls('render');
      expect(result).toHaveLength(1);
      expect(result[0].methodName).toBe('render');
    });

    it('should return max 100 calls', () => {
      // Add 150 calls
      for (let i = 0; i < 150; i += 1) {
        registry.methodCalls.push({
          id: i,
          ts: i * 1000,
          className: 'UTTest',
          methodName: 'method',
          isStatic: false,
          argPreviews: [],
          resultPreview: 'undefined',
          errorPreview: '',
          threw: false,
        });
      }

      const result = (window as any).FUTDBG.calls();
      expect(result.length).toBeLessThanOrEqual(100);
    });

    it('should return copies, not live references', () => {
      const call: MethodCall = {
        id: 1,
        ts: 1000,
        className: 'UTTest',
        methodName: 'test',
        isStatic: false,
        argPreviews: ['arg1'],
        resultPreview: 'result',
        errorPreview: '',
        threw: false,
      };

      registry.methodCalls.push(call);

      const result1 = (window as any).FUTDBG.calls();
      const result2 = (window as any).FUTDBG.calls();

      expect(result1).not.toBe(result2);
      expect(result1[0]).not.toBe(result2[0]);
    });
  });

  describe('FUTDBG.registry', () => {
    it('should return the registry object', () => {
      const result = (window as any).FUTDBG.registry;
      expect(result).toBe(registry);
    });

    it('should be a read-only getter (no setter)', () => {
      const original = (window as any).FUTDBG.registry;
      expect(() => {
        (window as any).FUTDBG.registry = {};
      }).toThrow();
      expect((window as any).FUTDBG.registry).toBe(original);
    });

    it('should provide access to registry.classes', () => {
      registry.classes.set('UTTest', {
        ctor: class UTTest {},
        protoMethods: [],
        staticMethods: [],
      });

      expect((window as any).FUTDBG.registry.classes.has('UTTest')).toBe(true);
    });

    it('should provide access to registry.methodCalls', () => {
      const call: MethodCall = {
        id: 1,
        ts: 1000,
        className: 'UTTest',
        methodName: 'test',
        isStatic: false,
        argPreviews: [],
        resultPreview: 'undefined',
        errorPreview: '',
        threw: false,
      };

      registry.methodCalls.push(call);
      expect((window as any).FUTDBG.registry.methodCalls.length).toBe(1);
    });
  });

  describe('FUTDBG.help()', () => {
    it('should return a string', () => {
      const result = (window as any).FUTDBG.help();
      expect(typeof result).toBe('string');
    });

    it('should include all available functions', () => {
      const help = (window as any).FUTDBG.help();
      expect(help).toContain('classes');
      expect(help).toContain('find');
      expect(help).toContain('views');
      expect(help).toContain('calls');
      expect(help).toContain('registry');
      expect(help).toContain('help');
    });

    it('should be multi-line and descriptive', () => {
      const help = (window as any).FUTDBG.help();
      expect(help.split('\n').length).toBeGreaterThan(1);
    });

    it('should mention that calls are max 100', () => {
      const help = (window as any).FUTDBG.help();
      expect(help.toLowerCase()).toContain('100');
    });
  });

  describe('FUTDBG namespace', () => {
    it('should be installed on window', () => {
      expect((window as any).FUTDBG).toBeDefined();
    });

    it('should have all required methods', () => {
      const futdbg = (window as any).FUTDBG;
      expect(typeof futdbg.classes).toBe('function');
      expect(typeof futdbg.find).toBe('function');
      expect(typeof futdbg.views).toBe('function');
      expect(typeof futdbg.calls).toBe('function');
      expect(typeof futdbg.help).toBe('function');
    });

    it('should have registry getter', () => {
      const futdbg = (window as any).FUTDBG;
      expect(futdbg.registry).toBeDefined();
    });
  });

  describe('Integration tests', () => {
    it('should work with populated registry', () => {
      // Add classes
      registry.classes.set('UTPlayerItemView', {
        ctor: class UTPlayerItemView {},
        protoMethods: ['render', 'update'],
        staticMethods: ['create'],
      });

      // Add views
      const element = document.createElement('div');
      registry.views.add({
        element,
        classes: new Set(['UTPlayerItemView']),
        lastItemSnippet: 'Messi',
        controlInfo: null,
        createdBy: 'UTPlayerItemView',
        createdStack: null,
      });

      // Add method calls
      registry.methodCalls.push({
        id: 1,
        ts: 1000,
        className: 'UTPlayerItemView',
        methodName: 'render',
        isStatic: false,
        argPreviews: [],
        resultPreview: 'undefined',
        errorPreview: '',
        threw: false,
      });

      const futdbg = (window as any).FUTDBG;

      expect(futdbg.classes()).toContain('UTPlayerItemView');
      expect(futdbg.find('UTPlayerItemView')).not.toBeNull();
      expect(futdbg.views()).toHaveLength(1);
      expect(futdbg.calls()).toHaveLength(1);
      expect(futdbg.registry).toBe(registry);
    });
  });
});
