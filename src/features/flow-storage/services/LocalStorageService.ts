import { SavedFlow, StorageStats, ImportResult } from '../types/SavedFlow';

import { IFlowStorage, StorageError } from './StorageInterface';

export class LocalStorageService implements IFlowStorage {
  private readonly STORAGE_KEY = 'flowviz_saved_flows';
  private readonly VERSION = '1.0.0';
  private readonly MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB limit

  async saveFlow(flow: SavedFlow): Promise<void> {
    try {
      const flows = await this.listFlows();
      const existingIndex = flows.findIndex(f => f.id === flow.id);
      
      // Update timestamps and metadata
      flow.metadata.updatedAt = new Date().toISOString();
      flow.metadata.version = this.VERSION;
      flow.metadata.nodeCount = flow.nodes.length;
      flow.metadata.edgeCount = flow.edges.length;
      
      if (existingIndex >= 0) {
        flows[existingIndex] = flow;
      } else {
        flow.metadata.createdAt = flow.metadata.createdAt || new Date().toISOString();
        flows.push(flow);
      }
      
      // Sort by updatedAt (newest first)
      flows.sort((a, b) => 
        new Date(b.metadata.updatedAt).getTime() - 
        new Date(a.metadata.updatedAt).getTime()
      );
      
      this.saveToStorage(flows);
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      throw new StorageError(`Failed to save flow: ${error.message}`);
    }
  }

  async loadFlow(id: string): Promise<SavedFlow> {
    const flows = await this.listFlows();
    const flow = flows.find(f => f.id === id);
    if (!flow) {
      throw new StorageError(`Flow with ID ${id} not found`, 'NOT_FOUND');
    }
    return flow;
  }

