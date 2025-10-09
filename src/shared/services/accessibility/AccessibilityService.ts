export interface AccessibilityPreferences {
  reduceMotion: boolean;
  highContrast: boolean;
  largeText: boolean;
  keyboardOnlyMode: boolean;
  screenReaderMode: boolean;
  focusIndicatorMode: 'subtle' | 'prominent' | 'high-contrast';
}

export interface AnnouncementOptions {
  priority: 'polite' | 'assertive';
  delay?: number;
  clearPrevious?: boolean;
}

export interface KeyboardNavigationConfig {
  trapFocus?: boolean;
  restoreFocus?: boolean;
  allowTabToEscape?: boolean;
  initialFocus?: string; // CSS selector
}

class AccessibilityService {
  private readonly STORAGE_KEY = 'threatflow_accessibility_preferences';
  private announcementRegion: HTMLElement | null = null;
  private preferenceChangeListeners: Set<(prefs: AccessibilityPreferences) => void> = new Set();

  constructor() {
    this.setupAnnouncementRegion();
    this.detectSystemPreferences();
    this.setupKeyboardListeners();
  }

  // Load accessibility preferences
  getPreferences(): AccessibilityPreferences {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        return { ...this.getDefaultPreferences(), ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Error loading accessibility preferences:', error);
    }
    
    return this.getDefaultPreferences();
  }

  // Get default preferences based on system settings
  private getDefaultPreferences(): AccessibilityPreferences {
    return {
      reduceMotion: this.detectReducedMotion(),
      highContrast: this.detectHighContrast(),
      largeText: false,
      keyboardOnlyMode: false,
      screenReaderMode: this.detectScreenReader(),
      focusIndicatorMode: 'subtle',
    };
  }

