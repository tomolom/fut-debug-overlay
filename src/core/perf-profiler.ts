/**
 * Performance Profiler
 * Tracks method call timing and aggregates statistics
 */

import { dispatcher } from './hook-dispatcher';
import { isFeatureEnabled } from './feature-toggles';

export interface MethodStats {
  className: string;
  methodName: string;
  callCount: number;
  totalMs: number;
  minMs: number;
  maxMs: number;
  avgMs: number;
  p95Ms: number;
  timings: number[];
}

// Global stats map: "ClassName.methodName" -> MethodStats
const stats = new Map<string, MethodStats>();

// Sampling state: track call counts per method for sampling threshold
const samplingCounters = new Map<string, number>();
const SAMPLING_THRESHOLD = 1000;
const SAMPLING_RATE = 10; // Sample 1-in-10 after threshold

// Track if profiler is initialized to prevent duplicate listeners
let profilerInitialized = false;
let profilerCallback: ((payload: any) => void) | null = null;

/**
 * Record a method call timing
 * @param className - The class name
 * @param methodName - The method name
 * @param durationMs - The duration in milliseconds
 */
export function recordTiming(
  className: string,
  methodName: string,
  durationMs: number,
): void {
  const key = `${className}.${methodName}`;

  // Apply sampling if threshold exceeded
  const currentCount = samplingCounters.get(key) || 0;
  samplingCounters.set(key, currentCount + 1);

  if (currentCount >= SAMPLING_THRESHOLD) {
    // Sample 1-in-10 after threshold
    if (currentCount % SAMPLING_RATE !== 0) {
      return;
    }
  }

  // Get or create stats entry
  let entry = stats.get(key);

  if (!entry) {
    entry = {
      className,
      methodName,
      callCount: 0,
      totalMs: 0,
      minMs: Infinity,
      maxMs: -Infinity,
      avgMs: 0,
      p95Ms: 0,
      timings: [],
    };
    stats.set(key, entry);
  }

  // Update stats
  entry.callCount += 1;
  entry.totalMs += durationMs;
  entry.minMs = Math.min(entry.minMs, durationMs);
  entry.maxMs = Math.max(entry.maxMs, durationMs);
  entry.avgMs = entry.totalMs / entry.callCount;

  // Store timing for p95 calculation
  entry.timings.push(durationMs);

  // Calculate p95
  const sortedTimings = [...entry.timings].sort((a, b) => a - b);
  const p95Index = Math.ceil(sortedTimings.length * 0.95) - 1;
  entry.p95Ms = sortedTimings[p95Index];
}

/**
 * Get current stats map (returns a copy)
 * @returns Map of method keys to stats
 */
export function getStats(): Map<string, MethodStats> {
  return new Map(stats);
}

/**
 * Get top N methods sorted by specified field
 * @param n - Number of results to return
 * @param sortBy - Field to sort by
 * @returns Array of MethodStats sorted descending by sortBy field
 */
export function getTopN(
  n: number,
  sortBy: 'totalMs' | 'callCount' | 'avgMs',
): MethodStats[] {
  const entries = Array.from(stats.values());

  // Sort descending by sortBy field
  entries.sort((a, b) => b[sortBy] - a[sortBy]);

  // Return top N
  return entries.slice(0, n);
}

/**
 * Reset all stats
 */
export function resetStats(): void {
  stats.clear();
  samplingCounters.clear();

  // Unsubscribe from dispatcher if profiler was initialized
  if (profilerInitialized && profilerCallback) {
    dispatcher.off('method:call', profilerCallback);
  }

  profilerInitialized = false;
  profilerCallback = null;
}

/**
 * Initialize the performance profiler
 * Subscribes to method:call events from the hook dispatcher
 */
export function initPerfProfiler(): void {
  // Prevent duplicate listeners
  if (profilerInitialized) return;
  profilerInitialized = true;

  profilerCallback = (payload) => {
    // Check feature toggle
    if (!isFeatureEnabled('perfprofiler')) return;

    // Extract metadata from payload
    const meta = payload.node as any;
    if (!meta || !meta.className || !meta.methodName) return;

    // Check if durationMs is present
    if (typeof meta.durationMs !== 'number') return;

    // Record timing
    recordTiming(meta.className, meta.methodName, meta.durationMs);
  };

  dispatcher.on('method:call', profilerCallback);
}