  async listFlows(): Promise<SavedFlow[]> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) {return [];}
      
      const flows = JSON.parse(stored) as SavedFlow[];
      
      // Validate each flow
      return flows.filter(flow => this.validateFlow(flow) !== null);
    } catch (error) {
      console.error('Error loading flows from storage:', error);
      return [];
    }
  }

  async deleteFlow(id: string): Promise<void> {
    const flows = await this.listFlows();
    const filtered = flows.filter(f => f.id !== id);
    
    if (filtered.length === flows.length) {
      throw new StorageError(`Flow with ID ${id} not found`, 'NOT_FOUND');
    }
    
    this.saveToStorage(filtered);
  }

  async deleteMultiple(ids: string[]): Promise<void> {
    const flows = await this.listFlows();
    const filtered = flows.filter(f => !ids.includes(f.id));
    this.saveToStorage(filtered);
  }

  async duplicateFlow(id: string, newTitle?: string): Promise<SavedFlow> {
    const original = await this.loadFlow(id);
    const timestamp = new Date().toISOString();
    
    const duplicate: SavedFlow = {
      ...original,
      id: crypto.randomUUID(),
      title: newTitle || `${original.title} (Copy)`,
      metadata: {
        ...original.metadata,
        createdAt: timestamp,
        updatedAt: timestamp,
      }
    };
    
    await this.saveFlow(duplicate);
    return duplicate;
  }

  async searchFlows(query: string): Promise<SavedFlow[]> {
    const flows = await this.listFlows();
    const searchTerm = query.toLowerCase();
    
    return flows.filter(flow => 
      flow.title.toLowerCase().includes(searchTerm) ||
      flow.metadata.description?.toLowerCase().includes(searchTerm) ||
      flow.metadata.tags.some(tag => tag.toLowerCase().includes(searchTerm)) ||
      flow.sourceUrl?.toLowerCase().includes(searchTerm)
    );
  }

  async getFlowsByTags(tags: string[]): Promise<SavedFlow[]> {
    const flows = await this.listFlows();
    return flows.filter(flow =>
      tags.some(tag => flow.metadata.tags.includes(tag))
    );
  }

  async exportFlow(id: string, filename?: string): Promise<Blob> {
    const flow = await this.loadFlow(id);
    const exportData = {
      ...flow,
      exportedAt: new Date().toISOString(),
      exportedBy: 'FlowViz Open Source',
      version: this.VERSION
    };
    
    return new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
  }

  async exportAllFlows(): Promise<Blob> {
    const flows = await this.listFlows();
    const exportData = {
      flows,
      exportedAt: new Date().toISOString(),
      exportedBy: 'FlowViz Open Source',
      version: this.VERSION,
      totalFlows: flows.length
    };
    
    return new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
  }

  async importFlow(file: File): Promise<SavedFlow> {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      // This method now only handles single flows
      // Bulk exports should be handled by importFlows
      const flow = data;
      
      // Validate the flow
      const validatedFlow = this.validateFlow(flow);
      if (!validatedFlow) {
        throw new Error('Invalid flow format');
      }
      
      // Generate new ID to avoid conflicts
      validatedFlow.id = crypto.randomUUID();
      validatedFlow.metadata.updatedAt = new Date().toISOString();
      
      await this.saveFlow(validatedFlow);
      return validatedFlow;
    } catch (error) {
      throw new StorageError(`Failed to import flow: ${error.message}`, 'INVALID_FORMAT');
    }
  }

  async importFlows(files: FileList): Promise<ImportResult> {
    const result: ImportResult = {
      success: [],
      failed: [],
      duplicates: []
    };
    
    for (const file of Array.from(files)) {
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        // Handle different import formats
        if (data.flows && Array.isArray(data.flows)) {
          // Bulk export format - import ALL flows
          if (data.flows.length === 0) {
            result.failed.push({
              filename: file.name,
              error: 'No flows found in bulk export file'
            });
            continue;
          }
          
          // Import each flow in the bulk export
          for (const flowData of data.flows) {
            try {
              const validatedFlow = this.validateFlow(flowData);
              if (!validatedFlow) {
                result.failed.push({
                  filename: file.name,
                  error: `Invalid flow format for flow: ${flowData.title || 'Unknown'}`
                });
                continue;
              }
              
              // Generate new ID and save
              validatedFlow.id = crypto.randomUUID();
              validatedFlow.metadata.updatedAt = new Date().toISOString();
              
              await this.saveFlow(validatedFlow);
              result.success.push(validatedFlow);
            } catch (error) {
              result.failed.push({
                filename: file.name,
                error: `Failed to import flow: ${error.message}`
              });
            }
          }
        } else {
          // Single flow format - use existing importFlow method
          const flow = await this.importFlow(file);
          result.success.push(flow);
        }
      } catch (error) {
        result.failed.push({
          filename: file.name,
          error: error.message
        });
      }
    }
    
    return result;
  }

  async getStorageStats(): Promise<StorageStats> {
    const flows = await this.listFlows();
    const storageData = localStorage.getItem(this.STORAGE_KEY) || '[]';
    
    const stats: StorageStats = {
      totalFlows: flows.length,
      storageUsed: new Blob([storageData]).size,
    };
    
    if (flows.length > 0) {
      const sortedByDate = [...flows].sort((a, b) => 
        new Date(a.metadata.createdAt).getTime() - new Date(b.metadata.createdAt).getTime()
      );
      
      stats.oldestFlow = sortedByDate[0].metadata.createdAt;
      stats.newestFlow = sortedByDate[sortedByDate.length - 1].metadata.createdAt;
      stats.averageNodes = Math.round(
        flows.reduce((sum, flow) => sum + flow.metadata.nodeCount, 0) / flows.length
      );
      stats.averageEdges = Math.round(
        flows.reduce((sum, flow) => sum + flow.metadata.edgeCount, 0) / flows.length
      );
    }
    
    return stats;
  }

  async clearAllFlows(): Promise<void> {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  async updateFlowMetadata(id: string, updates: Partial<SavedFlow['metadata']>): Promise<void> {
    const flow = await this.loadFlow(id);
    flow.metadata = {
      ...flow.metadata,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    await this.saveFlow(flow);
  }

  validateFlow(flow: any): SavedFlow | null {
    try {
      // Check required fields
      if (!flow.id || !flow.title || !flow.nodes || !flow.edges || !flow.metadata) {
        return null;
      }
      
      // Check arrays
      if (!Array.isArray(flow.nodes) || !Array.isArray(flow.edges)) {
        return null;
      }
      
      // Check metadata structure
      if (!flow.metadata.createdAt || !flow.metadata.updatedAt) {
        return null;
      }
      
      // Ensure required metadata fields exist
      const validatedFlow: SavedFlow = {
        id: flow.id,
        title: flow.title,
        sourceUrl: flow.sourceUrl,
        sourceText: flow.sourceText,
        inputMode: flow.inputMode || 'url',
        nodes: flow.nodes,
        edges: flow.edges,
        metadata: {
          createdAt: flow.metadata.createdAt,
          updatedAt: flow.metadata.updatedAt,
          version: flow.metadata.version || '1.0.0',
          description: flow.metadata.description,
          tags: Array.isArray(flow.metadata.tags) ? flow.metadata.tags : [],
          nodeCount: flow.metadata.nodeCount || flow.nodes.length,
          edgeCount: flow.metadata.edgeCount || flow.edges.length,
        },
        visualization: flow.visualization || {},
        analysis: flow.analysis || {}
      };
      
      return validatedFlow;
    } catch {
      return null;
    }
  }

  async isValidFlowFile(file: File): Promise<boolean> {
    try {
      if (!file.type.includes('json') && !file.name.endsWith('.json') && !file.name.endsWith('.flowviz')) {
        return false;
      }
      
      const text = await file.text();
      const data = JSON.parse(text);
      
      // Check if it's a single flow or bulk export
      if (data.flows && Array.isArray(data.flows)) {
        return data.flows.length > 0 && this.validateFlow(data.flows[0]) !== null;
      }
      
      return this.validateFlow(data) !== null;
    } catch {
      return false;
    }
  }

  private saveToStorage(flows: SavedFlow[]): void {
    const data = JSON.stringify(flows);
    const size = new Blob([data]).size;
    
    if (size > this.MAX_STORAGE_SIZE) {
      throw new StorageError(
        `Storage quota would be exceeded. Current size: ${Math.round(size / 1024)}KB, Limit: ${Math.round(this.MAX_STORAGE_SIZE / 1024)}KB`,
        'QUOTA_EXCEEDED'
      );
    }
    
    try {
      localStorage.setItem(this.STORAGE_KEY, data);
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        throw new StorageError(
          'Browser storage quota exceeded. Please delete some saved flows.',
          'QUOTA_EXCEEDED'
        );
      }
      throw new StorageError(`Failed to save to storage: ${error.message}`);
    }
  }
}