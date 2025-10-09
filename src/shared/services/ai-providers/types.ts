// AI Provider Types and Interfaces

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface StreamingResponse {
  type: 'progress' | 'node' | 'edge' | 'complete' | 'error';
  data: any;
  stage?: string;
  message?: string;
  error?: string;
}

export interface AIProviderConfig {
  name: string;
  displayName: string;
  description: string;
  requiresApiKey: boolean;
  requiresUrl: boolean;
  defaultModel?: string;
  maxTokens: number;
  supportsVision: boolean;
  supportsStreaming: boolean;
}

export interface AIProvider {
  config: AIProviderConfig;
  
  // Core streaming method for attack flow analysis
  streamAnalysis(params: {
    text: string;
    images?: Array<{ data: string; mediaType: string }>;
    onProgress: (response: StreamingResponse) => void;
    onComplete: () => void;
    onError: (error: Error) => void;
  }): Promise<void>;
  
  // Health check
  isHealthy(): Promise<boolean>;
}

// Provider types
export type ProviderType = 'claude' | 'ollama' | 'openai' | 'openrouter';

// Configuration for each provider
export interface ProviderConfigs {
  claude: {
    apiKey: string;
    model?: string;
  };
  ollama: {
    baseUrl: string;
    model: string;
  };
  openai: {
    apiKey: string;
    model?: string;
  };
  openrouter: {
    apiKey: string;
    model?: string;
  };
}