/**
 * Attack Simulation Components
 *
 * Export all UI components for attack simulation and purple teaming
 */

// Phase 1 Components
export { SimulationOrchestrator } from './SimulationOrchestrator';
export { ValidationResultsViewer } from './ValidationResultsViewer';
export { ControlGapAnalysis } from './ControlGapAnalysis';

// Phase 2 Components
export { RemediationPlanner } from './RemediationPlanner';
export { PurpleTeamWorkspace } from './PurpleTeamWorkspace';
export { ControlCoverageVisualization } from './ControlCoverageVisualization';
export { SimulationAnalyticsDashboard } from './SimulationAnalyticsDashboard';

// Re-export default exports for convenience
export { default as SimulationOrchestratorDefault } from './SimulationOrchestrator';
export { default as ValidationResultsViewerDefault } from './ValidationResultsViewer';
export { default as ControlGapAnalysisDefault } from './ControlGapAnalysis';
export { default as RemediationPlannerDefault } from './RemediationPlanner';
export { default as PurpleTeamWorkspaceDefault } from './PurpleTeamWorkspace';
export { default as ControlCoverageVisualizationDefault } from './ControlCoverageVisualization';
export { default as SimulationAnalyticsDashboardDefault } from './SimulationAnalyticsDashboard';
