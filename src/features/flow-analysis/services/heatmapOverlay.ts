import { Node } from 'reactflow';

export interface HeatmapData {
  techniqueId: string;
  frequency: number;
  severity: number;
  confidence: number;
  lastSeen: number;
  firstSeen: number;
  sources: string[]; // Analysis IDs where this technique appeared
  relatedThreatActors: string[];
  impactScore: number;
}

export interface HeatmapConfig {
  enabled: boolean;
  colorScheme: 'frequency' | 'severity' | 'confidence' | 'impact' | 'recency';
  intensity: number; // 0.1 to 1.0
  showLabels: boolean;
  showLegend: boolean;
  minOpacity: number;
  maxOpacity: number;
  animateTransitions: boolean;
  autoUpdate: boolean;
  timeWindow: number; // Days to consider for recency
}

export interface HeatmapColorScale {
  min: string;
  low: string;
  medium: string;
  high: string;
  max: string;
}

const DEFAULT_CONFIG: HeatmapConfig = {
  enabled: true,
  colorScheme: 'frequency',
  intensity: 0.7,
  showLabels: true,
  showLegend: true,
  minOpacity: 0.1,
  maxOpacity: 0.9,
  animateTransitions: true,
  autoUpdate: true,
  timeWindow: 30, // 30 days
};

const COLOR_SCHEMES: { [key: string]: HeatmapColorScale } = {
  frequency: {
    min: '#f7fafc',
    low: '#90cdf4',
    medium: '#4299e1',
    high: '#2b6cb0',
    max: '#1a365d',
  },
  severity: {
    min: '#f7fafc',
    low: '#fbb6ce',
    medium: '#f687b3',
    high: '#e53e3e',
    max: '#742a2a',
  },
  confidence: {
    min: '#f7fafc',
    low: '#c6f6d5',
    medium: '#9ae6b4',
    high: '#68d391',
    max: '#276749',
  },
  impact: {
    min: '#f7fafc',
    low: '#fbd38d',
    medium: '#f6ad55',
    high: '#dd6b20',
    max: '#7b341e',
  },
  recency: {
    min: '#f7fafc',
    low: '#d6bcfa',
    medium: '#b794f6',
    high: '#9f7aea',
    max: '#553c9a',
  },
};

class HeatmapOverlayService {
  private config: HeatmapConfig = { ...DEFAULT_CONFIG };
  private heatmapData: Map<string, HeatmapData> = new Map();
  private analysisHistory: Map<string, Node[]> = new Map(); // analysisId -> nodes
  private updateCallbacks: Set<() => void> = new Set();

  setConfig(config: Partial<HeatmapConfig>): void {
    this.config = { ...this.config, ...config };
    this.notifyUpdate();
  }

  getConfig(): HeatmapConfig {
    return { ...this.config };
  }

  // Register analysis data for heatmap calculation
  registerAnalysis(analysisId: string, nodes: Node[]): void {
    this.analysisHistory.set(analysisId, nodes);
    this.updateHeatmapData();
    
    if (this.config.autoUpdate) {
      this.notifyUpdate();
    }
  }

  // Remove analysis from history
  removeAnalysis(analysisId: string): void {
    this.analysisHistory.delete(analysisId);
    this.updateHeatmapData();
    this.notifyUpdate();
  }

  // Update heatmap data based on all registered analyses
  private updateHeatmapData(): void {
    const techniqueStats = new Map<string, {
      count: number;
      severities: number[];
      confidences: number[];
      timestamps: number[];
      sources: Set<string>;
      threatActors: Set<string>;
      impactScores: number[];
    }>();

    // Process all analyses
    this.analysisHistory.forEach((nodes, analysisId) => {
      nodes.forEach(node => {
        const techniqueId = this.extractTechniqueId(node);
        if (!techniqueId) {return;}

        if (!techniqueStats.has(techniqueId)) {
          techniqueStats.set(techniqueId, {
            count: 0,
            severities: [],
            confidences: [],
            timestamps: [],
            sources: new Set(),
            threatActors: new Set(),
            impactScores: [],
          });
        }

        const stats = techniqueStats.get(techniqueId)!;
        stats.count++;
        stats.sources.add(analysisId);

        // Extract metadata
        const severity = this.parseSeverity(node.data?.severity || node.data?.risk);
        const confidence = this.parseConfidence(node.data?.confidence);
        const timestamp = node.data?.timestamp || Date.now();
        const threatActor = node.data?.threat_actor || node.data?.actor;
        const impactScore = this.parseImpactScore(node.data?.impact || node.data?.damage);

        if (severity > 0) {stats.severities.push(severity);}
        if (confidence > 0) {stats.confidences.push(confidence);}
        if (timestamp > 0) {stats.timestamps.push(timestamp);}
        if (threatActor) {stats.threatActors.add(threatActor);}
        if (impactScore > 0) {stats.impactScores.push(impactScore);}
      });
    });

    // Convert stats to heatmap data
    this.heatmapData.clear();
    techniqueStats.forEach((stats, techniqueId) => {
      const heatmapEntry: HeatmapData = {
        techniqueId,
        frequency: stats.count,
        severity: stats.severities.length > 0 
          ? stats.severities.reduce((a, b) => a + b, 0) / stats.severities.length 
          : 0,
        confidence: stats.confidences.length > 0 
          ? stats.confidences.reduce((a, b) => a + b, 0) / stats.confidences.length 
          : 0,
        lastSeen: stats.timestamps.length > 0 ? Math.max(...stats.timestamps) : 0,
        firstSeen: stats.timestamps.length > 0 ? Math.min(...stats.timestamps) : 0,
        sources: Array.from(stats.sources),
        relatedThreatActors: Array.from(stats.threatActors),
        impactScore: stats.impactScores.length > 0 
          ? stats.impactScores.reduce((a, b) => a + b, 0) / stats.impactScores.length 
          : 0,
      };

      this.heatmapData.set(techniqueId, heatmapEntry);
    });
  }

