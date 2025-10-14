/**
 * Streaming Request/Response Type Definitions
 *
 * Defines strongly-typed interfaces for AI streaming API requests and responses.
 * Replaces: `const requestBody: any = { ... }`
 */

import { Node, Edge } from 'reactflow';
import { IOCAnalysis } from './IOCAnalysis';

/**
 * AI provider configuration for a single provider
 */
export interface ProviderConfig {
  /** API key for the provider (required for Claude, OpenAI, OpenRouter) */
  apiKey?: string;

  /** Base URL for the provider (required for Ollama) */
  baseUrl?: string;

  /** Model to use */
  model: string;

  /** Whether this provider is enabled (for optional providers like Picus) */
  enabled?: boolean;

  /** Optional refresh token (for OAuth providers) */
  refreshToken?: string;

  /** Optional organization ID */
  organizationId?: string;
}

/**
 * Complete provider settings including all supported providers
 */
export interface ProviderSettings {
  /** Currently selected provider */
  currentProvider: 'claude' | 'openai' | 'openrouter' | 'ollama';

  /** Claude configuration */
  claude: ProviderConfig;

  /** OpenAI configuration */
  openai: ProviderConfig;

  /** OpenRouter configuration */
  openrouter: ProviderConfig;

  /** Ollama configuration */
  ollama: ProviderConfig;

  /** Optional Picus integration configuration */
  picus?: ProviderConfig & {
    enabled: boolean;
  };
}

/**
 * Request body for streaming AI analysis
 */
export interface StreamingRequestBody {
  /** System prompt for the AI */
  system: string;

  /** Provider settings */
  provider: ProviderSettings;

  /** URL to analyze (mutually exclusive with pdf and text) */
  url?: string;

  /** Base64-encoded PDF content (mutually exclusive with url and text) */
  pdf?: string;

  /** Raw text to analyze (mutually exclusive with url and pdf) */
  text?: string;

  /** Optional additional context for the AI */
  context?: string;

  /** Optional user preferences */
  preferences?: {
    /** Preferred analysis depth */
    depth?: 'quick' | 'standard' | 'detailed';

    /** Whether to include IOC extraction */
    include_iocs?: boolean;

    /** Whether to include MITRE ATT&CK mapping */
    include_mitre?: boolean;
  };
}

/**
 * Metadata about the streaming response
 */
export interface ResponseMetadata {
  /** Processing time in milliseconds */
  processing_time_ms: number;

  /** Model that was used for analysis */
  model_used: string;

  /** Provider that was used */
  provider: string;

  /** Number of tokens used (if available) */
  tokens_used?: number;

  /** Estimated cost (if available) */
  estimated_cost?: number;

  /** Analysis completion timestamp */
  completed_at?: string;
}

/**
 * Complete streaming response structure
 */
export interface StreamingResponse {
  /** Extracted nodes */
  nodes: Node[];

  /** Extracted edges */
  edges: Edge[];

  /** Optional IOC analysis results */
  ioc_analysis?: IOCAnalysis;

  /** Optional response metadata */
  metadata?: ResponseMetadata;

  /** Optional error information */
  error?: {
    code: string;
    message: string;
    details?: string;
  };
}

/**
 * Partial streaming chunk during processing
 */
export interface StreamingChunk {
  /** Partial nodes (may be incomplete) */
  nodes?: Partial<Node>[];

  /** Partial edges (may be incomplete) */
  edges?: Partial<Edge>[];

  /** Progress information */
  progress?: {
    stage: string;
    message: string;
    percentage?: number;
  };

  /** Whether this is the final chunk */
  is_complete?: boolean;
}

/**
 * Type guard to check if an object is a valid StreamingResponse
 */
export function isStreamingResponse(obj: unknown): obj is StreamingResponse {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'nodes' in obj &&
    'edges' in obj &&
    Array.isArray((obj as StreamingResponse).nodes) &&
    Array.isArray((obj as StreamingResponse).edges)
  );
}

/**
 * Type guard to check if an object is a valid ProviderSettings
 */
export function isProviderSettings(obj: unknown): obj is ProviderSettings {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'currentProvider' in obj &&
    'claude' in obj &&
    'openai' in obj &&
    'openrouter' in obj &&
    'ollama' in obj
  );
}

/**
 * Safely parse streaming response from unknown data
 */
export function parseStreamingResponse(data: unknown): StreamingResponse | null {
  if (!isStreamingResponse(data)) {
    console.warn('Invalid streaming response data received:', data);
    return null;
  }
  return data;
}
