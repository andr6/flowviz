import { Edge, Node } from 'reactflow';

export interface AnimatedEdge extends Edge {
  animated?: boolean;
  animationDuration?: number;
  animationDelay?: number;
  animationType?: 'pulse' | 'flow' | 'glow' | 'dash' | 'particles';
  animationDirection?: 'forward' | 'reverse' | 'bidirectional';
  particleCount?: number;
  particleSpeed?: number;
  pulseIntensity?: number;
  glowColor?: string;
  dashLength?: number;
  strokeWidth?: number;
  opacity?: number;
}

export interface AnimationConfig {
  enabled: boolean;
  globalSpeed: number;
  showParticles: boolean;
  showPulse: boolean;
  showGlow: boolean;
  showFlow: boolean;
  particleDensity: number;
  syncWithStoryMode: boolean;
  pauseOnHover: boolean;
}

export interface EdgeAnimationStyle {
  stroke: string;
  strokeWidth: number;
  strokeDasharray?: string;
  strokeDashoffset?: string;
  opacity: number;
  filter?: string;
  animation?: string;
  transition?: string;
}

const DEFAULT_ANIMATION_CONFIG: AnimationConfig = {
  enabled: true,
  globalSpeed: 1.0,
  showParticles: true,
  showPulse: true,
  showGlow: false,
  showFlow: true,
  particleDensity: 0.5,
  syncWithStoryMode: true,
  pauseOnHover: false,
};

class EdgeAnimationService {
  private config: AnimationConfig = { ...DEFAULT_ANIMATION_CONFIG };
  private animationId: number | null = null;
  private animatedEdges: Set<string> = new Set();
  private particleAnimations: Map<string, any> = new Map();

  // CSS class names for animations
  private readonly ANIMATION_CLASSES = {
    pulse: 'edge-pulse-animation',
    flow: 'edge-flow-animation', 
    glow: 'edge-glow-animation',
    dash: 'edge-dash-animation',
    particles: 'edge-particles-animation',
  };

  setConfig(config: Partial<AnimationConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (!this.config.enabled) {
      this.stopAllAnimations();
    }
  }

  getConfig(): AnimationConfig {
    return { ...this.config };
  }

  // Apply animation styles to edges
  applyAnimationStyles(edges: AnimatedEdge[]): AnimatedEdge[] {
    if (!this.config.enabled) {
      return edges.map(edge => ({
        ...edge,
        animated: false,
        style: this.getStaticEdgeStyle(edge)
      }));
    }

    return edges.map(edge => this.applyAnimationToEdge(edge));
  }

  private applyAnimationToEdge(edge: AnimatedEdge): AnimatedEdge {
    const animationType = edge.animationType || 'flow';
    const animationClass = this.ANIMATION_CLASSES[animationType];
    
    // Calculate animation duration based on global speed
    const duration = (edge.animationDuration || 2000) / this.config.globalSpeed;
    const delay = edge.animationDelay || 0;

    const animatedEdge: AnimatedEdge = {
      ...edge,
      animated: true,
      className: [edge.className || '', animationClass].filter(Boolean).join(' '),
      style: {
        ...edge.style,
        ...this.getAnimationStyle(edge, duration, delay),
      },
      data: {
        ...edge.data,
        animationType,
        animationDuration: duration,
        animationDelay: delay,
      }
    };

    this.animatedEdges.add(edge.id);
    return animatedEdge;
  }

  private getAnimationStyle(edge: AnimatedEdge, duration: number, delay: number): EdgeAnimationStyle {
    const animationType = edge.animationType || 'flow';
    const baseStyle: EdgeAnimationStyle = {
      stroke: edge.style?.stroke || '#00e1ff',
      strokeWidth: edge.strokeWidth || 2,
      opacity: edge.opacity || 0.8,
    };

    switch (animationType) {
      case 'pulse':
        return {
          ...baseStyle,
          animation: `edgePulse ${duration}ms ease-in-out infinite`,
          animationDelay: `${delay}ms`,
        };

      case 'flow':
        return {
          ...baseStyle,
          strokeDasharray: '8 4',
          animation: `edgeFlow ${duration}ms linear infinite`,
          animationDelay: `${delay}ms`,
        };

      case 'glow':
        return {
          ...baseStyle,
          filter: `drop-shadow(0 0 ${edge.pulseIntensity || 6}px ${edge.glowColor || baseStyle.stroke})`,
          animation: `edgeGlow ${duration}ms ease-in-out infinite`,
          animationDelay: `${delay}ms`,
        };

      case 'dash':
        const dashLength = edge.dashLength || 12;
        return {
          ...baseStyle,
          strokeDasharray: `${dashLength} ${dashLength / 2}`,
          animation: `edgeDash ${duration}ms linear infinite`,
          animationDelay: `${delay}ms`,
        };

      case 'particles':
        // Particles will be handled separately with SVG elements
        return {
          ...baseStyle,
          opacity: 0.6,
        };

      default:
        return baseStyle;
    }
  }

