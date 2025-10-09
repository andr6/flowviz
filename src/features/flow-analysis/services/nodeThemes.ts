export interface NodeTheme {
  id: string;
  name: string;
  description: string;
  colors: {
    background: string;
    border: string;
    text: string;
    accent: string;
    shadow: string;
  };
  styles: {
    borderWidth: number;
    borderRadius: number;
    fontSize: number;
    fontWeight: number;
    padding: number;
  };
  effects: {
    glow: boolean;
    pulse: boolean;
    gradient: boolean;
    shadow: boolean;
  };
  icon?: string;
  category: 'threat-actor' | 'technique' | 'asset' | 'indicator' | 'custom';
}

export const PREDEFINED_THEMES: { [key: string]: NodeTheme } = {
  // Threat Actor Themes
  'apt-group': {
    id: 'apt-group',
    name: 'APT Group',
    description: 'Advanced Persistent Threat groups',
    colors: {
      background: '#1a1a2e',
      border: '#e74c3c',
      text: '#ffffff',
      accent: '#e74c3c',
      shadow: '#e74c3c40',
    },
    styles: {
      borderWidth: 3,
      borderRadius: 8,
      fontSize: 14,
      fontWeight: 600,
      padding: 12,
    },
    effects: {
      glow: true,
      pulse: true,
      gradient: false,
      shadow: true,
    },
    icon: '🎯',
    category: 'threat-actor',
  },
  'nation-state': {
    id: 'nation-state',
    name: 'Nation State',
    description: 'Nation-state sponsored threats',
    colors: {
      background: '#0f3460',
      border: '#e67e22',
      text: '#ffffff',
      accent: '#f39c12',
      shadow: '#f39c1240',
    },
    styles: {
      borderWidth: 3,
      borderRadius: 6,
      fontSize: 14,
      fontWeight: 700,
      padding: 14,
    },
    effects: {
      glow: true,
      pulse: false,
      gradient: true,
      shadow: true,
    },
    icon: '🏛️',
    category: 'threat-actor',
  },
  'cybercriminal': {
    id: 'cybercriminal',
    name: 'Cybercriminal',
    description: 'Financially motivated criminals',
    colors: {
      background: '#2c3e50',
      border: '#27ae60',
      text: '#ffffff',
      accent: '#2ecc71',
      shadow: '#2ecc7140',
    },
    styles: {
      borderWidth: 2,
      borderRadius: 10,
      fontSize: 13,
      fontWeight: 500,
      padding: 10,
    },
    effects: {
      glow: false,
      pulse: false,
      gradient: false,
      shadow: true,
    },
    icon: '💰',
    category: 'threat-actor',
  },
  'hacktivist': {
    id: 'hacktivist',
    name: 'Hacktivist',
    description: 'Ideologically motivated hackers',
    colors: {
      background: '#8e44ad',
      border: '#9b59b6',
      text: '#ffffff',
      accent: '#e91e63',
      shadow: '#9b59b640',
    },
    styles: {
      borderWidth: 2,
      borderRadius: 12,
      fontSize: 13,
      fontWeight: 500,
      padding: 10,
    },
    effects: {
      glow: false,
      pulse: true,
      gradient: false,
      shadow: false,
    },
    icon: '✊',
    category: 'threat-actor',
  },

  // Technique Themes
  'initial-access': {
    id: 'initial-access',
    name: 'Initial Access',
    description: 'Initial access techniques',
    colors: {
      background: '#ff6b6b',
      border: '#ff5252',
      text: '#ffffff',
      accent: '#ff1744',
      shadow: '#ff525240',
    },
    styles: {
      borderWidth: 2,
      borderRadius: 8,
      fontSize: 12,
      fontWeight: 600,
      padding: 8,
    },
    effects: {
      glow: true,
      pulse: false,
      gradient: true,
      shadow: true,
    },
    icon: '🚪',
    category: 'technique',
  },
  'execution': {
    id: 'execution',
    name: 'Execution',
    description: 'Execution techniques',
    colors: {
      background: '#4ecdc4',
      border: '#26c6da',
      text: '#ffffff',
      accent: '#00bcd4',
      shadow: '#26c6da40',
    },
    styles: {
      borderWidth: 2,
      borderRadius: 6,
      fontSize: 12,
      fontWeight: 500,
      padding: 8,
    },
    effects: {
      glow: false,
      pulse: false,
      gradient: false,
      shadow: true,
    },
    icon: '⚡',
    category: 'technique',
  },
  'persistence': {
    id: 'persistence',
    name: 'Persistence',
    description: 'Persistence techniques',
    colors: {
      background: '#45b7d1',
      border: '#2196f3',
      text: '#ffffff',
      accent: '#1976d2',
      shadow: '#2196f340',
    },
    styles: {
      borderWidth: 2,
      borderRadius: 8,
      fontSize: 12,
      fontWeight: 500,
      padding: 8,
    },
    effects: {
      glow: false,
      pulse: false,
      gradient: false,
      shadow: true,
    },
    icon: '🔒',
    category: 'technique',
  },

  // Asset Themes
  'critical-asset': {
    id: 'critical-asset',
    name: 'Critical Asset',
    description: 'High-value assets',
    colors: {
      background: '#ff9800',
      border: '#f57c00',
      text: '#ffffff',
      accent: '#ef6c00',
      shadow: '#f57c0040',
    },
    styles: {
      borderWidth: 3,
      borderRadius: 4,
      fontSize: 14,
      fontWeight: 700,
      padding: 12,
    },
    effects: {
      glow: true,
      pulse: true,
      gradient: false,
      shadow: true,
    },
    icon: '🏦',
    category: 'asset',
  },
  'endpoint': {
    id: 'endpoint',
    name: 'Endpoint',
    description: 'User endpoints and workstations',
    colors: {
      background: '#607d8b',
      border: '#546e7a',
      text: '#ffffff',
      accent: '#37474f',
      shadow: '#546e7a40',
    },
    styles: {
      borderWidth: 1,
      borderRadius: 6,
      fontSize: 12,
      fontWeight: 400,
      padding: 8,
    },
    effects: {
      glow: false,
      pulse: false,
      gradient: false,
      shadow: false,
    },
    icon: '💻',
    category: 'asset',
  },

  // Indicator Themes
  'ioc-high': {
    id: 'ioc-high',
    name: 'High Confidence IOC',
    description: 'High confidence indicators',
    colors: {
      background: '#d32f2f',
      border: '#b71c1c',
      text: '#ffffff',
      accent: '#ff1744',
      shadow: '#b71c1c40',
    },
    styles: {
      borderWidth: 2,
      borderRadius: 10,
      fontSize: 11,
      fontWeight: 600,
      padding: 6,
    },
    effects: {
      glow: true,
      pulse: false,
      gradient: false,
      shadow: true,
    },
    icon: '🚨',
    category: 'indicator',
  },
  'ioc-medium': {
    id: 'ioc-medium',
    name: 'Medium Confidence IOC',
    description: 'Medium confidence indicators',
    colors: {
      background: '#f57c00',
      border: '#ef6c00',
      text: '#ffffff',
      accent: '#ff9800',
      shadow: '#ef6c0040',
    },
    styles: {
      borderWidth: 1,
      borderRadius: 8,
      fontSize: 11,
      fontWeight: 500,
      padding: 6,
    },
    effects: {
      glow: false,
      pulse: false,
      gradient: false,
      shadow: true,
    },
    icon: '⚠️',
    category: 'indicator',
  },
  'ioc-low': {
    id: 'ioc-low',
    name: 'Low Confidence IOC',
    description: 'Low confidence indicators',
    colors: {
      background: '#689f38',
      border: '#558b2f',
      text: '#ffffff',
      accent: '#8bc34a',
      shadow: '#558b2f40',
    },
    styles: {
      borderWidth: 1,
      borderRadius: 6,
      fontSize: 11,
      fontWeight: 400,
      padding: 6,
    },
    effects: {
      glow: false,
      pulse: false,
      gradient: false,
      shadow: false,
    },
    icon: 'ℹ️',
    category: 'indicator',
  },

  // Default/Custom
  'default': {
    id: 'default',
    name: 'Default',
    description: 'Default node appearance',
    colors: {
      background: '#ffffff',
      border: '#cccccc',
      text: '#333333',
      accent: '#2196f3',
      shadow: '#cccccc40',
    },
    styles: {
      borderWidth: 1,
      borderRadius: 6,
      fontSize: 12,
      fontWeight: 400,
      padding: 8,
    },
    effects: {
      glow: false,
      pulse: false,
      gradient: false,
      shadow: false,
    },
    icon: '🔘',
    category: 'custom',
  },
};

