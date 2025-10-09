import { Node, Edge } from 'reactflow';

// Animation system for real-time attack progression visualization
export interface AnimationConfig {
  type: 'progressive' | 'pulse' | 'flow' | 'highlight' | 'custom';
  duration: number;
  delay?: number;
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'bounce';
  repeat?: boolean | number;
  direction?: 'forward' | 'reverse' | 'alternate';
}

export interface AnimationSequence {
  id: string;
  name: string;
  steps: AnimationStep[];
  totalDuration: number;
  loop: boolean;
}

export interface AnimationStep {
  id: string;
  nodeIds: string[];
  edgeIds: string[];
  animation: AnimationConfig;
  timestamp: number;
  description?: string;
  metadata?: any;
}

// Attack progression animation based on MITRE tactics
export const createAttackProgressionAnimation = (
  nodes: Node[],
  edges: Edge[],
  speed: number = 1000 // milliseconds per step
): AnimationSequence => {
  const tacticOrder = [
    'TA0043', // Reconnaissance
    'TA0042', // Resource Development  
    'TA0001', // Initial Access
    'TA0002', // Execution
    'TA0003', // Persistence
    'TA0004', // Privilege Escalation
    'TA0005', // Defense Evasion
    'TA0006', // Credential Access
    'TA0007', // Discovery
    'TA0008', // Lateral Movement
    'TA0009', // Collection
    'TA0011', // Command and Control
    'TA0010', // Exfiltration
    'TA0040', // Impact
  ];

  const steps: AnimationStep[] = [];
  let currentTime = 0;

  // Group nodes by tactic
  const tacticGroups = new Map<string, Node[]>();
  nodes.forEach(node => {
    const tacticId = node.data?.tactic_id || 'unknown';
    if (!tacticGroups.has(tacticId)) {
      tacticGroups.set(tacticId, []);
    }
    tacticGroups.get(tacticId)!.push(node);
  });

  // Create animation steps for each tactic phase
  tacticOrder.forEach((tacticId, index) => {
    const tacticNodes = tacticGroups.get(tacticId) || [];
    if (tacticNodes.length === 0) return;

    // Find related edges
    const relatedEdges = edges.filter(edge => 
      tacticNodes.some(node => node.id === edge.source || node.id === edge.target)
    );

    steps.push({
      id: `tactic-${tacticId}`,
      nodeIds: tacticNodes.map(n => n.id),
      edgeIds: relatedEdges.map(e => e.id),
      animation: {
        type: 'progressive',
        duration: speed,
        easing: 'ease-in-out'
      },
      timestamp: currentTime,
      description: `${getTacticName(tacticId)} Phase`,
      metadata: { tacticId, phase: index + 1 }
    });

    currentTime += speed;
  });

  return {
    id: 'attack-progression',
    name: 'Attack Progression Timeline',
    steps,
    totalDuration: currentTime,
    loop: false
  };
};

// Pulse animation for highlighting critical nodes
export const createPulseAnimation = (
  nodeIds: string[],
  intensity: 'low' | 'medium' | 'high' = 'medium'
): AnimationConfig => {
  const intensityMap = {
    low: { duration: 2000, scale: 1.1 },
    medium: { duration: 1500, scale: 1.2 },
    high: { duration: 1000, scale: 1.3 }
  };

  const config = intensityMap[intensity];

  return {
    type: 'pulse',
    duration: config.duration,
    easing: 'ease-in-out',
    repeat: true,
    direction: 'alternate'
  };
};

// Flow animation for showing data movement along edges
export const createFlowAnimation = (
  edges: Edge[],
  speed: number = 2000
): AnimationSequence => {
  const steps: AnimationStep[] = [];
  
  edges.forEach((edge, index) => {
    steps.push({
      id: `flow-${edge.id}`,
      nodeIds: [edge.source, edge.target],
      edgeIds: [edge.id],
      animation: {
        type: 'flow',
        duration: speed,
        easing: 'linear'
      },
      timestamp: index * (speed / 4), // Stagger the flows
      description: `Data flow: ${edge.source} → ${edge.target}`
    });
  });

  return {
    id: 'data-flow',
    name: 'Data Flow Animation',
    steps,
    totalDuration: Math.max(...steps.map(s => s.timestamp + s.animation.duration)),
    loop: true
  };
};

