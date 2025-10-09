import { useState, useEffect } from 'react';

import { CommandAction } from '../components/CommandPalette';

export interface UseCommandPaletteOptions {
  commands: CommandAction[];
  enabled?: boolean;
}

export interface UseCommandPaletteReturn {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  commands: CommandAction[];
}

export const useCommandPalette = ({ 
  commands, 
  enabled = true 
}: UseCommandPaletteOptions): UseCommandPaletteReturn => {
  const [isOpen, setIsOpen] = useState(false);

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);
  const toggle = () => setIsOpen(prev => !prev);

  // Handle global keyboard shortcut (Ctrl+K / Cmd+K)
  useEffect(() => {
    if (!enabled) {return;}

    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Ctrl+K (Windows/Linux) or Cmd+K (Mac)
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        event.stopPropagation();
        toggle();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, toggle]);

  // Close on escape when open
  useEffect(() => {
    if (!isOpen || !enabled) {return;}

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      }
    };

    // Add listener with higher priority to ensure it captures escape
    document.addEventListener('keydown', handleKeyDown, true);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen, enabled]);

  return {
    isOpen,
    open,
    close,
    toggle,
    commands,
  };
};