  private getStaticEdgeStyle(edge: AnimatedEdge): EdgeAnimationStyle {
    return {
      stroke: edge.style?.stroke || '#666666',
      strokeWidth: edge.strokeWidth || 1,
      opacity: edge.opacity || 0.7,
    };
  }

  // Generate CSS keyframes for animations
  generateAnimationCSS(): string {
    return `
      @keyframes edgePulse {
        0%, 100% { 
          opacity: 0.6;
          stroke-width: 2;
        }
        50% { 
          opacity: 1;
          stroke-width: 3;
        }
      }

      @keyframes edgeFlow {
        0% { stroke-dashoffset: 0; }
        100% { stroke-dashoffset: -12; }
      }

      @keyframes edgeGlow {
        0%, 100% { 
          filter: drop-shadow(0 0 4px currentColor);
        }
        50% { 
          filter: drop-shadow(0 0 12px currentColor);
        }
      }

      @keyframes edgeDash {
        0% { stroke-dashoffset: 0; }
        100% { stroke-dashoffset: 24; }
      }

      .edge-pulse-animation {
        animation-timing-function: ease-in-out;
      }

      .edge-flow-animation {
        animation-timing-function: linear;
      }

      .edge-glow-animation {
        animation-timing-function: ease-in-out;
      }

      .edge-dash-animation {
        animation-timing-function: linear;
      }

      .edge-particles-animation {
        position: relative;
      }

      /* Pause animations on hover if enabled */
      ${this.config.pauseOnHover ? `
      .react-flow__edge:hover .edge-pulse-animation,
      .react-flow__edge:hover .edge-flow-animation,
      .react-flow__edge:hover .edge-glow-animation,
      .react-flow__edge:hover .edge-dash-animation {
        animation-play-state: paused;
      }
      ` : ''}
    `;
  }

  // Auto-detect appropriate animations based on edge data
  detectAnimationForEdge(edge: Edge, nodes: Node[]): AnimatedEdge {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);

    // Default animation
    let animationType: AnimatedEdge['animationType'] = 'flow';
    let animationDuration = 2000;
    let glowColor = '#00e1ff';
    let strokeWidth = 2;

    // Determine animation based on edge type or data
    const edgeType = edge.type || edge.data?.type || '';
    const edgeLabel = edge.label || edge.data?.label || '';
    const confidence = edge.data?.confidence || 'medium';
    const severity = edge.data?.severity || 'medium';

    // Animation based on edge characteristics
    if (edgeType.includes('attack') || edgeLabel.includes('attack')) {
      animationType = 'pulse';
      glowColor = '#e74c3c';
      strokeWidth = 3;
      animationDuration = 1500;
    } else if (edgeType.includes('communication') || edgeLabel.includes('c2')) {
      animationType = 'dash';
      glowColor = '#9b59b6';
      animationDuration = 3000;
    } else if (edgeType.includes('data') || edgeLabel.includes('exfil')) {
      animationType = 'particles';
      glowColor = '#e67e22';
      animationDuration = 2500;
    } else if (confidence === 'high' || severity === 'critical') {
      animationType = 'glow';
      glowColor = '#f39c12';
      strokeWidth = 3;
    }

    // Animation based on connected nodes
    if (sourceNode && targetNode) {
      const sourceTactic = sourceNode.data?.tactic || '';
      const targetTactic = targetNode.data?.tactic || '';

      if (sourceTactic === 'initial-access' || targetTactic === 'initial-access') {
        animationType = 'pulse';
        glowColor = '#e74c3c';
      } else if (sourceTactic === 'command-and-control' || targetTactic === 'command-and-control') {
        animationType = 'dash';
        glowColor = '#9b59b6';
      } else if (sourceTactic === 'exfiltration' || targetTactic === 'exfiltration') {
        animationType = 'particles';
        glowColor = '#e67e22';
      }
    }