  // Save accessibility preferences
  setPreferences(preferences: Partial<AccessibilityPreferences>): void {
    const current = this.getPreferences();
    const updated = { ...current, ...preferences };
    
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
      this.applyPreferences(updated);
      this.notifyPreferenceChange(updated);
    } catch (error) {
      console.error('Error saving accessibility preferences:', error);
    }
  }

  // Apply preferences to the DOM
  private applyPreferences(preferences: AccessibilityPreferences): void {
    const root = document.documentElement;
    
    // Reduce motion
    root.setAttribute('data-reduce-motion', preferences.reduceMotion.toString());
    
    // High contrast
    root.setAttribute('data-high-contrast', preferences.highContrast.toString());
    
    // Large text
    root.setAttribute('data-large-text', preferences.largeText.toString());
    
    // Keyboard only mode
    root.setAttribute('data-keyboard-only', preferences.keyboardOnlyMode.toString());
    
    // Screen reader mode
    root.setAttribute('data-screen-reader', preferences.screenReaderMode.toString());
    
    // Focus indicator mode
    root.setAttribute('data-focus-mode', preferences.focusIndicatorMode);
  }

  // Listen for preference changes
  onPreferenceChange(callback: (prefs: AccessibilityPreferences) => void): () => void {
    this.preferenceChangeListeners.add(callback);
    return () => this.preferenceChangeListeners.delete(callback);
  }

  private notifyPreferenceChange(preferences: AccessibilityPreferences): void {
    this.preferenceChangeListeners.forEach(callback => callback(preferences));
  }

  // Detect system preferences
  private detectSystemPreferences(): void {
    // Listen for media query changes
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const contrastQuery = window.matchMedia('(prefers-contrast: high)');
    
    motionQuery.addEventListener('change', () => {
      this.setPreferences({ reduceMotion: motionQuery.matches });
    });
    
    contrastQuery.addEventListener('change', () => {
      this.setPreferences({ highContrast: contrastQuery.matches });
    });
  }

  private detectReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  private detectHighContrast(): boolean {
    return window.matchMedia('(prefers-contrast: high)').matches;
  }

  private detectScreenReader(): boolean {
    // Check for common screen reader indicators
    return !!(
      navigator.userAgent.includes('NVDA') ||
      navigator.userAgent.includes('JAWS') ||
      navigator.userAgent.includes('VoiceOver') ||
      window.speechSynthesis ||
      document.querySelector('[aria-live]')
    );
  }

  // Announcement system for screen readers
  private setupAnnouncementRegion(): void {
    if (typeof document === 'undefined') return;

    this.announcementRegion = document.createElement('div');
    this.announcementRegion.setAttribute('aria-live', 'polite');
    this.announcementRegion.setAttribute('aria-atomic', 'true');
    this.announcementRegion.setAttribute('class', 'sr-only');
    this.announcementRegion.style.cssText = `
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
    
    document.body.appendChild(this.announcementRegion);
  }

  // Announce message to screen readers
  announce(message: string, options: AnnouncementOptions = { priority: 'polite' }): void {
    if (!this.announcementRegion) return;

    const { priority, delay = 0, clearPrevious = true } = options;

    if (clearPrevious) {
      this.announcementRegion.textContent = '';
    }

    setTimeout(() => {
      if (this.announcementRegion) {
        this.announcementRegion.setAttribute('aria-live', priority);
        this.announcementRegion.textContent = message;
      }
    }, delay);

    // Clear after announcement
    setTimeout(() => {
      if (this.announcementRegion && clearPrevious) {
        this.announcementRegion.textContent = '';
      }
    }, delay + 1000);
  }

  // Keyboard navigation helpers
  private setupKeyboardListeners(): void {
    if (typeof document === 'undefined') return;

    // Detect keyboard usage
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        this.setPreferences({ keyboardOnlyMode: true });
      }
    });

    // Detect mouse usage
    document.addEventListener('mousedown', () => {
      this.setPreferences({ keyboardOnlyMode: false });
    });

    // Skip links
    this.setupSkipLinks();
  }

  // Create and manage skip links
  private setupSkipLinks(): void {
    const existingSkipLinks = document.querySelector('.skip-links');
    if (existingSkipLinks) return;

    const skipLinks = document.createElement('div');
    skipLinks.className = 'skip-links';
    skipLinks.innerHTML = `
      <a href="#main-content" class="skip-link">Skip to main content</a>
      <a href="#navigation" class="skip-link">Skip to navigation</a>
      <a href="#search" class="skip-link">Skip to search</a>
    `;

    // Style skip links
    const style = document.createElement('style');
    style.textContent = `
      .skip-links {
        position: absolute;
        top: -999px;
        left: -999px;
        z-index: 9999;
      }
      
      .skip-link {
        position: absolute;
        top: 0;
        left: 0;
        background: #000;
        color: #fff;
        padding: 8px 16px;
        text-decoration: none;
        border-radius: 0 0 4px 0;
        font-size: 14px;
        font-weight: bold;
        transition: all 0.2s ease;
      }
      
      .skip-link:focus {
        top: 0;
        left: 0;
        transform: translateY(0);
      }
      
      .skip-links:focus-within {
        position: fixed;
        top: 0;
        left: 0;
      }
    `;

    document.head.appendChild(style);
    document.body.insertBefore(skipLinks, document.body.firstChild);
  }

  // Focus management
  trapFocus(container: HTMLElement, config: KeyboardNavigationConfig = {}): () => void {
    const {
      allowTabToEscape = false,
      initialFocus,
      restoreFocus = true
    } = config;

    const focusableSelector = `
      a[href]:not([disabled]),
      button:not([disabled]),
      textarea:not([disabled]),
      input[type="text"]:not([disabled]),
      input[type="radio"]:not([disabled]),
      input[type="checkbox"]:not([disabled]),
      select:not([disabled]),
      [contenteditable]:not([disabled]),
      [tabindex]:not([tabindex="-1"]):not([disabled])
    `;

    const getFocusableElements = (): NodeListOf<HTMLElement> => 
      container.querySelectorAll(focusableSelector);

    const previouslyFocused = document.activeElement as HTMLElement;

    // Set initial focus
    if (initialFocus) {
      const initialElement = container.querySelector(initialFocus) as HTMLElement;
      if (initialElement) {
        initialElement.focus();
      }
    } else {
      const focusableElements = getFocusableElements();
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (allowTabToEscape) {
        // Allow tab to escape the container
        if (e.shiftKey && document.activeElement === firstElement) {
          return; // Let tab escape backwards
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          return; // Let tab escape forwards
        }
      }

      // Trap focus within container
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    // Return cleanup function
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      if (restoreFocus && previouslyFocused) {
        previouslyFocused.focus();
      }
    };
  }

  // ARIA helpers
  setAriaLive(element: HTMLElement, value: 'off' | 'polite' | 'assertive'): void {
    element.setAttribute('aria-live', value);
  }

  setAriaExpanded(element: HTMLElement, expanded: boolean): void {
    element.setAttribute('aria-expanded', expanded.toString());
  }

  setAriaPressed(element: HTMLElement, pressed: boolean | null): void {
    if (pressed === null) {
      element.removeAttribute('aria-pressed');
    } else {
      element.setAttribute('aria-pressed', pressed.toString());
    }
  }

  setAriaChecked(element: HTMLElement, checked: boolean | 'mixed'): void {
    element.setAttribute('aria-checked', checked.toString());
  }

  setAriaDisabled(element: HTMLElement, disabled: boolean): void {
    element.setAttribute('aria-disabled', disabled.toString());
    if (disabled) {
      element.setAttribute('tabindex', '-1');
    } else {
      element.removeAttribute('tabindex');
    }
  }

  // Roving tabindex for complex widgets
  setupRovingTabindex(container: HTMLElement, itemSelector: string): () => void {
    const items = container.querySelectorAll(itemSelector) as NodeListOf<HTMLElement>;
    let currentIndex = 0;

    // Initialize tabindex
    items.forEach((item, index) => {
      item.setAttribute('tabindex', index === 0 ? '0' : '-1');
    });

    const updateTabindex = (newIndex: number) => {
      items[currentIndex].setAttribute('tabindex', '-1');
      items[newIndex].setAttribute('tabindex', '0');
      items[newIndex].focus();
      currentIndex = newIndex;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      let newIndex = currentIndex;

      switch (e.key) {
        case 'ArrowDown':
        case 'ArrowRight':
          e.preventDefault();
          newIndex = (currentIndex + 1) % items.length;
          break;
        case 'ArrowUp':
        case 'ArrowLeft':
          e.preventDefault();
          newIndex = currentIndex === 0 ? items.length - 1 : currentIndex - 1;
          break;
        case 'Home':
          e.preventDefault();
          newIndex = 0;
          break;
        case 'End':
          e.preventDefault();
          newIndex = items.length - 1;
          break;
        default:
          return;
      }

      updateTabindex(newIndex);
    };

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }

  // Color contrast helpers
  getContrastRatio(color1: string, color2: string): number {
    const getLuminance = (color: string): number => {
      // Convert hex to RGB
      const hex = color.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16) / 255;
      const g = parseInt(hex.substr(2, 2), 16) / 255;
      const b = parseInt(hex.substr(4, 2), 16) / 255;

      // Calculate relative luminance
      const sRGB = [r, g, b].map(c => {
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });

      return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
    };

    const lum1 = getLuminance(color1);
    const lum2 = getLuminance(color2);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);

    return (brightest + 0.05) / (darkest + 0.05);
  }

  isContrastSufficient(foreground: string, background: string, level: 'AA' | 'AAA' = 'AA'): boolean {
    const ratio = this.getContrastRatio(foreground, background);
    return level === 'AA' ? ratio >= 4.5 : ratio >= 7;
  }

  // Initialize accessibility features
  initialize(): void {
    const preferences = this.getPreferences();
    this.applyPreferences(preferences);

    // Add global CSS for accessibility
    this.addAccessibilityStyles();
  }

  private addAccessibilityStyles(): void {
    const style = document.createElement('style');
    style.id = 'accessibility-styles';
    style.textContent = `
      /* Reduced motion */
      [data-reduce-motion="true"] * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }

      /* High contrast mode */
      [data-high-contrast="true"] {
        filter: contrast(1.5);
      }

      /* Large text mode */
      [data-large-text="true"] {
        font-size: 120% !important;
      }

      /* Focus indicators */
      [data-focus-mode="subtle"] *:focus {
        outline: 2px solid #007acc;
        outline-offset: 2px;
      }

      [data-focus-mode="prominent"] *:focus {
        outline: 3px solid #007acc;
        outline-offset: 3px;
        box-shadow: 0 0 0 1px #fff, 0 0 0 3px #007acc;
      }

      [data-focus-mode="high-contrast"] *:focus {
        outline: 4px solid #ffff00;
        outline-offset: 2px;
        box-shadow: 0 0 0 1px #000, 0 0 0 6px #ffff00;
        background-color: #000 !important;
        color: #ffff00 !important;
      }

      /* Keyboard-only mode */
      [data-keyboard-only="false"] *:focus:not(:focus-visible) {
        outline: none;
      }

      /* Screen reader only text */
      .sr-only {
        position: absolute !important;
        width: 1px !important;
        height: 1px !important;
        padding: 0 !important;
        margin: -1px !important;
        overflow: hidden !important;
        clip: rect(0, 0, 0, 0) !important;
        white-space: nowrap !important;
        border: 0 !important;
      }

      /* Focus management */
      [aria-hidden="true"] {
        pointer-events: none;
      }

      /* Interactive elements */
      button, a, input, select, textarea, [tabindex]:not([tabindex="-1"]) {
        touch-action: manipulation;
      }

      /* Loading states */
      [aria-busy="true"] {
        cursor: wait;
      }

      /* Error states */
      [aria-invalid="true"] {
        border-color: #d32f2f !important;
      }

      /* Required fields */
      [aria-required="true"]::after {
        content: " *";
        color: #d32f2f;
      }
    `;

    document.head.appendChild(style);
  }
}

export const accessibilityService = new AccessibilityService();