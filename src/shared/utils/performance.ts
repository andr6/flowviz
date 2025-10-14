/**
 * Performance Monitoring Utilities
 *
 * Provides utilities for measuring and tracking component performance,
 * render times, and memory usage.
 */

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private enabled: boolean;

  constructor() {
    this.enabled = process.env.NODE_ENV === 'development';
  }

  /**
   * Start measuring performance for a specific operation
   */
  start(name: string, metadata?: Record<string, any>): void {
    if (!this.enabled) return;

    this.metrics.set(name, {
      name,
      startTime: performance.now(),
      metadata,
    });
  }

  /**
   * End measuring performance and log results
   */
  end(name: string): number | null {
    if (!this.enabled) return null;

    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`Performance metric "${name}" was not started`);
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - metric.startTime;

    metric.endTime = endTime;
    metric.duration = duration;

    // Log if duration exceeds threshold (100ms)
    if (duration > 100) {
      console.warn(
        `⚠️ Performance: ${name} took ${duration.toFixed(2)}ms`,
        metric.metadata
      );
    } else {
      console.log(`✅ Performance: ${name} took ${duration.toFixed(2)}ms`);
    }

    return duration;
  }

  /**
   * Measure a function execution time
   */
  async measure<T>(
    name: string,
    fn: () => T | Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    if (!this.enabled) {
      return fn();
    }

    this.start(name, metadata);
    try {
      const result = await fn();
      this.end(name);
      return result;
    } catch (error) {
      this.end(name);
      throw error;
    }
  }

  /**
   * Get all recorded metrics
   */
  getMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
  }

  /**
   * Get memory usage (if available)
   */
  getMemoryUsage(): {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    limit: number;
  } | null {
    if (typeof window !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory;
      return {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
      };
    }
    return null;
  }

  /**
   * Log current memory usage
   */
  logMemoryUsage(label?: string): void {
    if (!this.enabled) return;

    const memory = this.getMemoryUsage();
    if (memory) {
      const usedMB = (memory.usedJSHeapSize / 1024 / 1024).toFixed(2);
      const totalMB = (memory.totalJSHeapSize / 1024 / 1024).toFixed(2);
      const limitMB = (memory.limit / 1024 / 1024).toFixed(2);

      console.log(
        `📊 Memory ${label ? `(${label})` : ''}: ${usedMB}MB / ${totalMB}MB (limit: ${limitMB}MB)`
      );
    }
  }
}

export const perfMonitor = new PerformanceMonitor();

/**
 * React hook for measuring component render performance
 */
export function useRenderPerformance(componentName: string) {
  if (process.env.NODE_ENV === 'production') {
    return { start: () => {}, end: () => {} };
  }

  const renderCount = React.useRef(0);

  React.useEffect(() => {
    renderCount.current += 1;
  });

  return {
    start: () => {
      perfMonitor.start(`${componentName}-render-${renderCount.current}`);
    },
    end: () => {
      perfMonitor.end(`${componentName}-render-${renderCount.current}`);
    },
  };
}

/**
 * HOC to measure component render performance
 */
export function withPerformanceMonitoring<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
): React.ComponentType<P> {
  if (process.env.NODE_ENV === 'production') {
    return Component;
  }

  const name = componentName || Component.displayName || Component.name || 'UnnamedComponent';

  return React.memo((props: P) => {
    const renderCount = React.useRef(0);

    React.useEffect(() => {
      renderCount.current += 1;
      perfMonitor.logMemoryUsage(name);
    });

    perfMonitor.start(`${name}-render-${renderCount.current}`);
    const result = <Component {...props} />;
    perfMonitor.end(`${name}-render-${renderCount.current}`);

    return result;
  });
}

/**
 * Debounce function with performance tracking
 */
export function debounceWithTracking<T extends (...args: any[]) => any>(
  fn: T,
  delay: number,
  name?: string
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);

    timeoutId = setTimeout(() => {
      if (name && process.env.NODE_ENV === 'development') {
        perfMonitor.measure(name, () => fn(...args));
      } else {
        fn(...args);
      }
    }, delay);
  };
}

/**
 * Throttle function with performance tracking
 */
export function throttleWithTracking<T extends (...args: any[]) => any>(
  fn: T,
  limit: number,
  name?: string
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      if (name && process.env.NODE_ENV === 'development') {
        perfMonitor.measure(name, () => fn(...args));
      } else {
        fn(...args);
      }

      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

// Import React for hooks
import React from 'react';

export default perfMonitor;