// Timeline-based animation for temporal analysis
export const createTimelineAnimation = (
  nodes: Node[],
  edges: Edge[]
): AnimationSequence => {
  // Sort nodes by timestamp if available
  const sortedNodes = nodes
    .filter(node => node.data?.timestamp)
    .sort((a, b) => 
      new Date(a.data.timestamp).getTime() - new Date(b.data.timestamp).getTime()
    );

  if (sortedNodes.length === 0) {
    // Fallback to tactic-based ordering
    return createAttackProgressionAnimation(nodes, edges);
  }

  const steps: AnimationStep[] = [];
  const baseTime = new Date(sortedNodes[0].data.timestamp).getTime();

  sortedNodes.forEach((node, index) => {
    const nodeTime = new Date(node.data.timestamp).getTime();
    const relativeTime = (nodeTime - baseTime) / 1000; // Convert to seconds

    // Find related edges
    const relatedEdges = edges.filter(edge => 
      edge.source === node.id || edge.target === node.id
    );

    steps.push({
      id: `timeline-${node.id}`,
      nodeIds: [node.id],
      edgeIds: relatedEdges.map(e => e.id),
      animation: {
        type: 'highlight',
        duration: 1000,
        easing: 'ease-out'
      },
      timestamp: relativeTime * 100, // Scale for visualization
      description: `Event at ${new Date(node.data.timestamp).toLocaleTimeString()}`,
      metadata: { originalTimestamp: node.data.timestamp }
    });
  });

  return {
    id: 'timeline',
    name: 'Timeline Playback',
    steps,
    totalDuration: Math.max(...steps.map(s => s.timestamp + s.animation.duration)),
    loop: false
  };
};

// CSS animation keyframes generator
export const generateAnimationKeyframes = (
  animationType: string,
  config: AnimationConfig
): string => {
  switch (animationType) {
    case 'pulse':
      return `
        @keyframes pulse-${Date.now()} {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }
      `;

    case 'highlight':
      return `
        @keyframes highlight-${Date.now()} {
          0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
          50% { box-shadow: 0 0 0 20px rgba(59, 130, 246, 0.3); }
          100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
        }
      `;

    case 'flow':
      return `
        @keyframes flow-${Date.now()} {
          0% { stroke-dashoffset: 100; }
          100% { stroke-dashoffset: 0; }
        }
      `;

    case 'progressive':
      return `
        @keyframes progressive-${Date.now()} {
          0% { opacity: 0; transform: translateY(20px) scale(0.9); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
      `;

    default:
      return '';
  }
};

// Apply animation styles to nodes
export const applyNodeAnimation = (
  node: Node,
  animation: AnimationConfig,
  isActive: boolean = true
): Node => {
  if (!isActive) {
    return {
      ...node,
      style: {
        ...node.style,
        animation: 'none',
        opacity: 0.3,
        transition: 'all 0.3s ease-out'
      }
    };
  }

  const animationName = `${animation.type}-${Date.now()}`;
  const duration = `${animation.duration}ms`;
  const timing = animation.easing || 'ease-in-out';
  const iteration = animation.repeat === true ? 'infinite' : 
                   typeof animation.repeat === 'number' ? animation.repeat.toString() : '1';
  const direction = animation.direction || 'normal';

  return {
    ...node,
    style: {
      ...node.style,
      animation: `${animationName} ${duration} ${timing} ${iteration} ${direction}`,
      opacity: 1,
      transition: 'all 0.3s ease-out'
    }
  };
};

// Apply animation styles to edges
export const applyEdgeAnimation = (
  edge: Edge,
  animation: AnimationConfig,
  isActive: boolean = true
): Edge => {
  if (!isActive) {
    return {
      ...edge,
      style: {
        ...edge.style,
        opacity: 0.2,
        strokeDasharray: 'none',
        animation: 'none'
      }
    };
  }

  const animationName = `flow-${Date.now()}`;
  const duration = `${animation.duration}ms`;

  return {
    ...edge,
    style: {
      ...edge.style,
      opacity: 1,
      strokeDasharray: animation.type === 'flow' ? '10 5' : 'none',
      animation: animation.type === 'flow' ? 
        `${animationName} ${duration} linear infinite` : 'none'
    }
  };
};

// Animation controller class
export class AnimationController {
  private currentAnimation: AnimationSequence | null = null;
  private currentStep: number = 0;
  private isPlaying: boolean = false;
  private animationTimer: NodeJS.Timeout | null = null;
  private callbacks: {
    onStepChange?: (step: AnimationStep, stepIndex: number) => void;
    onComplete?: () => void;
    onPause?: () => void;
    onResume?: () => void;
  } = {};

  setAnimation(animation: AnimationSequence) {
    this.stop();
    this.currentAnimation = animation;
    this.currentStep = 0;
  }

