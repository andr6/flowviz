// Ollama Local AI Provider

import { DEFAULT_AI_MODELS, NETWORK } from '../../constants/AppConstants';

import { BaseAIProvider } from './base-provider';
import { AIProviderConfig, StreamingResponse } from './types';

export class OllamaProvider extends BaseAIProvider {
  config: AIProviderConfig = {
    name: 'ollama',
    displayName: 'Ollama (Local)',
    description: 'Local Ollama instance with vision-capable models',
    requiresApiKey: false,
    requiresUrl: true,
    defaultModel: DEFAULT_AI_MODELS.ollama,
    maxTokens: 4000,
    supportsVision: true,
    supportsStreaming: true,
  };

  constructor(
    private baseUrl: string = `http://localhost:${NETWORK.PORTS.DEVELOPMENT.OLLAMA}`,
    private model: string = DEFAULT_AI_MODELS.ollama
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

      this.emitProgress(onProgress, 'initializing', 'Starting Ollama analysis...');

      // Check if model supports vision and images are provided
      const hasImages = images && images.length > 0;
      const supportsVision = this.model.includes('vision') || this.model.includes('llava');

      if (hasImages && !supportsVision) {
        throw new Error(`Model ${this.model} does not support vision. Please use a vision-capable model like llama3.2-vision or llava.`);
      }

      // Prepare the request
      const requestBody: any = {
        model: this.model,
        system: this.getSystemPrompt(),
        prompt: text,
        stream: true,
        options: {
          num_ctx: 8192,
          temperature: 0.1, // Lower temperature for more consistent JSON output
          top_p: 0.9,
        }
      };

      // Add images if provided and supported
      if (hasImages && supportsVision) {
        this.emitProgress(onProgress, 'processing_images', `Processing ${images.length} images with vision model...`);
        
        // Convert base64 images for Ollama
        requestBody.images = images.map(img => {
          // Remove data URL prefix if present
          const base64Data = img.data.replace(/^data:image\/[a-z]+;base64,/, '');
          return base64Data;
        });
      }

      this.emitProgress(onProgress, 'connecting', 'Connecting to Ollama...');

      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        
        // Handle specific Ollama errors
        switch (response.status) {
          case 404:
            if (errorText.includes('model')) {
              throw new Error(`Ollama model '${this.model}' not found. Please pull the model first: ollama pull ${this.model}`);
            } else {
              throw new Error('Ollama endpoint not found. Please ensure Ollama is running.');
            }
          case 500:
            throw new Error('Ollama server error. Please check the Ollama logs and try again.');
          case 503:
            throw new Error('Ollama service unavailable. The model may still be loading.');
          default:
            throw new Error(`Ollama API error: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ''}`);
        }
      }

      this.emitProgress(onProgress, 'streaming', 'Receiving analysis from Ollama...');

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader available');
      }

      let fullResponse = '';
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {break;}
          
          const chunk = new TextDecoder().decode(value);
          const lines = chunk.split('\n').filter(line => line.trim());
          
          for (const line of lines) {
            try {
              const data = JSON.parse(line);
              
              if (data.response) {
                fullResponse += data.response;
              }
              
              if (data.done) {
                // Process the complete response
                this.emitProgress(onProgress, 'parsing', 'Parsing Ollama response...');
                
                const streamingResponses = this.parseStreamingResponse(fullResponse);
                
                this.emitProgress(onProgress, 'emitting_results', `Emitting ${streamingResponses.length} analysis results...`);
                
                for (const streamResponse of streamingResponses) {
                  onProgress(streamResponse);
                  
                  // Add small delay between emissions
                  await new Promise(resolve => setTimeout(resolve, 50));
                }
                
                onComplete();
                return;
              }
              
            } catch (e) {
              // Skip invalid JSON lines
              continue;
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      // If we reach here without completion, something went wrong
      if (!fullResponse.trim()) {
        throw new Error('No response received from Ollama');
      }

    } catch (error) {
      console.error('Ollama provider error:', error);
      onError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      // Check if Ollama is running
      const response = await fetch(`${this.baseUrl}/api/version`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });

      if (!response.ok) {return false;}

      // Check if the specific model is available
      const modelsResponse = await fetch(`${this.baseUrl}/api/tags`);
      if (!modelsResponse.ok) {return false;}

      const modelsData = await modelsResponse.json();
      const availableModels = modelsData.models?.map((m: any) => m.name) || [];
      
      return availableModels.some((name: string) => 
        name === this.model || name.startsWith(this.model.split(':')[0])
      );

    } catch (error) {
      console.error('Ollama health check failed:', error);
      
      // Check if it's a connection error
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error(`Cannot connect to Ollama at ${this.baseUrl}. Please ensure Ollama is running.`);
      } else if (error.name === 'TimeoutError') {
        console.error('Ollama connection timed out. Service may be slow to respond.');
      } else {
        console.error('Ollama service error');
      }
      return false;
    }
  }

  // Additional Ollama-specific methods
  async listAvailableModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) {return [];}

      const data = await response.json();
      return data.models?.map((m: any) => m.name) || [];
    } catch {
      return [];
    }
  }

  async pullModel(modelName: string, onProgress?: (progress: number) => void): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/pull`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: modelName })
      });

      if (!response.ok) {return false;}

      const reader = response.body?.getReader();
      if (!reader) {return false;}

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {break;}

          const chunk = new TextDecoder().decode(value);
          const lines = chunk.split('\n').filter(line => line.trim());

          for (const line of lines) {
            try {
              const data = JSON.parse(line);
              if (data.completed && data.total && onProgress) {
                const progress = (data.completed / data.total) * 100;
                onProgress(Math.round(progress));
              }
            } catch {
              continue;
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      return true;
    } catch {
      return false;
    }
  }
}