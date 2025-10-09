// OpenRouter Provider Implementation

import { BaseAIProvider } from './base-provider';
import { AIProviderConfig } from './types';

export class OpenRouterProvider extends BaseAIProvider {
  private apiKey: string;
  private model: string;

  config: AIProviderConfig = {
    name: 'openrouter',
    displayName: 'OpenRouter',
    description: 'OpenRouter - Access to multiple AI models',
    requiresApiKey: true,
    requiresUrl: false,
    defaultModel: 'anthropic/claude-3.5-sonnet',
    maxTokens: 4000,
    supportsVision: true,
    supportsStreaming: true,
  };

  constructor(apiKey: string, model?: string) {
    super();
    this.apiKey = apiKey;
    this.model = model || this.config.defaultModel || 'anthropic/claude-3.5-sonnet';
  }

  async streamAnalysis(params: {
    text: string;
    images?: Array<{ data: string; mediaType: string }>;
    onProgress: (response: any) => void;
    onComplete: () => void;
    onError: (error: Error) => void;
  }): Promise<void> {
    const { text, images, onProgress, onComplete, onError } = params;

    try {
      this.emitProgress(onProgress, 'connecting', 'Connecting to OpenRouter...');

      // Build message content
      const messageContent: any[] = [
        { type: 'text', text: `${this.getSystemPrompt()  }\n\n${  text}` }
      ];

      // Add images if provided (format depends on the underlying model)
      if (images && images.length > 0) {
        for (const image of images) {
          // Use OpenAI format which is compatible with most models on OpenRouter
          messageContent.push({
            type: 'image_url',
            image_url: {
              url: `data:${image.mediaType};base64,${image.data}`
            }
          });
        }
      }

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://threatflow.app', // Optional: your app's URL
          'X-Title': 'ThreatFlow - Attack Flow Visualizer' // Optional: your app name
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'user',
              content: messageContent
            }
          ],
          max_tokens: this.config.maxTokens,
          temperature: 0.1,
          stream: false // For now using non-streaming, can be enhanced later
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || 'Unknown error';
        
        // Handle specific OpenRouter API errors
        switch (response.status) {
          case 401:
            throw new Error('OpenRouter API authentication failed. Please check your API key.');
          case 402:
            throw new Error('OpenRouter API payment required. Please check your account balance.');
          case 403:
            throw new Error('OpenRouter API access forbidden. Please check your API key permissions.');
          case 429:
            throw new Error('OpenRouter API rate limit exceeded. Please try again later.');
          case 500:
          case 502:
          case 503:
            throw new Error('OpenRouter API server error. Please try again later.');
          default:
            throw new Error(`OpenRouter API error: ${response.status} ${response.statusText} - ${errorMessage}`);
        }
      }

      this.emitProgress(onProgress, 'analyzing', 'OpenRouter is analyzing the content...');

      const result = await response.json();
      const analysisText = result.choices?.[0]?.message?.content;

      if (!analysisText) {
        throw new Error('No analysis content received from OpenRouter');
      }

      // Parse and emit the streaming responses
      const streamingResponses = this.parseStreamingResponse(analysisText);
      
      this.emitProgress(onProgress, 'emitting_results', `Emitting ${streamingResponses.length} analysis results...`);

      for (const streamResponse of streamingResponses) {
        onProgress(streamResponse);
        
        // Add small delay between emissions to simulate streaming
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      onComplete();

    } catch (error) {
      console.error('OpenRouter provider error:', error);
      onError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://threatflow.app',
          'X-Title': 'ThreatFlow - Attack Flow Visualizer'
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'user',
              content: 'Health check'
            }
          ],
          max_tokens: 10
        })
      });

      return response.ok;
    } catch (error) {
      console.error('OpenRouter health check failed:', error);
      // Check if it's a network error vs API error
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error('OpenRouter API network connection failed');
      } else {
        console.error('OpenRouter API authentication or server error');
      }
      return false;
    }
  }
}