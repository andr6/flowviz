import React, { createContext, useContext, useEffect, ReactNode } from 'react';

import { accessibilityService } from '../services/accessibility/AccessibilityService';

interface AccessibilityContextValue {
  isInitialized: boolean;
}

const AccessibilityContext = createContext<AccessibilityContextValue>({
  isInitialized: false,
});

interface AccessibilityProviderProps {
  children: ReactNode;
}

export const AccessibilityProvider: React.FC<AccessibilityProviderProps> = ({
  children,
}) => {
  const [isInitialized, setIsInitialized] = React.useState(false);

  useEffect(() => {
    // Initialize accessibility service
    accessibilityService.initialize();
    setIsInitialized(true);

    // Add live region for announcements if it doesn't exist
    if (!document.querySelector('[aria-live]')) {
      const liveRegion = document.createElement('div');
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.className = 'sr-only';
      liveRegion.style.cssText = `
        position: absolute !important;
        width: 1px !important;
        height: 1px !important;
        padding: 0 !important;
        margin: -1px !important;
        overflow: hidden !important;
        clip: rect(0, 0, 0, 0) !important;
        white-space: nowrap !important;
        border: 0 !important;
      `;
      document.body.appendChild(liveRegion);
    }

    // Add skip links container if it doesn't exist
    if (!document.querySelector('.skip-links')) {
      const skipLinks = document.createElement('div');
      skipLinks.className = 'skip-links';
      skipLinks.innerHTML = `
        <a href="#main-content" class="skip-link">Skip to main content</a>
        <a href="#navigation" class="skip-link">Skip to navigation</a>
        <a href="#search" class="skip-link">Skip to search</a>
      `;
      document.body.insertBefore(skipLinks, document.body.firstChild);
    }

    // Add main content landmark if it doesn't exist
    const mainContent = document.querySelector('main, [role="main"], #main-content');
    if (!mainContent) {
      const main = document.createElement('main');
      main.id = 'main-content';
      main.setAttribute('role', 'main');
      main.setAttribute('tabindex', '-1');
      
      // Move existing content into main
      const root = document.querySelector('#root');
      if (root && root.children.length > 0) {
        Array.from(root.children).forEach(child => {
          if (!child.classList.contains('skip-links')) {
            main.appendChild(child);
          }
        });
        root.appendChild(main);
      }
    }

    // Listen for system preference changes
    const handlePrefersReducedMotion = (e: MediaQueryListEvent) => {
      accessibilityService.setPreferences({ reduceMotion: e.matches });
    };

    const handlePrefersHighContrast = (e: MediaQueryListEvent) => {
      accessibilityService.setPreferences({ highContrast: e.matches });
    };

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const contrastQuery = window.matchMedia('(prefers-contrast: high)');

    motionQuery.addEventListener('change', handlePrefersReducedMotion);
    contrastQuery.addEventListener('change', handlePrefersHighContrast);

    return () => {
      motionQuery.removeEventListener('change', handlePrefersReducedMotion);
      contrastQuery.removeEventListener('change', handlePrefersHighContrast);
    };
  }, []);

  const value: AccessibilityContextValue = {
    isInitialized,
  };

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibilityContext = (): AccessibilityContextValue => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibilityContext must be used within an AccessibilityProvider');
  }
  return context;
};