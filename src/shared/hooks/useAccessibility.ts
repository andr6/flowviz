import { useState, useEffect, useCallback, useRef } from 'react';
import { accessibilityService, AccessibilityPreferences, AnnouncementOptions, KeyboardNavigationConfig } from '../services/accessibility/AccessibilityService';

export interface UseAccessibilityReturn {
  preferences: AccessibilityPreferences;
  setPreferences: (prefs: Partial<AccessibilityPreferences>) => void;
  announce: (message: string, options?: AnnouncementOptions) => void;
  trapFocus: (element: HTMLElement, config?: KeyboardNavigationConfig) => () => void;
  setupRovingTabindex: (container: HTMLElement, itemSelector: string) => () => void;
  isReducedMotion: boolean;
  isHighContrast: boolean;
  isLargeText: boolean;
  isKeyboardMode: boolean;
  isScreenReaderMode: boolean;
  focusMode: string;
}

export const useAccessibility = (): UseAccessibilityReturn => {
  const [preferences, setPreferencesState] = useState<AccessibilityPreferences>(() => 
    accessibilityService.getPreferences()
  );

  // Listen for preference changes
  useEffect(() => {
    const unsubscribe = accessibilityService.onPreferenceChange(setPreferencesState);
    return unsubscribe;
  }, []);

  const setPreferences = useCallback((prefs: Partial<AccessibilityPreferences>) => {
    accessibilityService.setPreferences(prefs);
  }, []);

  const announce = useCallback((message: string, options?: AnnouncementOptions) => {
    accessibilityService.announce(message, options);
  }, []);

  const trapFocus = useCallback((element: HTMLElement, config?: KeyboardNavigationConfig) => {
    return accessibilityService.trapFocus(element, config);
  }, []);

  const setupRovingTabindex = useCallback((container: HTMLElement, itemSelector: string) => {
    return accessibilityService.setupRovingTabindex(container, itemSelector);
  }, []);

  return {
    preferences,
    setPreferences,
    announce,
    trapFocus,
    setupRovingTabindex,
    isReducedMotion: preferences.reduceMotion,
    isHighContrast: preferences.highContrast,
    isLargeText: preferences.largeText,
    isKeyboardMode: preferences.keyboardOnlyMode,
    isScreenReaderMode: preferences.screenReaderMode,
    focusMode: preferences.focusIndicatorMode,
  };
};

// Hook for managing focus trap
export const useFocusTrap = (
  isActive: boolean, 
  config?: KeyboardNavigationConfig
) => {
  const containerRef = useRef<HTMLElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (isActive && containerRef.current) {
      cleanupRef.current = accessibilityService.trapFocus(containerRef.current, config);
    } else if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, [isActive, config]);

  return containerRef;
};

// Hook for managing roving tabindex
export const useRovingTabindex = (
  itemSelector: string,
  isActive: boolean = true
) => {
  const containerRef = useRef<HTMLElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (isActive && containerRef.current) {
      cleanupRef.current = accessibilityService.setupRovingTabindex(
        containerRef.current, 
        itemSelector
      );
    } else if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, [itemSelector, isActive]);

  return containerRef;
};

// Hook for announcing messages
export const useAnnouncer = () => {
  const { announce } = useAccessibility();

  const announceImmediate = useCallback((message: string) => {
    announce(message, { priority: 'assertive' });
  }, [announce]);

  const announcePolite = useCallback((message: string) => {
    announce(message, { priority: 'polite' });
  }, [announce]);

  const announceDelayed = useCallback((message: string, delay: number = 1000) => {
    announce(message, { priority: 'polite', delay });
  }, [announce]);

  return {
    announce,
    announceImmediate,
    announcePolite,
    announceDelayed,
  };
};

// Hook for keyboard navigation
export const useKeyboardNavigation = (
  onNavigate?: (direction: 'up' | 'down' | 'left' | 'right' | 'home' | 'end') => void,
  enabled: boolean = true
) => {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled || !onNavigate) return;

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        onNavigate('up');
        break;
      case 'ArrowDown':
        e.preventDefault();
        onNavigate('down');
        break;
      case 'ArrowLeft':
        e.preventDefault();
        onNavigate('left');
        break;
      case 'ArrowRight':
        e.preventDefault();
        onNavigate('right');
        break;
      case 'Home':
        e.preventDefault();
        onNavigate('home');
        break;
      case 'End':
        e.preventDefault();
        onNavigate('end');
        break;
    }
  }, [onNavigate, enabled]);

  useEffect(() => {
    if (enabled) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [handleKeyDown, enabled]);

  return { handleKeyDown };
};

// Hook for managing aria-live regions
export const useAriaLive = (initialValue: string = '') => {
  const [message, setMessage] = useState(initialValue);
  const [priority, setPriority] = useState<'polite' | 'assertive'>('polite');

  const announce = useCallback((text: string, options: { priority?: 'polite' | 'assertive' } = {}) => {
    setPriority(options.priority || 'polite');
    setMessage(text);
    
    // Clear after announcement
    setTimeout(() => setMessage(''), 1000);
  }, []);

  return {
    message,
    priority,
    announce,
    ariaLiveProps: {
      'aria-live': priority,
      'aria-atomic': true,
      className: 'sr-only',
    },
  };
};