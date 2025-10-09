export interface RecentFlow {
  id: string;
  title: string;
  description?: string;
  sourceType: 'url' | 'text' | 'pdf';
  sourceContent: string; // URL, text preview, or filename
  timestamp: number;
  tags?: string[];
  nodeCount?: number;
  edgeCount?: number;
}

const RECENT_FLOWS_KEY = 'threatflow_recent_flows';
const MAX_RECENT_FLOWS = 10;

class RecentFlowsService {
  private recentFlows: RecentFlow[] = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(RECENT_FLOWS_KEY);
      if (stored) {
        this.recentFlows = JSON.parse(stored);
        // Clean up old flows (older than 30 days)
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        this.recentFlows = this.recentFlows.filter(flow => flow.timestamp > thirtyDaysAgo);
        this.saveToStorage();
      }
    } catch (error) {
      console.warn('Failed to load recent flows from storage:', error);
      this.recentFlows = [];
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(RECENT_FLOWS_KEY, JSON.stringify(this.recentFlows));
    } catch (error) {
      console.warn('Failed to save recent flows to storage:', error);
    }
  }

  private generateFlowId(flow: Omit<RecentFlow, 'id' | 'timestamp'>): string {
    // Create a unique ID based on the flow content
    const content = `${flow.sourceType}_${flow.sourceContent}_${flow.title}`;
    return btoa(content).replace(/[/+=]/g, '').substring(0, 16);
  }

  addRecentFlow(flow: Omit<RecentFlow, 'id' | 'timestamp'>): RecentFlow {
    const id = this.generateFlowId(flow);
    const timestamp = Date.now();
    
    // Remove existing flow with same ID if it exists
    this.recentFlows = this.recentFlows.filter(f => f.id !== id);
    
    // Add new flow at the beginning
    const newFlow: RecentFlow = {
      ...flow,
      id,
      timestamp,
    };
    
    this.recentFlows.unshift(newFlow);
    
    // Keep only the most recent flows
    if (this.recentFlows.length > MAX_RECENT_FLOWS) {
      this.recentFlows = this.recentFlows.slice(0, MAX_RECENT_FLOWS);
    }
    
    this.saveToStorage();
    return newFlow;
  }

  getRecentFlows(): RecentFlow[] {
    return [...this.recentFlows];
  }

  removeRecentFlow(id: string): void {
    this.recentFlows = this.recentFlows.filter(flow => flow.id !== id);
    this.saveToStorage();
  }

  clearRecentFlows(): void {
    this.recentFlows = [];
    this.saveToStorage();
  }

  updateRecentFlow(id: string, updates: Partial<RecentFlow>): RecentFlow | null {
    const flowIndex = this.recentFlows.findIndex(flow => flow.id === id);
    if (flowIndex === -1) {
      return null;
    }

    this.recentFlows[flowIndex] = {
      ...this.recentFlows[flowIndex],
      ...updates,
      id, // Ensure ID doesn't change
      timestamp: Date.now(), // Update timestamp
    };

    this.saveToStorage();
    return this.recentFlows[flowIndex];
  }

  getFlowById(id: string): RecentFlow | null {
    return this.recentFlows.find(flow => flow.id === id) || null;
  }

  searchRecentFlows(query: string): RecentFlow[] {
    const searchTerm = query.toLowerCase();
    return this.recentFlows.filter(flow =>
      flow.title.toLowerCase().includes(searchTerm) ||
      flow.description?.toLowerCase().includes(searchTerm) ||
      flow.sourceContent.toLowerCase().includes(searchTerm) ||
      flow.tags?.some(tag => tag.toLowerCase().includes(searchTerm))
    );
  }

  getFlowsBySourceType(sourceType: RecentFlow['sourceType']): RecentFlow[] {
    return this.recentFlows.filter(flow => flow.sourceType === sourceType);
  }

  getRecentFlowsGroupedByDate(): { [key: string]: RecentFlow[] } {
    const groups: { [key: string]: RecentFlow[] } = {};
    const now = new Date();
    
    this.recentFlows.forEach(flow => {
      const flowDate = new Date(flow.timestamp);
      const diffInDays = Math.floor((now.getTime() - flowDate.getTime()) / (1000 * 60 * 60 * 24));
      
      let groupKey: string;
      if (diffInDays === 0) {
        groupKey = 'Today';
      } else if (diffInDays === 1) {
        groupKey = 'Yesterday';
      } else if (diffInDays <= 7) {
        groupKey = 'This week';
      } else if (diffInDays <= 30) {
        groupKey = 'This month';
      } else {
        groupKey = 'Older';
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(flow);
    });
    
    return groups;
  }
}

// Export a singleton instance
export const recentFlowsService = new RecentFlowsService();