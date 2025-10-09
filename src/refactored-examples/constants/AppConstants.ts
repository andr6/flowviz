// REFACTORED: Centralized constants with clear naming and organization
export const LIMITS = {
  TEXT: {
    MAX_CHARS: 650_000,
    WARNING_CHARS: 500_000,
    MAX_WORDS: Math.floor(650_000 / 5),
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
      SEARCH: 300,
      RESIZE: 100,
      SCROLL: 50,
    },
    LAYOUT: {
      APPBAR_HEIGHT: 76,
      SIDEBAR_WIDTH: 280,
      PANEL_MIN_WIDTH: 320,
    }
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