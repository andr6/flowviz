/**
 * Validation Strategies - Strategy pattern for provider validation
 *
 * Eliminates code duplication by defining reusable validation strategies
 * for different provider types (API key-based, URL-based, etc.)
 */

import { ValidationError } from '../errors';

/**
 * Base interface for provider validation strategies.
 * Each strategy implements validation logic for a specific provider type.
 */
export interface ProviderValidationStrategy {
  validate(config: any): void;
}

/**
 * Validation strategy for API key-based providers (Claude, OpenAI, OpenRouter).
 * Validates that API key and model are present and non-empty.
 */
export class APIKeyValidationStrategy implements ProviderValidationStrategy {
  constructor(private providerName: string) {}

  validate(config: { apiKey?: string; model?: string }): void {
    if (!config.apiKey?.trim()) {
      throw new ValidationError(
        `${this.providerName} API key is required. Please configure it in Settings.`
      );
    }

    if (!config.model) {
      throw new ValidationError(`${this.providerName} model is required`);
    }
  }
}

/**
 * Validation strategy for URL-based providers (Ollama, local models).
 * Validates that base URL and model are present and non-empty.
 */
export class URLBasedValidationStrategy implements ProviderValidationStrategy {
  constructor(private providerName: string) {}

  validate(config: { baseUrl?: string; model?: string }): void {
    if (!config.baseUrl?.trim()) {
      throw new ValidationError(
        `${this.providerName} base URL is required. Please configure it in Settings.`
      );
    }

    if (!config.model) {
      throw new ValidationError(`${this.providerName} model is required`);
    }
  }
}

/**
 * Validation strategy for optional providers that may or may not be configured.
 * Only validates if the provider is explicitly enabled.
 */
export class OptionalProviderValidationStrategy implements ProviderValidationStrategy {
  constructor(
    private providerName: string,
    private innerStrategy: ProviderValidationStrategy
  ) {}

  validate(config: { enabled?: boolean; [key: string]: any }): void {
    // Only validate if provider is explicitly enabled
    if (config.enabled === true) {
      this.innerStrategy.validate(config);
    }
  }
}
