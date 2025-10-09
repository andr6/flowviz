// Advanced AI Capabilities Service
// Provides multi-model support, custom prompts, incremental analysis, confidence tuning, and vision analysis

import { providerManager } from '../../../shared/services/ai-providers';
import { ProviderType } from '../../../shared/services/ai-providers/types';

// Types for advanced AI capabilities
export interface AIModel {
  id: string;
  name: string;
  provider: ProviderType;
  description: string;
  capabilities: string[];
  supportsVision: boolean;
  supportsStreaming: boolean;
  isAvailable?: boolean;
  cost?: 'low' | 'medium' | 'high';
  speed?: 'fast' | 'medium' | 'slow';
  accuracy?: 'high' | 'medium' | 'standard';
}

export interface CustomPrompt {
  id: string;
  name: string;
  description: string;
  category: 'security' | 'malware' | 'network' | 'incident' | 'threat-intel' | 'general';
  template: string;
  variables: string[];
  isBuiltIn: boolean;
  created: Date;
  lastUsed?: Date;
  usage: number;
  tags: string[];
}

export interface ConfidenceTuning {
  extractionSensitivity: number; // 0-100, higher = more aggressive extraction
  sourceReliability: 'high' | 'medium' | 'low' | 'unknown';
  contextWeight: number; // 0-100, how much context affects confidence
  patternMatching: 'strict' | 'moderate' | 'flexible';
  minimumConfidence: number; // 0-100, minimum confidence to include in results
  falsePositiveReduction: boolean;
  adaptiveThresholds: boolean;
}

export interface IncrementalAnalysis {
  existingFlowId: string;
  additionalContent: string;
  mergeStrategy: 'append' | 'merge' | 'replace' | 'smart-merge';
  preserveExisting: boolean;
  conflictResolution: 'prefer-new' | 'prefer-existing' | 'ask-user';
  analysisMode: 'full-reanalysis' | 'delta-only' | 'smart-update';
}

export interface VisionAnalysisConfig {
  ocrLanguage: string;
  preprocessingFilters: string[];
  confidenceThreshold: number;
  extractionMode: 'text-only' | 'text-and-structure' | 'full-analysis';
  enhanceQuality: boolean;
  detectTables: boolean;
  detectDiagrams: boolean;
}

export interface AnalysisSession {
  id: string;
  model: AIModel;
  customPrompt?: CustomPrompt;
  confidenceTuning: ConfidenceTuning;
  incremental?: IncrementalAnalysis;
  visionConfig?: VisionAnalysisConfig;
  created: Date;
  lastActivity: Date;
  status: 'active' | 'completed' | 'error' | 'cancelled';
  results?: any;
}

// Default models configuration
const DEFAULT_MODELS: AIModel[] = [
  {
    id: 'claude-3-5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'claude',
    description: 'Most capable model for complex threat analysis and detailed reasoning',
    capabilities: ['complex-reasoning', 'code-analysis', 'multi-step-analysis', 'vision'],
    supportsVision: true,
    supportsStreaming: true,
    cost: 'high',
    speed: 'medium',
    accuracy: 'high'
  },
  {
    id: 'claude-3-haiku',
    name: 'Claude 3 Haiku',
    provider: 'claude',
    description: 'Fast and efficient for quick threat analysis',
    capabilities: ['fast-analysis', 'pattern-recognition', 'basic-reasoning'],
    supportsVision: false,
    supportsStreaming: true,
    cost: 'low',
    speed: 'fast',
    accuracy: 'medium'
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    description: 'Powerful multimodal model with strong analytical capabilities',
    capabilities: ['multimodal', 'complex-reasoning', 'vision', 'code-analysis'],
    supportsVision: true,
    supportsStreaming: true,
    cost: 'high',
    speed: 'medium',
    accuracy: 'high'
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    description: 'Faster, cost-effective version for routine analysis',
    capabilities: ['fast-analysis', 'pattern-recognition', 'basic-reasoning'],
    supportsVision: true,
    supportsStreaming: true,
    cost: 'low',
    speed: 'fast',
    accuracy: 'medium'
  },
  {
    id: 'llama-3.2-90b',
    name: 'Llama 3.2 90B',
    provider: 'ollama',
    description: 'Open-source model for privacy-focused analysis',
    capabilities: ['local-processing', 'privacy-focused', 'code-analysis'],
    supportsVision: false,
    supportsStreaming: true,
    cost: 'low',
    speed: 'slow',
    accuracy: 'medium'
  },
  {
    id: 'llama-3.2-11b-vision',
    name: 'Llama 3.2 11B Vision',
    provider: 'ollama',
    description: 'Local vision-enabled model for document analysis',
    capabilities: ['local-processing', 'vision', 'document-analysis'],
    supportsVision: true,
    supportsStreaming: true,
    cost: 'low',
    speed: 'medium',
    accuracy: 'medium'
  }
];