  private extractTechniqueId(node: Node): string | null {
    return node.data?.technique_id || 
           node.data?.technique || 
           node.data?.id?.match(/T\d{4}(\.\d{3})?/)?.[0] ||
           null;
  }

  private parseSeverity(severity: any): number {
    if (typeof severity === 'number') {return Math.max(0, Math.min(100, severity));}
    
    const severityMap: { [key: string]: number } = {
      'low': 25,
      'medium': 50,
      'high': 75,
      'critical': 100,
      'info': 10,
    };

    return severityMap[String(severity).toLowerCase()] || 0;
  }

  private parseConfidence(confidence: any): number {
    if (typeof confidence === 'number') {return Math.max(0, Math.min(100, confidence));}
    
    const confidenceMap: { [key: string]: number } = {
      'low': 30,
      'medium': 60,
      'high': 90,
    };

    return confidenceMap[String(confidence).toLowerCase()] || 0;
  }

  private parseImpactScore(impact: any): number {
    if (typeof impact === 'number') {return Math.max(0, Math.min(100, impact));}
    
    const impactMap: { [key: string]: number } = {
      'low': 25,
      'medium': 50,
      'high': 75,
      'critical': 100,
    };

    return impactMap[String(impact).toLowerCase()] || 0;
  }

  // Get heatmap value for a technique
  getHeatmapValue(techniqueId: string): number {
    const data = this.heatmapData.get(techniqueId);
    if (!data) {return 0;}

    switch (this.config.colorScheme) {
      case 'frequency':
        return this.normalizeValue(data.frequency, this.getMaxFrequency());
      case 'severity':
        return data.severity / 100;
      case 'confidence':
        return data.confidence / 100;
      case 'impact':
        return data.impactScore / 100;
      case 'recency':
        return this.calculateRecencyScore(data.lastSeen);
      default:
        return 0;
    }
  }

  // Get color for a heatmap value
  getHeatmapColor(value: number): string {
    const colorScheme = COLOR_SCHEMES[this.config.colorScheme];
    const adjustedValue = Math.max(0, Math.min(1, value * this.config.intensity));

    if (adjustedValue <= 0.2) {return colorScheme.min;}
    if (adjustedValue <= 0.4) {return colorScheme.low;}
    if (adjustedValue <= 0.6) {return colorScheme.medium;}
    if (adjustedValue <= 0.8) {return colorScheme.high;}
    return colorScheme.max;
  }

  // Apply heatmap styling to nodes
  applyHeatmapToNodes(nodes: Node[]): Node[] {
    if (!this.config.enabled) {return nodes;}

    return nodes.map(node => {
      const techniqueId = this.extractTechniqueId(node);
      if (!techniqueId) {return node;}

      const heatmapValue = this.getHeatmapValue(techniqueId);
      const heatmapColor = this.getHeatmapColor(heatmapValue);
      const opacity = this.config.minOpacity + 
        (this.config.maxOpacity - this.config.minOpacity) * heatmapValue;

      const heatmapData = this.heatmapData.get(techniqueId);

      return {
        ...node,
        style: {
          ...node.style,
          backgroundColor: heatmapColor,
          opacity,
          transition: this.config.animateTransitions ? 'all 0.3s ease-in-out' : undefined,
          border: `2px solid ${this.adjustColorBrightness(heatmapColor, -20)}`,
        },
        data: {
          ...node.data,
          heatmapValue,
          heatmapData,
          heatmapColor,
        },
        className: [
          node.className || '',
          'heatmap-node',
          `heatmap-${this.config.colorScheme}`,
          heatmapValue > 0.7 ? 'heatmap-hot' : heatmapValue > 0.4 ? 'heatmap-warm' : 'heatmap-cool',
        ].filter(Boolean).join(' '),
      };
    });
  }

  private adjustColorBrightness(color: string, amount: number): string {
    const usePound = color[0] === '#';
    color = usePound ? color.slice(1) : color;
    
    const num = parseInt(color, 16);
    let r = (num >> 16) + amount;
    let g = (num >> 8 & 0x00FF) + amount;
    let b = (num & 0x0000FF) + amount;

    r = Math.max(Math.min(255, r), 0);
    g = Math.max(Math.min(255, g), 0);
    b = Math.max(Math.min(255, b), 0);

    return (usePound ? '#' : '') + (r << 16 | g << 8 | b).toString(16).padStart(6, '0');
  }

