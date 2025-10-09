import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { Node, Edge, Viewport } from 'reactflow';

// Separate state by domain concerns
export interface AnalysisState {
  isStreaming: boolean;
  streamingResponse: string;
  currentAnalysis: string | null;
  error: string | null;
}

export interface FlowState {
  nodes: Node[];
  edges: Edge[];
  viewport: Viewport;
  selectedNodeId: string | null;
}

export interface UIState {
  showSaveDialog: boolean;
  showLoadDialog: boolean;
  showSettings: boolean;
  commandPaletteOpen: boolean;
}

export interface AppState {
  analysis: AnalysisState;
  flow: FlowState;
  ui: UIState;
}

// Action types with clear intent
type AppAction =
  | { type: 'ANALYSIS_START'; payload: { analysisType: string } }
  | { type: 'ANALYSIS_STREAM_UPDATE'; payload: { content: string } }
  | { type: 'ANALYSIS_COMPLETE'; payload: { nodes: Node[]; edges: Edge[] } }
  | { type: 'ANALYSIS_ERROR'; payload: { error: string } }
  | { type: 'UI_DIALOG_TOGGLE'; payload: { dialog: keyof UIState; open: boolean } }
  | { type: 'FLOW_NODE_SELECT'; payload: { nodeId: string | null } }
  | { type: 'FLOW_VIEWPORT_UPDATE'; payload: { viewport: Viewport } };

const initialState: AppState = {
  analysis: {
    isStreaming: false,
    streamingResponse: '',
    currentAnalysis: null,
    error: null,
  },
  flow: {
    nodes: [],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
    selectedNodeId: null,
  },
  ui: {
    showSaveDialog: false,
    showLoadDialog: false,
    showSettings: false,
    commandPaletteOpen: false,
  },
};

function appStateReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'ANALYSIS_START':
      return {
        ...state,
        analysis: {
          ...state.analysis,
          isStreaming: true,
          streamingResponse: '',
          currentAnalysis: action.payload.analysisType,
          error: null,
        },
      };

    case 'ANALYSIS_STREAM_UPDATE':
      return {
        ...state,
        analysis: {
          ...state.analysis,
          streamingResponse: state.analysis.streamingResponse + action.payload.content,
        },
      };

    case 'ANALYSIS_COMPLETE':
      return {
        ...state,
        analysis: {
          ...state.analysis,
          isStreaming: false,
          currentAnalysis: null,
        },
        flow: {
          ...state.flow,
          nodes: action.payload.nodes,
          edges: action.payload.edges,
        },
      };

    case 'ANALYSIS_ERROR':
      return {
        ...state,
        analysis: {
          ...state.analysis,
          isStreaming: false,
          error: action.payload.error,
        },
      };

    case 'UI_DIALOG_TOGGLE':
      return {
        ...state,
        ui: {
          ...state.ui,
          [action.payload.dialog]: action.payload.open,
        },
      };

    case 'FLOW_NODE_SELECT':
      return {
        ...state,
        flow: {
          ...state.flow,
          selectedNodeId: action.payload.nodeId,
        },
      };

    case 'FLOW_VIEWPORT_UPDATE':
      return {
        ...state,
        flow: {
          ...state.flow,
          viewport: action.payload.viewport,
        },
      };

    default:
      return state;
  }
}

const AppStateContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appStateReducer, initialState);

  return (
    <AppStateContext.Provider value={{ state, dispatch }}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppStateContext() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppStateContext must be used within AppStateProvider');
  }
  return context;
}

// Custom hooks for specific domains
export function useAnalysisState() {
  const { state, dispatch } = useAppStateContext();
  
  const startAnalysis = useCallback((analysisType: string) => {
    dispatch({ type: 'ANALYSIS_START', payload: { analysisType } });
  }, [dispatch]);
  
  const updateStream = useCallback((content: string) => {
    dispatch({ type: 'ANALYSIS_STREAM_UPDATE', payload: { content } });
  }, [dispatch]);
  
  const completeAnalysis = useCallback((nodes: Node[], edges: Edge[]) => {
    dispatch({ type: 'ANALYSIS_COMPLETE', payload: { nodes, edges } });
  }, [dispatch]);
  
  const setError = useCallback((error: string) => {
    dispatch({ type: 'ANALYSIS_ERROR', payload: { error } });
  }, [dispatch]);
  
  return {
    ...state.analysis,
    startAnalysis,
    updateStream,
    completeAnalysis,
    setError,
  };
}

export function useFlowState() {
  const { state, dispatch } = useAppStateContext();
  
  const selectNode = useCallback((nodeId: string | null) => {
    dispatch({ type: 'FLOW_NODE_SELECT', payload: { nodeId } });
  }, [dispatch]);
  
  const updateViewport = useCallback((viewport: Viewport) => {
    dispatch({ type: 'FLOW_VIEWPORT_UPDATE', payload: { viewport } });
  }, [dispatch]);
  
  return {
    ...state.flow,
    selectNode,
    updateViewport,
  };
}

export function useUIState() {
  const { state, dispatch } = useAppStateContext();
  
  const toggleDialog = useCallback((dialog: keyof UIState, open: boolean) => {
    dispatch({ type: 'UI_DIALOG_TOGGLE', payload: { dialog, open } });
  }, [dispatch]);
  
  return {
    ...state.ui,
    toggleDialog,
  };
}