// Theme matching patterns
export const THEME_PATTERNS = {
  // Match by node data fields
  byThreatActor: {
    'apt': 'apt-group',
    'advanced persistent threat': 'apt-group',
    'nation state': 'nation-state',
    'state-sponsored': 'nation-state',
    'cybercriminal': 'cybercriminal',
    'financial': 'cybercriminal',
    'hacktivist': 'hacktivist',
    'ideology': 'hacktivist',
  },
  byTactic: {
    'initial-access': 'initial-access',
    'initial access': 'initial-access',
    'execution': 'execution',
    'persistence': 'persistence',
    'privilege-escalation': 'execution',
    'defense-evasion': 'execution',
    'credential-access': 'persistence',
    'discovery': 'execution',
    'lateral-movement': 'execution',
    'collection': 'execution',
    'command-and-control': 'execution',
    'exfiltration': 'execution',
    'impact': 'execution',
  },
  byAssetType: {
    'server': 'critical-asset',
    'database': 'critical-asset',
    'domain controller': 'critical-asset',
    'workstation': 'endpoint',
    'laptop': 'endpoint',
    'endpoint': 'endpoint',
  },
  byConfidence: {
    'high': 'ioc-high',
    'medium': 'ioc-medium',
    'low': 'ioc-low',
  },
  bySeverity: {
    'critical': 'ioc-high',
    'high': 'ioc-high',
    'medium': 'ioc-medium',
    'low': 'ioc-low',
    'info': 'ioc-low',
  },
};

