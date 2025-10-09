// AI Provider Manager - Handles multiple AI backends

import { ClaudeProvider } from './claude-provider';
import { OllamaProvider } from './ollama-provider';
import { OpenAIProvider } from './openai-provider';
import { OpenRouterProvider } from './openrouter-provider';
import { AIProvider, ProviderType, ProviderConfigs } from './types';

export class AIProviderManager {
  private providers: Map<ProviderType, AIProvider> = new Map();
  private currentProvider: ProviderType = 'claude';

  constructor() {
    // Initialize with default providers (will be configured later)
  }

  // Configure and set providers
  configureProviders(configs: Partial<ProviderConfigs>) {
    // Configure Claude if API key is provided
    if (configs.claude?.apiKey) {
      const claudeProvider = new ClaudeProvider(
        configs.claude.apiKey,
        configs.claude.model
      );
      this.providers.set('claude', claudeProvider);
    }

    // Configure Ollama if base URL is provided
    if (configs.ollama?.baseUrl && configs.ollama?.model) {
      const ollamaProvider = new OllamaProvider(
        configs.ollama.baseUrl,
        configs.ollama.model
      );
      this.providers.set('ollama', ollamaProvider);
    }

    // Configure OpenAI if API key is provided
    if (configs.openai?.apiKey) {
      const openaiProvider = new OpenAIProvider(
        configs.openai.apiKey,
        configs.openai.model
      );
      this.providers.set('openai', openaiProvider);
    }

    // Configure OpenRouter if API key is provided
    if (configs.openrouter?.apiKey) {
      const openrouterProvider = new OpenRouterProvider(
        configs.openrouter.apiKey,
        configs.openrouter.model
      );
      this.providers.set('openrouter', openrouterProvider);
    }
  }

  // Get current provider
  getCurrentProvider(): AIProvider | null {
    return this.providers.get(this.currentProvider) || null;
  }

  // Switch provider
  setCurrentProvider(providerType: ProviderType): boolean {
    if (this.providers.has(providerType)) {
      this.currentProvider = providerType;
      return true;
    }
    return false;
  }

  // Get available providers
  getAvailableProviders(): Array<{ type: ProviderType; provider: AIProvider }> {
    return Array.from(this.providers.entries()).map(([type, provider]) => ({
      type,
      provider
    }));
  }

  // Check if a provider is available
  isProviderAvailable(providerType: ProviderType): boolean {
    return this.providers.has(providerType);
  }

  // Health check for current provider
  async isCurrentProviderHealthy(): Promise<boolean> {
    const provider = this.getCurrentProvider();
    return provider ? await provider.isHealthy() : false;
  }

  // Health check for all providers
  async checkAllProvidersHealth(): Promise<Record<ProviderType, boolean>> {
    const health: Partial<Record<ProviderType, boolean>> = {};
    
    for (const [type, provider] of this.providers) {
      try {
        health[type] = await provider.isHealthy();
      } catch {
        health[type] = false;
      }
    }
    
    return health as Record<ProviderType, boolean>;
  }

  // Get provider configurations (without sensitive data)
  getProviderConfigs(): Array<{ type: ProviderType; config: any }> {
    return Array.from(this.providers.entries()).map(([type, provider]) => ({
      type,
      config: {
        ...provider.config,
        // Remove sensitive information
        apiKey: undefined,
      }
    }));
  }

  // Streaming analysis using current provider
  async streamAnalysis(params: {
    text: string;
    images?: Array<{ data: string; mediaType: string }>;
    onProgress: (response: any) => void;
    onComplete: () => void;
    onError: (error: Error) => void;
  }): Promise<void> {
    const provider = this.getCurrentProvider();
    
    if (!provider) {
      params.onError(new Error('No AI provider configured'));
      return;
    }

    try {
      // Add provider information to progress updates
      const wrappedOnProgress = (response: any) => {
        params.onProgress({
          ...response,
          provider: {
            type: this.currentProvider,
            name: provider.config.displayName
          }
        });
      };

      await provider.streamAnalysis({
        ...params,
        onProgress: wrappedOnProgress
      });
    } catch (error) {
      console.error(`Provider ${this.currentProvider} error:`, error);
      params.onError(error instanceof Error ? error : new Error(String(error)));
    }
  }
}

// Global provider manager instance
export const providerManager = new AIProviderManager();