  private normalizeValue(value: number, max: number): number {
    return max > 0 ? value / max : 0;
  }

  private getMaxFrequency(): number {
    return Math.max(...Array.from(this.heatmapData.values()).map(d => d.frequency), 1);
  }

  private calculateRecencyScore(timestamp: number): number {
    if (!timestamp) {return 0;}
    
    const now = Date.now();
    const daysSince = (now - timestamp) / (24 * 60 * 60 * 1000);
    const maxDays = this.config.timeWindow;
    
    return Math.max(0, 1 - (daysSince / maxDays));
  }

  // Get heatmap data for a specific technique
  getTechniqueData(techniqueId: string): HeatmapData | null {
    return this.heatmapData.get(techniqueId) || null;
  }

  // Get all heatmap data
  getAllHeatmapData(): HeatmapData[] {
    return Array.from(this.heatmapData.values());
  }

  // Get top techniques by selected metric
  getTopTechniques(limit: number = 10): HeatmapData[] {
    const sortKey = this.config.colorScheme === 'frequency' ? 'frequency' :
                   this.config.colorScheme === 'severity' ? 'severity' :
                   this.config.colorScheme === 'confidence' ? 'confidence' :
                   this.config.colorScheme === 'impact' ? 'impactScore' : 'lastSeen';

    return Array.from(this.heatmapData.values())
      .sort((a, b) => b[sortKey as keyof HeatmapData] as number - (a[sortKey as keyof HeatmapData] as number))
      .slice(0, limit);
  }

  // Get color legend
  getColorLegend(): { value: number; color: string; label: string }[] {
    const colorScheme = COLOR_SCHEMES[this.config.colorScheme];
    const schemeLabels = {
      frequency: ['Never', 'Rare', 'Common', 'Frequent', 'Very Frequent'],
      severity: ['Info', 'Low', 'Medium', 'High', 'Critical'],
      confidence: ['No Data', 'Low', 'Medium', 'High', 'Very High'],
      impact: ['Minimal', 'Low', 'Medium', 'High', 'Severe'],
      recency: ['Old', 'Weeks', 'Days', 'Hours', 'Recent'],
    };

    const labels = schemeLabels[this.config.colorScheme] || schemeLabels.frequency;
    const colors = [colorScheme.min, colorScheme.low, colorScheme.medium, colorScheme.high, colorScheme.max];

    return colors.map((color, index) => ({
      value: index / 4,
      color,
      label: labels[index],
    }));
  }

  // Generate heatmap statistics
  getStatistics() {
    const totalTechniques = this.heatmapData.size;
    const totalAnalyses = this.analysisHistory.size;
    const totalNodes = Array.from(this.analysisHistory.values())
      .reduce((sum, nodes) => sum + nodes.length, 0);

    const frequencyStats = Array.from(this.heatmapData.values())
      .map(d => d.frequency);
    
    const avgFrequency = frequencyStats.length > 0 
      ? frequencyStats.reduce((a, b) => a + b, 0) / frequencyStats.length 
      : 0;

    const maxFrequency = Math.max(...frequencyStats, 0);

    return {
      totalTechniques,
      totalAnalyses,
      totalNodes,
      avgFrequency: Math.round(avgFrequency * 100) / 100,
      maxFrequency,
      colorScheme: this.config.colorScheme,
      timeWindow: this.config.timeWindow,
    };
  }

  // Export heatmap data
  exportData(): { config: HeatmapConfig; data: HeatmapData[] } {
    return {
      config: this.config,
      data: Array.from(this.heatmapData.values()),
    };
  }

  // Import heatmap data
  importData(data: { config?: HeatmapConfig; data: HeatmapData[] }): void {
    if (data.config) {
      this.config = { ...this.config, ...data.config };
    }
    
    this.heatmapData.clear();
    data.data.forEach(entry => {
      this.heatmapData.set(entry.techniqueId, entry);
    });

    this.notifyUpdate();
  }

  // Register update callback
  onUpdate(callback: () => void): () => void {
    this.updateCallbacks.add(callback);
    return () => this.updateCallbacks.delete(callback);
  }

  private notifyUpdate(): void {
    this.updateCallbacks.forEach(callback => callback());
  }

  // Clear all data
  clearData(): void {
    this.heatmapData.clear();
    this.analysisHistory.clear();
    this.notifyUpdate();
  }

  // Generate CSS for heatmap styles
  generateHeatmapCSS(): string {
    return `
      .heatmap-node {
        transition: ${this.config.animateTransitions ? 'all 0.3s ease-in-out' : 'none'};
      }

      .heatmap-hot {
        box-shadow: 0 0 10px rgba(255, 0, 0, 0.5);
      }

      .heatmap-warm {
        box-shadow: 0 0 6px rgba(255, 165, 0, 0.4);
      }

      .heatmap-cool {
        box-shadow: none;
      }

      .heatmap-node:hover {
        transform: scale(1.05);
        z-index: 1000;
      }
    `;
  }
}

// Export singleton instance
export const heatmapOverlayService = new HeatmapOverlayService();