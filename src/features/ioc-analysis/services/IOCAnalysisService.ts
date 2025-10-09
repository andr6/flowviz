import { v4 as uuidv4 } from 'uuid';

import { IOC, IOA, IOCIOAAnalysisResult, IOCExtractionConfig, IOCExportFormat } from '../types/IOC';

import { ImageIOCExtractor } from './ImageIOCExtractor';
import { IOCExportService } from './IOCExportService';
import { IOCExtractorService } from './IOCExtractorService';

/**
 * Main service for comprehensive IOC/IOA analysis
 */
export class IOCAnalysisService {
  private textExtractor: IOCExtractorService;
  private imageExtractor: ImageIOCExtractor;
  private exportService: IOCExportService;
  
  constructor(config?: Partial<IOCExtractionConfig>) {
    this.textExtractor = new IOCExtractorService(config);
    this.imageExtractor = new ImageIOCExtractor();
    this.exportService = new IOCExportService();
  }

  /**
   * Perform comprehensive IOC/IOA analysis on text and images
   */
  async analyzeContent(input: {
    text?: string;
    images?: Array<{
      data: string | ArrayBuffer | Blob;
      url?: string;
      metadata?: { filename?: string; source?: string };
    }>;
    aiExtractedData?: {
      ioc_analysis?: {
        indicators?: any[];
        behaviors?: any[];
        summary?: any;
        extraction_metadata?: any;
      };
    };
    metadata?: {
      source?: string;
      title?: string;
      author?: string;
      publishDate?: Date;
      tags?: string[];
    };
  }): Promise<IOCIOAAnalysisResult> {
    const startTime = Date.now();
    const allIOCs: IOC[] = [];
    const allIOAs: IOA[] = [];
    
    try {
      // Extract IOCs from text
      if (input.text) {
        console.log('🔍 Extracting IOCs from text...');
        const textIOCs = await this.textExtractor.extractFromText(
          input.text, 
          input.metadata?.source || 'text-content'
        );
        allIOCs.push(...textIOCs);
        console.log(`✅ Found ${textIOCs.length} IOCs in text`);
      }

      // Extract IOCs from images
      if (input.images && input.images.length > 0) {
        console.log(`🖼️ Extracting IOCs from ${input.images.length} images...`);
        const imageIOCs = await this.imageExtractor.extractFromImages(input.images);
        allIOCs.push(...imageIOCs);
        console.log(`✅ Found ${imageIOCs.length} IOCs in images`);
      }

      // Process AI-extracted IOC/IOA data if available
      if (input.aiExtractedData?.ioc_analysis) {
        console.log('🤖 Processing AI-extracted IOC/IOA data...');
        const aiIOCs = this.processAIExtractedIOCs(input.aiExtractedData.ioc_analysis.indicators || []);
        const aiIOAs = this.processAIExtractedIOAs(input.aiExtractedData.ioc_analysis.behaviors || []);
        
        allIOCs.push(...aiIOCs);
        allIOAs.push(...aiIOAs);
        
        console.log(`✅ Processed ${aiIOCs.length} AI-extracted IOCs and ${aiIOAs.length} IOAs`);
        
        // Debug: Show IOC types processed
        const iocTypeCount: Record<string, number> = {};
        aiIOCs.forEach(ioc => {
          iocTypeCount[ioc.type] = (iocTypeCount[ioc.type] || 0) + 1;
        });
        console.log('📊 AI-extracted IOC types:', iocTypeCount);
      }

      // Create comprehensive analysis result
      const analysisResult = this.textExtractor.createAnalysisResult(allIOCs, allIOAs);
      analysisResult.reportMetadata.totalProcessingTime = Date.now() - startTime;
      
      // Add metadata to the result
      if (input.metadata) {
        analysisResult.reportMetadata = {
          ...analysisResult.reportMetadata,
          sourceMetadata: input.metadata
        };
      }

      console.log(`🎯 Analysis complete: ${analysisResult.summary.totalIOCs} IOCs, ${analysisResult.summary.totalIOAs} IOAs`);
      return analysisResult;
      
    } catch (error) {
      console.error('❌ IOC/IOA analysis failed:', error);
      
      // Return minimal result on error
      return this.textExtractor.createAnalysisResult(allIOCs, allIOAs);
    }
  }

