/**
 * StreamingJsonParser - Parses streaming JSON responses from AI providers
 *
 * Responsibilities:
 * - Parse partial JSON from streaming responses
 * - Extract nodes and edges as they arrive
 * - Handle incomplete JSON gracefully
 * - Emit parsed entities to callbacks
 *
 * Note: This is a transitional implementation that extracts the parsing logic
 * from StreamingDirectFlowClient. Future enhancement: use a proper streaming
 * JSON parser library for better performance and reliability.
 */

import { Node, Edge } from 'reactflow';
import { StreamStateManager } from './StreamStateManager';

/**
 * Callbacks for streaming events
 */
export interface StreamingCallbacks {
  onNode: (node: Node) => void;
  onEdge: (edge: Edge) => void;
  onProgress?: (stage: string, message: string) => void;
  onIOCAnalysis?: (iocAnalysis: any) => void;
}

/**
 * Result of parsing attempt
 */
interface ParseResult {
  nodes: Node[];
  edges: Edge[];
  iocAnalysis?: any;
}

export class StreamingJsonParser {
  private accumulatedText = '';

  constructor(private stateManager: StreamStateManager) {}

  /**
   * Parse a chunk of streaming data and emit any complete entities.
   *
   * @param chunk - The text chunk to parse
   * @param callbacks - Callbacks for emitting parsed entities
   */
  parseChunk(chunk: string, callbacks: StreamingCallbacks): void {
    this.accumulatedText += chunk;

    // Try to parse nodes from partial JSON
    this.tryParseNodesFromPartial(this.accumulatedText, callbacks);

    // Try to parse complete JSON if available
    if (this.looksLikeCompleteJson(this.accumulatedText)) {
      this.tryParseCompleteJson(this.accumulatedText, callbacks);
    }
  }

  /**
   * Parse final accumulated text when stream is complete.
   *
   * @param callbacks - Callbacks for emitting parsed entities
   * @returns The complete parse result
   */
  parseFinal(callbacks: StreamingCallbacks): ParseResult {
    const result = this.parseAndEmitAll(this.accumulatedText, callbacks);
    this.reset();
    return result;
  }

  /**
   * Reset parser state for new stream.
   */
  reset(): void {
    this.accumulatedText = '';
  }

  /**
   * Get accumulated text (for debugging).
   */
  getAccumulatedText(): string {
    return this.accumulatedText;
  }

  // ==================== Private Methods ====================