    return {
      ...edge,
      animationType,
      animationDuration,
      glowColor,
      strokeWidth,
      animated: true,
    };
  }

  // Apply auto-animations to all edges
  applyAutoAnimations(edges: Edge[], nodes: Node[]): AnimatedEdge[] {
    return edges.map(edge => this.detectAnimationForEdge(edge, nodes));
  }

  // Story mode integration - animate edges in sequence
  playStorySequence(edges: AnimatedEdge[], sequence: string[], delay: number = 500): Promise<void> {
    return new Promise((resolve) => {
      let currentIndex = 0;
      const totalDelay = delay * sequence.length;

      const playNext = () => {
        if (currentIndex >= sequence.length) {
          resolve();
          return;
        }

        const edgeId = sequence[currentIndex];
        const edge = edges.find(e => e.id === edgeId);
        
        if (edge) {
          // Temporarily enhance animation for story mode
          edge.animationType = 'glow';
          edge.pulseIntensity = 10;
          edge.animationDuration = 1000;
          
          // Reset after animation
          setTimeout(() => {
            if (edge) {
              edge.pulseIntensity = 6;
              edge.animationDuration = 2000;
            }
          }, 2000);
        }

        currentIndex++;
        setTimeout(playNext, delay);
      };

      playNext();
    });
  }

  // Particle system for particle animations
  createParticleSystem(edgeId: string, path: string, particleCount: number = 3): void {
    if (!this.config.showParticles) {return;}

    const particles = Array.from({ length: particleCount }, (_, i) => ({
      id: `${edgeId}_particle_${i}`,
      position: 0,
      speed: 0.5 + Math.random() * 0.5,
      delay: i * (1000 / particleCount),
    }));

    this.particleAnimations.set(edgeId, particles);
  }

  // Clean up animations
  stopAllAnimations(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    this.animatedEdges.clear();
    this.particleAnimations.clear();
  }

  // Get active animations count
  getActiveAnimationCount(): number {
    return this.animatedEdges.size;
  }

  // Performance optimization - reduce animations based on edge count
  optimizeAnimations(edgeCount: number): void {
    if (edgeCount > 100) {
      // Reduce animation complexity for large graphs
      this.config.showParticles = false;
      this.config.showGlow = false;
      this.config.globalSpeed = 1.5; // Faster animations
    } else if (edgeCount > 50) {
      this.config.particleDensity = 0.3;
      this.config.showGlow = false;
    } else {
      // Full animations for smaller graphs
      this.config.showParticles = true;
      this.config.showGlow = true;
      this.config.particleDensity = 0.5;
    }
  }

  // Preset animation configurations
  applyPreset(preset: 'subtle' | 'normal' | 'dramatic' | 'performance'): void {
    const presets = {
      subtle: {
        enabled: true,
        globalSpeed: 1.5,
        showParticles: false,
        showPulse: true,
        showGlow: false,
        showFlow: true,
        particleDensity: 0,
        pauseOnHover: true,
      },
      normal: {
        ...DEFAULT_ANIMATION_CONFIG,
      },
      dramatic: {
        enabled: true,
        globalSpeed: 0.8,
        showParticles: true,
        showPulse: true,
        showGlow: true,
        showFlow: true,
        particleDensity: 0.8,
        pauseOnHover: false,
      },
      performance: {
        enabled: true,
        globalSpeed: 2.0,
        showParticles: false,
        showPulse: false,
        showGlow: false,
        showFlow: true,
        particleDensity: 0,
        pauseOnHover: false,
      },
    };

    this.setConfig(presets[preset]);
  }

  // Export animation state
  exportAnimationState(): any {
    return {
      config: this.config,
      animatedEdges: Array.from(this.animatedEdges),
    };
  }

  // Import animation state
  importAnimationState(state: any): void {
    if (state.config) {
      this.setConfig(state.config);
    }
    if (state.animatedEdges) {
      this.animatedEdges = new Set(state.animatedEdges);
    }
  }
}

// Export singleton instance
export const edgeAnimationService = new EdgeAnimationService();