  /**
   * Export analysis results in specified format
   */
  async exportAnalysis(
    analysisResult: IOCIOAAnalysisResult,
    format: IOCExportFormat
  ): Promise<string> {
    return await this.exportService.export(analysisResult, format);
  }

  /**
   * Get IOC/IOA statistics summary
   */
  getAnalysisSummary(analysisResult: IOCIOAAnalysisResult): {
    overview: {
      totalIOCs: number;
      totalIOAs: number;
      highConfidenceIOCs: number;
      maliciousIOCs: number;
      criticalIOAs: number;
    };
    topTypes: Array<{ type: string; count: number; percentage: number }>;
    topCategories: Array<{ category: string; count: number; percentage: number }>;
    timelineSpan: { earliest: Date; latest: Date };
    riskAssessment: 'low' | 'medium' | 'high' | 'critical';
  } {
    const { iocs, ioas, summary } = analysisResult;
    
    const highConfidenceIOCs = iocs.filter(ioc => ioc.confidence === 'high').length;
    const maliciousIOCs = iocs.filter(ioc => ioc.malicious === true).length;
    const criticalIOAs = ioas.filter(ioa => ioa.severity === 'critical').length;
    
    // Calculate top types
    const typeEntries = Object.entries(summary.iocsByType);
    const totalIOCs = summary.totalIOCs;
    const topTypes = typeEntries
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([type, count]) => ({
        type,
        count,
        percentage: Math.round((count / totalIOCs) * 100)
      }));
    
