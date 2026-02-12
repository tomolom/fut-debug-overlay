import type {
  ViewRecord,
  MethodCall,
  ClassInfo,
  ListenerEntry,
  ControllerEntry,
  ViewModelEntry,
} from '../types';
import { RingBuffer } from './ring-buffer';

/**
 * Global registry singleton for the UT debug overlay
 * Stores all tracked views, controllers, viewmodels, method calls, and event listeners
 * Exported as a plain object (not a class) for simplicity and direct mutation
 */
export const registry = {
  /** Set of all tracked ViewRecords (DOM elements with UT metadata) */
  views: new Set<ViewRecord>(),

  /** WeakMap for fast O(1) lookup of ViewRecord by Element */
  viewMap: new WeakMap<Element, ViewRecord>(),

  /** Array of all instantiated ViewController instances */
  controllers: [] as ControllerEntry[],

  /** Array of all instantiated ViewModel instances */
  viewModels: [] as ViewModelEntry[],

  /** Current text filter for sidebar search */
  filterText: '',

  /** Cache of last pruned views (for sidebar rendering) */
  _lastViews: [] as ViewRecord[],

  /** Map of UT class name -> ClassInfo (constructor, methods) */
  classes: new Map<string, ClassInfo>(),

  /** Ring buffer of all recorded method calls (newest entries added to end, oldest auto-evicted at 50k) */
  methodCalls: new RingBuffer<MethodCall>(50000),

  /** Array of all recorded event listener attachments */
  listeners: [] as ListenerEntry[],
};
