/**
 * ProviderValidator - Validates AI provider settings before API calls
 *
 * Uses Strategy pattern to eliminate code duplication across different
 * provider types. Each provider (Claude, OpenAI, Ollama, etc.) has a
 * specific validation strategy.
 *
 * Benefits:
 * - Single Responsibility: Only validates provider settings
 * - Open/Closed: Easy to add new providers without modifying existing code
 * - Eliminates duplication: Was 88 lines of repeated if statements
 */

import { ValidationError } from '../errors';
import {
  ProviderValidationStrategy,
  APIKeyValidationStrategy,
  URLBasedValidationStrategy
} from './validationStrategies';

// Import ProviderSettings type (will be created in Phase 2)
// For now, using a local interface
interface ProviderSettings {
  currentProvider: string;
  [key: string]: any;
}

export class ProviderValidator {
  private strategies: Record<string, ProviderValidationStrategy>;

  constructor() {
    // Initialize validation strategies for each provider
    this.strategies = {
      claude: new APIKeyValidationStrategy('Claude'),
      openai: new APIKeyValidationStrategy('OpenAI'),
      openrouter: new APIKeyValidationStrategy('OpenRouter'),
      ollama: new URLBasedValidationStrategy('Ollama'),
    };
  }

  /**
   * Validates provider settings before making API calls.
   * Ensures API keys and required configuration are present.
   *
   * @param settings - The provider settings to validate
   * @throws {ValidationError} If settings are invalid or incomplete
   */
  validate(settings: ProviderSettings): void {
    const provider = settings.currentProvider;
    const config = settings[provider];

    // Check if provider configuration exists
    if (!config) {
      throw new ValidationError(
        `Provider configuration for "${provider}" is missing`
      );
    }

    // Get validation strategy for this provider
    const strategy = this.strategies[provider];
    if (!strategy) {
      throw new ValidationError(
        `Unknown provider: ${provider}. Supported providers: ${Object.keys(this.strategies).join(', ')}`
      );
    }

    // Validate using provider-specific strategy
    try {
      strategy.validate(config);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(
        `Failed to validate ${provider} settings: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Registers a new provider validation strategy.
   * Allows extending the validator with custom providers.
   *
   * @param providerName - Name of the provider
   * @param strategy - Validation strategy for this provider
   */
  registerProvider(providerName: string, strategy: ProviderValidationStrategy): void {
    this.strategies[providerName] = strategy;
  }

  /**
   * Checks if a provider is supported.
   *
   * @param providerName - Name of the provider to check
   * @returns true if provider is supported, false otherwise
   */
  isProviderSupported(providerName: string): boolean {
    return providerName in this.strategies;
  }

  /**
   * Gets list of all supported providers.
   *
   * @returns Array of supported provider names
   */
  getSupportedProviders(): string[] {
    return Object.keys(this.strategies);
  }
}
