/**
 * useSettingsState - Manages application settings state
 *
 * Extracted from useAppState to follow Single Responsibility Principle.
 * Handles settings like cinematic mode, edge styling, story mode speed, etc.
 * Persists settings to localStorage.
 */

import { useState, useEffect, useCallback } from 'react';

/**
 * Settings configuration type
 */
export interface SettingsConfig {
  cinematicMode: boolean;
  edgeColor: string;
  edgeStyle: string;
  edgeCurve: string;
  storyModeSpeed: number;
  showConfidenceOverlay: boolean;
  showScreenshotControls: boolean;
}

/**
 * Settings state interface
 */
export interface SettingsState extends SettingsConfig {
  // Loading state
  settingsLoaded: boolean;

  // Setters
  setCinematicMode: (enabled: boolean) => void;
  setEdgeColor: (color: string) => void;
  setEdgeStyle: (style: string) => void;
  setEdgeCurve: (curve: string) => void;
  setStoryModeSpeed: (speed: number) => void;
  setShowConfidenceOverlay: (show: boolean) => void;
  setShowScreenshotControls: (show: boolean) => void;

  // Persistence
  saveSettings: (config?: Partial<SettingsConfig>) => void;
  resetSettings: () => void;
}

/**
 * Default settings
 */
const DEFAULT_SETTINGS: SettingsConfig = {
  cinematicMode: true,
  edgeColor: 'default',
  edgeStyle: 'solid',
  edgeCurve: 'smooth',
  storyModeSpeed: 3,
  showConfidenceOverlay: false,
  showScreenshotControls: false
};

/**
 * Storage keys for individual settings
 */
const STORAGE_KEYS = {
  CINEMATIC_MODE: 'cinematic_mode',
  EDGE_COLOR: 'edge_color',
  EDGE_STYLE: 'edge_style',
  EDGE_CURVE: 'edge_curve',
  STORY_MODE_SPEED: 'story_mode_speed',
  SHOW_CONFIDENCE_OVERLAY: 'show_confidence_overlay',
  SHOW_SCREENSHOT_CONTROLS: 'show_screenshot_controls'
} as const;

/**
 * Load settings from localStorage
 */
function loadSettingsFromStorage(): SettingsConfig {
  try {
    return {
      cinematicMode: localStorage.getItem(STORAGE_KEYS.CINEMATIC_MODE) === 'true',
      edgeColor: localStorage.getItem(STORAGE_KEYS.EDGE_COLOR) || DEFAULT_SETTINGS.edgeColor,
      edgeStyle: localStorage.getItem(STORAGE_KEYS.EDGE_STYLE) || DEFAULT_SETTINGS.edgeStyle,
      edgeCurve: localStorage.getItem(STORAGE_KEYS.EDGE_CURVE) || DEFAULT_SETTINGS.edgeCurve,
      storyModeSpeed: parseInt(localStorage.getItem(STORAGE_KEYS.STORY_MODE_SPEED) || String(DEFAULT_SETTINGS.storyModeSpeed), 10),
      showConfidenceOverlay: localStorage.getItem(STORAGE_KEYS.SHOW_CONFIDENCE_OVERLAY) === 'true',
      showScreenshotControls: localStorage.getItem(STORAGE_KEYS.SHOW_SCREENSHOT_CONTROLS) === 'true'
    };
  } catch (error) {
    console.warn('Failed to load settings from localStorage:', error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Save settings to localStorage
 */
function saveSettingsToStorage(settings: SettingsConfig): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CINEMATIC_MODE, settings.cinematicMode.toString());
    localStorage.setItem(STORAGE_KEYS.EDGE_COLOR, settings.edgeColor);
    localStorage.setItem(STORAGE_KEYS.EDGE_STYLE, settings.edgeStyle);
    localStorage.setItem(STORAGE_KEYS.EDGE_CURVE, settings.edgeCurve);
    localStorage.setItem(STORAGE_KEYS.STORY_MODE_SPEED, settings.storyModeSpeed.toString());
    localStorage.setItem(STORAGE_KEYS.SHOW_CONFIDENCE_OVERLAY, settings.showConfidenceOverlay.toString());
    localStorage.setItem(STORAGE_KEYS.SHOW_SCREENSHOT_CONTROLS, settings.showScreenshotControls.toString());
  } catch (error) {
    console.error('Failed to save settings to localStorage:', error);
    throw new Error('Storage quota exceeded or unavailable');
  }
}

