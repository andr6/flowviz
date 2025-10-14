/**
 * StreamStateManager - Manages state during streaming flow extraction
 *
 * Responsibilities:
 * - Track processed nodes and edges
 * - Manage node ID mapping (original -> display ID)
 * - Handle pending edges (edges created before target nodes exist)
 * - Prevent memory leaks with bounded collections
 *
 * Memory Safety:
 * - Implements maximum size limits for all collections
 * - Provides cleanup methods to prevent unbounded growth
 * - Automatically trims old entries when limits are reached
 */

import { Node, Edge } from 'reactflow';

/**
 * Represents an edge that's waiting for its source or target node to be created
 */
export interface PendingEdge {
  /** The edge object */
  edge: Edge;

  /** Original source node ID */
  sourceId: string;

  /** Original target node ID */
  targetId: string;

  /** Timestamp when edge was added (for cleanup) */
  timestamp?: number;
}

export class StreamStateManager {
  // Memory safety limits
  private static readonly MAX_PENDING_EDGES = 1000;
  private static readonly MAX_CACHE_SIZE = 500;
  private static readonly CLEANUP_THRESHOLD = 0.75; // Trigger cleanup at 75% capacity

  // State tracking
  private nodeIdMap = new Map<string, string>();
  private processedNodeIds = new Set<string>();
  private processedEdgeIds = new Set<string>();
  private pendingEdges: PendingEdge[] = [];
  private emittedNodeIds = new Set<string>();

  /**
   * Register a new node and get its display ID.
   * Maps the original node ID to a display-friendly ID.
   *
   * @param originalId - The original node ID from the AI response
   * @param displayId - The display ID to use in the UI
   */
  registerNode(originalId: string, displayId: string): void {
    this.nodeIdMap.set(originalId, displayId);
    this.processedNodeIds.add(originalId);
    this.emittedNodeIds.add(displayId);

    // Prevent unbounded growth
    if (this.nodeIdMap.size > StreamStateManager.MAX_CACHE_SIZE) {
      this.cleanupOldEntries();
    }
  }

  /**
   * Check if a node has been processed.
   *
   * @param nodeId - The original node ID to check
   * @returns true if node has been processed, false otherwise
   */
  hasProcessedNode(nodeId: string): boolean {
    return this.processedNodeIds.has(nodeId);
  }

  /**
   * Check if a node has been emitted to the UI.
   *
   * @param displayId - The display ID to check
   * @returns true if node has been emitted, false otherwise
   */
  hasEmittedNode(displayId: string): boolean {
    return this.emittedNodeIds.has(displayId);
  }

  /**
   * Get the display ID for a node.
   *
   * @param originalId - The original node ID
   * @returns The display ID if found, undefined otherwise
   */
  getDisplayId(originalId: string): string | undefined {
    return this.nodeIdMap.get(originalId);
  }

  /**
   * Add a pending edge that's waiting for its nodes to be created.
   *
   * @param pendingEdge - The pending edge to add
   */
  addPendingEdge(pendingEdge: PendingEdge): void {
    // Add timestamp for cleanup
    const edgeWithTimestamp: PendingEdge = {
      ...pendingEdge,
      timestamp: Date.now()
    };

    // Check for duplicates before adding
    const isDuplicate = this.pendingEdges.some(
      e => e.edge.id === pendingEdge.edge.id
    );

    if (!isDuplicate) {
      if (this.pendingEdges.length >= StreamStateManager.MAX_PENDING_EDGES) {
        console.warn(
          `Pending edges limit reached (${StreamStateManager.MAX_PENDING_EDGES}). ` +
          'Oldest edges will be dropped.'
        );
        // Remove oldest 25% of edges
        const removeCount = Math.floor(StreamStateManager.MAX_PENDING_EDGES * 0.25);
        this.pendingEdges.splice(0, removeCount);
      }

      this.pendingEdges.push(edgeWithTimestamp);
    }
  }

  /**
   * Get all pending edges.
   *
   * @returns Array of pending edges (defensive copy)
   */
  getPendingEdges(): PendingEdge[] {
    return [...this.pendingEdges];
  }

  /**
   * Get pending edges for a specific node.
   * Returns edges where the node is either source or target.
   *
   * @param nodeId - The original node ID
   * @returns Array of pending edges connected to this node
   */
  getPendingEdgesForNode(nodeId: string): PendingEdge[] {
    return this.pendingEdges.filter(
      pe => pe.sourceId === nodeId || pe.targetId === nodeId
    );
  }

  /**
   * Remove a pending edge.
   *
   * @param edgeId - ID of the edge to remove
   */
  removePendingEdge(edgeId: string): void {
    this.pendingEdges = this.pendingEdges.filter(pe => pe.edge.id !== edgeId);
  }