  /**
   * Try to parse nodes from partial JSON using regex.
   * This allows us to emit nodes as they arrive without waiting for complete JSON.
   */
  private tryParseNodesFromPartial(text: string, callbacks: StreamingCallbacks): void {
    // Match node objects in the JSON
    const nodeStartRegex = /\{\s*"id"\s*:\s*"([^"]+)"\s*,\s*"type"\s*:\s*"([^"]+)"\s*,\s*"data"\s*:\s*\{/g;
    let match;

    while ((match = nodeStartRegex.exec(text)) !== null) {
      const nodeId = match[1];
      const nodeType = match[2];

      // Skip if already processed
      if (this.stateManager.hasProcessedNode(nodeId)) {
        continue;
      }

      // Try to extract complete node object
      const nodeObj = this.extractNodeObject(text, match.index);
      if (nodeObj) {
        try {
          const node = JSON.parse(nodeObj);
          if (this.isValidNode(node)) {
            // Generate display ID
            const displayId = `${nodeType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            // Register and emit node
            this.stateManager.registerNode(nodeId, displayId);
            callbacks.onNode({ ...node, id: displayId });

            // Mark as processed
            this.stateManager.registerNode(nodeId, displayId);
          }
        } catch (error) {
          // Ignore parse errors for partial objects
        }
      }
    }
  }

  /**
   * Extract a complete node object starting from a given position.
   * Uses brace counting to find the matching closing brace.
   */
  private extractNodeObject(text: string, startIndex: number): string | null {
    let braceCount = 0;
    let inString = false;
    let escapeNext = false;
    let nodeStart = -1;

    for (let i = startIndex; i < text.length; i++) {
      const char = text[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === '\\') {
        escapeNext = true;
        continue;
      }

      if (char === '"' && !escapeNext) {
        inString = !inString;
        continue;
      }

      if (inString) {
        continue;
      }

      if (char === '{') {
        if (braceCount === 0) {
          nodeStart = i;
        }
        braceCount++;
      } else if (char === '}') {
        braceCount--;
        if (braceCount === 0 && nodeStart !== -1) {
          return text.substring(nodeStart, i + 1);
        }
      }
    }

    return null;
  }

  /**
   * Parse complete JSON and emit all entities.
   */
  private parseAndEmitAll(text: string, callbacks: StreamingCallbacks): ParseResult {
    const result: ParseResult = {
      nodes: [],
      edges: []
    };

    try {
      // Clean text before parsing
      const cleanedText = this.cleanJsonText(text);
      const json = JSON.parse(cleanedText);

      // Parse nodes
      if (json.nodes && Array.isArray(json.nodes)) {
        json.nodes.forEach((node: any) => {
          if (this.isValidNode(node)) {
            const displayId = this.stateManager.getDisplayId(node.id);
            if (!displayId) {
              // Node not yet emitted
              const newDisplayId = `${node.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
              this.stateManager.registerNode(node.id, newDisplayId);
              callbacks.onNode({ ...node, id: newDisplayId });
              result.nodes.push({ ...node, id: newDisplayId });
            }
          }
        });
      }

      // Parse edges
      if (json.edges && Array.isArray(json.edges)) {
        json.edges.forEach((edge: any) => {
          if (this.isValidEdge(edge)) {
            const sourceDisplayId = this.stateManager.getDisplayId(edge.source);
            const targetDisplayId = this.stateManager.getDisplayId(edge.target);

            if (sourceDisplayId && targetDisplayId) {
              const edgeId = `${sourceDisplayId}-to-${targetDisplayId}`;
              if (!this.stateManager.hasProcessedEdge(edgeId)) {
                const newEdge = {
                  ...edge,
                  id: edgeId,
                  source: sourceDisplayId,
                  target: targetDisplayId
                };
                callbacks.onEdge(newEdge);
                this.stateManager.markEdgeProcessed(edgeId);
                result.edges.push(newEdge);
              }
            } else {
              // Add to pending edges
              this.stateManager.addPendingEdge({
                edge,
                sourceId: edge.source,
                targetId: edge.target
              });
            }
          }
        });
      }

      // Process pending edges
      this.processPendingEdges(callbacks);

      // Parse IOC analysis if present
      if (json.ioc_analysis) {
        result.iocAnalysis = json.ioc_analysis;
        callbacks.onIOCAnalysis?.(json.ioc_analysis);
      }

    } catch (error) {
      console.warn('Failed to parse complete JSON:', error);
    }

    return result;
  }

  /**
   * Process pending edges now that nodes are available.
   */
  private processPendingEdges(callbacks: StreamingCallbacks): void {
    const pendingEdges = this.stateManager.getPendingEdges();

    pendingEdges.forEach(pendingEdge => {
      const sourceDisplayId = this.stateManager.getDisplayId(pendingEdge.source);
      const targetDisplayId = this.stateManager.getDisplayId(pendingEdge.target);

      if (sourceDisplayId && targetDisplayId) {
        const edgeId = `${sourceDisplayId}-to-${targetDisplayId}`;
        if (!this.stateManager.hasProcessedEdge(edgeId)) {
          const newEdge = {
            ...pendingEdge.edge,
            id: edgeId,
            source: sourceDisplayId,
            target: targetDisplayId
          };
          callbacks.onEdge(newEdge);
          this.stateManager.markEdgeProcessed(edgeId);
          this.stateManager.removePendingEdge(pendingEdge.edge.id);
        }
      }
    });
  }

  /**
   * Try to parse complete JSON if text looks complete.
   */
  private tryParseCompleteJson(text: string, callbacks: StreamingCallbacks): void {
    try {
      const cleanedText = this.cleanJsonText(text);
      JSON.parse(cleanedText);
      // If successful, parse and emit all
      this.parseAndEmitAll(text, callbacks);
    } catch {
      // Not complete yet, continue accumulating
    }
  }

  /**
   * Check if text looks like complete JSON.
   */
  private looksLikeCompleteJson(text: string): boolean {
    const trimmed = text.trim();
    return (
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))
    );
  }

  /**
   * Clean JSON text by removing markdown code blocks and extra whitespace.
   */
  private cleanJsonText(text: string): string {
    return text
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();
  }

  /**
   * Validate that an object is a proper node.
   */
  private isValidNode(node: any): boolean {
    return (
      typeof node === 'object' &&
      node !== null &&
      typeof node.id === 'string' &&
      typeof node.type === 'string' &&
      typeof node.data === 'object'
    );
  }

  /**
   * Validate that an object is a proper edge.
   */
  private isValidEdge(edge: any): boolean {
    return (
      typeof edge === 'object' &&
      edge !== null &&
      typeof edge.source === 'string' &&
      typeof edge.target === 'string'
    );
  }
}
