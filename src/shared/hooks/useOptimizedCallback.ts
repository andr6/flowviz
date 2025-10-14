/**
 * Optimized hooks for performance-critical operations
 *
 * These hooks provide optimized versions of useCallback and useMemo
 * with additional performance tracking in development mode.
 */

import { useCallback, useMemo, useRef, DependencyList } from 'react';
import { perfMonitor } from '../utils/performance';

/**
 * Enhanced useCallback with performance tracking
 */
export function useOptimizedCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: DependencyList,
  name?: string
): T {
  const callbackName = name || 'anonymous-callback';

  return useCallback(
    ((...args: Parameters<T>) => {
      if (process.env.NODE_ENV === 'development' && name) {
        return perfMonitor.measure(callbackName, () => callback(...args));
      }
      return callback(...args);
    }) as T,
    deps
  );
}

/**
 * Enhanced useMemo with performance tracking
 */
export function useOptimizedMemo<T>(
  factory: () => T,
  deps: DependencyList,
  name?: string
): T {
  const memoName = name || 'anonymous-memo';

  return useMemo(() => {
    if (process.env.NODE_ENV === 'development' && name) {
      return perfMonitor.measure(memoName, factory) as T;
    }
    return factory();
  }, deps);
}

/**
 * useStableCallback - callback that never changes identity
 * Useful for callbacks passed to deeply nested memoized components
 */
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T
): T {
  const callbackRef = useRef(callback);

  // Update ref on each render
  callbackRef.current = callback;

  // Return stable function that calls current ref
  return useCallback(((...args: Parameters<T>) => {
    return callbackRef.current(...args);
  }) as T, []);
}

/**
 * useDebouncedCallback - debounced callback with automatic cleanup
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout>();

  return useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    }) as T,
    [callback, delay]
  );
}

/**
 * useThrottledCallback - throttled callback
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  limit: number
): T {
  const inThrottleRef = useRef(false);

  return useCallback(
    ((...args: Parameters<T>) => {
      if (!inThrottleRef.current) {
        callback(...args);
        inThrottleRef.current = true;

        setTimeout(() => {
          inThrottleRef.current = false;
        }, limit);
      }
    }) as T,
    [callback, limit]
  );
}

/**
 * useMemoCompare - useMemo with custom comparison function
 * Useful for complex objects that need deep comparison
 */
export function useMemoCompare<T>(
  factory: () => T,
  deps: DependencyList,
  compare: (prev: DependencyList, next: DependencyList) => boolean
): T {
  const prevDepsRef = useRef<DependencyList>();
  const valueRef = useRef<T>();

  const depsChanged =
    !prevDepsRef.current || !compare(prevDepsRef.current, deps);

  if (depsChanged) {
    valueRef.current = factory();
    prevDepsRef.current = deps;
  }

  return valueRef.current as T;
}

/**
 * useDeepCompareMemo - useMemo with deep comparison
 * Uses JSON.stringify for comparison (use sparingly)
 */
export function useDeepCompareMemo<T>(
  factory: () => T,
  deps: DependencyList
): T {
  return useMemoCompare(
    factory,
    deps,
    (prev, next) => JSON.stringify(prev) === JSON.stringify(next)
  );
}
