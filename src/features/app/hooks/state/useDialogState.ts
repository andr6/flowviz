/**
 * useDialogState - Manages dialog visibility state
 *
 * Extracted from useAppState to follow Single Responsibility Principle.
 * Handles open/close state for all application dialogs.
 */

import { useState, useCallback } from 'react';

/**
 * Dialog state interface
 */
export interface DialogState {
  // Dialog open states
  newSearchDialogOpen: boolean;
  saveFlowDialogOpen: boolean;
  loadFlowDialogOpen: boolean;
  settingsDialogOpen: boolean;

  // Individual setters
  setNewSearchDialogOpen: (open: boolean) => void;
  setSaveFlowDialogOpen: (open: boolean) => void;
  setLoadFlowDialogOpen: (open: boolean) => void;
  setSettingsDialogOpen: (open: boolean) => void;

  // Convenience methods
  openNewSearchDialog: () => void;
  closeNewSearchDialog: () => void;
  openSaveFlowDialog: () => void;
  closeSaveFlowDialog: () => void;
  openLoadFlowDialog: () => void;
  closeLoadFlowDialog: () => void;
  openSettingsDialog: () => void;
  closeSettingsDialog: () => void;

  // Close all dialogs
  closeAllDialogs: () => void;

  // Check if any dialog is open
  anyDialogOpen: boolean;
}

/**
 * Hook for managing dialog state
 */
export function useDialogState(): DialogState {
  const [newSearchDialogOpen, setNewSearchDialogOpen] = useState(false);
  const [saveFlowDialogOpen, setSaveFlowDialogOpen] = useState(false);
  const [loadFlowDialogOpen, setLoadFlowDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);

  // Convenience methods for opening dialogs
  const openNewSearchDialog = useCallback(() => setNewSearchDialogOpen(true), []);
  const closeNewSearchDialog = useCallback(() => setNewSearchDialogOpen(false), []);

  const openSaveFlowDialog = useCallback(() => setSaveFlowDialogOpen(true), []);
  const closeSaveFlowDialog = useCallback(() => setSaveFlowDialogOpen(false), []);

  const openLoadFlowDialog = useCallback(() => setLoadFlowDialogOpen(true), []);
  const closeLoadFlowDialog = useCallback(() => setLoadFlowDialogOpen(false), []);

  const openSettingsDialog = useCallback(() => setSettingsDialogOpen(true), []);
  const closeSettingsDialog = useCallback(() => setSettingsDialogOpen(false), []);

  /**
   * Close all dialogs at once
   */
  const closeAllDialogs = useCallback(() => {
    setNewSearchDialogOpen(false);
    setSaveFlowDialogOpen(false);
    setLoadFlowDialogOpen(false);
    setSettingsDialogOpen(false);
  }, []);

  /**
   * Check if any dialog is currently open
   */
  const anyDialogOpen = Boolean(
    newSearchDialogOpen ||
    saveFlowDialogOpen ||
    loadFlowDialogOpen ||
    settingsDialogOpen
  );

  return {
    // Dialog states
    newSearchDialogOpen,
    saveFlowDialogOpen,
    loadFlowDialogOpen,
    settingsDialogOpen,

    // Setters
    setNewSearchDialogOpen,
    setSaveFlowDialogOpen,
    setLoadFlowDialogOpen,
    setSettingsDialogOpen,

    // Convenience methods
    openNewSearchDialog,
    closeNewSearchDialog,
    openSaveFlowDialog,
    closeSaveFlowDialog,
    openLoadFlowDialog,
    closeLoadFlowDialog,
    openSettingsDialog,
    closeSettingsDialog,

    // Helpers
    closeAllDialogs,
    anyDialogOpen
  };
}
