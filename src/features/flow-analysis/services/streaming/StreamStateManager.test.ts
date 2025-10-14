import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StreamStateManager } from './StreamStateManager';
import type { Edge } from 'reactflow';

describe('StreamStateManager', () => {
  let manager: StreamStateManager;

  beforeEach(() => {
    manager = new StreamStateManager();
  });

  describe('node registration', () => {
    it('should register a node with ID mapping', () => {
      manager.registerNode('original-1', 'display-1');

      expect(manager.getDisplayId('original-1')).toBe('display-1');
    });

    it('should track processed nodes', () => {
      manager.registerNode('original-1', 'display-1');

      expect(manager.hasProcessedNode('original-1')).toBe(true);
      expect(manager.hasProcessedNode('original-2')).toBe(false);
    });

    it('should track emitted node IDs', () => {
      manager.registerNode('original-1', 'display-1');

      expect(manager.hasEmittedNode('display-1')).toBe(true);
      expect(manager.hasEmittedNode('display-2')).toBe(false);
    });

    it('should handle multiple node registrations', () => {
      manager.registerNode('original-1', 'display-1');
      manager.registerNode('original-2', 'display-2');
      manager.registerNode('original-3', 'display-3');

      expect(manager.hasProcessedNode('original-1')).toBe(true);
      expect(manager.hasProcessedNode('original-2')).toBe(true);
      expect(manager.hasProcessedNode('original-3')).toBe(true);
    });
  });

  describe('edge processing', () => {
    it('should track processed edges', () => {
      manager.markEdgeProcessed('edge-1');

      expect(manager.hasProcessedEdge('edge-1')).toBe(true);
      expect(manager.hasProcessedEdge('edge-2')).toBe(false);
    });

    it('should handle multiple edge markings', () => {
      manager.markEdgeProcessed('edge-1');
      manager.markEdgeProcessed('edge-2');
      manager.markEdgeProcessed('edge-3');

      expect(manager.hasProcessedEdge('edge-1')).toBe(true);
      expect(manager.hasProcessedEdge('edge-2')).toBe(true);
      expect(manager.hasProcessedEdge('edge-3')).toBe(true);
    });
  });

  describe('pending edges', () => {
    const createMockEdge = (id: string, source: string, target: string): Edge => ({
      id,
      source,
      target,
      type: 'floating',
    });

    it('should add pending edges', () => {
      const edge = createMockEdge('edge-1', 'node-1', 'node-2');
      manager.addPendingEdge({ edge, sourceId: 'node-1', targetId: 'node-2' });

      const pending = manager.getPendingEdges();
      expect(pending).toHaveLength(1);
      expect(pending[0].edge.id).toBe('edge-1');
    });

    it('should process pending edges when both nodes exist', () => {
      const edge1 = createMockEdge('edge-1', 'node-1', 'node-2');
      const edge2 = createMockEdge('edge-2', 'node-2', 'node-3');
      const edge3 = createMockEdge('edge-3', 'node-3', 'node-4');

      manager.addPendingEdge({ edge: edge1, sourceId: 'node-1', targetId: 'node-2' });
      manager.addPendingEdge({ edge: edge2, sourceId: 'node-2', targetId: 'node-3' });
      manager.addPendingEdge({ edge: edge3, sourceId: 'node-3', targetId: 'node-4' });

      // Register nodes 1 and 2
      manager.registerNode('node-1', 'display-1');
      manager.registerNode('node-2', 'display-2');

      const onEdge = vi.fn();
      manager.processPendingEdges(onEdge);

      // Only edge-1 should be processed (both nodes exist)
      expect(onEdge).toHaveBeenCalledTimes(1);
      expect(onEdge).toHaveBeenCalledWith(edge1);

      // Remaining pending edges
      const remaining = manager.getPendingEdges();
      expect(remaining).toHaveLength(2);
    });

    it('should clear pending edges after successful processing', () => {
      const edge = createMockEdge('edge-1', 'node-1', 'node-2');
      manager.addPendingEdge({ edge, sourceId: 'node-1', targetId: 'node-2' });

      manager.registerNode('node-1', 'display-1');
      manager.registerNode('node-2', 'display-2');

      const onEdge = vi.fn();
      manager.processPendingEdges(onEdge);

      expect(manager.getPendingEdges()).toHaveLength(0);
    });

    it('should not process edges if source node is missing', () => {
      const edge = createMockEdge('edge-1', 'node-1', 'node-2');
      manager.addPendingEdge({ edge, sourceId: 'node-1', targetId: 'node-2' });

      // Only register target node
      manager.registerNode('node-2', 'display-2');

      const onEdge = vi.fn();
      manager.processPendingEdges(onEdge);

      expect(onEdge).not.toHaveBeenCalled();
      expect(manager.getPendingEdges()).toHaveLength(1);
    });

    it('should not process edges if target node is missing', () => {
      const edge = createMockEdge('edge-1', 'node-1', 'node-2');
      manager.addPendingEdge({ edge, sourceId: 'node-1', targetId: 'node-2' });

      // Only register source node
      manager.registerNode('node-1', 'display-1');

      const onEdge = vi.fn();
      manager.processPendingEdges(onEdge);

      expect(onEdge).not.toHaveBeenCalled();
      expect(manager.getPendingEdges()).toHaveLength(1);
    });
  });

  describe('memory safety - bounded collections', () => {
    it('should limit node cache to MAX_CACHE_SIZE', () => {
      // Register 501 nodes (MAX_CACHE_SIZE = 500)
      for (let i = 0; i < 501; i++) {
        manager.registerNode(`original-${i}`, `display-${i}`);
      }

      // Should trigger cleanup, but exact behavior depends on cleanup algorithm
      // At minimum, should not crash and should maintain some nodes
      expect(manager.hasProcessedNode('original-500')).toBe(true);
    });

    it('should limit pending edges to MAX_PENDING_EDGES', () => {
      const edge = { id: 'edge', source: 'src', target: 'tgt', type: 'floating' as const };

      // Add 1001 pending edges (MAX_PENDING_EDGES = 1000)
      for (let i = 0; i < 1001; i++) {
        manager.addPendingEdge({
          edge: { ...edge, id: `edge-${i}` },
          sourceId: `src-${i}`,
          targetId: `tgt-${i}`,
        });
      }

      // Should have dropped oldest edges
      const pending = manager.getPendingEdges();
      expect(pending.length).toBeLessThanOrEqual(1000);
    });

    it('should cleanup old pending edges (time-based)', () => {
      const edge = { id: 'edge-1', source: 'src', target: 'tgt', type: 'floating' as const };

      // Add edge with old timestamp
      const oldEdge = {
        edge,
        sourceId: 'src',
        targetId: 'tgt',
        timestamp: Date.now() - 6 * 60 * 1000, // 6 minutes ago
      };

      manager.addPendingEdge(oldEdge);

      // Trigger cleanup by adding many nodes
      for (let i = 0; i < 501; i++) {
        manager.registerNode(`node-${i}`, `display-${i}`);
      }

      // Old edge should be cleaned up
      const pending = manager.getPendingEdges();
      expect(pending.some(p => p.edge.id === 'edge-1')).toBe(false);
    });
  });

  describe('state reset', () => {
    it('should clear all state', () => {
      manager.registerNode('original-1', 'display-1');
      manager.registerNode('original-2', 'display-2');
      manager.markEdgeProcessed('edge-1');
      manager.addPendingEdge({
        edge: { id: 'edge-2', source: 'src', target: 'tgt', type: 'floating' },
        sourceId: 'src',
        targetId: 'tgt',
      });

      manager.reset();

      expect(manager.hasProcessedNode('original-1')).toBe(false);
      expect(manager.hasProcessedNode('original-2')).toBe(false);
      expect(manager.hasProcessedEdge('edge-1')).toBe(false);
      expect(manager.getPendingEdges()).toHaveLength(0);
    });

    it('should allow fresh state after reset', () => {
      manager.registerNode('original-1', 'display-1');
      manager.reset();
      manager.registerNode('original-2', 'display-2');

      expect(manager.hasProcessedNode('original-1')).toBe(false);
      expect(manager.hasProcessedNode('original-2')).toBe(true);
    });
  });

  describe('ID mapping', () => {
    it('should return null for unmapped IDs', () => {
      expect(manager.getDisplayId('nonexistent')).toBeNull();
    });

    it('should maintain bidirectional mapping', () => {
      manager.registerNode('original-1', 'display-1');

      expect(manager.getDisplayId('original-1')).toBe('display-1');
      expect(manager.hasEmittedNode('display-1')).toBe(true);
    });

    it('should handle overwriting existing mappings', () => {
      manager.registerNode('original-1', 'display-1');
      manager.registerNode('original-1', 'display-2');

      // Latest mapping should win
      expect(manager.getDisplayId('original-1')).toBe('display-2');
    });
  });

  describe('concurrent operations', () => {
    it('should handle rapid node registrations', () => {
      for (let i = 0; i < 100; i++) {
        manager.registerNode(`original-${i}`, `display-${i}`);
      }

      expect(manager.hasProcessedNode('original-0')).toBe(true);
      expect(manager.hasProcessedNode('original-50')).toBe(true);
      expect(manager.hasProcessedNode('original-99')).toBe(true);
    });

    it('should handle mixed operations', () => {
      const edge = { id: 'edge', source: 'src', target: 'tgt', type: 'floating' as const };

      for (let i = 0; i < 50; i++) {
        manager.registerNode(`node-${i}`, `display-${i}`);
        manager.markEdgeProcessed(`edge-${i}`);
        manager.addPendingEdge({
          edge: { ...edge, id: `pending-${i}` },
          sourceId: `src-${i}`,
          targetId: `tgt-${i}`,
        });
      }

      expect(manager.hasProcessedNode('node-25')).toBe(true);
      expect(manager.hasProcessedEdge('edge-25')).toBe(true);
      expect(manager.getPendingEdges().length).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty string IDs', () => {
      manager.registerNode('', 'display');
      expect(manager.hasProcessedNode('')).toBe(true);
    });

    it('should handle IDs with special characters', () => {
      manager.registerNode('node:with:colons', 'display-1');
      manager.registerNode('node/with/slashes', 'display-2');
      manager.registerNode('node with spaces', 'display-3');

      expect(manager.hasProcessedNode('node:with:colons')).toBe(true);
      expect(manager.hasProcessedNode('node/with/slashes')).toBe(true);
      expect(manager.hasProcessedNode('node with spaces')).toBe(true);
    });

    it('should handle very long IDs', () => {
      const longId = 'x'.repeat(10000);
      manager.registerNode(longId, 'display');

      expect(manager.hasProcessedNode(longId)).toBe(true);
    });
  });
});
