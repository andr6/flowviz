import { Node, Edge } from 'reactflow';

import { DEFAULT_AI_MODELS, NETWORK } from '../../../shared/constants/AppConstants';

import { APIError, ValidationError } from './errors';
import { InputValidator } from './validation/InputValidator';
import { ProviderValidator } from './validation/ProviderValidator';
import { StreamStateManager } from './streaming/StreamStateManager';
import { StreamingJsonParser } from './streaming/StreamingJsonParser';

export interface StreamingDirectFlowCallbacks {
  onNode: (node: Node) => void;
  onEdge: (edge: Edge) => void;
  onProgress?: (stage: string, message: string) => void;
  onIOCAnalysis?: (iocAnalysis: any) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
}

export interface StreamingOptions {
  providerSettings?: ProviderSettings;
  signal?: AbortSignal;
  timeout?: number;
}

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

export class StreamingDirectFlowClient {
  private inputValidator: InputValidator;
  private providerValidator: ProviderValidator;
  private stateManager: StreamStateManager;
  private jsonParser: StreamingJsonParser;

  constructor() {
    this.inputValidator = new InputValidator();
    this.providerValidator = new ProviderValidator();
    this.stateManager = new StreamStateManager();
    this.jsonParser = new StreamingJsonParser(this.stateManager);
  }

  /**
   * Extracts and streams attack flow data from various input sources.
   *
   * @param input - URL string, PDF File, or raw text to analyze
   * @param callbacks - Handlers for streaming events (nodes, edges, progress, errors)
   * @param providerSettings - Optional AI provider configuration (for backwards compatibility)
   * @param options - Optional streaming options (signal, timeout)
   * @returns Promise that resolves when extraction is complete
   * @throws {APIError} If API request fails
   * @throws {ValidationError} If input is invalid
   * @throws {NetworkError} If network request fails
   */
  async extractDirectFlowStreaming(
    input: string | File,
    callbacks: StreamingDirectFlowCallbacks,
    providerSettings?: ProviderSettings,
    options?: StreamingOptions
  ): Promise<void> {
    console.log('=== Starting Streaming Direct Flow Extraction ===');

    // Support both old and new API signatures
    const finalOptions: StreamingOptions = {
      providerSettings: options?.providerSettings || providerSettings,
      signal: options?.signal,
      timeout: options?.timeout || 60000 // 60 second default timeout
    };

    // Setup timeout handling
    let timeoutId: NodeJS.Timeout | undefined;
    let internalAbortController: AbortController | undefined;

    try {
      // Validate input is not empty
      if (!input || (typeof input === 'string' && !input.trim())) {
        throw new ValidationError('Input cannot be empty');
      }

      // Validate provider settings if provided
      if (finalOptions.providerSettings) {
        this.providerValidator.validate(finalOptions.providerSettings);
      }

      // Determine input type
      const isUrl = typeof input === 'string' && (input.startsWith('http://') || input.startsWith('https://'));
      const isPdf = input instanceof File && input.type === 'application/pdf';

      const requestBody: any = {
        system: "You are an expert in cyber threat intelligence analysis.",
        provider: finalOptions.providerSettings || {
          currentProvider: 'claude',
          claude: { apiKey: '', model: DEFAULT_AI_MODELS.claude },
          ollama: { baseUrl: `http://localhost:${NETWORK.PORTS.DEVELOPMENT.OLLAMA}`, model: DEFAULT_AI_MODELS.ollama },
          openai: { apiKey: '', model: DEFAULT_AI_MODELS.openai },
          openrouter: { apiKey: '', model: 'anthropic/claude-3.5-sonnet' }
        }
      };

      if (isUrl) {
        // SECURITY: Validate URL before using to prevent SSRF attacks
        this.inputValidator.validateUrl(input as string);
        requestBody.url = input;
      } else if (isPdf) {
        // SECURITY: Validate PDF file before processing
        await this.inputValidator.validatePdf(input as File);

        // Convert PDF to base64
        const arrayBuffer = await (input as File).arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        requestBody.pdf = base64;
      } else {
        // Text input
        const textInput = input as string;

        // Validate text input
        this.inputValidator.validateText(textInput);

        requestBody.text = textInput;
      }

      // Setup abort controller for cancellation support
      internalAbortController = new AbortController();
      const effectiveSignal = finalOptions.signal || internalAbortController.signal;

      // Setup timeout
      if (finalOptions.timeout) {
        timeoutId = setTimeout(() => {
          console.warn(`Request timeout after ${finalOptions.timeout}ms`);
          internalAbortController?.abort();
        }, finalOptions.timeout);
      }

      // Make API request with cancellation support
      const response = await fetch('/api/ai-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: effectiveSignal,
      });

      // Clear timeout once we have a response
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = undefined;
      }

      if (!response.ok) {
        throw new APIError(`Failed to stream from AI provider: ${response.statusText}`, response.status);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new APIError('No response body available for streaming', 500);
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let responseText = '';
      let hasError = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) {break;}

        buffer += decoder.decode(value, { stream: true });
        
        // Process SSE events
        const lines = buffer.split('\n');
        buffer = lines[lines.length - 1]; // Keep incomplete line in buffer
        
        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i].trim();
          
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              // Only parse and emit if no error occurred
              if (!hasError) {
                this.jsonParser.parseFinal(callbacks);
                callbacks.onComplete();
              }
              return;
            }
            
            try {
              const event = JSON.parse(data);
              
              // Handle error events from server
              if (event.type === 'error' || event.error) {
                console.error('❌ Server error:', event.error);
                hasError = true;
                callbacks.onError(new Error(event.error || 'Server error occurred'));
                // Don't return here, let it process [DONE] to properly end the stream
              }
              
              // Handle progress updates from server
              if (event.type === 'progress') {
                console.log(`📈 ${event.stage}: ${event.message}`);
                callbacks.onProgress?.(event.stage, event.message);
              }
              
              // Handle IOC analysis data from server
              if (event.type === 'ioc_analysis' && event.data && callbacks.onIOCAnalysis) {
                console.log(`🔍 IOC Analysis received: ${event.data.indicators?.length || 0} indicators`);
                callbacks.onIOCAnalysis(event.data);
              }
              
              if (event.type === 'content_block_delta' && event.delta?.text) {
                responseText += event.delta.text;

                // Try to parse nodes as they appear in the stream
                this.jsonParser.parseChunk(event.delta.text, callbacks);

                // Log progress for debugging
                if (responseText.includes('"edges"')) {
                  console.log('📊 Edges array detected in stream');
                }
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (error) {
      // Handle abort errors specifically
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('🛑 Request cancelled by user or timeout');
        callbacks.onError(new Error('Request was cancelled'));
      } else {
        console.error('❌ Streaming extraction failed:', error);
        callbacks.onError(error as Error);
      }
    } finally {
      // Clean up timeout if still active
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }
}