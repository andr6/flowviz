import { useState, useCallback, useRef } from 'react';
import { Node, Edge } from 'reactflow';

import { TEXT_PROCESSING_LIMITS, STREAMING_LIMITS } from '../../../shared/constants/ApplicationLimits';
import { StreamParser } from '../../../shared/services/streaming/StreamParser';
import { logger } from '../../../shared/utils/logger';
import { AnalysisService } from '../services/AnalysisService';

export interface FlowAnalysisState {
  isAnalyzing: boolean;
  progress: number;
  currentStep: string;
  error: string | null;
  nodes: Node[];
  edges: Edge[];
  rawResponse: string;
}

export interface AnalysisRequest {
  content: string;
  analysisType: 'direct_flow' | 'story_mode' | 'detailed_analysis';
  provider: 'claude' | 'ollama' | 'openai' | 'openrouter';
  model?: string;
}

/**
 * Focused hook for flow analysis operations
 * Single responsibility: Manage flow analysis state and operations
 */
export function useFlowAnalysis() {
  const [state, setState] = useState<FlowAnalysisState>({
    isAnalyzing: false,
    progress: 0,
    currentStep: '',
    error: null,
    nodes: [],
    edges: [],
    rawResponse: '',
  });

  const analysisService = useRef(new AnalysisService());
  const streamParser = useRef(new StreamParser(STREAMING_LIMITS.BUFFER_MAX_SIZE));
  const abortController = useRef<AbortController | null>(null);

  /**
   * Start a new flow analysis
   */
  const startAnalysis = useCallback(async (request: AnalysisRequest) => {
    // Validate input before starting
    const validation = validateAnalysisRequest(request);
    if (!validation.valid) {
      setState(prev => ({ ...prev, error: validation.error || 'Invalid request' }));
      return;
    }

    // Reset state for new analysis
    setState(prev => ({
      ...prev,
      isAnalyzing: true,
      progress: 0,
      currentStep: 'Initializing analysis...',
      error: null,
      nodes: [],
      edges: [],
      rawResponse: '',
    }));

    // Setup cancellation
    abortController.current = new AbortController();

    try {
      await analysisService.current.analyzeWithStreaming({
        ...request,
        signal: abortController.current.signal,
        onProgress: updateProgress,
        onChunk: processStreamChunk,
        onComplete: handleAnalysisComplete,
      });

    } catch (error) {
      handleAnalysisError(error as Error);
    }
  }, []);

  /**
   * Cancel ongoing analysis
   */
  const cancelAnalysis = useCallback(() => {
    if (abortController.current) {
      abortController.current.abort();
      setState(prev => ({
        ...prev,
        isAnalyzing: false,
        currentStep: 'Analysis cancelled',
        error: 'Analysis was cancelled by user',
      }));
    }
  }, []);

  /**
   * Clear analysis results and reset state
   */
  const clearAnalysis = useCallback(() => {
    setState(prev => ({
      ...prev,
      nodes: [],
      edges: [],
      rawResponse: '',
      error: null,
      progress: 0,
      currentStep: '',
    }));
    streamParser.current.reset();
  }, []);

  /**
   * Process streaming chunk from analysis
   */
  const processStreamChunk = useCallback((chunk: string) => {
    setState(prev => ({
      ...prev,
      rawResponse: prev.rawResponse + chunk,
    }));

    // Parse streaming data for real-time updates
    try {
      const parseResult = streamParser.current.parseChunk(chunk);
      
      parseResult.messages.forEach(message => {
        if (message.type === 'content') {
          // Update nodes/edges in real-time if parsing is successful
          const partialFlow = analysisService.current.parsePartialFlow(message.data);
          if (partialFlow.nodes.length > 0) {
            setState(prev => ({
              ...prev,
              nodes: partialFlow.nodes,
              edges: partialFlow.edges,
            }));
          }
        }
      });
    } catch (error) {
      logger.warn('Failed to parse streaming chunk', { error, chunkLength: chunk.length });
    }
  }, []);

  /**
   * Update analysis progress
   */
  const updateProgress = useCallback((progress: number, step: string) => {
    setState(prev => ({
      ...prev,
      progress: Math.max(0, Math.min(100, progress)),
      currentStep: step,
    }));
  }, []);

  /**
   * Handle successful analysis completion
   */
  const handleAnalysisComplete = useCallback((result: { nodes: Node[]; edges: Edge[] }) => {
    setState(prev => ({
      ...prev,
      isAnalyzing: false,
      progress: 100,
      currentStep: 'Analysis complete',
      nodes: result.nodes,
      edges: result.edges,
    }));

    logger.info('Flow analysis completed successfully', {
      nodeCount: result.nodes.length,
      edgeCount: result.edges.length,
    });
  }, []);

  /**
   * Handle analysis errors
   */
  const handleAnalysisError = useCallback((error: Error) => {
    const errorMessage = error.name === 'AbortError' 
      ? 'Analysis was cancelled'
      : `Analysis failed: ${error.message}`;

    setState(prev => ({
      ...prev,
      isAnalyzing: false,
      error: errorMessage,
      currentStep: 'Analysis failed',
    }));

    logger.error('Flow analysis failed', { error: error.message, stack: error.stack });
  }, []);

  return {
    ...state,
    startAnalysis,
    cancelAnalysis,
    clearAnalysis,
    canCancel: state.isAnalyzing && !!abortController.current,
    hasResults: state.nodes.length > 0,
  };
}

/**
 * Validate analysis request
 */
function validateAnalysisRequest(request: AnalysisRequest): { valid: boolean; error?: string } {
  if (!request.content?.trim()) {
    return { valid: false, error: 'Content is required for analysis' };
  }

  if (request.content.length > TEXT_PROCESSING_LIMITS.MAX_CHARACTERS) {
    return {
      valid: false,
      error: `Content exceeds maximum length of ${TEXT_PROCESSING_LIMITS.MAX_CHARACTERS.toLocaleString()} characters`,
    };
  }

  if (!['direct_flow', 'story_mode', 'detailed_analysis'].includes(request.analysisType)) {
    return { valid: false, error: 'Invalid analysis type' };
  }

  if (!['claude', 'ollama', 'openai', 'openrouter'].includes(request.provider)) {
    return { valid: false, error: 'Invalid provider' };
  }

  return { valid: true };
}