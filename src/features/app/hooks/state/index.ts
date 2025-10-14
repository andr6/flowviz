/**
 * State Management Hooks
 *
 * Focused state hooks extracted from the monolithic useAppState hook.
 * Each hook manages a specific concern following Single Responsibility Principle.
 */

export { useInputState } from './useInputState';
export type { InputState, InputMode } from './useInputState';

export { useDialogState } from './useDialogState';
export type { DialogState } from './useDialogState';

export { useSettingsState } from './useSettingsState';
export type { SettingsState, SettingsConfig } from './useSettingsState';