class NodeThemeService {
  private customThemes: Map<string, NodeTheme> = new Map();
  private nodeThemeMapping: Map<string, string> = new Map(); // nodeId -> themeId

  constructor() {
    this.loadCustomThemes();
  }

  private loadCustomThemes(): void {
    try {
      const stored = localStorage.getItem('threatflow_custom_themes');
      if (stored) {
        const themes: NodeTheme[] = JSON.parse(stored);
        themes.forEach(theme => {
          this.customThemes.set(theme.id, theme);
        });
      }
    } catch (error) {
      console.warn('Failed to load custom themes:', error);
    }
  }

  private saveCustomThemes(): void {
    try {
      const themes = Array.from(this.customThemes.values());
      localStorage.setItem('threatflow_custom_themes', JSON.stringify(themes));
    } catch (error) {
      console.warn('Failed to save custom themes:', error);
    }
  }

  // Get all available themes
  getAllThemes(): NodeTheme[] {
    const predefined = Object.values(PREDEFINED_THEMES);
    const custom = Array.from(this.customThemes.values());
    return [...predefined, ...custom];
  }

  // Get theme by ID
  getTheme(themeId: string): NodeTheme | null {
    return PREDEFINED_THEMES[themeId] || this.customThemes.get(themeId) || null;
  }

  // Auto-detect theme for a node
  detectThemeForNode(node: any): string {
    const data = node.data || {};
    const nodeText = (data.label || data.name || '').toLowerCase();
    const nodeType = (data.type || '').toLowerCase();
    const tactic = (data.tactic || data.category || '').toLowerCase();
    const threatActor = (data.threat_actor || data.actor || '').toLowerCase();
    const assetType = (data.asset_type || data.asset || '').toLowerCase();
    const confidence = (data.confidence || '').toLowerCase();
    const severity = (data.severity || data.risk || '').toLowerCase();

    // Check threat actor patterns
    for (const [pattern, theme] of Object.entries(THEME_PATTERNS.byThreatActor)) {
      if (threatActor.includes(pattern) || nodeText.includes(pattern)) {
        return theme;
      }
    }

    // Check tactic patterns
    for (const [pattern, theme] of Object.entries(THEME_PATTERNS.byTactic)) {
      if (tactic.includes(pattern) || nodeText.includes(pattern)) {
        return theme;
      }
    }

    // Check asset type patterns
    for (const [pattern, theme] of Object.entries(THEME_PATTERNS.byAssetType)) {
      if (assetType.includes(pattern) || nodeType.includes(pattern) || nodeText.includes(pattern)) {
        return theme;
      }
    }

    // Check confidence patterns
    for (const [pattern, theme] of Object.entries(THEME_PATTERNS.byConfidence)) {
      if (confidence.includes(pattern)) {
        return theme;
      }
    }

    // Check severity patterns
    for (const [pattern, theme] of Object.entries(THEME_PATTERNS.bySeverity)) {
      if (severity.includes(pattern)) {
        return theme;
      }
    }

    return 'default';
  }

  // Apply theme to node
  applyThemeToNode(node: any, themeId: string): any {
    const theme = this.getTheme(themeId);
    if (!theme) {return node;}

    const themedNode = {
      ...node,
      style: {
        ...node.style,
        backgroundColor: theme.colors.background,
        border: `${theme.styles.borderWidth}px solid ${theme.colors.border}`,
        borderRadius: theme.styles.borderRadius,
        color: theme.colors.text,
        fontSize: theme.styles.fontSize,
        fontWeight: theme.styles.fontWeight,
        padding: theme.styles.padding,
        ...(theme.effects.shadow && {
          boxShadow: `0 2px 8px ${theme.colors.shadow}`,
        }),
        ...(theme.effects.glow && {
          filter: `drop-shadow(0 0 8px ${theme.colors.accent}40)`,
        }),
      },
      data: {
        ...node.data,
        theme: themeId,
        themeIcon: theme.icon,
      },
      className: [
        node.className || '',
        `theme-${themeId}`,
        theme.effects.pulse ? 'pulse-effect' : '',
        theme.effects.gradient ? 'gradient-effect' : '',
      ].filter(Boolean).join(' '),
    };

    this.nodeThemeMapping.set(node.id, themeId);
    return themedNode;
  }

