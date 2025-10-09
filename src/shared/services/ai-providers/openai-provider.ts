// OpenAI Provider Implementation

import { BaseAIProvider } from './base-provider';
import { AIProviderConfig } from './types';

export class OpenAIProvider extends BaseAIProvider {
  private apiKey: string;
  private model: string;

  config: AIProviderConfig = {
    name: 'openai',
    displayName: 'OpenAI',
    description: 'OpenAI GPT models with vision support',
    requiresApiKey: true,
    requiresUrl: false,
    defaultModel: 'gpt-4o',
    maxTokens: 4000,
    supportsVision: true,
    supportsStreaming: true,
  };

  constructor(apiKey: string, model?: string) {
    super();
    this.apiKey = apiKey;
    this.model = model || this.config.defaultModel || 'gpt-4o';
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
      this.emitProgress(onProgress, 'connecting', 'Connecting to OpenAI...');

      // Build message content
      const messageContent: any[] = [
        { type: 'text', text: `${this.getSystemPrompt()  }\n\n${  text}` }
      ];

      // Add images if provided
      if (images && images.length > 0) {
        for (const image of images) {
          messageContent.push({
            type: 'image_url',
            image_url: {
              url: `data:${image.mediaType};base64,${image.data}`
            }
          });
        }
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
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
        
        // Handle specific OpenAI API errors
        switch (response.status) {
          case 401:
            throw new Error('OpenAI API authentication failed. Please check your API key.');
          case 403:
            throw new Error('OpenAI API access forbidden. Please check your API key permissions.');
          case 429:
            throw new Error('OpenAI API rate limit exceeded. Please try again later.');
          case 500:
          case 502:
          case 503:
            throw new Error('OpenAI API server error. Please try again later.');
          default:
            throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorMessage}`);
        }
      }

      this.emitProgress(onProgress, 'analyzing', 'OpenAI is analyzing the content...');

      const result = await response.json();
      const analysisText = result.choices?.[0]?.message?.content;

      if (!analysisText) {
        throw new Error('No analysis content received from OpenAI');
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
      console.error('OpenAI provider error:', error);
      onError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
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
      console.error('OpenAI health check failed:', error);
      // Check if it's a network error vs API error
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error('OpenAI API network connection failed');
      } else {
        console.error('OpenAI API authentication or server error');
      }
      return false;
    }
  }
}