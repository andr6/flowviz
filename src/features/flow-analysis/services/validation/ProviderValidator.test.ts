import { describe, it, expect, beforeEach } from 'vitest';
import { ProviderValidator } from './ProviderValidator';
import { ValidationError } from '../errors';
import type { ProviderSettings } from '../../types/StreamingTypes';

describe('ProviderValidator', () => {
  let validator: ProviderValidator;

  beforeEach(() => {
    validator = new ProviderValidator();
  });

  describe('Claude provider', () => {
    it('should accept valid Claude configuration', () => {
      const settings: ProviderSettings = {
        currentProvider: 'claude',
        claude: { apiKey: 'sk-ant-valid-key', model: 'claude-3-5-sonnet-20250929' },
        openai: { apiKey: '', model: '' },
        openrouter: { apiKey: '', model: '' },
        ollama: { baseUrl: '', model: '' },
      };

      expect(() => validator.validate(settings)).not.toThrow();
    });

    it('should reject Claude with empty API key', () => {
      const settings: ProviderSettings = {
        currentProvider: 'claude',
        claude: { apiKey: '', model: 'claude-3-5-sonnet-20250929' },
        openai: { apiKey: '', model: '' },
        openrouter: { apiKey: '', model: '' },
        ollama: { baseUrl: '', model: '' },
      };

      expect(() => validator.validate(settings)).toThrow(ValidationError);
      expect(() => validator.validate(settings)).toThrow('Claude API key is required');
    });

    it('should reject Claude with whitespace-only API key', () => {
      const settings: ProviderSettings = {
        currentProvider: 'claude',
        claude: { apiKey: '   ', model: 'claude-3-5-sonnet-20250929' },
        openai: { apiKey: '', model: '' },
        openrouter: { apiKey: '', model: '' },
        ollama: { baseUrl: '', model: '' },
      };

      expect(() => validator.validate(settings)).toThrow(ValidationError);
      expect(() => validator.validate(settings)).toThrow('Claude API key is required');
    });

    it('should reject Claude with missing model', () => {
      const settings: ProviderSettings = {
        currentProvider: 'claude',
        claude: { apiKey: 'sk-ant-valid-key', model: '' },
        openai: { apiKey: '', model: '' },
        openrouter: { apiKey: '', model: '' },
        ollama: { baseUrl: '', model: '' },
      };

      expect(() => validator.validate(settings)).toThrow(ValidationError);
      expect(() => validator.validate(settings)).toThrow('model is required');
    });
  });

  describe('OpenAI provider', () => {
    it('should accept valid OpenAI configuration', () => {
      const settings: ProviderSettings = {
        currentProvider: 'openai',
        claude: { apiKey: '', model: '' },
        openai: { apiKey: 'sk-valid-openai-key', model: 'gpt-4-turbo-preview' },
        openrouter: { apiKey: '', model: '' },
        ollama: { baseUrl: '', model: '' },
      };

      expect(() => validator.validate(settings)).not.toThrow();
    });

    it('should reject OpenAI with empty API key', () => {
      const settings: ProviderSettings = {
        currentProvider: 'openai',
        claude: { apiKey: '', model: '' },
        openai: { apiKey: '', model: 'gpt-4-turbo-preview' },
        openrouter: { apiKey: '', model: '' },
        ollama: { baseUrl: '', model: '' },
      };

      expect(() => validator.validate(settings)).toThrow(ValidationError);
      expect(() => validator.validate(settings)).toThrow('OpenAI API key is required');
    });

    it('should reject OpenAI with missing model', () => {
      const settings: ProviderSettings = {
        currentProvider: 'openai',
        claude: { apiKey: '', model: '' },
        openai: { apiKey: 'sk-valid-openai-key', model: '' },
        openrouter: { apiKey: '', model: '' },
        ollama: { baseUrl: '', model: '' },
      };

      expect(() => validator.validate(settings)).toThrow(ValidationError);
      expect(() => validator.validate(settings)).toThrow('model is required');
    });
  });

  describe('OpenRouter provider', () => {
    it('should accept valid OpenRouter configuration', () => {
      const settings: ProviderSettings = {
        currentProvider: 'openrouter',
        claude: { apiKey: '', model: '' },
        openai: { apiKey: '', model: '' },
        openrouter: { apiKey: 'sk-or-valid-key', model: 'anthropic/claude-3.5-sonnet' },
        ollama: { baseUrl: '', model: '' },
      };

      expect(() => validator.validate(settings)).not.toThrow();
    });

    it('should reject OpenRouter with empty API key', () => {
      const settings: ProviderSettings = {
        currentProvider: 'openrouter',
        claude: { apiKey: '', model: '' },
        openai: { apiKey: '', model: '' },
        openrouter: { apiKey: '', model: 'anthropic/claude-3.5-sonnet' },
        ollama: { baseUrl: '', model: '' },
      };

      expect(() => validator.validate(settings)).toThrow(ValidationError);
      expect(() => validator.validate(settings)).toThrow('OpenRouter API key is required');
    });

    it('should reject OpenRouter with missing model', () => {
      const settings: ProviderSettings = {
        currentProvider: 'openrouter',
        claude: { apiKey: '', model: '' },
        openai: { apiKey: '', model: '' },
        openrouter: { apiKey: 'sk-or-valid-key', model: '' },
        ollama: { baseUrl: '', model: '' },
      };

      expect(() => validator.validate(settings)).toThrow(ValidationError);
      expect(() => validator.validate(settings)).toThrow('model is required');
    });
  });

  describe('Ollama provider', () => {
    it('should accept valid Ollama configuration', () => {
      const settings: ProviderSettings = {
        currentProvider: 'ollama',
        claude: { apiKey: '', model: '' },
        openai: { apiKey: '', model: '' },
        openrouter: { apiKey: '', model: '' },
        ollama: { baseUrl: 'http://localhost:11434', model: 'llama2' },
      };

      expect(() => validator.validate(settings)).not.toThrow();
    });

    it('should reject Ollama with empty base URL', () => {
      const settings: ProviderSettings = {
        currentProvider: 'ollama',
        claude: { apiKey: '', model: '' },
        openai: { apiKey: '', model: '' },
        openrouter: { apiKey: '', model: '' },
        ollama: { baseUrl: '', model: 'llama2' },
      };

      expect(() => validator.validate(settings)).toThrow(ValidationError);
      expect(() => validator.validate(settings)).toThrow('Ollama base URL is required');
    });

    it('should reject Ollama with whitespace-only base URL', () => {
      const settings: ProviderSettings = {
        currentProvider: 'ollama',
        claude: { apiKey: '', model: '' },
        openai: { apiKey: '', model: '' },
        openrouter: { apiKey: '', model: '' },
        ollama: { baseUrl: '   ', model: 'llama2' },
      };

      expect(() => validator.validate(settings)).toThrow(ValidationError);
      expect(() => validator.validate(settings)).toThrow('Ollama base URL is required');
    });

    it('should reject Ollama with missing model', () => {
      const settings: ProviderSettings = {
        currentProvider: 'ollama',
        claude: { apiKey: '', model: '' },
        openai: { apiKey: '', model: '' },
        openrouter: { apiKey: '', model: '' },
        ollama: { baseUrl: 'http://localhost:11434', model: '' },
      };

      expect(() => validator.validate(settings)).toThrow(ValidationError);
      expect(() => validator.validate(settings)).toThrow('model is required');
    });
  });

  describe('configuration errors', () => {
    it('should reject missing provider configuration', () => {
      const settings = {
        currentProvider: 'claude',
        openai: { apiKey: '', model: '' },
        openrouter: { apiKey: '', model: '' },
        ollama: { baseUrl: '', model: '' },
      } as any;

      expect(() => validator.validate(settings)).toThrow(ValidationError);
      expect(() => validator.validate(settings)).toThrow('Provider configuration for "claude" is missing');
    });

    it('should reject unknown provider', () => {
      const settings = {
        currentProvider: 'unknown',
        claude: { apiKey: 'key', model: 'model' },
        openai: { apiKey: '', model: '' },
        openrouter: { apiKey: '', model: '' },
        ollama: { baseUrl: '', model: '' },
      } as any;

      expect(() => validator.validate(settings)).toThrow(ValidationError);
      expect(() => validator.validate(settings)).toThrow('Unknown provider: unknown');
    });
  });

  describe('Strategy Pattern implementation', () => {
    it('should use APIKeyValidationStrategy for Claude', () => {
      const settings: ProviderSettings = {
        currentProvider: 'claude',
        claude: { apiKey: 'sk-ant-key', model: 'claude-3-5-sonnet-20250929' },
        openai: { apiKey: '', model: '' },
        openrouter: { apiKey: '', model: '' },
        ollama: { baseUrl: '', model: '' },
      };

      // Should not throw since it uses API key validation strategy
      expect(() => validator.validate(settings)).not.toThrow();
    });

    it('should use URLBasedValidationStrategy for Ollama', () => {
      const settings: ProviderSettings = {
        currentProvider: 'ollama',
        claude: { apiKey: '', model: '' },
        openai: { apiKey: '', model: '' },
        openrouter: { apiKey: '', model: '' },
        ollama: { baseUrl: 'http://localhost:11434', model: 'llama2' },
      };

      // Should not throw since it uses URL-based validation strategy
      expect(() => validator.validate(settings)).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle API key with special characters', () => {
      const settings: ProviderSettings = {
        currentProvider: 'claude',
        claude: { apiKey: 'sk-ant-key_with-special.chars!@#', model: 'claude-3-5-sonnet-20250929' },
        openai: { apiKey: '', model: '' },
        openrouter: { apiKey: '', model: '' },
        ollama: { baseUrl: '', model: '' },
      };

      expect(() => validator.validate(settings)).not.toThrow();
    });

    it('should handle base URL with port number', () => {
      const settings: ProviderSettings = {
        currentProvider: 'ollama',
        claude: { apiKey: '', model: '' },
        openai: { apiKey: '', model: '' },
        openrouter: { apiKey: '', model: '' },
        ollama: { baseUrl: 'http://localhost:11434', model: 'llama2' },
      };

      expect(() => validator.validate(settings)).not.toThrow();
    });

    it('should handle model names with version numbers', () => {
      const settings: ProviderSettings = {
        currentProvider: 'openai',
        claude: { apiKey: '', model: '' },
        openai: { apiKey: 'sk-key', model: 'gpt-4-turbo-2024-04-09' },
        openrouter: { apiKey: '', model: '' },
        ollama: { baseUrl: '', model: '' },
      };

      expect(() => validator.validate(settings)).not.toThrow();
    });
  });
});
