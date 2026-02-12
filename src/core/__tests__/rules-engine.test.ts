import { describe, it, expect, beforeEach } from 'vitest';
import {
  addRule,
  removeRule,
  getRules,
  clearRules,
  matchCall,
} from '../rules-engine';

describe('RulesEngine', () => {
  beforeEach(() => {
    clearRules();
  });

  describe('addRule', () => {
    it('should add rule and return unique ID', () => {
      const id = addRule({
        className: 'UTPlayerItemView',
        action: 'log',
      });

      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    it('should generate different IDs for different rules', () => {
      const id1 = addRule({ className: 'UTPlayerItemView', action: 'log' });
      const id2 = addRule({ className: 'UTRootView', action: 'log' });

      expect(id1).not.toBe(id2);
    });

    it('should enforce max 20 rules limit', () => {
      // Add 20 rules (should succeed)
      for (let i = 0; i < 20; i++) {
        addRule({ className: `Class${i}`, action: 'log' });
      }

      // 21st rule should throw
      expect(() => {
        addRule({ className: 'Class21', action: 'log' });
      }).toThrow('Maximum of 20 rules allowed');
    });

    it('should allow adding rule after removing one', () => {
      // Fill to capacity
      const ids: string[] = [];
      for (let i = 0; i < 20; i++) {
        ids.push(addRule({ className: `Class${i}`, action: 'log' }));
      }

      // Remove one
      removeRule(ids[0]);

      // Should now be able to add another
      expect(() => {
        addRule({ className: 'NewClass', action: 'log' });
      }).not.toThrow();
    });

    it('should store rule with all properties', () => {
      const id = addRule({
        className: 'UTPlayerItemView',
        methodName: 'render',
        argContains: 'player',
        action: 'debugger',
      });

      const rules = getRules();
      const rule = rules.find((r) => r.id === id);

      expect(rule).toBeDefined();
      expect(rule?.className).toBe('UTPlayerItemView');
      expect(rule?.methodName).toBe('render');
      expect(rule?.argContains).toBe('player');
      expect(rule?.action).toBe('debugger');
    });
  });

  describe('removeRule', () => {
    it('should return true when removing existing rule', () => {
      const id = addRule({ className: 'UTPlayerItemView', action: 'log' });
      const result = removeRule(id);

      expect(result).toBe(true);
    });

    it('should return false when removing non-existent rule', () => {
      const result = removeRule('non-existent-id');

      expect(result).toBe(false);
    });

    it('should actually remove the rule from storage', () => {
      const id = addRule({ className: 'UTPlayerItemView', action: 'log' });
      removeRule(id);

      const rules = getRules();
      expect(rules.find((r) => r.id === id)).toBeUndefined();
    });

    it('should not affect other rules when removing one', () => {
      const id1 = addRule({ className: 'Class1', action: 'log' });
      const id2 = addRule({ className: 'Class2', action: 'log' });
      const id3 = addRule({ className: 'Class3', action: 'log' });

      removeRule(id2);

      const rules = getRules();
      expect(rules.length).toBe(2);
      expect(rules.find((r) => r.id === id1)).toBeDefined();
      expect(rules.find((r) => r.id === id3)).toBeDefined();
      expect(rules.find((r) => r.id === id2)).toBeUndefined();
    });
  });

  describe('getRules', () => {
    it('should return empty array when no rules exist', () => {
      const rules = getRules();

      expect(rules).toEqual([]);
    });

    it('should return all active rules', () => {
      addRule({ className: 'Class1', action: 'log' });
      addRule({ className: 'Class2', action: 'debugger' });
      addRule({ className: 'Class3', action: 'highlight' });

      const rules = getRules();

      expect(rules.length).toBe(3);
    });

    it('should return a copy, not live array', () => {
      addRule({ className: 'Class1', action: 'log' });

      const rules1 = getRules();
      const rules2 = getRules();

      expect(rules1).not.toBe(rules2);
      expect(rules1).toEqual(rules2);
    });

    it('should not allow mutation of internal state', () => {
      const id = addRule({ className: 'Class1', action: 'log' });

      const rules = getRules();
      rules.pop(); // Try to mutate returned array

      const rulesAfter = getRules();
      expect(rulesAfter.length).toBe(1);
      expect(rulesAfter[0].id).toBe(id);
    });
  });

  describe('clearRules', () => {
    it('should remove all rules', () => {
      addRule({ className: 'Class1', action: 'log' });
      addRule({ className: 'Class2', action: 'log' });
      addRule({ className: 'Class3', action: 'log' });

      clearRules();

      const rules = getRules();
      expect(rules.length).toBe(0);
    });

    it('should allow adding rules after clear', () => {
      addRule({ className: 'Class1', action: 'log' });
      clearRules();

      const id = addRule({ className: 'Class2', action: 'log' });
      const rules = getRules();

      expect(rules.length).toBe(1);
      expect(rules[0].id).toBe(id);
    });

    it('should work on empty rule set', () => {
      expect(() => {
        clearRules();
      }).not.toThrow();
    });
  });

  describe('matchCall - exact matching', () => {
    it('should match exact className', () => {
      const id = addRule({ className: 'UTPlayerItemView', action: 'log' });

      const matches = matchCall('UTPlayerItemView', 'render', []);

      expect(matches.length).toBe(1);
      expect(matches[0].id).toBe(id);
    });

    it('should match exact methodName', () => {
      const id = addRule({ methodName: 'render', action: 'log' });

      const matches = matchCall('UTPlayerItemView', 'render', []);

      expect(matches.length).toBe(1);
      expect(matches[0].id).toBe(id);
    });

    it('should match both className and methodName', () => {
      const id = addRule({
        className: 'UTPlayerItemView',
        methodName: 'render',
        action: 'log',
      });

      const matches = matchCall('UTPlayerItemView', 'render', []);

      expect(matches.length).toBe(1);
      expect(matches[0].id).toBe(id);
    });

    it('should not match wrong className', () => {
      addRule({ className: 'UTPlayerItemView', action: 'log' });

      const matches = matchCall('UTRootView', 'render', []);

      expect(matches.length).toBe(0);
    });

    it('should not match wrong methodName', () => {
      addRule({ methodName: 'render', action: 'log' });

      const matches = matchCall('UTPlayerItemView', 'update', []);

      expect(matches.length).toBe(0);
    });

    it('should not match when className matches but methodName does not', () => {
      addRule({
        className: 'UTPlayerItemView',
        methodName: 'render',
        action: 'log',
      });

      const matches = matchCall('UTPlayerItemView', 'update', []);

      expect(matches.length).toBe(0);
    });
  });

  describe('matchCall - glob wildcard matching', () => {
    it('should match wildcard at end of className', () => {
      const id = addRule({ className: 'UT*', action: 'log' });

      const matches = matchCall('UTPlayerItemView', 'render', []);

      expect(matches.length).toBe(1);
      expect(matches[0].id).toBe(id);
    });

    it('should match wildcard at start of className', () => {
      const id = addRule({ className: '*View', action: 'log' });

      const matches = matchCall('UTPlayerItemView', 'render', []);

      expect(matches.length).toBe(1);
      expect(matches[0].id).toBe(id);
    });

    it('should match wildcard in middle of className', () => {
      const id = addRule({ className: 'UT*View', action: 'log' });

      const matches = matchCall('UTPlayerItemView', 'render', []);

      expect(matches.length).toBe(1);
      expect(matches[0].id).toBe(id);
    });

    it('should match multiple wildcards in className', () => {
      const id = addRule({ className: 'UT*Item*', action: 'log' });

      const matches = matchCall('UTPlayerItemView', 'render', []);

      expect(matches.length).toBe(1);
      expect(matches[0].id).toBe(id);
    });

    it('should match wildcard at end of methodName', () => {
      const id = addRule({ methodName: 'render*', action: 'log' });

      const matches = matchCall('UTPlayerItemView', 'renderItem', []);

      expect(matches.length).toBe(1);
      expect(matches[0].id).toBe(id);
    });

    it('should match wildcard at start of methodName', () => {
      const id = addRule({ methodName: '*Item', action: 'log' });

      const matches = matchCall('UTPlayerItemView', 'renderItem', []);

      expect(matches.length).toBe(1);
      expect(matches[0].id).toBe(id);
    });

    it('should match wildcard in middle of methodName', () => {
      const id = addRule({ methodName: 'render*Item', action: 'log' });

      const matches = matchCall('UTPlayerItemView', 'renderPlayerItem', []);

      expect(matches.length).toBe(1);
      expect(matches[0].id).toBe(id);
    });

    it('should match single wildcard for everything', () => {
      const id = addRule({ className: '*', action: 'log' });

      const matches = matchCall('AnyClass', 'anyMethod', []);

      expect(matches.length).toBe(1);
      expect(matches[0].id).toBe(id);
    });

    it('should not match when glob pattern does not match', () => {
      addRule({ className: 'UT*View', action: 'log' });

      const matches = matchCall('UTPlayerItemController', 'render', []);

      expect(matches.length).toBe(0);
    });
  });

  describe('matchCall - argContains matching', () => {
    it('should match when argContains substring found in first arg', () => {
      const id = addRule({ argContains: 'player', action: 'log' });

      const matches = matchCall('UTPlayerItemView', 'render', [
        'player-123',
        'other',
      ]);

      expect(matches.length).toBe(1);
      expect(matches[0].id).toBe(id);
    });

    it('should match when argContains substring found in second arg', () => {
      const id = addRule({ argContains: 'player', action: 'log' });

      const matches = matchCall('UTPlayerItemView', 'render', [
        'other',
        'player-123',
      ]);

      expect(matches.length).toBe(1);
      expect(matches[0].id).toBe(id);
    });

    it('should match when argContains substring found in any arg', () => {
      const id = addRule({ argContains: 'player', action: 'log' });

      const matches = matchCall('UTPlayerItemView', 'render', [
        'a',
        'b',
        'c',
        'player-123',
      ]);

      expect(matches.length).toBe(1);
      expect(matches[0].id).toBe(id);
    });

    it('should not match when argContains substring not found', () => {
      addRule({ argContains: 'player', action: 'log' });

      const matches = matchCall('UTPlayerItemView', 'render', [
        'other',
        'data',
      ]);

      expect(matches.length).toBe(0);
    });

    it('should not match when argPreviews is empty', () => {
      addRule({ argContains: 'player', action: 'log' });

      const matches = matchCall('UTPlayerItemView', 'render', []);

      expect(matches.length).toBe(0);
    });

    it('should be case-sensitive', () => {
      addRule({ argContains: 'player', action: 'log' });

      const matches = matchCall('UTPlayerItemView', 'render', ['PLAYER-123']);

      expect(matches.length).toBe(0);
    });
  });

  describe('matchCall - combined criteria', () => {
    it('should match when all criteria match', () => {
      const id = addRule({
        className: 'UT*View',
        methodName: 'render*',
        argContains: 'player',
        action: 'log',
      });

      const matches = matchCall('UTPlayerItemView', 'renderItem', [
        'player-123',
      ]);

      expect(matches.length).toBe(1);
      expect(matches[0].id).toBe(id);
    });

    it('should not match when className matches but methodName does not', () => {
      addRule({
        className: 'UT*View',
        methodName: 'render*',
        argContains: 'player',
        action: 'log',
      });

      const matches = matchCall('UTPlayerItemView', 'update', ['player-123']);

      expect(matches.length).toBe(0);
    });

    it('should not match when className and methodName match but argContains does not', () => {
      addRule({
        className: 'UT*View',
        methodName: 'render*',
        argContains: 'player',
        action: 'log',
      });

      const matches = matchCall('UTPlayerItemView', 'renderItem', ['other']);

      expect(matches.length).toBe(0);
    });

    it('should match rule with only className when others undefined', () => {
      const id = addRule({
        className: 'UTPlayerItemView',
        action: 'log',
      });

      const matches = matchCall('UTPlayerItemView', 'anyMethod', ['anyArg']);

      expect(matches.length).toBe(1);
      expect(matches[0].id).toBe(id);
    });

    it('should match rule with only methodName when others undefined', () => {
      const id = addRule({
        methodName: 'render',
        action: 'log',
      });

      const matches = matchCall('AnyClass', 'render', ['anyArg']);

      expect(matches.length).toBe(1);
      expect(matches[0].id).toBe(id);
    });

    it('should match rule with only argContains when others undefined', () => {
      const id = addRule({
        argContains: 'player',
        action: 'log',
      });

      const matches = matchCall('AnyClass', 'anyMethod', ['player-123']);

      expect(matches.length).toBe(1);
      expect(matches[0].id).toBe(id);
    });
  });

  describe('matchCall - multiple rules', () => {
    it('should return all matching rules', () => {
      const id1 = addRule({ className: 'UT*', action: 'log' });
      const id2 = addRule({ methodName: 'render', action: 'debugger' });
      const id3 = addRule({ argContains: 'player', action: 'highlight' });

      const matches = matchCall('UTPlayerItemView', 'render', ['player-123']);

      expect(matches.length).toBe(3);
      expect(matches.map((r) => r.id)).toContain(id1);
      expect(matches.map((r) => r.id)).toContain(id2);
      expect(matches.map((r) => r.id)).toContain(id3);
    });

    it('should return only matching rules, not all rules', () => {
      const id1 = addRule({ className: 'UTPlayerItemView', action: 'log' });
      addRule({ className: 'UTRootView', action: 'log' });
      addRule({ methodName: 'update', action: 'log' });

      const matches = matchCall('UTPlayerItemView', 'render', []);

      expect(matches.length).toBe(1);
      expect(matches[0].id).toBe(id1);
    });

    it('should return empty array when no rules match', () => {
      addRule({ className: 'UTRootView', action: 'log' });
      addRule({ methodName: 'update', action: 'log' });

      const matches = matchCall('UTPlayerItemView', 'render', []);

      expect(matches.length).toBe(0);
    });
  });

  describe('matchCall - edge cases', () => {
    it('should handle empty className', () => {
      const id = addRule({ methodName: 'render', action: 'log' });

      const matches = matchCall('', 'render', []);

      expect(matches.length).toBe(1);
      expect(matches[0].id).toBe(id);
    });

    it('should handle empty methodName', () => {
      const id = addRule({ className: 'UTPlayerItemView', action: 'log' });

      const matches = matchCall('UTPlayerItemView', '', []);

      expect(matches.length).toBe(1);
      expect(matches[0].id).toBe(id);
    });

    it('should handle special regex characters in className', () => {
      const id = addRule({ className: 'UT.Player', action: 'log' });

      // Should match exactly, not as regex
      const matches = matchCall('UT.Player', 'render', []);

      expect(matches.length).toBe(1);
      expect(matches[0].id).toBe(id);
    });

    it('should not treat dot as regex wildcard', () => {
      addRule({ className: 'UT.Player', action: 'log' });

      // Should NOT match (dot should be literal, not regex wildcard)
      const matches = matchCall('UTXPlayer', 'render', []);

      expect(matches.length).toBe(0);
    });

    it('should handle rule with no criteria (matches nothing)', () => {
      const id = addRule({ action: 'log' });

      // Rule with no className, methodName, or argContains should match everything
      const matches = matchCall('AnyClass', 'anyMethod', ['anyArg']);

      expect(matches.length).toBe(1);
      expect(matches[0].id).toBe(id);
    });
  });
});
