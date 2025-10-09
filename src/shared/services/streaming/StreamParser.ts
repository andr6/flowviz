/**
 * StreamParser - Single responsibility: Parse streaming AI responses
 * Separated from networking and state management concerns
 */
export class StreamParser {
  private buffer: string = '';
  private maxBufferSize: number;

  constructor(maxBufferSize: number = 1024 * 1024) { // 1MB default
    this.maxBufferSize = maxBufferSize;
  }

  /**
   * Parse a chunk of streaming data
   * Returns complete messages and updates internal buffer
   */
  parseChunk(chunk: string): ParseResult {
    // Prevent unbounded buffer growth
    if (this.buffer.length + chunk.length > this.maxBufferSize) {
      throw new Error(`Stream buffer exceeded maximum size: ${this.maxBufferSize}`);
    }

    this.buffer += chunk;
    const messages: StreamMessage[] = [];
    const lines = this.buffer.split('\n');

    // Keep the last incomplete line in buffer
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      const message = this.parseLine(line);
      if (message) {
        messages.push(message);
      }
    }

    return {
      messages,
      hasMore: this.buffer.length > 0,
      bufferSize: this.buffer.length,
    };
  }

  /**
   * Parse a single line according to SSE format
   */
  private parseLine(line: string): StreamMessage | null {
    const trimmed = line.trim();
    
    if (!trimmed || trimmed.startsWith(':')) {
      return null; // Comment or empty line
    }

    if (trimmed === 'data: [DONE]') {
      return { type: 'done', data: null };
    }

    if (trimmed.startsWith('data: ')) {
      const data = trimmed.slice(6);
      
      try {
        const parsed = JSON.parse(data);
        return this.validateMessage(parsed);
      } catch (error) {
        // Invalid JSON - treat as raw text
        return { type: 'text', data };
      }
    }

    if (trimmed.startsWith('event: ')) {
      return { type: 'event', data: trimmed.slice(7) };
    }

    return null;
  }

  /**
   * Validate and normalize message structure
   */
  private validateMessage(data: any): StreamMessage {
    // Handle different provider formats
    if (data.choices && data.choices[0]?.delta?.content) {
      return { type: 'content', data: data.choices[0].delta.content };
    }

    if (data.delta?.text) {
      return { type: 'content', data: data.delta.text };
    }

    if (data.completion) {
      return { type: 'content', data: data.completion };
    }

    if (data.error) {
      return { type: 'error', data: data.error };
    }

    return { type: 'unknown', data };
  }

  /**
   * Reset parser state
   */
  reset(): void {
    this.buffer = '';
  }

  /**
   * Get current buffer size for monitoring
   */
  getBufferSize(): number {
    return this.buffer.length;
  }
}

export interface StreamMessage {
  type: 'content' | 'error' | 'done' | 'event' | 'text' | 'unknown';
  data: any;
}

export interface ParseResult {
  messages: StreamMessage[];
  hasMore: boolean;
  bufferSize: number;
}