// Advanced Security Components
export { default as AdvancedSecurityDashboard } from './AdvancedSecurityDashboard';
export { default as AttackSimulationOrchestrator } from './AttackSimulationOrchestrator';
export { default as DefensiveRecommendationsEngine } from './DefensiveRecommendationsEngine';
export { default as QuantitativeRiskAssessment } from './QuantitativeRiskAssessment';
export { default as ComplianceAuditingDashboard } from './ComplianceAuditingDashboard';
export { default as FrameworkIntegrationOrchestrator } from './FrameworkIntegrationOrchestrator';

// Re-export types for convenience
export type {
  PurpleTeamExercise,
  AttackSimulation,
  DefensiveRecommendation,
  RiskAssessment,
  ComplianceFramework,
  FrameworkIntegration
} from '../types/AdvancedSecurity';