  play() {
    if (!this.currentAnimation || this.isPlaying) return;
    
    this.isPlaying = true;
    this.executeCurrentStep();
  }

  pause() {
    this.isPlaying = false;
    if (this.animationTimer) {
      clearTimeout(this.animationTimer);
      this.animationTimer = null;
    }
    this.callbacks.onPause?.();
  }

  resume() {
    if (!this.isPlaying && this.currentAnimation) {
      this.play();
      this.callbacks.onResume?.();
    }
  }

  stop() {
    this.isPlaying = false;
    this.currentStep = 0;
    if (this.animationTimer) {
      clearTimeout(this.animationTimer);
      this.animationTimer = null;
    }
  }

  nextStep() {
    if (!this.currentAnimation) return;
    
    this.currentStep = Math.min(
      this.currentStep + 1,
      this.currentAnimation.steps.length - 1
    );
    this.executeCurrentStep();
  }

  previousStep() {
    this.currentStep = Math.max(this.currentStep - 1, 0);
    this.executeCurrentStep();
  }

  setCallbacks(callbacks: typeof this.callbacks) {
    this.callbacks = callbacks;
  }

  getCurrentStep(): AnimationStep | null {
    if (!this.currentAnimation || this.currentStep >= this.currentAnimation.steps.length) {
      return null;
    }
    return this.currentAnimation.steps[this.currentStep];
  }

  getProgress(): number {
    if (!this.currentAnimation || this.currentAnimation.steps.length === 0) {
      return 0;
    }
    return this.currentStep / this.currentAnimation.steps.length;
  }

  private executeCurrentStep() {
    if (!this.currentAnimation || this.currentStep >= this.currentAnimation.steps.length) {
      this.isPlaying = false;
      this.callbacks.onComplete?.();
      return;
    }

    const step = this.currentAnimation.steps[this.currentStep];
    this.callbacks.onStepChange?.(step, this.currentStep);

    if (this.isPlaying) {
      const nextStepDelay = this.currentStep < this.currentAnimation.steps.length - 1 
        ? this.currentAnimation.steps[this.currentStep + 1].timestamp - step.timestamp
        : step.animation.duration;

      this.animationTimer = setTimeout(() => {
        this.currentStep++;
        this.executeCurrentStep();
      }, Math.max(nextStepDelay, step.animation.duration));
    }
  }
}

// Utility functions
const getTacticName = (tacticId: string): string => {
  const tacticNames: Record<string, string> = {
    'TA0043': 'Reconnaissance',
    'TA0042': 'Resource Development',
    'TA0001': 'Initial Access',
    'TA0002': 'Execution',
    'TA0003': 'Persistence',
    'TA0004': 'Privilege Escalation',
    'TA0005': 'Defense Evasion',
    'TA0006': 'Credential Access',
    'TA0007': 'Discovery',
    'TA0008': 'Lateral Movement',
    'TA0009': 'Collection',
    'TA0011': 'Command and Control',
    'TA0010': 'Exfiltration',
    'TA0040': 'Impact',
  };
  return tacticNames[tacticId] || tacticId;
};

// Performance optimization for large graphs
export const optimizeAnimationForPerformance = (
  sequence: AnimationSequence,
  maxSimultaneousAnimations: number = 10
): AnimationSequence => {
  // Group steps that happen simultaneously
  const groupedSteps: AnimationStep[][] = [];
  let currentGroup: AnimationStep[] = [];
  let currentTime = 0;

  sequence.steps.forEach(step => {
    if (step.timestamp > currentTime + 100) { // 100ms tolerance
      if (currentGroup.length > 0) {
        groupedSteps.push(currentGroup);
        currentGroup = [];
      }
      currentTime = step.timestamp;
    }
    currentGroup.push(step);
  });

  if (currentGroup.length > 0) {
    groupedSteps.push(currentGroup);
  }

  // Limit simultaneous animations
  const optimizedSteps: AnimationStep[] = [];
  
  groupedSteps.forEach(group => {
    if (group.length <= maxSimultaneousAnimations) {
      optimizedSteps.push(...group);
    } else {
      // Split large groups into smaller chunks
      for (let i = 0; i < group.length; i += maxSimultaneousAnimations) {
        const chunk = group.slice(i, i + maxSimultaneousAnimations);
        const chunkDelay = Math.floor(i / maxSimultaneousAnimations) * 100;
        
        chunk.forEach(step => {
          optimizedSteps.push({
            ...step,
            timestamp: step.timestamp + chunkDelay
          });
        });
      }
    }
  });

  return {
    ...sequence,
    steps: optimizedSteps
  };
};