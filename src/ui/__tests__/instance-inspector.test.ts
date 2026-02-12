import { describe, it, expect } from 'vitest';
import {
  extractOwnProperties,
  extractPrototypeChain,
  safeGetValue,
} from '../instance-inspector';

class MockBase {
  baseProp = 'base';
  baseMethod() {}
}

class MockClass extends MockBase {
  prop1 = 'value1';
  prop2 = 123;
  _prop3 = { nested: true };

  constructor() {
    super();
  }

  get getterProp() {
    return 'getterValue';
  }

  method1() {}
}

describe('Instance Inspector', () => {
  it('extracts own properties correctly', () => {
    const instance = new MockClass();
    const props = extractOwnProperties(instance);

    // Should contain prop1, prop2, _prop3, baseProp (inherited instance properties are "own" properties on the instance object)
    expect(props.find((p) => p.key === 'prop1')).toBeDefined();
    expect(props.find((p) => p.key === 'prop2')).toBeDefined();
    expect(props.find((p) => p.key === '_prop3')).toBeDefined();
    expect(props.find((p) => p.key === 'baseProp')).toBeDefined();

    // Should NOT contain methods from prototype (they are on prototype, not own)
    expect(props.find((p) => p.key === 'method1')).toBeUndefined();
    expect(props.find((p) => p.key === 'baseMethod')).toBeUndefined();

    // Should NOT contain getter (it is on prototype)
    expect(props.find((p) => p.key === 'getterProp')).toBeUndefined();
  });

  it('extracts prototype chain correctly', () => {
    const instance = new MockClass();
    const chain = extractPrototypeChain(instance);

    // Constructor name depends on runtime environment but should be consistent
    expect(chain[0]).toBe('MockClass');
    expect(chain).toContain('MockBase');
    expect(chain).toContain('Object');
  });

  it('detects own getters correctly', () => {
    const instance: any = {
      val: 123,
    };

    // Define property with getter manually to ensure it's "own" property
    Object.defineProperty(instance, 'ownGetter', {
      get: () => 'unsafe',
      enumerable: true,
      configurable: true,
    });

    const props = extractOwnProperties(instance);
    const getterProp = props.find((p) => p.key === 'ownGetter');
    const valProp = props.find((p) => p.key === 'val');

    expect(getterProp).toBeDefined();
    expect(getterProp?.isGetter).toBe(true);
    expect(getterProp?.valuePreview).toBe('[getter]');

    expect(valProp).toBeDefined();
    expect(valProp?.isGetter).toBe(false);
    expect(valProp?.valuePreview).toBe('123');
  });

  it('safeGetValue returns value for regular properties', () => {
    const instance = { a: 1 };
    const val = safeGetValue(instance, 'a');
    expect(val).toBe(1);
  });

  it('safeGetValue returns placeholder for getter when invoke is false', () => {
    const instance = {};
    Object.defineProperty(instance, 'g', { get: () => 1 });
    const val = safeGetValue(instance, 'g', false);
    expect(val).toBe('[getter]');
  });

  it('safeGetValue invokes getter when invoke is true', () => {
    const instance = {};
    Object.defineProperty(instance, 'g', { get: () => 999 });
    const val = safeGetValue(instance, 'g', true);
    expect(val).toBe(999);
  });
});
