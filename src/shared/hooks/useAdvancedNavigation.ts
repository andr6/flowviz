/**
 * Advanced Navigation Hook
 * Centralized hook for managing enhanced navigation features
 */
import { useState, useEffect, useCallback, useContext, createContext } from 'react';
import { BreadcrumbItem } from '../components/Breadcrumb/EnhancedBreadcrumb';

// Navigation context for global state
interface NavigationContextValue {
  // Command palette
  isCommandPaletteOpen: boolean;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  
  // Breadcrumb navigation
  breadcrumbItems: BreadcrumbItem[];
  setBreadcrumbItems: (items: BreadcrumbItem[]) => void;
  addBreadcrumbItem: (item: BreadcrumbItem) => void;
  
  // Dashboard state
  dashboardLayout: any[];
  setDashboardLayout: (layout: any[]) => void;
  
  // Help system
  isHelpEnabled: boolean;
  toggleHelp: () => void;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [breadcrumbItems, setBreadcrumbItems] = useState<BreadcrumbItem[]>([]);
  const [dashboardLayout, setDashboardLayout] = useState<any[]>([]);
  const [isHelpEnabled, setIsHelpEnabled] = useState(false);

  // Keyboard shortcut for command palette (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        setIsCommandPaletteOpen(true);
      }
      
      if (event.key === 'Escape') {
        setIsCommandPaletteOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const openCommandPalette = useCallback(() => {
    setIsCommandPaletteOpen(true);
  }, []);

  const closeCommandPalette = useCallback(() => {
    setIsCommandPaletteOpen(false);
  }, []);

  const addBreadcrumbItem = useCallback((item: BreadcrumbItem) => {
    setBreadcrumbItems(prev => {
      // Avoid duplicates
      const exists = prev.some(existing => existing.path === item.path);
      if (exists) return prev;
      
      return [...prev, item];
    });
  }, []);

  const toggleHelp = useCallback(() => {
    setIsHelpEnabled(prev => !prev);
  }, []);

  const contextValue: NavigationContextValue = {
    isCommandPaletteOpen,
    openCommandPalette,
    closeCommandPalette,
    breadcrumbItems,
    setBreadcrumbItems,
    addBreadcrumbItem,
    dashboardLayout,
    setDashboardLayout,
    isHelpEnabled,
    toggleHelp,
  };

  return (
    <NavigationContext.Provider value={contextValue}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useAdvancedNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useAdvancedNavigation must be used within NavigationProvider');
  }
  return context;
};