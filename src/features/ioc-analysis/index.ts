// IOC Analysis Feature Exports

// Types
export * from './types/IOC';

// Services
export { IOCExtractorService } from './services/IOCExtractorService';
export { ImageIOCExtractor } from './services/ImageIOCExtractor';
export { IOCExportService } from './services/IOCExportService';
export { IOCAnalysisService } from './services/IOCAnalysisService';

// Main service instance for easy import
export const createIOCAnalysisService = (config?: any) => new IOCAnalysisService(config);