    // Calculate top categories
    const categoryEntries = Object.entries(summary.ioasByCategory);
    const totalIOAs = summary.totalIOAs;
    const topCategories = categoryEntries
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([category, count]) => ({
        category,
        count,
        percentage: Math.round((count / totalIOAs) * 100)
      }));
    
    // Calculate timeline span
    const timestamps = [...iocs.map(ioc => ioc.firstSeen), ...ioas.map(ioa => ioa.firstObserved)];
    const earliest = timestamps.length > 0 ? new Date(Math.min(...timestamps.map(t => t.getTime()))) : new Date();
    const latest = timestamps.length > 0 ? new Date(Math.max(...timestamps.map(t => t.getTime()))) : new Date();
    
    // Assess risk level
    let riskAssessment: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (criticalIOAs > 0 || maliciousIOCs > 10) {
      riskAssessment = 'critical';
    } else if (maliciousIOCs > 5 || highConfidenceIOCs > 20) {
      riskAssessment = 'high';
    } else if (maliciousIOCs > 0 || highConfidenceIOCs > 10) {
      riskAssessment = 'medium';
    }
    
    return {
      overview: {
        totalIOCs,
        totalIOAs,
        highConfidenceIOCs,
        maliciousIOCs,
        criticalIOAs
      },
      topTypes,
      topCategories,
      timelineSpan: { earliest, latest },
      riskAssessment
    };
  }

  /**
   * Convert AI-extracted IOC data to internal format
   */
  private processAIExtractedIOCs(aiIOCs: any[]): IOC[] {
    const processedIOCs: IOC[] = [];
    const now = new Date();
    
    for (const aiIOC of aiIOCs) {
      try {
        let correctedType = aiIOC.type;
        const value = aiIOC.value;
        
        // Apply the same classification logic as text extraction
        if (aiIOC.type === 'domain') {
          // Check if this looks like a filename instead of a domain
          if (this.looksLikeFilename(value)) {
            correctedType = 'filename';
            console.log(`🔄 Corrected IOC type: "${value}" from domain to filename`);
          } else if (!this.isValidDomain(value)) {
            // Skip invalid domains entirely
            console.log(`⚠️ Skipping invalid domain: "${value}"`);
            continue;
          }
        }
        
        // Validate the IOC with corrected type
        if (!this.validateIOCType(correctedType, value)) {
          console.log(`❌ Skipping invalid ${correctedType} IOC: "${value}"`);
          continue;
        }
        
        const ioc: IOC = {
          id: uuidv4(),
          type: correctedType,
          value,
          confidence: aiIOC.confidence || 'medium',
          source: 'metadata',
          sourceLocation: aiIOC.source_location,
          context: aiIOC.context,
          firstSeen: now,
          lastSeen: now,
          tags: aiIOC.tags || [],
          description: aiIOC.description,
          malicious: aiIOC.malicious,
          tlp: 'WHITE'
        };
        
        processedIOCs.push(ioc);
      } catch (error) {
        console.error('Failed to process AI-extracted IOC:', error, aiIOC);
      }
    }
    
    return processedIOCs;
  }

  /**
   * Convert AI-extracted IOA data to internal format
   */
  private processAIExtractedIOAs(aiIOAs: any[]): IOA[] {
    const processedIOAs: IOA[] = [];
    const now = new Date();
    
    for (const aiIOA of aiIOAs) {
      try {
        const ioa: IOA = {
          id: uuidv4(),
          name: aiIOA.name,
          description: aiIOA.description,
          category: aiIOA.category,
          confidence: aiIOA.confidence || 'medium',
          source: 'metadata',
          sourceLocation: aiIOA.source_location,
          context: aiIOA.context,
          mitreAttackId: aiIOA.mitre_attack_id,
          mitreTactic: aiIOA.mitre_tactic,
          mitreTechnique: aiIOA.mitre_technique,
          signatures: aiIOA.signatures || [],
          relatedIOCs: aiIOA.related_iocs || [],
          firstObserved: now,
          lastObserved: now,
          tags: aiIOA.tags || [],
          severity: aiIOA.severity || 'medium'
        };
        
        processedIOAs.push(ioa);
      } catch (error) {
        console.error('Failed to process AI-extracted IOA:', error, aiIOA);
      }
    }
    
    return processedIOAs;
  }

  /**
   * Validate and enrich IOCs using threat intelligence
   */
  async enrichIOCs(iocs: IOC[]): Promise<IOC[]> {
    // This would integrate with threat intelligence feeds
    // For now, return as-is
    console.warn('IOC enrichment not yet implemented - would integrate with threat intel feeds');
    return iocs;
  }

  /**
   * Create IOC/IOA relationships based on context and timing
   */
  createRelationships(iocs: IOC[], ioas: IOA[]) {
    // This would analyze IOCs and IOAs to create relationship mappings
    // For now, return empty array
    console.warn('IOC/IOA relationship creation not yet fully implemented');
    return [];
  }

  /**
   * Generate detection rules from IOCs
   */
  generateDetectionRules(iocs: IOC[], format: 'yara' | 'suricata' | 'sigma'): string {
    const mockResult = this.textExtractor.createAnalysisResult(iocs, []);
    const exportFormat: IOCExportFormat = {
      format: format as any,
      includeIOCs: true,
      includeIOAs: false,
      includeRelationships: false,
      includeTimeline: false
    };
    
    return this.exportService.export(mockResult, exportFormat) as any;
  }

  /**
   * Search IOCs by various criteria
   */
  searchIOCs(
    iocs: IOC[], 
    criteria: {
      type?: string;
      value?: string;
      confidence?: 'low' | 'medium' | 'high';
      malicious?: boolean;
      tags?: string[];
      dateRange?: { start: Date; end: Date };
    }
  ): IOC[] {
    return iocs.filter(ioc => {
      if (criteria.type && ioc.type !== criteria.type) {return false;}
      if (criteria.value && !ioc.value.toLowerCase().includes(criteria.value.toLowerCase())) {return false;}
      if (criteria.confidence && ioc.confidence !== criteria.confidence) {return false;}
      if (criteria.malicious !== undefined && ioc.malicious !== criteria.malicious) {return false;}
      if (criteria.tags && !criteria.tags.some(tag => ioc.tags.includes(tag))) {return false;}
      if (criteria.dateRange) {
        const iocDate = ioc.firstSeen.getTime();
        if (iocDate < criteria.dateRange.start.getTime() || iocDate > criteria.dateRange.end.getTime()) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * Check if a value looks like a filename rather than a domain
   */
  private looksLikeFilename(value: string): boolean {
    // Check if string has executable or document file extensions
    const fileExtensions = /\.(exe|dll|bat|cmd|ps1|vbs|js|jar|zip|rar|7z|pdf|doc|docx|xls|xlsx|ppt|pptx|scr|pif|msi|tmp|log|bin|dat|sys|drv|ocx|cpl|ini|cfg|conf|txt|csv|xml|json|yml|yaml)$/i;
    
    if (fileExtensions.test(value)) {
      return true;
    }
    
    // Don't treat valid domain TLDs as filenames
    const validDomainTlds = ['com', 'org', 'net', 'edu', 'gov', 'mil', 'int', 'biz', 'info', 'name', 'pro', 'aero', 'coop', 'museum'];
    const parts = value.split('.');
    if (parts.length >= 2) {
      const extension = parts[parts.length - 1].toLowerCase();
      // If it ends with a valid domain TLD, it's likely a domain
      if (validDomainTlds.includes(extension) || extension.length === 2) {
        return false;
      }
    }
    
    // Check if it looks like a filename pattern (short name with non-domain extension)
    if (parts.length === 2) {
      const [name, extension] = parts;
      // If name is short and extension is 1-4 chars and NOT a domain TLD, likely a filename
      if (name.length <= 20 && extension.length >= 1 && extension.length <= 4) {
        return !validDomainTlds.includes(extension.toLowerCase()) && extension.length <= 4;
      }
    }
    
    return false;
  }

  /**
   * Validate if a value is a legitimate domain
   */
  private isValidDomain(value: string): boolean {
    // Don't treat filenames with executable extensions as domains
    if (value.match(/\.(exe|dll|bat|cmd|ps1|vbs|js|jar|zip|rar|7z|pdf|doc|docx|xls|xlsx|ppt|pptx|scr|pif|msi|tmp|log|bin|dat)$/i)) {
      return false;
    }
    
    // Don't treat single-word filenames as domains
    if (!value.includes('.') || value.split('.').length < 2) {
      return false;
    }
    
    // Require at least one valid TLD
    const validTlds = ['com', 'org', 'net', 'edu', 'gov', 'mil', 'int', 'arpa', 'biz', 'info', 'name', 'pro', 'aero', 'coop', 'museum'];
    const tld = value.split('.').pop()?.toLowerCase();
    const domainLength = value.length;
    
    // Domain should be reasonable length and have valid TLD
    return tld && domainLength >= 4 && domainLength <= 253 ? (validTlds.includes(tld) || tld.length === 2) : false;
  }

  /**
   * Validate IOC type and value combination
   */
  private validateIOCType(type: string, value: string): boolean {
    // Basic validation
    if (!value || value.length < 1) {return false;}
    
    switch (type) {
      case 'filename':
        // Require reasonable filename length and format
        return value.length >= 3 && value.length <= 255 && value.includes('.');
      
      case 'domain':
        return this.isValidDomain(value);
      
      case 'process-name':
        // Process names should end with .exe or .dll
        return value.match(/\.(exe|dll)$/i) !== null;
      
      case 'command-line':
        // Command lines should contain executable or command
        const hasExecutable = value.match(/\.(exe|bat|cmd|ps1|vbs|js)\b/i);
        const hasCommand = value.match(/\b(cmd|powershell|wmic|net|netstat|tasklist|schtasks|rundll32|regsvr32|certutil|bitsadmin|sc|reg)\b/i);
        return hasExecutable !== null || hasCommand !== null;
      
      default:
        return true;
    }
  }
}