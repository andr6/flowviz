// Export all IOC enrichment types
export * from './types/EnrichmentTypes';

// Export all services
export { iocEnrichmentService } from './services/IOCEnrichmentService';
export { multiProviderEnrichmentService } from './services/MultiProviderEnrichmentService';

// Export all components
export { IOCEnrichmentDashboard } from './components/IOCEnrichmentDashboard';

// Export API routes
export { default as iocEnrichmentRoutes } from '../../api/routes/ioc-enrichment';

// Export new provider-based enrichment system (Option A + B)
export * from './providers';
export * from './aggregation';
export * from './cache';
export * from './orchestration';

// Convenience functions for quick setup
import { getEnrichmentOrchestrator } from './orchestration';
import { initializeProvidersFromEnv } from './providers';

/**
 * Initialize the enrichment system from environment variables
 */
export function initializeEnrichmentSystem(): void {
  initializeProvidersFromEnv();
}

/**
 * Quick enrichment function (auto-initializes if needed)
 */
export async function enrichIOC(ioc: string, iocType: string) {
  const orchestrator = getEnrichmentOrchestrator();
  return await orchestrator.enrich(ioc, iocType);
}