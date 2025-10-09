// REFACTORED: Extract provider settings logic into custom hook
import { useState, useEffect } from 'react';
import { secureStorage } from '../../shared/services/storage/secureStorage';

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
}

const DEFAULT_PROVIDER_SETTINGS: ProviderSettings = {
  currentProvider: 'claude',
  claude: {
    apiKey: '',
    model: 'claude-3-5-sonnet-20241022'
  },
  ollama: {
    baseUrl: 'http://localhost:11434',
    model: 'llama3.2-vision:latest'
  },
  openai: {
    apiKey: '',
    model: 'gpt-4o'
  },
  openrouter: {
    apiKey: '',
    model: 'anthropic/claude-3.5-sonnet'
  }
};

export function useProviderSettings() {
  const [providerSettings, setProviderSettings] = useState<ProviderSettings>(DEFAULT_PROVIDER_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const storedSettings = secureStorage.getProviderSettings();
        if (storedSettings) {
          console.log('🔓 Loaded provider settings from secure storage');
          setProviderSettings(storedSettings);
        }
      } catch (error) {
        console.error('Failed to load provider settings:', error);
      } finally {
        setIsLoaded(true);
      }
    };

    loadSettings();
  }, []);

  // Save settings when they change
  useEffect(() => {
    if (!isLoaded) return; // Don't save during initial load
    
    // Only save if we have API keys (avoid saving empty initial state)
    const hasApiKeys = Boolean(
      providerSettings.claude.apiKey || 
      providerSettings.openai.apiKey || 
      providerSettings.openrouter.apiKey
    );

    if (hasApiKeys) {
      try {
        secureStorage.storeProviderSettings(providerSettings);
        console.log('🔒 Provider settings saved to secure storage');
      } catch (error) {
        console.error('Failed to save provider settings:', error);
      }
    }
  }, [providerSettings, isLoaded]);

  return {
    providerSettings,
    setProviderSettings,
    isLoaded
  };
}