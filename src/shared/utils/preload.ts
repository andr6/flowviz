/**
 * Resource Preloading Utilities
 *
 * Provides utilities for preloading critical resources and optimizing
 * resource loading priorities.
 */

/**
 * Preload a script resource
 */
export function preloadScript(src: string, priority: 'high' | 'low' = 'high'): void {
  if (typeof document === 'undefined') return;

  const existingLink = document.querySelector(`link[href="${src}"]`);
  if (existingLink) return;

  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'script';
  link.href = src;
  if (priority === 'high') {
    link.setAttribute('importance', 'high');
  }

  document.head.appendChild(link);
}

/**
 * Preload a CSS stylesheet
 */
export function preloadStylesheet(href: string): void {
  if (typeof document === 'undefined') return;

  const existingLink = document.querySelector(`link[href="${href}"]`);
  if (existingLink) return;

  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'style';
  link.href = href;

  document.head.appendChild(link);
}

/**
 * Preload a font file
 */
export function preloadFont(href: string, type = 'font/woff2'): void {
  if (typeof document === 'undefined') return;

  const existingLink = document.querySelector(`link[href="${href}"]`);
  if (existingLink) return;

  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'font';
  link.type = type;
  link.href = href;
  link.crossOrigin = 'anonymous';

  document.head.appendChild(link);
}

/**
 * Prefetch a resource for future navigation
 */
export function prefetchResource(href: string): void {
  if (typeof document === 'undefined') return;

  const existingLink = document.querySelector(`link[href="${href}"]`);
  if (existingLink) return;

  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = href;

  document.head.appendChild(link);
}

/**
 * Preconnect to an external domain
 */
export function preconnectDomain(origin: string): void {
  if (typeof document === 'undefined') return;

  const existingLink = document.querySelector(`link[href="${origin}"]`);
  if (existingLink) return;

  const link = document.createElement('link');
  link.rel = 'preconnect';
  link.href = origin;
  link.crossOrigin = 'anonymous';

  document.head.appendChild(link);
}

/**
 * DNS prefetch for external domains
 */
export function dnsPrefetchDomain(origin: string): void {
  if (typeof document === 'undefined') return;

  const existingLink = document.querySelector(`link[href="${origin}"]`);
  if (existingLink) return;

  const link = document.createElement('link');
  link.rel = 'dns-prefetch';
  link.href = origin;

  document.head.appendChild(link);
}

/**
 * Preload critical application resources
 */
export function preloadCriticalResources(): void {
  // Preconnect to API if available
  if (window.location.hostname !== 'localhost') {
    preconnectDomain(window.location.origin);
  }

  // DNS prefetch for potential external resources
  dnsPrefetchDomain('https://fonts.googleapis.com');
  dnsPrefetchDomain('https://fonts.gstatic.com');
}

/**
 * Lazy load an image with IntersectionObserver
 */
export function lazyLoadImage(img: HTMLImageElement): void {
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const image = entry.target as HTMLImageElement;
          const src = image.dataset.src;
          if (src) {
            image.src = src;
            image.removeAttribute('data-src');
          }
          observer.unobserve(image);
        }
      });
    });

    observer.observe(img);
  } else {
    // Fallback for browsers without IntersectionObserver
    const src = img.dataset.src;
    if (src) {
      img.src = src;
    }
  }
}

/**
 * Get resource hints for current page
 */
export function getResourceHints(): {
  preload: string[];
  prefetch: string[];
  preconnect: string[];
  dnsPrefetch: string[];
} {
  const links = Array.from(document.querySelectorAll('link'));

  return {
    preload: links.filter(l => l.rel === 'preload').map(l => l.href),
    prefetch: links.filter(l => l.rel === 'prefetch').map(l => l.href),
    preconnect: links.filter(l => l.rel === 'preconnect').map(l => l.href),
    dnsPrefetch: links.filter(l => l.rel === 'dns-prefetch').map(l => l.href),
  };
}
