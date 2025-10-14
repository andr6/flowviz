import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { StreamingDirectFlowClient } from './streamingDirectFlowClient';
import type { StreamingDirectFlowCallbacks, ProviderSettings } from './streamingDirectFlowClient';

// Mock fetch globally
global.fetch = vi.fn();

describe('StreamingDirectFlowClient', () => {
  let client: StreamingDirectFlowClient;
  let callbacks: StreamingDirectFlowCallbacks;

  beforeEach(() => {
    client = new StreamingDirectFlowClient();
    callbacks = {
      onNode: vi.fn(),
      onEdge: vi.fn(),
      onProgress: vi.fn(),
      onIOCAnalysis: vi.fn(),
      onComplete: vi.fn(),
      onError: vi.fn(),
    };

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const createMockProviderSettings = (): ProviderSettings => ({
    currentProvider: 'claude',
    claude: { apiKey: 'sk-ant-test-key', model: 'claude-3-5-sonnet-20250929' },
    openai: { apiKey: '', model: '' },
    openrouter: { apiKey: '', model: '' },
    ollama: { baseUrl: '', model: '' },
  });

  const createMockStreamResponse = (data: string[]) => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        for (const chunk of data) {
          controller.enqueue(encoder.encode(chunk));
        }
        controller.close();
      },
    });

    return new Response(stream, {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
    });
  };

  describe('input validation', () => {
    it('should reject empty input', async () => {
      await client.extractDirectFlowStreaming('', callbacks, createMockProviderSettings());

      expect(callbacks.onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('Input cannot be empty') })
      );
    });

    it('should reject localhost URLs (SSRF protection)', async () => {
      await client.extractDirectFlowStreaming(
        'http://localhost:8080',
        callbacks,
        createMockProviderSettings()
      );

      expect(callbacks.onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('Localhost access is not allowed') })
      );
    });

    it('should reject private IP URLs (SSRF protection)', async () => {
      await client.extractDirectFlowStreaming(
        'http://192.168.1.1',
        callbacks,
        createMockProviderSettings()
      );

      expect(callbacks.onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('Private IP') })
      );
    });

    it('should reject text input exceeding MAX_TEXT_LENGTH', async () => {
      const longText = 'a'.repeat(50001);

      await client.extractDirectFlowStreaming(
        longText,
        callbacks,
        createMockProviderSettings()
      );

      expect(callbacks.onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('Text input too long') })
      );
    });

    it('should accept valid URLs', async () => {
      const mockResponse = createMockStreamResponse([
        'data: {"type":"content_block_delta","delta":{"text":"{\\"nodes\\":[],\\"edges\\":[]}"}}\n\n',
        'data: [DONE]\n\n',
      ]);

      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      await client.extractDirectFlowStreaming(
        'https://example.com/article',
        callbacks,
        createMockProviderSettings()
      );

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/ai-stream',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('https://example.com/article'),
        })
      );
    });

    it('should accept valid text input', async () => {
      const mockResponse = createMockStreamResponse([
        'data: {"type":"content_block_delta","delta":{"text":"{\\"nodes\\":[],\\"edges\\":[]}"}}\n\n',
        'data: [DONE]\n\n',
      ]);

      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      await client.extractDirectFlowStreaming(
        'Valid text content for analysis',
        callbacks,
        createMockProviderSettings()
      );

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/ai-stream',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('Valid text content'),
        })
      );
    });
  });

  describe('provider validation', () => {
    it('should reject empty Claude API key', async () => {
      const settings: ProviderSettings = {
        currentProvider: 'claude',
        claude: { apiKey: '', model: 'claude-3-5-sonnet-20250929' },
        openai: { apiKey: '', model: '' },
        openrouter: { apiKey: '', model: '' },
        ollama: { baseUrl: '', model: '' },
      };

      await client.extractDirectFlowStreaming('https://example.com', callbacks, settings);

      expect(callbacks.onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('Claude API key is required') })
      );
    });

    it('should reject empty OpenAI API key when OpenAI is selected', async () => {
      const settings: ProviderSettings = {
        currentProvider: 'openai',
        claude: { apiKey: '', model: '' },
        openai: { apiKey: '', model: 'gpt-4-turbo-preview' },
        openrouter: { apiKey: '', model: '' },
        ollama: { baseUrl: '', model: '' },
      };

      await client.extractDirectFlowStreaming('https://example.com', callbacks, settings);

      expect(callbacks.onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('OpenAI API key is required') })
      );
    });

    it('should reject empty Ollama base URL when Ollama is selected', async () => {
      const settings: ProviderSettings = {
        currentProvider: 'ollama',
        claude: { apiKey: '', model: '' },
        openai: { apiKey: '', model: '' },
        openrouter: { apiKey: '', model: '' },
        ollama: { baseUrl: '', model: 'llama2' },
      };

      await client.extractDirectFlowStreaming('https://example.com', callbacks, settings);

      expect(callbacks.onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('Ollama base URL is required') })
      );
    });
  });

  describe('streaming flow extraction', () => {
    it('should handle successful streaming response', async () => {
      const mockResponse = createMockStreamResponse([
        'data: {"type":"content_block_delta","delta":{"text":"{\\"id\\":\\"node-1\\",\\"type\\":\\"action\\",\\"data\\":{\\"label\\":\\"Test\\"}}"}}\n\n',
        'data: [DONE]\n\n',
      ]);

      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      await client.extractDirectFlowStreaming(
        'https://example.com',
        callbacks,
        createMockProviderSettings()
      );

      expect(callbacks.onComplete).toHaveBeenCalledOnce();
      expect(callbacks.onError).not.toHaveBeenCalled();
    });

    it('should emit progress events', async () => {
      const mockResponse = createMockStreamResponse([
        'data: {"type":"progress","stage":"analyzing","message":"Analyzing content..."}\n\n',
        'data: {"type":"content_block_delta","delta":{"text":"{\\"nodes\\":[],\\"edges\\":[]}"}}\n\n',
        'data: [DONE]\n\n',
      ]);

      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      await client.extractDirectFlowStreaming(
        'https://example.com',
        callbacks,
        createMockProviderSettings()
      );

      expect(callbacks.onProgress).toHaveBeenCalledWith('analyzing', 'Analyzing content...');
    });

    it('should emit IOC analysis events', async () => {
      const iocData = {
        indicators: [{ type: 'ip', value: '192.168.1.1', confidence: 0.9 }],
        observables: [],
      };

      const mockResponse = createMockStreamResponse([
        `data: {"type":"ioc_analysis","data":${JSON.stringify(iocData)}}\n\n`,
        'data: [DONE]\n\n',
      ]);

      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      await client.extractDirectFlowStreaming(
        'https://example.com',
        callbacks,
        createMockProviderSettings()
      );

      expect(callbacks.onIOCAnalysis).toHaveBeenCalledWith(iocData);
    });

    it('should handle server error events', async () => {
      const mockResponse = createMockStreamResponse([
        'data: {"type":"error","error":"Server processing failed"}\n\n',
        'data: [DONE]\n\n',
      ]);

      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      await client.extractDirectFlowStreaming(
        'https://example.com',
        callbacks,
        createMockProviderSettings()
      );

      expect(callbacks.onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('Server processing failed') })
      );
    });

    it('should handle API request failure', async () => {
      (global.fetch as any).mockResolvedValueOnce(
        new Response(null, { status: 500, statusText: 'Internal Server Error' })
      );

      await client.extractDirectFlowStreaming(
        'https://example.com',
        callbacks,
        createMockProviderSettings()
      );

      expect(callbacks.onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('Internal Server Error') })
      );
    });

    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network request failed'));

      await client.extractDirectFlowStreaming(
        'https://example.com',
        callbacks,
        createMockProviderSettings()
      );

      expect(callbacks.onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('Network request failed') })
      );
    });
  });

  describe('timeout handling', () => {
    it('should timeout after specified duration', async () => {
      const mockResponse = createMockStreamResponse([
        // Never complete - simulate long-running request
      ]);

      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      await client.extractDirectFlowStreaming('https://example.com', callbacks, undefined, {
        providerSettings: createMockProviderSettings(),
        timeout: 100, // 100ms timeout
      });

      // Wait for timeout
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(callbacks.onError).toHaveBeenCalled();
    });

    it('should use default timeout of 60 seconds', async () => {
      const mockResponse = createMockStreamResponse([
        'data: {"type":"content_block_delta","delta":{"text":"{\\"nodes\\":[],\\"edges\\":[]}"}}\n\n',
        'data: [DONE]\n\n',
      ]);

      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      // Should not timeout immediately
      await client.extractDirectFlowStreaming(
        'https://example.com',
        callbacks,
        createMockProviderSettings()
      );

      expect(callbacks.onComplete).toHaveBeenCalled();
      expect(callbacks.onError).not.toHaveBeenCalled();
    });
  });

  describe('cancellation support', () => {
    it('should support AbortSignal cancellation', async () => {
      const mockResponse = createMockStreamResponse([
        // Long response to allow time for cancellation
      ]);

      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      const controller = new AbortController();

      const promise = client.extractDirectFlowStreaming(
        'https://example.com',
        callbacks,
        undefined,
        {
          providerSettings: createMockProviderSettings(),
          signal: controller.signal,
        }
      );

      // Cancel immediately
      controller.abort();

      await promise;

      expect(callbacks.onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('cancelled') })
      );
    });
  });

  describe('PDF processing', () => {
    it('should reject empty PDF files', async () => {
      const emptyPdf = new File([], 'empty.pdf', { type: 'application/pdf' });

      await client.extractDirectFlowStreaming(
        emptyPdf,
        callbacks,
        createMockProviderSettings()
      );

      expect(callbacks.onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('PDF file is empty') })
      );
    });

    it('should reject oversized PDF files', async () => {
      // Create 11MB PDF (exceeds 10MB limit)
      const pdfHeader = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34]);
      const padding = new Uint8Array(11 * 1024 * 1024);
      const largePdf = new File([pdfHeader, padding], 'large.pdf', { type: 'application/pdf' });

      await client.extractDirectFlowStreaming(
        largePdf,
        callbacks,
        createMockProviderSettings()
      );

      expect(callbacks.onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('PDF file too large') })
      );
    });

    it('should convert valid PDF to base64 for API', async () => {
      const pdfContent = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34]);
      const validPdf = new File([pdfContent], 'test.pdf', { type: 'application/pdf' });

      const mockResponse = createMockStreamResponse([
        'data: {"type":"content_block_delta","delta":{"text":"{\\"nodes\\":[],\\"edges\\":[]}"}}\n\n',
        'data: [DONE]\n\n',
      ]);

      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      await client.extractDirectFlowStreaming(
        validPdf,
        callbacks,
        createMockProviderSettings()
      );

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/ai-stream',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('pdf'),
        })
      );
    });
  });

  describe('integration with services', () => {
    it('should use InputValidator for validation', async () => {
      // Invalid input should be caught by InputValidator
      await client.extractDirectFlowStreaming(
        'http://localhost',
        callbacks,
        createMockProviderSettings()
      );

      expect(callbacks.onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('Localhost') })
      );
    });

    it('should use ProviderValidator for provider settings', async () => {
      const invalidSettings: ProviderSettings = {
        currentProvider: 'claude',
        claude: { apiKey: '', model: '' },
        openai: { apiKey: '', model: '' },
        openrouter: { apiKey: '', model: '' },
        ollama: { baseUrl: '', model: '' },
      };

      await client.extractDirectFlowStreaming(
        'https://example.com',
        callbacks,
        invalidSettings
      );

      expect(callbacks.onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('API key is required') })
      );
    });

    it('should use StreamStateManager for state tracking', async () => {
      const mockResponse = createMockStreamResponse([
        'data: {"type":"content_block_delta","delta":{"text":"{\\"id\\":\\"node-1\\",\\"type\\":\\"action\\",\\"data\\":{\\"label\\":\\"A1\\"}}"}}\n\n',
        'data: {"type":"content_block_delta","delta":{"text":"{\\"id\\":\\"node-2\\",\\"type\\":\\"action\\",\\"data\\":{\\"label\\":\\"A2\\"}}"}}\n\n',
        'data: {"type":"content_block_delta","delta":{"text":"{\\"id\\":\\"edge-1\\",\\"source\\":\\"node-1\\",\\"target\\":\\"node-2\\"}"}}\n\n',
        'data: [DONE]\n\n',
      ]);

      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      await client.extractDirectFlowStreaming(
        'https://example.com',
        callbacks,
        createMockProviderSettings()
      );

      // Should emit nodes and edge (edge after both nodes)
      expect(callbacks.onNode).toHaveBeenCalled();
      expect(callbacks.onEdge).toHaveBeenCalled();
    });

    it('should use StreamingJsonParser for JSON parsing', async () => {
      const mockResponse = createMockStreamResponse([
        'data: {"type":"content_block_delta","delta":{"text":"{\\"nodes\\":[{\\"id\\":\\"node-1\\",\\"type\\":\\"action\\",\\"data\\":{\\"label\\":\\"Test\\"}}],\\"edges\\":[]}"}}\n\n',
        'data: [DONE]\n\n',
      ]);

      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      await client.extractDirectFlowStreaming(
        'https://example.com',
        callbacks,
        createMockProviderSettings()
      );

      expect(callbacks.onNode).toHaveBeenCalled();
      expect(callbacks.onComplete).toHaveBeenCalled();
    });
  });
});
