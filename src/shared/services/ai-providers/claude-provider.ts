// Claude (Anthropic) AI Provider

import { BaseAIProvider } from './base-provider';
import { AIProviderConfig, StreamingResponse } from './types';

export class ClaudeProvider extends BaseAIProvider {
  config: AIProviderConfig = {
    name: 'claude',
    displayName: 'Claude (Anthropic)',
    description: 'Anthropic Claude 3.5 Sonnet with vision support',
    requiresApiKey: true,
    requiresUrl: false,
    defaultModel: 'claude-3-5-sonnet-20241022',
    maxTokens: 4000,
    supportsVision: true,
    supportsStreaming: true,
  };

  constructor(
    private apiKey: string,
    private model: string = 'claude-3-5-sonnet-20241022'
  ) {
    super();
  }

  async streamAnalysis(params: {
    text: string;
    images?: Array<{ data: string; mediaType: string }>;
    onProgress: (response: StreamingResponse) => void;
    onComplete: () => void;
    onError: (error: Error) => void;
  }): Promise<void> {
    try {
      const { text, images, onProgress, onComplete, onError } = params;

      this.emitProgress(onProgress, 'initializing', 'Starting Claude analysis...');

      // Prepare the message content
      const content: any[] = [
        { type: 'text', text }
      ];

      // Add images if provided
      if (images && images.length > 0) {
        this.emitProgress(onProgress, 'processing_images', `Processing ${images.length} images...`);
        
        for (const image of images) {
          content.push({
            type: 'image',
            source: {
              type: 'base64',
              media_type: image.mediaType,
              data: image.data
            }
          });
        }
      }

      // Make the streaming request to Claude API
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: this.config.maxTokens,
          system: this.getSystemPrompt(),
          messages: [
            {
              role: 'user',
              content
            }
          ],
          stream: false // Note: For now using non-streaming, can be enhanced later
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || 'Unknown error';
        
        // Handle specific Claude API errors
        switch (response.status) {
          case 401:
            throw new Error('Claude API authentication failed. Please check your API key.');
          case 403:
            throw new Error('Claude API access forbidden. Please check your API key permissions.');
          case 429:
            throw new Error('Claude API rate limit exceeded. Please try again later.');
          case 500:
          case 502:
          case 503:
            throw new Error('Claude API server error. Please try again later.');
          default:
            throw new Error(`Claude API error: ${response.status} ${response.statusText} - ${errorMessage}`);
        }
      }

      this.emitProgress(onProgress, 'analyzing', 'Claude is analyzing the content...');

      const result = await response.json();
      const analysisText = result.content?.[0]?.text;

      if (!analysisText) {
        throw new Error('No analysis content received from Claude');
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
      console.error('Claude provider error:', error);
      onError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 10,
          messages: [
            {
              role: 'user',
              content: 'Health check'
            }
          ]
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Claude health check failed:', error);
      // Check if it's a network error vs API error
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error('Claude API network connection failed');
      } else {
        console.error('Claude API authentication or server error');
      }
      return false;
    }
  }
}