import { useState, useEffect } from 'react';

import { recentFlowsService, type RecentFlow } from '../services/storage/recentFlows';

export interface UseRecentFlowsReturn {
  recentFlows: RecentFlow[];
  addRecentFlow: (flow: Omit<RecentFlow, 'id' | 'timestamp'>) => RecentFlow;
  removeRecentFlow: (id: string) => void;
  clearRecentFlows: () => void;
  updateRecentFlow: (id: string, updates: Partial<RecentFlow>) => RecentFlow | null;
  searchRecentFlows: (query: string) => RecentFlow[];
  getFlowById: (id: string) => RecentFlow | null;
  getFlowsBySourceType: (sourceType: RecentFlow['sourceType']) => RecentFlow[];
  getRecentFlowsGroupedByDate: () => { [key: string]: RecentFlow[] };
  refresh: () => void;
}

export const useRecentFlows = (): UseRecentFlowsReturn => {
  const [recentFlows, setRecentFlows] = useState<RecentFlow[]>([]);

  const refresh = () => {
    setRecentFlows(recentFlowsService.getRecentFlows());
  };

  useEffect(() => {
    refresh();
  }, []);

  const addRecentFlow = (flow: Omit<RecentFlow, 'id' | 'timestamp'>): RecentFlow => {
    const newFlow = recentFlowsService.addRecentFlow(flow);
    refresh();
    return newFlow;
  };

  const removeRecentFlow = (id: string): void => {
    recentFlowsService.removeRecentFlow(id);
    refresh();
  };

  const clearRecentFlows = (): void => {
    recentFlowsService.clearRecentFlows();
    refresh();
  };

  const updateRecentFlow = (id: string, updates: Partial<RecentFlow>): RecentFlow | null => {
    const updatedFlow = recentFlowsService.updateRecentFlow(id, updates);
    refresh();
    return updatedFlow;
  };

  const searchRecentFlows = (query: string): RecentFlow[] => {
    return recentFlowsService.searchRecentFlows(query);
  };

  const getFlowById = (id: string): RecentFlow | null => {
    return recentFlowsService.getFlowById(id);
  };

  const getFlowsBySourceType = (sourceType: RecentFlow['sourceType']): RecentFlow[] => {
    return recentFlowsService.getFlowsBySourceType(sourceType);
  };

  const getRecentFlowsGroupedByDate = (): { [key: string]: RecentFlow[] } => {
    return recentFlowsService.getRecentFlowsGroupedByDate();
  };

  return {
    recentFlows,
    addRecentFlow,
    removeRecentFlow,
    clearRecentFlows,
    updateRecentFlow,
    searchRecentFlows,
    getFlowById,
    getFlowsBySourceType,
    getRecentFlowsGroupedByDate,
    refresh,
  };
};