// Built-in custom prompts
const BUILTIN_PROMPTS: Omit<CustomPrompt, 'id' | 'created' | 'lastUsed' | 'usage'>[] = [
  {
    name: 'Advanced Threat Hunt',
    description: 'Deep analysis focusing on hunting indicators and advanced persistent threats',
    category: 'threat-intel',
    template: `Analyze this content for advanced threat indicators with the following focus:

1. Advanced Persistent Threat (APT) indicators
2. Living-off-the-land techniques
3. Zero-day exploitation patterns
4. Supply chain compromise indicators
5. Infrastructure analysis and attribution

Content: {content}

Source reliability: {reliability}
Confidence threshold: {confidence}

Provide detailed analysis with high-confidence indicators and potential attribution clues.`,
    variables: ['content', 'reliability', 'confidence'],
    isBuiltIn: true,
    tags: ['apt', 'hunting', 'attribution', 'advanced']
  },
  {
    name: 'Malware Family Analysis',
    description: 'Specialized analysis for malware identification and family classification',
    category: 'malware',
    template: `Analyze this malware report to identify:

1. Malware family and variant
2. Infection vectors and propagation methods
3. Persistence mechanisms
4. Command and control infrastructure
5. Evasion techniques employed
6. Potential attribution or campaign links

Report content: {content}

Focus on technical indicators that can be used for detection and hunting.
Confidence setting: {confidence}`,
    variables: ['content', 'confidence'],
    isBuiltIn: true,
    tags: ['malware', 'family', 'classification', 'technical']
  },
  {
    name: 'Incident Response Focus',
    description: 'Analysis optimized for incident response and containment actions',
    category: 'incident',
    template: `Analyze this incident report for immediate response actions:

1. Attack timeline and progression
2. Compromise indicators requiring immediate attention
3. Lateral movement indicators
4. Data exfiltration evidence
5. Recommended containment actions
6. Recovery and remediation priorities

Incident details: {content}

Urgency level: {urgency}
Confidence threshold: {confidence}

Prioritize actionable intelligence for immediate response.`,
    variables: ['content', 'urgency', 'confidence'],
    isBuiltIn: true,
    tags: ['incident', 'response', 'containment', 'urgent']
  },
  {
    name: 'Network Security Analysis',
    description: 'Focus on network-based indicators and infrastructure analysis',
    category: 'network',
    template: `Analyze for network security indicators:

1. Malicious IP addresses and domains
2. Network communication patterns
3. DNS analysis and domain generation algorithms
4. SSL/TLS certificate analysis
5. Network infrastructure mapping
6. Traffic analysis indicators

Network data: {content}

Analysis depth: {depth}
Confidence level: {confidence}

Emphasize network-based detection opportunities.`,
    variables: ['content', 'depth', 'confidence'],
    isBuiltIn: true,
    tags: ['network', 'infrastructure', 'domains', 'traffic']
  },
  {
    name: 'Quick Triage',
    description: 'Fast analysis for initial threat assessment and prioritization',
    category: 'general',
    template: `Perform quick triage analysis:

1. Threat severity assessment (Critical/High/Medium/Low)
2. Primary attack vectors identified
3. Key indicators of compromise
4. Recommended next steps
5. Urgency for detailed analysis

Content: {content}

Provide rapid assessment suitable for SOC triage workflow.`,
    variables: ['content'],
    isBuiltIn: true,
    tags: ['triage', 'quick', 'assessment', 'soc']
  }
];

export class AdvancedAICapabilities {
  private models: AIModel[] = [];
  private customPrompts: CustomPrompt[] = [];
  private sessions: Map<string, AnalysisSession> = new Map();
  private defaultConfidenceTuning: ConfidenceTuning = {
    extractionSensitivity: 70,
    sourceReliability: 'medium',
    contextWeight: 60,
    patternMatching: 'moderate',
    minimumConfidence: 50,
    falsePositiveReduction: true,
    adaptiveThresholds: true
  };

  constructor() {
    this.initialize();
  }

  private async initialize() {
    await this.loadModels();
    this.loadCustomPrompts();
  }

