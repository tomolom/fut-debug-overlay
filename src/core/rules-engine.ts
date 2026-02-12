import { dispatcher } from './hook-dispatcher';
import type { HookDispatchPayload } from './hook-dispatcher';

export interface Rule {
  id: string;
  className?: string;
  methodName?: string;
  argContains?: string;
  action: 'log' | 'debugger' | 'highlight';
}

const MAX_RULES = 20;
const rules: Rule[] = [];

/**
 * Generate unique rule ID
 */
function generateRuleId(): string {
  return `rule-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Convert glob pattern to regex (simple * wildcard only)
 */
function globToRegex(pattern: string): RegExp {
  // Escape special regex characters except *
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  // Convert * to .*
  const regexPattern = escaped.replace(/\*/g, '.*');
  return new RegExp(`^${regexPattern}$`);
}

/**
 * Check if a string matches a glob pattern
 */
function matchesGlob(value: string, pattern: string): boolean {
  const regex = globToRegex(pattern);
  return regex.test(value);
}

/**
 * Add a new rule
 * @throws Error if max rules (20) exceeded
 */
export function addRule(rule: Omit<Rule, 'id'>): string {
  if (rules.length >= MAX_RULES) {
    throw new Error('Maximum of 20 rules allowed');
  }

  const id = generateRuleId();
  const newRule: Rule = { id, ...rule };
  rules.push(newRule);
  return id;
}

/**
 * Remove a rule by ID
 * @returns true if removed, false if not found
 */
export function removeRule(id: string): boolean {
  const index = rules.findIndex((r) => r.id === id);
  if (index === -1) return false;

  rules.splice(index, 1);
  return true;
}

/**
 * Get all active rules (returns a copy)
 */
export function getRules(): Rule[] {
  return rules.map((r) => ({ ...r }));
}

/**
 * Clear all rules
 */
export function clearRules(): void {
  rules.length = 0;
}

/**
 * Match a method call against all rules
 * @returns Array of matching rules
 */
export function matchCall(
  className: string,
  methodName: string,
  argPreviews: string[],
): Rule[] {
  const matches: Rule[] = [];

  for (let i = 0; i < rules.length; i += 1) {
    const rule = rules[i];
    let isMatch = true;

    // Check className if specified
    if (rule.className !== undefined) {
      if (!matchesGlob(className, rule.className)) {
        isMatch = false;
      }
    }

    // Check methodName if specified
    if (isMatch && rule.methodName !== undefined) {
      if (!matchesGlob(methodName, rule.methodName)) {
        isMatch = false;
      }
    }

    // Check argContains if specified
    if (isMatch && rule.argContains !== undefined) {
      let foundInArgs = false;
      for (let j = 0; j < argPreviews.length; j += 1) {
        if (argPreviews[j].includes(rule.argContains)) {
          foundInArgs = true;
          break;
        }
      }
      if (!foundInArgs) {
        isMatch = false;
      }
    }

    if (isMatch) {
      matches.push(rule);
    }
  }

  return matches;
}

/**
 * Execute rule action
 */
function executeAction(
  rule: Rule,
  className: string,
  methodName: string,
  argPreviews: string[],
  node: unknown,
): void {
  switch (rule.action) {
    case 'log':
      console.group(
        `[Rule ${rule.id}] ${className}.${methodName}(${argPreviews.length} args)`,
      );
      console.log('Rule:', rule);
      console.log('Class:', className);
      console.log('Method:', methodName);
      console.log('Args:', argPreviews);
      if (node) console.log('Node:', node);
      console.groupEnd();
      break;

    case 'debugger':
      // eslint-disable-next-line no-debugger
      debugger;
      break;

    case 'highlight':
      if (node && node instanceof Element) {
        // Flash highlight the element
        const originalOutline = (node as HTMLElement).style.outline;
        const originalOutlineOffset = (node as HTMLElement).style.outlineOffset;

        (node as HTMLElement).style.outline = '3px solid #ff0';
        (node as HTMLElement).style.outlineOffset = '2px';

        setTimeout(() => {
          (node as HTMLElement).style.outline = originalOutline;
          (node as HTMLElement).style.outlineOffset = originalOutlineOffset;
        }, 500);
      }
      break;

    default:
      break;
  }
}

/**
 * Initialize rules engine by subscribing to hook dispatcher
 */
export function initRulesEngine(): void {
  dispatcher.on('method:call', (payload: HookDispatchPayload) => {
    // payload.args format: [className, methodName, argPreviews, ...]
    const args = payload.args as unknown[];
    if (args.length < 3) return;

    const className = args[0] as string;
    const methodName = args[1] as string;
    const argPreviews = args[2] as string[];

    const matchingRules = matchCall(className, methodName, argPreviews);

    for (let i = 0; i < matchingRules.length; i += 1) {
      executeAction(
        matchingRules[i],
        className,
        methodName,
        argPreviews,
        payload.node,
      );
    }
  });
}
