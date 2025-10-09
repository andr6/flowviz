import { useState, useEffect } from 'react';

import { DEFAULT_AI_MODELS, NETWORK } from '../constants/AppConstants';
import { secureStorage } from '../services/storage/secureStorage';

export interface ProviderSettings {
  currentProvider: 'claude' | 'ollama' | 'openai' | 'openrouter';
  claude: {
    apiKey: string;
    model: string;
  };
  ollama: {
    baseUrl: string;
    model: string;
  };
  openai: {
    apiKey: string;
    model: string;
  };
  openrouter: {
    apiKey: string;
    model: string;
  };
  picus: {
    baseUrl: string;
    refreshToken: string;
    enabled: boolean;
  };
}

const DEFAULT_PROVIDER_SETTINGS: ProviderSettings = {
  currentProvider: 'claude',
  claude: {
    apiKey: '',
    model: DEFAULT_AI_MODELS.claude
  },
  ollama: {
    baseUrl: `http://localhost:${NETWORK.PORTS.DEVELOPMENT.OLLAMA}`,
    model: DEFAULT_AI_MODELS.ollama
  },
  openai: {
    apiKey: '',
    model: DEFAULT_AI_MODELS.openai
  },
  openrouter: {
    apiKey: '',
    model: 'anthropic/claude-3.5-sonnet'
  },
  picus: {
    baseUrl: 'https://api.picussecurity.com',
    refreshToken: '',
    enabled: false
  }
};

/**
 * Custom hook for managing AI provider settings
 * Extracts provider settings logic from App.tsx to reduce complexity
 */
export function useProviderSettings() {
  const [providerSettings, setProviderSettings] = useState<ProviderSettings>(DEFAULT_PROVIDER_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const storedSettings = secureStorage.getProviderSettings();
        if (storedSettings) {
          console.log('🔓 Loaded provider settings from secure storage');
          console.log('🔧 Stored settings:', storedSettings);
          console.log('🔧 Default Picus settings:', DEFAULT_PROVIDER_SETTINGS.picus);
          // Merge with defaults to handle new settings added in updates
          const mergedSettings = {
            ...DEFAULT_PROVIDER_SETTINGS,
            ...storedSettings,
            // Ensure nested objects are properly merged
            claude: { ...DEFAULT_PROVIDER_SETTINGS.claude, ...storedSettings.claude },
            ollama: { ...DEFAULT_PROVIDER_SETTINGS.ollama, ...storedSettings.ollama },
            openai: { ...DEFAULT_PROVIDER_SETTINGS.openai, ...storedSettings.openai },
            openrouter: { ...DEFAULT_PROVIDER_SETTINGS.openrouter, ...storedSettings.openrouter },
            picus: { ...DEFAULT_PROVIDER_SETTINGS.picus, ...storedSettings.picus },
          };
          console.log('🔧 Final merged settings:', mergedSettings);
          console.log('🔧 Final Picus settings:', mergedSettings.picus);
          setProviderSettings(mergedSettings);
        } else {
          console.log('🔧 No stored settings found, using defaults');
          console.log('🔧 Default settings:', DEFAULT_PROVIDER_SETTINGS);
          console.log('🔧 Default Picus settings:', DEFAULT_PROVIDER_SETTINGS.picus);
          setProviderSettings(DEFAULT_PROVIDER_SETTINGS);
        }
      } catch (err) {
        const errorMessage = 'Failed to load provider settings from storage';
        console.error(errorMessage, err);
        setError(errorMessage);
        console.log('🔧 Error fallback - using default settings');
        setProviderSettings(DEFAULT_PROVIDER_SETTINGS);
      } finally {
        setIsLoaded(true);
      }
    };

    loadSettings();
  }, []);

  // Save settings when they change
  useEffect(() => {
    if (!isLoaded) {return;} // Don't save during initial load
    
    // Only save if we have API keys or Picus is configured (avoid saving empty initial state)
    const hasApiKeys = Boolean(
      providerSettings.claude.apiKey || 
      providerSettings.openai.apiKey || 
      providerSettings.openrouter.apiKey ||
      (providerSettings.picus.enabled && providerSettings.picus.refreshToken)
    );

    if (hasApiKeys) {
      try {
        secureStorage.storeProviderSettings(providerSettings);
        console.log('🔒 Provider settings saved to secure storage');
        setError(null); // Clear any previous errors
      } catch (err) {
        const errorMessage = 'Failed to save provider settings';
        console.error(errorMessage, err);
        setError(errorMessage);
      }
    }
  }, [providerSettings, isLoaded]);

  /**
   * Update provider settings with validation
   */
  const updateProviderSettings = (updates: Partial<ProviderSettings>) => {
    setProviderSettings(current => ({
      ...current,
      ...updates,
      // Ensure nested objects are properly merged
      claude: updates.claude ? { ...current.claude, ...updates.claude } : current.claude,
      ollama: updates.ollama ? { ...current.ollama, ...updates.ollama } : current.ollama,
      openai: updates.openai ? { ...current.openai, ...updates.openai } : current.openai,
      openrouter: updates.openrouter ? { ...current.openrouter, ...updates.openrouter } : current.openrouter,
      picus: updates.picus ? { ...current.picus, ...updates.picus } : current.picus,
    }));
  };

  /**
   * Get available providers (those with API keys configured)
   */
  const getAvailableProviders = (): Array<'claude' | 'ollama' | 'openai' | 'openrouter'> => {
    const available: Array<'claude' | 'ollama' | 'openai' | 'openrouter'> = [];

    if (providerSettings.claude.apiKey) {available.push('claude');}
    if (providerSettings.openai.apiKey) {available.push('openai');}
    if (providerSettings.openrouter.apiKey) {available.push('openrouter');}
    // Ollama is always available (local)
    available.push('ollama');

    return available;
  };

  /**
   * Validate current provider settings
   */
  const validateSettings = (): { valid: boolean; message?: string } => {
    const currentProvider = providerSettings.currentProvider;
    
    switch (currentProvider) {
      case 'claude':
        return {
          valid: Boolean(providerSettings.claude.apiKey),
          message: !providerSettings.claude.apiKey ? 'Claude API key is required' : undefined
        };
      case 'openai':
        return {
          valid: Boolean(providerSettings.openai.apiKey),
          message: !providerSettings.openai.apiKey ? 'OpenAI API key is required' : undefined
        };
      case 'openrouter':
        return {
          valid: Boolean(providerSettings.openrouter.apiKey),
          message: !providerSettings.openrouter.apiKey ? 'OpenRouter API key is required' : undefined
        };
      case 'ollama':
        return {
          valid: Boolean(providerSettings.ollama.baseUrl),
          message: !providerSettings.ollama.baseUrl ? 'Ollama base URL is required' : undefined
        };
      default:
        return { valid: false, message: 'Invalid provider selected' };
    }
  };

  /**
   * Reset settings to defaults
   */
  const resetToDefaults = () => {
    setProviderSettings(DEFAULT_PROVIDER_SETTINGS);
    setError(null);
  };

  return {
    // State
    providerSettings,
    isLoaded,
    error,
    
    // Actions
    setProviderSettings: updateProviderSettings,
    resetToDefaults,
    
    // Computed values
    availableProviders: getAvailableProviders(),
    validation: validateSettings(),
    
    // Helpers
    hasAnyProvider: getAvailableProviders().length > 0,
  };
}