  // Model Management
  private async loadModels() {
    this.models = [...DEFAULT_MODELS];
    
    // Check availability of each model
    const availableProviders = providerManager.getAvailableProviders();
    const providerTypes = availableProviders.map(p => p.type);
    
    this.models = this.models.map(model => ({
      ...model,
      isAvailable: providerTypes.includes(model.provider)
    }));
  }

  public getAvailableModels(): AIModel[] {
    return this.models.filter(model => model.isAvailable);
  }

  public getModelsByProvider(provider: ProviderType): AIModel[] {
    return this.models.filter(model => model.provider === provider && model.isAvailable);
  }

  public getModelById(id: string): AIModel | undefined {
    return this.models.find(model => model.id === id);
  }

  public async switchModel(modelId: string): Promise<boolean> {
    const model = this.getModelById(modelId);
    if (!model || !model.isAvailable) {
      return false;
    }

    const success = providerManager.setCurrentProvider(model.provider);
    if (success) {
      localStorage.setItem('selected_ai_model', modelId);
    }
    return success;
  }

  public getCurrentModel(): AIModel | null {
    const savedModelId = localStorage.getItem('selected_ai_model');
    if (savedModelId) {
      const model = this.getModelById(savedModelId);
      if (model && model.isAvailable) {
        return model;
      }
    }
    
    // Return first available model as default
    const available = this.getAvailableModels();
    return available.length > 0 ? available[0] : null;
  }

  // Custom Prompts Management
  private loadCustomPrompts() {
    // Load built-in prompts
    const builtInPrompts = BUILTIN_PROMPTS.map((prompt, index) => ({
      ...prompt,
      id: `builtin-${index}`,
      created: new Date(),
      usage: 0
    }));

    // Load user prompts from localStorage
    const storedPrompts = localStorage.getItem('custom_prompts');
    const userPrompts = storedPrompts ? JSON.parse(storedPrompts) : [];

    this.customPrompts = [...builtInPrompts, ...userPrompts];
  }

  public getCustomPrompts(category?: string): CustomPrompt[] {
    return this.customPrompts.filter(prompt => 
      !category || prompt.category === category
    );
  }

  public createCustomPrompt(prompt: Omit<CustomPrompt, 'id' | 'created' | 'usage'>): string {
    const id = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newPrompt: CustomPrompt = {
      ...prompt,
      id,
      created: new Date(),
      usage: 0
    };

    this.customPrompts.push(newPrompt);
    this.saveUserPrompts();
    return id;
  }

  public updateCustomPrompt(id: string, updates: Partial<CustomPrompt>): boolean {
    const index = this.customPrompts.findIndex(p => p.id === id && !p.isBuiltIn);
    if (index === -1) return false;

    this.customPrompts[index] = { ...this.customPrompts[index], ...updates };
    this.saveUserPrompts();
    return true;
  }

  public deleteCustomPrompt(id: string): boolean {
    const index = this.customPrompts.findIndex(p => p.id === id && !p.isBuiltIn);
    if (index === -1) return false;

    this.customPrompts.splice(index, 1);
    this.saveUserPrompts();
    return true;
  }

  public getPromptById(id: string): CustomPrompt | undefined {
    return this.customPrompts.find(p => p.id === id);
  }

  private saveUserPrompts() {
    const userPrompts = this.customPrompts.filter(p => !p.isBuiltIn);
    localStorage.setItem('custom_prompts', JSON.stringify(userPrompts));
  }

  // Confidence Tuning
  public getConfidenceTuning(): ConfidenceTuning {
    const stored = localStorage.getItem('confidence_tuning');
    return stored ? { ...this.defaultConfidenceTuning, ...JSON.parse(stored) } : this.defaultConfidenceTuning;
  }

  public updateConfidenceTuning(tuning: Partial<ConfidenceTuning>) {
    const current = this.getConfidenceTuning();
    const updated = { ...current, ...tuning };
    localStorage.setItem('confidence_tuning', JSON.stringify(updated));
  }

  public resetConfidenceTuning() {
    localStorage.removeItem('confidence_tuning');
  }

