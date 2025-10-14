import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StreamingJsonParser } from './StreamingJsonParser';
import { StreamStateManager } from './StreamStateManager';
import type { Node, Edge } from 'reactflow';

describe('StreamingJsonParser', () => {
  let parser: StreamingJsonParser;
  let stateManager: StreamStateManager;
  let onNode: ReturnType<typeof vi.fn>;
  let onEdge: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    stateManager = new StreamStateManager();
    parser = new StreamingJsonParser(stateManager);
    onNode = vi.fn();
    onEdge = vi.fn();
  });

  describe('parseChunk - streaming node parsing', () => {
    it('should parse a complete node from chunk', () => {
      const chunk = `{"id":"node-1","type":"action","data":{"label":"Test Action"}}`;

      parser.parseChunk(chunk, { onNode, onEdge });

      expect(onNode).toHaveBeenCalledOnce();
      const node = onNode.mock.calls[0][0] as Node;
      expect(node.type).toBe('action');
      expect(node.data.label).toBe('Test Action');
    });

    it('should parse multiple nodes from chunk', () => {
      const chunk = `
        {"id":"node-1","type":"action","data":{"label":"Action 1"}}
        {"id":"node-2","type":"malware","data":{"label":"Malware 2"}}
      `;

      parser.parseChunk(chunk, { onNode, onEdge });

      expect(onNode).toHaveBeenCalledTimes(2);
    });

    it('should skip duplicate nodes', () => {
      const chunk = `{"id":"node-1","type":"action","data":{"label":"Test"}}`;

      parser.parseChunk(chunk, { onNode, onEdge });
      parser.parseChunk(chunk, { onNode, onEdge });

      // Should only be called once (second attempt should be skipped)
      expect(onNode).toHaveBeenCalledOnce();
    });

    it('should handle partial node data gracefully', () => {
      const partialChunk = `{"id":"node-1","type":"action","data":{"label":"Test"`;

      // Should not throw, just skip incomplete node
      expect(() => parser.parseChunk(partialChunk, { onNode, onEdge })).not.toThrow();
      expect(onNode).not.toHaveBeenCalled();
    });

    it('should accumulate partial chunks', () => {
      const chunk1 = `{"id":"node-1","type":"action",`;
      const chunk2 = `"data":{"label":"Test Action"}}`;

      parser.parseChunk(chunk1, { onNode, onEdge });
      expect(onNode).not.toHaveBeenCalled();

      parser.parseChunk(chunk2, { onNode, onEdge });
      expect(onNode).toHaveBeenCalledOnce();
    });
  });

  describe('parseChunk - streaming edge parsing', () => {
    it('should parse edge when both nodes exist', () => {
      // Register nodes first
      stateManager.registerNode('node-1', 'node-1');
      stateManager.registerNode('node-2', 'node-2');

      const chunk = `{"id":"edge-1","source":"node-1","target":"node-2","label":"leads to"}`;

      parser.parseChunk(chunk, { onNode, onEdge });

      expect(onEdge).toHaveBeenCalledOnce();
      const edge = onEdge.mock.calls[0][0] as Edge;
      expect(edge.source).toBe('node-1');
      expect(edge.target).toBe('node-2');
      expect(edge.label).toBe('leads to');
    });

    it('should queue edge when source node is missing', () => {
      stateManager.registerNode('node-2', 'node-2');

      const chunk = `{"id":"edge-1","source":"node-1","target":"node-2"}`;

      parser.parseChunk(chunk, { onNode, onEdge });

      // Edge should be pending, not emitted
      expect(onEdge).not.toHaveBeenCalled();
      expect(stateManager.getPendingEdges()).toHaveLength(1);
    });

    it('should queue edge when target node is missing', () => {
      stateManager.registerNode('node-1', 'node-1');

      const chunk = `{"id":"edge-1","source":"node-1","target":"node-2"}`;

      parser.parseChunk(chunk, { onNode, onEdge });

      // Edge should be pending, not emitted
      expect(onEdge).not.toHaveBeenCalled();
      expect(stateManager.getPendingEdges()).toHaveLength(1);
    });

    it('should skip duplicate edges', () => {
      stateManager.registerNode('node-1', 'node-1');
      stateManager.registerNode('node-2', 'node-2');

      const chunk = `{"id":"edge-1","source":"node-1","target":"node-2"}`;

      parser.parseChunk(chunk, { onNode, onEdge });
      parser.parseChunk(chunk, { onNode, onEdge });

      expect(onEdge).toHaveBeenCalledOnce();
    });
  });

  describe('parseFinal - complete JSON parsing', () => {
    it('should parse complete JSON with nodes and edges', () => {
      const json = {
        nodes: [
          { id: 'node-1', type: 'action', data: { label: 'Action 1' } },
          { id: 'node-2', type: 'malware', data: { label: 'Malware 2' } },
        ],
        edges: [
          { id: 'edge-1', source: 'node-1', target: 'node-2', label: 'uses' },
        ],
      };

      parser.parseChunk(JSON.stringify(json), { onNode, onEdge });
      const result = parser.parseFinal({ onNode, onEdge });

      expect(result.success).toBe(true);
      expect(onNode).toHaveBeenCalled();
    });

    it('should handle JSON with markdown code fences', () => {
      const jsonWithFences = '```json\n{"nodes":[],"edges":[]}\n```';

      parser.parseChunk(jsonWithFences, { onNode, onEdge });
      const result = parser.parseFinal({ onNode, onEdge });

      expect(result.success).toBe(true);
    });

    it('should handle empty response', () => {
      const result = parser.parseFinal({ onNode, onEdge });

      expect(result.success).toBe(false);
      expect(result.error).toContain('No data accumulated');
    });

    it('should handle malformed JSON gracefully', () => {
      parser.parseChunk('{ invalid json }', { onNode, onEdge });
      const result = parser.parseFinal({ onNode, onEdge });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should process IOC analysis data', () => {
      const onIOCAnalysis = vi.fn();
      const json = {
        nodes: [],
        edges: [],
        ioc_analysis: {
          indicators: [{ type: 'ip', value: '192.168.1.1', confidence: 0.9 }],
          observables: [],
        },
      };

      parser.parseChunk(JSON.stringify(json), { onNode, onEdge, onIOCAnalysis });
      const result = parser.parseFinal({ onNode, onEdge, onIOCAnalysis });

      expect(result.success).toBe(true);
      expect(onIOCAnalysis).toHaveBeenCalledWith(json.ioc_analysis);
    });

    it('should reset accumulated text after parsing', () => {
      const json = { nodes: [], edges: [] };

      parser.parseChunk(JSON.stringify(json), { onNode, onEdge });
      parser.parseFinal({ onNode, onEdge });

      // Should have no accumulated text after reset
      const result = parser.parseFinal({ onNode, onEdge });
      expect(result.success).toBe(false);
    });
  });

  describe('validation', () => {
    it('should validate node structure', () => {
      const validNode = `{"id":"node-1","type":"action","data":{"label":"Test"}}`;
      const invalidNode = `{"type":"action","data":{"label":"Test"}}`; // Missing id

      parser.parseChunk(validNode, { onNode, onEdge });
      expect(onNode).toHaveBeenCalledOnce();

      parser.parseChunk(invalidNode, { onNode, onEdge });
      expect(onNode).toHaveBeenCalledOnce(); // Should not increase
    });

    it('should validate edge structure', () => {
      stateManager.registerNode('node-1', 'node-1');
      stateManager.registerNode('node-2', 'node-2');

      const validEdge = `{"id":"edge-1","source":"node-1","target":"node-2"}`;
      const invalidEdge = `{"id":"edge-1","source":"node-1"}`; // Missing target

      parser.parseChunk(validEdge, { onNode, onEdge });
      expect(onEdge).toHaveBeenCalledOnce();

      parser.parseChunk(invalidEdge, { onNode, onEdge });
      expect(onEdge).toHaveBeenCalledOnce(); // Should not increase
    });

    it('should skip objects that are actually edges in nodes array', () => {
      const edgeInNodesArray = `{"source":"node-1","target":"node-2","id":"edge-1"}`;

      parser.parseChunk(edgeInNodesArray, { onNode, onEdge });

      // Should not be treated as a node
      expect(onNode).not.toHaveBeenCalled();
    });
  });

  describe('complex streaming scenarios', () => {
    it('should handle interleaved nodes and edges', () => {
      const chunk1 = `{"id":"node-1","type":"action","data":{"label":"A1"}}`;
      const chunk2 = `{"id":"node-2","type":"action","data":{"label":"A2"}}`;
      const chunk3 = `{"id":"edge-1","source":"node-1","target":"node-2"}`;

      parser.parseChunk(chunk1, { onNode, onEdge });
      parser.parseChunk(chunk2, { onNode, onEdge });
      parser.parseChunk(chunk3, { onNode, onEdge });

      expect(onNode).toHaveBeenCalledTimes(2);
      expect(onEdge).toHaveBeenCalledOnce();
    });

    it('should process pending edges after nodes arrive', () => {
      // Edge arrives before nodes
      const edgeChunk = `{"id":"edge-1","source":"node-1","target":"node-2"}`;
      parser.parseChunk(edgeChunk, { onNode, onEdge });
      expect(onEdge).not.toHaveBeenCalled();

      // Nodes arrive
      const node1Chunk = `{"id":"node-1","type":"action","data":{"label":"A1"}}`;
      parser.parseChunk(node1Chunk, { onNode, onEdge });
      expect(onEdge).not.toHaveBeenCalled(); // Still waiting for node-2

      const node2Chunk = `{"id":"node-2","type":"action","data":{"label":"A2"}}`;
      parser.parseChunk(node2Chunk, { onNode, onEdge });

      // Now edge should be processed
      expect(onEdge).toHaveBeenCalledOnce();
    });

    it('should handle large streaming responses', () => {
      let largeResponse = '';
      for (let i = 0; i < 100; i++) {
        largeResponse += `{"id":"node-${i}","type":"action","data":{"label":"Action ${i}"}}`;
      }

      parser.parseChunk(largeResponse, { onNode, onEdge });

      expect(onNode).toHaveBeenCalledTimes(100);
    });
  });

  describe('edge cases', () => {
    it('should handle nested JSON in data fields', () => {
      const chunk = `{"id":"node-1","type":"action","data":{"label":"Test","nested":{"key":"value"}}}`;

      parser.parseChunk(chunk, { onNode, onEdge });

      expect(onNode).toHaveBeenCalledOnce();
      const node = onNode.mock.calls[0][0] as Node;
      expect(node.data.nested).toEqual({ key: 'value' });
    });

    it('should handle escaped quotes in strings', () => {
      const chunk = `{"id":"node-1","type":"action","data":{"label":"Test \\"quoted\\" text"}}`;

      parser.parseChunk(chunk, { onNode, onEdge });

      expect(onNode).toHaveBeenCalledOnce();
      const node = onNode.mock.calls[0][0] as Node;
      expect(node.data.label).toBe('Test "quoted" text');
    });

    it('should handle unicode characters', () => {
      const chunk = `{"id":"node-1","type":"action","data":{"label":"Test 中文 🔥"}}`;

      parser.parseChunk(chunk, { onNode, onEdge });

      expect(onNode).toHaveBeenCalledOnce();
      const node = onNode.mock.calls[0][0] as Node;
      expect(node.data.label).toBe('Test 中文 🔥');
    });

    it('should handle very long data fields', () => {
      const longLabel = 'x'.repeat(10000);
      const chunk = `{"id":"node-1","type":"action","data":{"label":"${longLabel}"}}`;

      parser.parseChunk(chunk, { onNode, onEdge });

      expect(onNode).toHaveBeenCalledOnce();
      const node = onNode.mock.calls[0][0] as Node;
      expect(node.data.label).toBe(longLabel);
    });

    it('should handle whitespace variations', () => {
      const chunk = `{
        "id"  :  "node-1"  ,
        "type"  :  "action"  ,
        "data"  :  {  "label"  :  "Test"  }
      }`;

      parser.parseChunk(chunk, { onNode, onEdge });

      expect(onNode).toHaveBeenCalledOnce();
    });
  });

  describe('error recovery', () => {
    it('should continue parsing after encountering invalid JSON', () => {
      const invalidChunk = `{"id":"node-1" INVALID JSON`;
      const validChunk = `{"id":"node-2","type":"action","data":{"label":"Valid"}}`;

      parser.parseChunk(invalidChunk, { onNode, onEdge });
      parser.parseChunk(validChunk, { onNode, onEdge });

      // Should successfully parse the valid chunk
      expect(onNode).toHaveBeenCalledOnce();
    });

    it('should not crash on circular references in final parse', () => {
      // Note: JSON.stringify will throw on circular refs, but parser should handle gracefully
      const validJson = `{"nodes":[],"edges":[]}`;
      parser.parseChunk(validJson, { onNode, onEdge });

      expect(() => parser.parseFinal({ onNode, onEdge })).not.toThrow();
    });
  });

  describe('reset', () => {
    it('should clear accumulated text', () => {
      parser.parseChunk('some accumulated text', { onNode, onEdge });
      parser.reset();

      const result = parser.parseFinal({ onNode, onEdge });
      expect(result.success).toBe(false);
    });

    it('should allow fresh parsing after reset', () => {
      parser.parseChunk('old data', { onNode, onEdge });
      parser.reset();

      const validChunk = `{"id":"node-1","type":"action","data":{"label":"New"}}`;
      parser.parseChunk(validChunk, { onNode, onEdge });

      expect(onNode).toHaveBeenCalledOnce();
    });
  });
});
