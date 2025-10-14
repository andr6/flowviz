// CENTRALIZED CONSTANTS - Replace hardcoded values throughout codebase
export const LIMITS = {
  TEXT: {
    MAX_CHARS: 650_000,
    WARNING_CHARS: 500_000,
    MAX_WORDS: Math.floor(650_000 / 5),
    MAX_INPUT_LENGTH: 50_000, // 50k characters for text input
  },
  FILES: {
    PDF: {
      MAX_SIZE: 10 * 1024 * 1024,        // 10MB
      MAX_PAGES: 100,
      VALIDATION_TIMEOUT: 10_000,        // 10 seconds
    },
    IMAGE: {
      MAX_SIZE: 3 * 1024 * 1024,         // 3MB
    },
  },
  REQUEST: {
    MAX_SIZE: '10mb',
    MAX_ARTICLE_SIZE: 5_242_880, // 5MB
    MAX_IMAGE_SIZE: 3_145_728,   // 3MB
  },
  RATE: {
    ARTICLES: 10,        // per 15 minutes
    IMAGES: 50,          // per 10 minutes
    STREAMING: 5,        // per 5 minutes
  },
  UI: {
    ANIMATION: {
      DURATION_SHORT: 200,
      DURATION_NORMAL: 300,
      DURATION_LONG: 800,
    },
    DEBOUNCE: {
      NAVIGATION: 150,   // Navigation debounce delay
      INPUT: 300,        // Input field debounce
      SEARCH: 300,       // Search debounce
      RESIZE: 100,       // Window resize debounce
      SCROLL: 50,        // Scroll debounce
    },
    LAYOUT: {
      APPBAR_HEIGHT: 76,
      SIDEBAR_WIDTH: 280,
      PANEL_MIN_WIDTH: 320,
    }
  }
} as const;

export const TIMEOUTS = {
  AI_STREAMING: {
    DEFAULT: 60_000,      // 1 minute - standard AI response
    EXTENDED: 120_000,    // 2 minutes - large documents/PDFs
    MAX: 300_000,         // 5 minutes - absolute maximum
  },
  VALIDATION: {
    PDF_PROCESSING: 10_000,  // 10 seconds for PDF validation
    URL_FETCH: 30_000,       // 30 seconds for URL fetching
  },
  NETWORK: {
    API_REQUEST: 30_000,     // 30 seconds for standard API requests
    LONG_POLL: 120_000,      // 2 minutes for long-polling
  }
} as const;

export const NETWORK = {
  PORTS: {
    DEVELOPMENT: {
      FRONTEND: [5173, 5174, 5175],
      BACKEND: 3001,
      OLLAMA: 11434,
    },
    PRODUCTION: {
      DEFAULT: 8080,
    }
  },
  HOSTS: {
    DEVELOPMENT: ['localhost', '127.0.0.1'],
    APIS: {
      ANTHROPIC: 'https://api.anthropic.com',
      OPENAI: 'https://api.openai.com',
      OPENROUTER: 'https://openrouter.ai',
    }
  }
} as const;

export const AI_MODELS = {
  CLAUDE: {
    SONNET_4: 'claude-sonnet-4-20250514',
    SONNET_3_5: 'claude-3-5-sonnet-20241022',
  },
  OPENAI: {
    GPT_4O: 'gpt-4o',
    GPT_4_TURBO: 'gpt-4-turbo',
  },
  OLLAMA: {
    LLAMA_3_2_VISION: 'llama3.2-vision:latest',
    LLAMA_3_2: 'llama3.2:latest',
  }
} as const;

export const SECURITY = {
  JWT: {
    ACCESS_TOKEN_EXPIRY: '15m',
    REFRESH_TOKEN_EXPIRY: '7d',
  },
  BCRYPT: {
    ROUNDS: 12,
  },
  SESSION: {
    MAX_AGE: 24 * 60 * 60 * 1000, // 24 hours
  }
} as const;

export const VISUALIZATION = {
  NODES: {
    MAX_SIMPLIFIED_THRESHOLD: 30,
    MAX_AUTO_SWITCH_THRESHOLD: 50,
  },
  LAYOUT: {
    PADDING: 0.15,
    MAX_ZOOM: 4,
    MIN_ZOOM: 0.1,
    DEFAULT_ZOOM: 1,
  },
  GRID: {
    SIZE: [15, 15] as const,
    GAP: 20,
    DOT_SIZE: 1,
  }
} as const;

export const ROUTES = {
  API: {
    AUTH: '/api/auth',
    INVESTIGATIONS: '/api/investigations',
    SIEM: '/api/siem',
    PICUS: '/api/picus',
    STREAMING: '/api/stream',
  },
  PAGES: {
    HOME: '/',
    LOGIN: '/login',
    DASHBOARD: '/dashboard',
  }
} as const;

export const THEMES = {
  COLORS: {
    BRAND: {
      PRIMARY: '#0066ff',
      SECONDARY: '#00d4ff',
      DARK: 'rgba(0, 102, 255, 0.1)',
    },
    STATUS: {
      SUCCESS: '#22c55e',
      WARNING: '#f59e0b', 
      ERROR: '#ef4444',
      INFO: '#3b82f6',
    }
  },
  SPACING: {
    XS: 4,
    SM: 8,
    MD: 16,
    LG: 24,
    XL: 32,
  }
} as const;

export const STORAGE_KEYS = {
  PROVIDER_SETTINGS: 'threatflow_provider_settings',
  USER_PREFERENCES: 'threatflow_user_prefs',
  RECENT_FLOWS: 'threatflow_recent_flows',
  SESSION_TOKEN: 'threatflow_session',
} as const;

export const ERROR_MESSAGES = {
  NETWORK: {
    CONNECTION_FAILED: 'Network connection failed. Please check your internet connection.',
    TIMEOUT: 'Request timed out. Please try again.',
    RATE_LIMITED: 'Too many requests. Please wait before trying again.',
  },
  AUTH: {
    INVALID_CREDENTIALS: 'Invalid credentials provided.',
    SESSION_EXPIRED: 'Your session has expired. Please log in again.',
    INSUFFICIENT_PERMISSIONS: 'You do not have permission to perform this action.',
  },
  VALIDATION: {
    INVALID_URL: 'Please enter a valid URL.',
    FILE_TOO_LARGE: 'File is too large. Please select a smaller file.',
    UNSUPPORTED_FORMAT: 'Unsupported file format.',
  }
} as const;

// Environment-aware constants (will be replaced by ConfigurationService)
export const getDevOrigins = () => NETWORK.HOSTS.DEVELOPMENT.flatMap(host => 
  NETWORK.PORTS.DEVELOPMENT.FRONTEND.map(port => `http://${host}:${port}`)
);

export const getOllamaUrl = () => `http://${NETWORK.HOSTS.DEVELOPMENT[0]}:${NETWORK.PORTS.DEVELOPMENT.OLLAMA}`;

export const DEFAULT_AI_MODELS = {
  claude: AI_MODELS.CLAUDE.SONNET_3_5,
  openai: AI_MODELS.OPENAI.GPT_4O,
  ollama: AI_MODELS.OLLAMA.LLAMA_3_2_VISION,
} as const;