  /**
   * Mark an edge as processed.
   *
   * @param edgeId - The edge ID to mark as processed
   */
  markEdgeProcessed(edgeId: string): void {
    this.processedEdgeIds.add(edgeId);

    // Prevent unbounded growth
    if (this.processedEdgeIds.size > StreamStateManager.MAX_CACHE_SIZE) {
      // Keep only the most recent 75%
      const edgeIdsArray = Array.from(this.processedEdgeIds);
      this.processedEdgeIds.clear();
      edgeIdsArray
        .slice(-Math.floor(StreamStateManager.MAX_CACHE_SIZE * StreamStateManager.CLEANUP_THRESHOLD))
        .forEach(id => this.processedEdgeIds.add(id));
    }
  }

  /**
   * Check if an edge has been processed.
   *
   * @param edgeId - The edge ID to check
   * @returns true if edge has been processed, false otherwise
   */
  hasProcessedEdge(edgeId: string): boolean {
    return this.processedEdgeIds.has(edgeId);
  }

  /**
   * Clear all pending edges.
   * Useful when processing is complete or needs to be reset.
   */
  clearPendingEdges(): void {
    this.pendingEdges = [];
  }

  /**
   * Process pending edges - emit edges whose nodes now exist.
   *
   * @param onEdge - Callback to emit edges
   */
  processPendingEdges(onEdge: (edge: Edge) => void): void {
    const remainingEdges: PendingEdge[] = [];

    for (const pending of this.pendingEdges) {
      // Check if both nodes exist (using original IDs mapped to display IDs)
      const sourceDisplayId = this.nodeIdMap.get(pending.sourceId);
      const targetDisplayId = this.nodeIdMap.get(pending.targetId);

      if (sourceDisplayId && targetDisplayId &&
          this.emittedNodeIds.has(sourceDisplayId) &&
          this.emittedNodeIds.has(targetDisplayId)) {
        // Both nodes exist, emit the edge
        onEdge(pending.edge);
      } else {
        // Keep edge pending
        remainingEdges.push(pending);
      }
    }

    this.pendingEdges = remainingEdges;
  }

  /**
   * Reset all state to initial values.
   * Call this when starting a new analysis.
   */
  reset(): void {
    this.nodeIdMap.clear();
    this.processedNodeIds.clear();
    this.processedEdgeIds.clear();
    this.pendingEdges = [];
    this.emittedNodeIds.clear();
  }

  /**
   * Get statistics about current state (useful for debugging).
   *
   * @returns Object containing state statistics
   */
  getStats(): {
    nodeCount: number;
    processedNodeCount: number;
    emittedNodeCount: number;
    pendingEdgeCount: number;
    processedEdgeCount: number;
  } {
    return {
      nodeCount: this.nodeIdMap.size,
      processedNodeCount: this.processedNodeIds.size,
      emittedNodeCount: this.emittedNodeIds.size,
      pendingEdgeCount: this.pendingEdges.length,
      processedEdgeCount: this.processedEdgeIds.size
    };
  }

  /**
   * Cleanup old entries to prevent memory leaks.
   * Called automatically when caches reach capacity.
   *
   * Strategy: Keep only the most recent entries (75% of max capacity).
   */
  private cleanupOldEntries(): void {
    const threshold = Math.floor(
      StreamStateManager.MAX_CACHE_SIZE * StreamStateManager.CLEANUP_THRESHOLD
    );

    // Cleanup node ID map
    if (this.nodeIdMap.size > threshold) {
      const entries = Array.from(this.nodeIdMap.entries());
      this.nodeIdMap.clear();
      entries.slice(-threshold).forEach(([key, value]) => {
        this.nodeIdMap.set(key, value);
      });
    }

    // Cleanup processed node IDs
    if (this.processedNodeIds.size > threshold) {
      const ids = Array.from(this.processedNodeIds);
      this.processedNodeIds.clear();
      ids.slice(-threshold).forEach(id => this.processedNodeIds.add(id));
    }

    // Cleanup emitted node IDs
    if (this.emittedNodeIds.size > threshold) {
      const ids = Array.from(this.emittedNodeIds);
      this.emittedNodeIds.clear();
      ids.slice(-threshold).forEach(id => this.emittedNodeIds.add(id));
    }

    // Cleanup old pending edges (older than 5 minutes)
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    this.pendingEdges = this.pendingEdges.filter(
      pe => !pe.timestamp || pe.timestamp > fiveMinutesAgo
    );

    console.log('[StreamStateManager] Cleaned up old entries to prevent memory leaks');
  }
}
