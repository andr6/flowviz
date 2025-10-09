/**
 * Application-wide limits and thresholds
 * Centralized configuration for all size, time, and count limits
 */

// Text processing limits (based on Claude's 700k token context)
export const TEXT_PROCESSING_LIMITS = {
  MAX_CHARACTERS: 650_000,
  WARNING_THRESHOLD: 500_000,
  MAX_WORDS: Math.floor(650_000 / 5), // ~5 chars per word average
  MAX_PARAGRAPHS: 1000,
} as const;

// File upload limits (in bytes)
export const FILE_SIZE_LIMITS = {
  PDF_MAX_SIZE: 10 * 1024 * 1024,      // 10MB - reasonable for most threat reports
  IMAGE_MAX_SIZE: 5 * 1024 * 1024,     // 5MB - high-quality screenshots
  TEXT_MAX_SIZE: 2 * 1024 * 1024,      // 2MB - large text documents
  TOTAL_UPLOAD_MAX: 50 * 1024 * 1024,  // 50MB - batch upload limit
} as const;

// Streaming and performance limits
export const STREAMING_LIMITS = {
  BUFFER_MAX_SIZE: 1024 * 1024,        // 1MB - prevent memory exhaustion
  CHUNK_SIZE: 1024,                    // 1KB - optimal streaming chunk size
  TIMEOUT_MS: 30 * 1000,               // 30s - reasonable for AI responses
  MAX_RETRIES: 3,                      // Network retry attempts
  RETRY_DELAY_MS: 1000,                // Base retry delay
} as const;

// Database and connection limits
export const CONNECTION_LIMITS = {
  DB_POOL_MIN: 5,                      // Minimum active connections
  DB_POOL_MAX: 20,                     // Maximum connections (adjust per deployment)
  DB_TIMEOUT_MS: 10 * 1000,            // 10s connection timeout
  CACHE_TTL_MS: 5 * 60 * 1000,         // 5 minute cache TTL
} as const;

// Rate limiting (requests per time window)
export const RATE_LIMITS = {
  ANALYSIS_PER_MINUTE: 10,             // Analysis requests per user per minute
  FILE_UPLOADS_PER_HOUR: 50,           // File uploads per user per hour
  API_CALLS_PER_MINUTE: 100,           // General API calls per user per minute
  BURST_ALLOWANCE: 5,                  // Extra requests during bursts
} as const;

// UI and UX limits
export const UI_LIMITS = {
  MAX_NODES_DISPLAY: 200,              // Maximum nodes before pagination
  MAX_EDGES_DISPLAY: 500,              // Maximum edges before simplification
  ANIMATION_DURATION_MS: 300,          // Standard animation duration
  DEBOUNCE_DELAY_MS: 500,              // Input debouncing delay
} as const;

/**
 * Validation functions for limits
 */
export const validateLimits = {
  textSize: (text: string): { valid: boolean; error?: string } => {
    if (text.length > TEXT_PROCESSING_LIMITS.MAX_CHARACTERS) {
      return {
        valid: false,
        error: `Text exceeds maximum length of ${TEXT_PROCESSING_LIMITS.MAX_CHARACTERS.toLocaleString()} characters`,
      };
    }
    return { valid: true };
  },

  fileSize: (size: number, type: 'pdf' | 'image' | 'text'): { valid: boolean; error?: string } => {
    const limit = type === 'pdf' ? FILE_SIZE_LIMITS.PDF_MAX_SIZE
                 : type === 'image' ? FILE_SIZE_LIMITS.IMAGE_MAX_SIZE
                 : FILE_SIZE_LIMITS.TEXT_MAX_SIZE;

    if (size > limit) {
      return {
        valid: false,
        error: `File size ${(size / 1024 / 1024).toFixed(1)}MB exceeds limit of ${(limit / 1024 / 1024)}MB for ${type} files`,
      };
    }
    return { valid: true };
  },

  nodeCount: (count: number): { valid: boolean; warning?: string } => {
    if (count > UI_LIMITS.MAX_NODES_DISPLAY) {
      return {
        valid: true,
        warning: `Displaying ${count} nodes may impact performance. Consider filtering.`,
      };
    }
    return { valid: true };
  },
};

/**
 * Human-readable descriptions for limits
 */
export const LIMIT_DESCRIPTIONS = {
  [TEXT_PROCESSING_LIMITS.MAX_CHARACTERS]: 'Maximum text input for analysis',
  [FILE_SIZE_LIMITS.PDF_MAX_SIZE]: 'Maximum PDF file size for upload',
  [STREAMING_LIMITS.TIMEOUT_MS]: 'Maximum time to wait for AI response',
  [RATE_LIMITS.ANALYSIS_PER_MINUTE]: 'Analysis requests per minute per user',
} as const;