  // Apply themes to all nodes automatically
  applyAutoThemes(nodes: any[]): any[] {
    return nodes.map(node => {
      const detectedTheme = this.detectThemeForNode(node);
      return this.applyThemeToNode(node, detectedTheme);
    });
  }

  // Set manual theme for a node
  setNodeTheme(nodeId: string, themeId: string): void {
    this.nodeThemeMapping.set(nodeId, themeId);
  }

  // Get theme for a specific node
  getNodeTheme(nodeId: string): string {
    return this.nodeThemeMapping.get(nodeId) || 'default';
  }

  // Create custom theme
  createCustomTheme(theme: Omit<NodeTheme, 'id'>): NodeTheme {
    const id = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const customTheme: NodeTheme = {
      ...theme,
      id,
      category: 'custom',
    };

    this.customThemes.set(id, customTheme);
    this.saveCustomThemes();
    return customTheme;
  }

  // Update custom theme
  updateCustomTheme(themeId: string, updates: Partial<NodeTheme>): boolean {
    if (!this.customThemes.has(themeId)) {return false;}

    const existingTheme = this.customThemes.get(themeId)!;
    const updatedTheme = { ...existingTheme, ...updates };
    this.customThemes.set(themeId, updatedTheme);
    this.saveCustomThemes();
    return true;
  }

  // Delete custom theme
  deleteCustomTheme(themeId: string): boolean {
    if (!this.customThemes.has(themeId)) {return false;}

    this.customThemes.delete(themeId);
    
    // Remove theme mappings
    for (const [nodeId, mappedThemeId] of this.nodeThemeMapping) {
      if (mappedThemeId === themeId) {
        this.nodeThemeMapping.delete(nodeId);
      }
    }

    this.saveCustomThemes();
    return true;
  }

  // Export themes
  exportThemes(): { custom: NodeTheme[]; mappings: [string, string][] } {
    return {
      custom: Array.from(this.customThemes.values()),
      mappings: Array.from(this.nodeThemeMapping.entries()),
    };
  }

  // Import themes
  importThemes(data: { custom?: NodeTheme[]; mappings?: [string, string][] }): boolean {
    try {
      if (data.custom) {
        data.custom.forEach(theme => {
          this.customThemes.set(theme.id, theme);
        });
      }

      if (data.mappings) {
        data.mappings.forEach(([nodeId, themeId]) => {
          this.nodeThemeMapping.set(nodeId, themeId);
        });
      }

      this.saveCustomThemes();
      return true;
    } catch (error) {
      console.error('Failed to import themes:', error);
      return false;
    }
  }

  // Get themes by category
  getThemesByCategory(category: NodeTheme['category']): NodeTheme[] {
    return this.getAllThemes().filter(theme => theme.category === category);
  }

  // Generate CSS for themes (for dynamic styling)
  generateThemeCSS(): string {
    const themes = this.getAllThemes();
    let css = '';

    themes.forEach(theme => {
      css += `
        .theme-${theme.id} {
          background-color: ${theme.colors.background} !important;
          border: ${theme.styles.borderWidth}px solid ${theme.colors.border} !important;
          border-radius: ${theme.styles.borderRadius}px !important;
          color: ${theme.colors.text} !important;
          font-size: ${theme.styles.fontSize}px !important;
          font-weight: ${theme.styles.fontWeight} !important;
          padding: ${theme.styles.padding}px !important;
          ${theme.effects.shadow ? `box-shadow: 0 2px 8px ${theme.colors.shadow};` : ''}
          ${theme.effects.glow ? `filter: drop-shadow(0 0 8px ${theme.colors.accent}40);` : ''}
        }
        
        ${theme.effects.pulse ? `
        .theme-${theme.id}.pulse-effect {
          animation: pulse-${theme.id} 2s ease-in-out infinite;
        }
        
        @keyframes pulse-${theme.id} {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.8; }
        }
        ` : ''}
        
        ${theme.effects.gradient ? `
        .theme-${theme.id}.gradient-effect {
          background: linear-gradient(135deg, ${theme.colors.background}, ${theme.colors.accent}40) !important;
        }
        ` : ''}
      `;
    });

    return css;
  }

  // Clear all mappings
  clearAllMappings(): void {
    this.nodeThemeMapping.clear();
  }

  // Get usage statistics
  getUsageStatistics() {
    const themeCounts = new Map<string, number>();
    
    for (const themeId of this.nodeThemeMapping.values()) {
      themeCounts.set(themeId, (themeCounts.get(themeId) || 0) + 1);
    }

    return {
      totalMappings: this.nodeThemeMapping.size,
      customThemes: this.customThemes.size,
      themeUsage: Object.fromEntries(themeCounts),
    };
  }
}

// Export singleton instance
export const nodeThemeService = new NodeThemeService();