  // Vision Analysis
  public async analyzeImageContent(
    imageData: string,
    mediaType: string,
    config?: Partial<VisionAnalysisConfig>
  ): Promise<{
    extractedText: string;
    structuredData: any;
    confidence: number;
    metadata: any;
  }> {
    const currentModel = this.getCurrentModel();
    if (!currentModel || !currentModel.supportsVision) {
      throw new Error('Current AI model does not support vision analysis');
    }

    const visionConfig: VisionAnalysisConfig = {
      ocrLanguage: 'en',
      preprocessingFilters: ['enhance_contrast', 'noise_reduction'],
      confidenceThreshold: 0.7,
      extractionMode: 'full-analysis',
      enhanceQuality: true,
      detectTables: true,
      detectDiagrams: true,
      ...config
    };

    return new Promise((resolve, reject) => {
      const extractedContent = {
        extractedText: '',
        structuredData: null,
        confidence: 0,
        metadata: {}
      };

      providerManager.streamAnalysis({
        text: `Analyze this cybersecurity document image and extract threat intelligence indicators. Focus on:
1. IOCs (IPs, domains, file hashes, etc.)
2. Attack techniques and TTPs
3. Timeline information
4. Attribution indicators
5. Structured data (tables, diagrams)

Configuration: ${JSON.stringify(visionConfig)}`,
        images: [{ data: imageData, mediaType }],
        onProgress: (response) => {
          if (response.type === 'progress' && response.data?.extractedText) {
            extractedContent.extractedText += response.data.extractedText;
          }
          if (response.type === 'node' && response.data) {
            if (!extractedContent.structuredData) {
              extractedContent.structuredData = { nodes: [], edges: [] };
            }
            extractedContent.structuredData.nodes.push(response.data);
          }
        },
        onComplete: () => {
          extractedContent.confidence = this.calculateVisionConfidence(extractedContent, visionConfig);
          extractedContent.metadata = {
            model: currentModel.name,
            config: visionConfig,
            processed: new Date().toISOString()
          };
          resolve(extractedContent);
        },
        onError: reject
      });
    });
  }

  private calculateVisionConfidence(content: any, config: VisionAnalysisConfig): number {
    let confidence = 0.5; // Base confidence
    
    // Increase confidence based on extracted content quality
    if (content.extractedText && content.extractedText.length > 100) {
      confidence += 0.2;
    }
    
    if (content.structuredData && content.structuredData.nodes.length > 0) {
      confidence += 0.2;
    }
    
    // Adjust based on config settings
    if (config.enhanceQuality) {
      confidence += 0.1;
    }
    
    return Math.min(confidence, 1.0);
  }

  // Incremental Analysis
  public async performIncrementalAnalysis(
    config: IncrementalAnalysis,
    onProgress?: (response: any) => void
  ): Promise<any> {
    const currentModel = this.getCurrentModel();
    if (!currentModel) {
      throw new Error('No AI model available for analysis');
    }

    // Retrieve existing flow data
    const existingFlow = this.getExistingFlow(config.existingFlowId);
    if (!existingFlow) {
      throw new Error('Existing flow not found');
    }

    const prompt = this.buildIncrementalPrompt(config, existingFlow);
    
    return new Promise((resolve, reject) => {
      const results = {
        newNodes: [],
        newEdges: [],
        updatedNodes: [],
        conflicts: [],
        mergedFlow: null
      };

      providerManager.streamAnalysis({
        text: prompt,
        onProgress: (response) => {
          if (onProgress) onProgress(response);
          
          if (response.type === 'node') {
            const existingNode = existingFlow.nodes.find((n: any) => 
              this.nodesAreSimilar(n, response.data)
            );
            
            if (existingNode) {
              if (config.conflictResolution === 'prefer-new') {
                results.updatedNodes.push(response.data);
              } else if (config.conflictResolution === 'prefer-existing') {
                // Keep existing
              } else {
                results.conflicts.push({
                  existing: existingNode,
                  new: response.data,
                  type: 'node_conflict'
                });
              }
            } else {
              results.newNodes.push(response.data);
            }
          }
          
          if (response.type === 'edge') {
            results.newEdges.push(response.data);
          }
        },
        onComplete: () => {
          results.mergedFlow = this.mergeFlows(existingFlow, results, config);
          resolve(results);
        },
        onError: reject
      });
    });
  }

  private getExistingFlow(flowId: string): any {
    // This would typically load from your flow storage system
    const stored = localStorage.getItem(`flow_${flowId}`);
    return stored ? JSON.parse(stored) : null;
  }