/**
 * Hook for managing settings state
 */
export function useSettingsState(): SettingsState {
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [cinematicMode, setCinematicMode] = useState(DEFAULT_SETTINGS.cinematicMode);
  const [edgeColor, setEdgeColor] = useState(DEFAULT_SETTINGS.edgeColor);
  const [edgeStyle, setEdgeStyle] = useState(DEFAULT_SETTINGS.edgeStyle);
  const [edgeCurve, setEdgeCurve] = useState(DEFAULT_SETTINGS.edgeCurve);
  const [storyModeSpeed, setStoryModeSpeed] = useState(DEFAULT_SETTINGS.storyModeSpeed);
  const [showConfidenceOverlay, setShowConfidenceOverlay] = useState(DEFAULT_SETTINGS.showConfidenceOverlay);
  const [showScreenshotControls, setShowScreenshotControls] = useState(DEFAULT_SETTINGS.showScreenshotControls);

  /**
   * Load settings from localStorage on mount
   */
  useEffect(() => {
    const loadedSettings = loadSettingsFromStorage();

    setCinematicMode(loadedSettings.cinematicMode);
    setEdgeColor(loadedSettings.edgeColor);
    setEdgeStyle(loadedSettings.edgeStyle);
    setEdgeCurve(loadedSettings.edgeCurve);
    setStoryModeSpeed(loadedSettings.storyModeSpeed);
    setShowConfidenceOverlay(loadedSettings.showConfidenceOverlay);
    setShowScreenshotControls(loadedSettings.showScreenshotControls);

    setSettingsLoaded(true);
  }, []);

  /**
   * Save current settings to localStorage
   */
  const saveSettings = useCallback((config?: Partial<SettingsConfig>) => {
    const settingsToSave: SettingsConfig = config ? {
      cinematicMode: config.cinematicMode ?? cinematicMode,
      edgeColor: config.edgeColor ?? edgeColor,
      edgeStyle: config.edgeStyle ?? edgeStyle,
      edgeCurve: config.edgeCurve ?? edgeCurve,
      storyModeSpeed: config.storyModeSpeed ?? storyModeSpeed,
      showConfidenceOverlay: config.showConfidenceOverlay ?? showConfidenceOverlay,
      showScreenshotControls: config.showScreenshotControls ?? showScreenshotControls
    } : {
      cinematicMode,
      edgeColor,
      edgeStyle,
      edgeCurve,
      storyModeSpeed,
      showConfidenceOverlay,
      showScreenshotControls
    };

    try {
      saveSettingsToStorage(settingsToSave);
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }, [cinematicMode, edgeColor, edgeStyle, edgeCurve, storyModeSpeed, showConfidenceOverlay, showScreenshotControls]);

  /**
   * Reset settings to defaults
   */
  const resetSettings = useCallback(() => {
    setCinematicMode(DEFAULT_SETTINGS.cinematicMode);
    setEdgeColor(DEFAULT_SETTINGS.edgeColor);
    setEdgeStyle(DEFAULT_SETTINGS.edgeStyle);
    setEdgeCurve(DEFAULT_SETTINGS.edgeCurve);
    setStoryModeSpeed(DEFAULT_SETTINGS.storyModeSpeed);
    setShowConfidenceOverlay(DEFAULT_SETTINGS.showConfidenceOverlay);
    setShowScreenshotControls(DEFAULT_SETTINGS.showScreenshotControls);

    saveSettingsToStorage(DEFAULT_SETTINGS);
  }, []);

  return {
    // Settings
    settingsLoaded,
    cinematicMode,
    edgeColor,
    edgeStyle,
    edgeCurve,
    storyModeSpeed,
    showConfidenceOverlay,
    showScreenshotControls,

    // Setters
    setCinematicMode,
    setEdgeColor,
    setEdgeStyle,
    setEdgeCurve,
    setStoryModeSpeed,
    setShowConfidenceOverlay,
    setShowScreenshotControls,

    // Persistence
    saveSettings,
    resetSettings
  };
}