  private buildIncrementalPrompt(config: IncrementalAnalysis, existingFlow: any): string {
    return `Perform incremental analysis on this additional content, considering the existing flow context.

Existing flow summary:
- Nodes: ${existingFlow.nodes.length}
- Key techniques: ${existingFlow.nodes.map((n: any) => n.data?.technique).filter(Boolean).slice(0, 5).join(', ')}

Additional content to analyze:
${config.additionalContent}

Analysis mode: ${config.analysisMode}
Merge strategy: ${config.mergeStrategy}
Preserve existing: ${config.preserveExisting}

Focus on identifying:
1. New attack techniques not in existing flow
2. Additional IOCs and indicators
3. Timeline connections to existing events
4. Relationships with existing nodes`;
  }

  private nodesAreSimilar(node1: any, node2: any): boolean {
    // Simple similarity check - could be enhanced with fuzzy matching
    if (node1.data?.technique && node2.data?.technique) {
      return node1.data.technique.toLowerCase() === node2.data.technique.toLowerCase();
    }
    if (node1.data?.label && node2.data?.label) {
      return node1.data.label.toLowerCase() === node2.data.label.toLowerCase();
    }
    return false;
  }

  private mergeFlows(existingFlow: any, results: any, config: IncrementalAnalysis): any {
    const merged = {
      ...existingFlow,
      nodes: [...existingFlow.nodes],
      edges: [...existingFlow.edges]
    };

    // Add new nodes
    merged.nodes.push(...results.newNodes);
    
    // Add new edges
    merged.edges.push(...results.newEdges);
    
    // Update existing nodes if requested
    results.updatedNodes.forEach((updatedNode: any) => {
      const index = merged.nodes.findIndex((n: any) => 
        this.nodesAreSimilar(n, updatedNode)
      );
      if (index !== -1) {
        merged.nodes[index] = updatedNode;
      }
    });

    return merged;
  }

  // Session Management
  public createAnalysisSession(
    modelId: string,
    options: {
      customPromptId?: string;
      confidenceTuning?: Partial<ConfidenceTuning>;
      incremental?: IncrementalAnalysis;
      visionConfig?: Partial<VisionAnalysisConfig>;
    } = {}
  ): string {
    const model = this.getModelById(modelId);
    if (!model || !model.isAvailable) {
      throw new Error('Model not available');
    }

    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const session: AnalysisSession = {
      id: sessionId,
      model,
      customPrompt: options.customPromptId ? this.getPromptById(options.customPromptId) : undefined,
      confidenceTuning: { ...this.getConfidenceTuning(), ...options.confidenceTuning },
      incremental: options.incremental,
      visionConfig: options.visionConfig ? { 
        ocrLanguage: 'en',
        preprocessingFilters: [],
        confidenceThreshold: 0.7,
        extractionMode: 'full-analysis',
        enhanceQuality: true,
        detectTables: true,
        detectDiagrams: true,
        ...options.visionConfig 
      } : undefined,
      created: new Date(),
      lastActivity: new Date(),
      status: 'active'
    };

    this.sessions.set(sessionId, session);
    return sessionId;
  }

  public getSession(sessionId: string): AnalysisSession | undefined {
    return this.sessions.get(sessionId);
  }

  public updateSession(sessionId: string, updates: Partial<AnalysisSession>): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    this.sessions.set(sessionId, {
      ...session,
      ...updates,
      lastActivity: new Date()
    });
    return true;
  }

  public getActiveSessions(): AnalysisSession[] {
    return Array.from(this.sessions.values()).filter(s => s.status === 'active');
  }

  // Analytics and Usage
  public getUsageStatistics(): {
    totalSessions: number;
    modelUsage: Record<string, number>;
    promptUsage: Record<string, number>;
    averageSessionDuration: number;
  } {
    const sessions = Array.from(this.sessions.values());
    const modelUsage: Record<string, number> = {};
    const promptUsage: Record<string, number> = {};

    sessions.forEach(session => {
      modelUsage[session.model.id] = (modelUsage[session.model.id] || 0) + 1;
      if (session.customPrompt) {
        promptUsage[session.customPrompt.id] = (promptUsage[session.customPrompt.id] || 0) + 1;
      }
    });

    const completedSessions = sessions.filter(s => s.status === 'completed');
    const averageSessionDuration = completedSessions.length > 0 
      ? completedSessions.reduce((sum, session) => {
          return sum + (session.lastActivity.getTime() - session.created.getTime());
        }, 0) / completedSessions.length
      : 0;

    return {
      totalSessions: sessions.length,
      modelUsage,
      promptUsage,
      averageSessionDuration
    };
  }
}

// Global instance
export const advancedAI = new AdvancedAICapabilities();