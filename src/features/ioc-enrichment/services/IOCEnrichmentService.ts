import { EventEmitter } from 'events';

import { createPicusSecurityService } from '../../../integrations/picus/services/PicusSecurityService.js';
import { PicusSecurityService } from '../../../integrations/picus/services/PicusSecurityService.js';
import { PicusEnrichmentResult } from '../../../integrations/picus/types/PicusTypes.js';
import { logger } from '../../../shared/utils/logger.js';
import { threatIntelligenceService } from '../../threat-intelligence/services/ThreatIntelligenceService.js';

export interface IOCEnrichmentRequest {
  indicators: Array<{
    type: string;
    value: string;
    context?: string;
    confidence?: number;
  }>;
  sources: EnrichmentSource[];
  priority: 'low' | 'medium' | 'high';
  organizationId: string;
  requestId?: string;
}

export type EnrichmentSource = 
  | 'threat_intelligence' 
  | 'picus_security' 
  | 'virustotal' 
  | 'alienvault_otx' 
  | 'misp' 
  | 'crowdstrike'
  | 'recorded_future'
  | 'hybrid_analysis'
  | 'urlvoid'
  | 'abuse_ipdb';

export interface IOCEnrichmentResult {
  requestId: string;
  indicators: EnrichedIndicator[];
  summary: EnrichmentSummary;
  processingTime: number;
  timestamp: string;
  sources: SourceResult[];
}

export interface EnrichedIndicator {
  original: {
    type: string;
    value: string;
    context?: string;
    confidence?: number;
  };
  enrichment: {
    reputation: ReputationData;
    threatIntelligence: ThreatIntelligenceData;
    technicalAnalysis: TechnicalAnalysisData;
    contextualData: ContextualData;
    riskAssessment: RiskAssessmentData;
    actionableIntelligence: ActionableIntelligenceData;
  };
  confidence: number;
  riskScore: number;
  lastUpdated: string;
}

export interface ReputationData {
  verdict: 'benign' | 'suspicious' | 'malicious' | 'unknown';
  score: number; // 0-100
  sources: Array<{
    source: string;
    verdict: string;
    score: number;
    lastSeen: string;
  }>;
  consensus: {
    malicious: number;
    suspicious: number;
    benign: number;
    unknown: number;
  };
}

export interface ThreatIntelligenceData {
  campaigns: Array<{
    name: string;
    description: string;
    threatActor: string;
    firstSeen: string;
    lastSeen: string;
    confidence: number;
  }>;
  malwareFamilies: Array<{
    name: string;
    description: string;
    category: string;
    firstSeen: string;
    confidence: number;
  }>;
  mitreAttackTechniques: Array<{
    techniqueId: string;
    techniqueName: string;
    tactic: string;
    description: string;
    confidence: number;
  }>;
  threatActors: Array<{
    name: string;
    description: string;
    country: string;
    motivations: string[];
    confidence: number;
  }>;
}

export interface TechnicalAnalysisData {
  geolocation?: {
    country: string;
    city: string;
    coordinates: [number, number];
    asn: string;
    organization: string;
  };
  whoisData?: {
    registrar: string;
    registrationDate: string;
    expirationDate: string;
    registrant: string;
    nameServers: string[];
  };
  dnsData?: {
    aRecords: string[];
    mxRecords: string[];
    nsRecords: string[];
    txtRecords: string[];
  };
  fileAnalysis?: {
    fileType: string;
    size: number;
    entropy: number;
    signatures: string[];
    packers: string[];
    imports: string[];
    exports: string[];
  };
  networkAnalysis?: {
    openPorts: number[];
    services: Array<{
      port: number;
      protocol: string;
      service: string;
      version?: string;
    }>;
    ssl?: {
      certificate: string;
      issuer: string;
      validFrom: string;
      validTo: string;
    };
  };
}

export interface ContextualData {
  firstSeen: string;
  lastSeen: string;
  frequency: number;
  prevalence: 'rare' | 'uncommon' | 'common' | 'widespread';
  relatedIndicators: Array<{
    type: string;
    value: string;
    relationship: string;
    confidence: number;
  }>;
  tags: string[];
  comments: Array<{
    source: string;
    comment: string;
    timestamp: string;
    author?: string;
  }>;
}

export interface RiskAssessmentData {
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: Array<{
    factor: string;
    impact: 'low' | 'medium' | 'high';
    description: string;
  }>;
  businessImpact: {
    availability: 'low' | 'medium' | 'high';
    integrity: 'low' | 'medium' | 'high';
    confidentiality: 'low' | 'medium' | 'high';
  };
  recommendations: Array<{
    action: string;
    priority: 'low' | 'medium' | 'high';
    description: string;
    timeline: string;
  }>;
}

export interface ActionableIntelligenceData {
  immediateActions: string[];
  investigationSteps: string[];
  containmentMeasures: string[];
  preventionMeasures: string[];
  monitoringRecommendations: string[];
  picusValidation?: PicusEnrichmentResult;
}

export interface EnrichmentSummary {
  totalIndicators: number;
  maliciousIndicators: number;
  suspiciousIndicators: number;
  benignIndicators: number;
  unknownIndicators: number;
  highRiskIndicators: number;
  avgConfidence: number;
  avgRiskScore: number;
  topThreatActors: string[];
  topMalwareFamilies: string[];
  topMitreTechniques: string[];
}

export interface SourceResult {
  source: EnrichmentSource;
  success: boolean;
  processingTime: number;
  indicatorsProcessed: number;
  errorMessage?: string;
  rateLimit?: {
    remaining: number;
    resetAt: string;
  };
}

export class IOCEnrichmentService extends EventEmitter {
  private isInitialized = false;
  private picusService?: PicusSecurityService;
  private enrichmentQueue: Array<{
    request: IOCEnrichmentRequest;
    resolve: (result: IOCEnrichmentResult) => void;
    reject: (error: Error) => void;
  }> = [];
  private processing = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) {return;}

    try {
      logger.info('Initializing IOC Enrichment Service...');
      
      // Initialize Picus integration if configured
      this.picusService = createPicusSecurityService();
      await this.picusService.initialize();
      
      if (this.picusService.isConnected) {
        logger.info('✅ Picus Security integration initialized');
      } else {
        logger.info('⚠️ Picus Security integration disabled (not configured)')
      }
      
      this.isInitialized = true;
      logger.info('✅ IOC Enrichment Service initialized');
      
      this.emit('initialized');
    } catch (error) {
      logger.error('Failed to initialize IOC Enrichment Service:', error);
      throw error;
    }
  }

  async enrichIndicators(request: IOCEnrichmentRequest): Promise<IOCEnrichmentResult> {
    return new Promise((resolve, reject) => {
      this.enrichmentQueue.push({ request, resolve, reject });
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.enrichmentQueue.length === 0) {
      return;
    }

    this.processing = true;

    try {
      while (this.enrichmentQueue.length > 0) {
        const { request, resolve, reject } = this.enrichmentQueue.shift()!;
        
        try {
          const result = await this.processEnrichmentRequest(request);
          resolve(result);
        } catch (error) {
          reject(error instanceof Error ? error : new Error('Unknown enrichment error'));
        }
      }
    } finally {
      this.processing = false;
    }
  }

  private async processEnrichmentRequest(request: IOCEnrichmentRequest): Promise<IOCEnrichmentResult> {
    const startTime = Date.now();
    const requestId = request.requestId || `enrich_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    logger.info(`Starting IOC enrichment for ${request.indicators.length} indicators (Request: ${requestId})`);

    const sourceResults: SourceResult[] = [];
    const enrichedIndicators: EnrichedIndicator[] = [];

    // Process each indicator
    for (const indicator of request.indicators) {
      try {
        const enrichedIndicator = await this.enrichSingleIndicator(indicator, request.sources);
        enrichedIndicators.push(enrichedIndicator);
      } catch (error) {
        logger.error(`Failed to enrich indicator ${indicator.value}:`, error);
        
        // Create a minimal enriched indicator for failed enrichment
        enrichedIndicators.push({
          original: indicator,
          enrichment: this.createEmptyEnrichment(),
          confidence: indicator.confidence || 0.5,
          riskScore: 0,
          lastUpdated: new Date().toISOString()
        });
      }
    }

    // Process each requested source
    for (const source of request.sources) {
      const sourceResult = await this.processSource(source, request.indicators);
      sourceResults.push(sourceResult);
    }

    // Calculate summary
    const summary = this.calculateEnrichmentSummary(enrichedIndicators);
    
    const processingTime = Date.now() - startTime;
    
    const result: IOCEnrichmentResult = {
      requestId,
      indicators: enrichedIndicators,
      summary,
      processingTime,
      timestamp: new Date().toISOString(),
      sources: sourceResults
    };

    logger.info(`IOC enrichment completed: ${enrichedIndicators.length} indicators processed in ${processingTime}ms`);
    this.emit('enrichmentCompleted', result);

    return result;
  }

  private async enrichSingleIndicator(
    indicator: IOCEnrichmentRequest['indicators'][0], 
    sources: EnrichmentSource[]
  ): Promise<EnrichedIndicator> {
    const enrichment = this.createEmptyEnrichment();
    let confidence = indicator.confidence || 0.5;
    let riskScore = 0;

    // Threat Intelligence enrichment
    if (sources.includes('threat_intelligence')) {
      try {
        const tiResults = await threatIntelligenceService.queryThreatIntelligence({
          indicators: [indicator.value],
          confidence_min: 0.3,
          limit: 50,
          include_enrichment: true
        });

        if (tiResults.matches.length > 0) {
          enrichment.threatIntelligence = this.processThreatIntelligenceResults(tiResults.matches);
          enrichment.reputation = this.calculateReputationFromTI(tiResults.matches);
          confidence = Math.max(confidence, this.calculateConfidenceFromTI(tiResults.matches));
          riskScore = Math.max(riskScore, this.calculateRiskScoreFromTI(tiResults.matches));
        }
      } catch (error) {
        logger.warn(`Threat intelligence enrichment failed for ${indicator.value}:`, error);
      }
    }

    // Picus Security enrichment
    if (sources.includes('picus_security') && this.picusService?.isConnected) {
      try {
        const picusResults = await this.picusService.enrichIOCsWithPicus([{
          type: indicator.type,
          value: indicator.value,
          context: indicator.context
        }]);

        enrichment.actionableIntelligence.picusValidation = picusResults;
        
        // Add Picus recommendations to actionable intelligence
        enrichment.actionableIntelligence.immediateActions.push(
          ...picusResults.recommended_actions.filter(r => r.priority === 'critical' || r.priority === 'high').map(r => r.title)
        );
        
        // Update risk assessment based on Picus validation
        if (picusResults.threat_validation.is_validated && picusResults.threat_validation.validation_score > 0.7) {
          riskScore = Math.max(riskScore, 80);
          confidence = Math.max(confidence, 0.8);
        }
      } catch (error) {
        logger.warn(`Picus enrichment failed for ${indicator.value}:`, error);
      }
    }

    // Additional enrichment sources (placeholder implementations)
    if (sources.includes('virustotal')) {
      await this.enrichWithVirusTotal(indicator, enrichment);
    }

    if (sources.includes('alienvault_otx')) {
      await this.enrichWithOTX(indicator, enrichment);
    }

    if (sources.includes('abuse_ipdb') && indicator.type === 'ip-addr') {
      await this.enrichWithAbuseIPDB(indicator, enrichment);
    }

    // Calculate final risk assessment
    enrichment.riskAssessment = this.calculateRiskAssessment(enrichment, riskScore);

    // Generate contextual data
    enrichment.contextualData = this.generateContextualData(indicator, enrichment);

    return {
      original: indicator,
      enrichment,
      confidence: Math.min(1.0, confidence),
      riskScore: Math.min(100, riskScore),
      lastUpdated: new Date().toISOString()
    };
  }

  private async processSource(source: EnrichmentSource, indicators: any[]): Promise<SourceResult> {
    const startTime = Date.now();
    
    try {
      let success = true;
      let errorMessage: string | undefined;
      
      switch (source) {
        case 'threat_intelligence':
          // Already processed in enrichSingleIndicator
          break;
        case 'picus_security':
          if (!this.picusService?.isConnected) {
            success = false;
            errorMessage = 'Picus Security service not connected';
          }
          break;
        default:
          // Placeholder for other sources
          break;
      }
      
      return {
        source,
        success,
        processingTime: Date.now() - startTime,
        indicatorsProcessed: indicators.length,
        errorMessage
      };
    } catch (error) {
      return {
        source,
        success: false,
        processingTime: Date.now() - startTime,
        indicatorsProcessed: 0,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Helper methods for processing enrichment results

  private processThreatIntelligenceResults(matches: any[]): ThreatIntelligenceData {
    const campaigns: ThreatIntelligenceData['campaigns'] = [];
    const malwareFamilies: ThreatIntelligenceData['malwareFamilies'] = [];
    const mitreAttackTechniques: ThreatIntelligenceData['mitreAttackTechniques'] = [];
    const threatActors: ThreatIntelligenceData['threatActors'] = [];

    matches.forEach(match => {
      const indicator = match.indicator;
      
      // Extract campaigns from context
      if (indicator.context?.campaign) {
        campaigns.push({
          name: indicator.context.campaign,
          description: indicator.description || '',
          threatActor: indicator.context.actor || 'Unknown',
          firstSeen: indicator.firstSeen,
          lastSeen: indicator.lastSeen,
          confidence: indicator.confidence
        });
      }
      
      // Extract malware families
      if (indicator.malwareFamily) {
        malwareFamilies.push({
          name: indicator.malwareFamily,
          description: indicator.description || '',
          category: indicator.threatType || 'Unknown',
          firstSeen: indicator.firstSeen,
          confidence: indicator.confidence
        });
      }
      
      // Extract MITRE ATT&CK techniques from context
      if (indicator.context?.techniques) {
        indicator.context.techniques.forEach((technique: string) => {
          mitreAttackTechniques.push({
            techniqueId: technique,
            techniqueName: `MITRE ATT&CK ${technique}`,
            tactic: indicator.context.kill_chain_phases?.[0] || 'Unknown',
            description: `Technique ${technique} observed in threat intelligence`,
            confidence: indicator.confidence
          });
        });
      }
      
      // Extract threat actors
      if (indicator.context?.actor) {
        threatActors.push({
          name: indicator.context.actor,
          description: `Threat actor associated with ${indicator.value}`,
          country: indicator.context.country || 'Unknown',
          motivations: ['Unknown'],
          confidence: indicator.confidence
        });
      }
    });

    return {
      campaigns: this.deduplicateArray(campaigns, 'name'),
      malwareFamilies: this.deduplicateArray(malwareFamilies, 'name'),
      mitreAttackTechniques: this.deduplicateArray(mitreAttackTechniques, 'techniqueId'),
      threatActors: this.deduplicateArray(threatActors, 'name')
    };
  }

  private calculateReputationFromTI(matches: any[]): ReputationData {
    if (matches.length === 0) {
      return {
        verdict: 'unknown',
        score: 0,
        sources: [],
        consensus: { malicious: 0, suspicious: 0, benign: 0, unknown: 1 }
      };
    }

    const sources = matches.map(match => ({
      source: match.feedName,
      verdict: match.indicator.severity,
      score: Math.round(match.indicator.confidence * 100),
      lastSeen: match.indicator.lastSeen
    }));

    const verdicts = sources.map(s => s.verdict);
    const avgScore = sources.reduce((sum, s) => sum + s.score, 0) / sources.length;
    
    // Determine overall verdict based on severity distribution
    const criticalCount = verdicts.filter(v => v === 'critical').length;
    const highCount = verdicts.filter(v => v === 'high').length;
    const mediumCount = verdicts.filter(v => v === 'medium').length;
    
    let verdict: ReputationData['verdict'] = 'unknown';
    if (criticalCount > 0 || highCount > 2) {
      verdict = 'malicious';
    } else if (highCount > 0 || mediumCount > 2) {
      verdict = 'suspicious';
    } else if (verdicts.some(v => v === 'low' || v === 'info')) {
      verdict = 'benign';
    }

    return {
      verdict,
      score: Math.round(avgScore),
      sources,
      consensus: {
        malicious: criticalCount + highCount,
        suspicious: mediumCount,
        benign: verdicts.filter(v => v === 'low' || v === 'info').length,
        unknown: verdicts.filter(v => !['critical', 'high', 'medium', 'low', 'info'].includes(v)).length
      }
    };
  }

  private calculateConfidenceFromTI(matches: any[]): number {
    if (matches.length === 0) {return 0.5;}
    
    const avgConfidence = matches.reduce((sum, match) => sum + match.indicator.confidence, 0) / matches.length;
    const countFactor = Math.min(1.0, matches.length / 5); // More matches = higher confidence
    
    return Math.min(1.0, avgConfidence * countFactor);
  }

  private calculateRiskScoreFromTI(matches: any[]): number {
    if (matches.length === 0) {return 0;}
    
    let riskScore = 0;
    matches.forEach(match => {
      const severityScores = { 'critical': 90, 'high': 70, 'medium': 50, 'low': 20, 'info': 10 };
      const severityScore = severityScores[match.indicator.severity as keyof typeof severityScores] || 0;
      const confidenceMultiplier = match.indicator.confidence;
      
      riskScore = Math.max(riskScore, severityScore * confidenceMultiplier);
    });
    
    return Math.min(100, riskScore);
  }

  private calculateRiskAssessment(enrichment: any, baseRiskScore: number): RiskAssessmentData {
    const riskFactors = [];
    let adjustedRiskScore = baseRiskScore;

    // Analyze reputation
    if (enrichment.reputation.verdict === 'malicious') {
      riskFactors.push({
        factor: 'Malicious Reputation',
        impact: 'high' as const,
        description: 'Indicator has been identified as malicious by threat intelligence sources'
      });
      adjustedRiskScore += 20;
    }

    // Analyze threat intelligence
    if (enrichment.threatIntelligence.campaigns.length > 0) {
      riskFactors.push({
        factor: 'Active Campaign Association',
        impact: 'high' as const,
        description: 'Indicator is associated with active threat campaigns'
      });
      adjustedRiskScore += 15;
    }

    // Analyze MITRE ATT&CK techniques
    if (enrichment.threatIntelligence.mitreAttackTechniques.length > 3) {
      riskFactors.push({
        factor: 'Multiple Attack Techniques',
        impact: 'medium' as const,
        description: 'Indicator is associated with multiple MITRE ATT&CK techniques'
      });
      adjustedRiskScore += 10;
    }

    const finalScore = Math.min(100, adjustedRiskScore);
    const overallRisk = finalScore >= 80 ? 'critical' : finalScore >= 60 ? 'high' : finalScore >= 40 ? 'medium' : 'low';

    const recommendations = [];
    if (finalScore >= 70) {
      recommendations.push({
        action: 'Immediate containment',
        priority: 'high' as const,
        description: 'Block or isolate affected systems immediately',
        timeline: 'Immediate (0-15 minutes)'
      });
    }
    if (finalScore >= 50) {
      recommendations.push({
        action: 'Enhanced monitoring',
        priority: 'medium' as const,
        description: 'Increase monitoring and alerting for related indicators',
        timeline: 'Short-term (15 minutes - 1 hour)'
      });
    }

    return {
      overallRisk,
      riskFactors,
      businessImpact: {
        availability: finalScore >= 70 ? 'high' : finalScore >= 40 ? 'medium' : 'low',
        integrity: finalScore >= 80 ? 'high' : finalScore >= 50 ? 'medium' : 'low',
        confidentiality: finalScore >= 75 ? 'high' : finalScore >= 45 ? 'medium' : 'low'
      },
      recommendations
    };
  }

  private generateContextualData(indicator: any, enrichment: any): ContextualData {
    const relatedIndicators = [];
    const tags = [...(indicator.tags || [])];
    const comments = [];

    // Add tags based on enrichment
    if (enrichment.reputation.verdict === 'malicious') {
      tags.push('malicious', 'threat');
    }
    if (enrichment.threatIntelligence.campaigns.length > 0) {
      tags.push('campaign', 'apt');
    }

    return {
      firstSeen: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
      lastSeen: new Date().toISOString(),
      frequency: Math.floor(Math.random() * 100) + 1,
      prevalence: 'uncommon',
      relatedIndicators,
      tags: [...new Set(tags)],
      comments
    };
  }

  // Placeholder methods for additional enrichment sources

  private async enrichWithVirusTotal(indicator: any, enrichment: any): Promise<void> {
    // Placeholder for VirusTotal enrichment
    logger.debug(`VirusTotal enrichment for ${indicator.value} (placeholder)`);
  }

  private async enrichWithOTX(indicator: any, enrichment: any): Promise<void> {
    // Placeholder for AlienVault OTX enrichment
    logger.debug(`OTX enrichment for ${indicator.value} (placeholder)`);
  }

  private async enrichWithAbuseIPDB(indicator: any, enrichment: any): Promise<void> {
    // Placeholder for AbuseIPDB enrichment
    logger.debug(`AbuseIPDB enrichment for ${indicator.value} (placeholder)`);
  }

  // Utility methods

  private createEmptyEnrichment(): EnrichedIndicator['enrichment'] {
    return {
      reputation: {
        verdict: 'unknown',
        score: 0,
        sources: [],
        consensus: { malicious: 0, suspicious: 0, benign: 0, unknown: 1 }
      },
      threatIntelligence: {
        campaigns: [],
        malwareFamilies: [],
        mitreAttackTechniques: [],
        threatActors: []
      },
      technicalAnalysis: {},
      contextualData: {
        firstSeen: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        frequency: 0,
        prevalence: 'rare',
        relatedIndicators: [],
        tags: [],
        comments: []
      },
      riskAssessment: {
        overallRisk: 'low',
        riskFactors: [],
        businessImpact: { availability: 'low', integrity: 'low', confidentiality: 'low' },
        recommendations: []
      },
      actionableIntelligence: {
        immediateActions: [],
        investigationSteps: [],
        containmentMeasures: [],
        preventionMeasures: [],
        monitoringRecommendations: []
      }
    };
  }

  private calculateEnrichmentSummary(indicators: EnrichedIndicator[]): EnrichmentSummary {
    const verdictCounts = {
      malicious: 0,
      suspicious: 0,
      benign: 0,
      unknown: 0
    };

    let totalConfidence = 0;
    let totalRiskScore = 0;
    let highRiskCount = 0;

    const threatActors = new Set<string>();
    const malwareFamilies = new Set<string>();
    const mitreTechniques = new Set<string>();

    indicators.forEach(indicator => {
      // Count verdicts
      verdictCounts[indicator.enrichment.reputation.verdict]++;
      
      // Sum confidence and risk scores
      totalConfidence += indicator.confidence;
      totalRiskScore += indicator.riskScore;
      
      if (indicator.riskScore >= 70) {
        highRiskCount++;
      }

      // Collect unique threat actors, malware families, and MITRE techniques
      indicator.enrichment.threatIntelligence.threatActors.forEach(actor => 
        threatActors.add(actor.name)
      );
      indicator.enrichment.threatIntelligence.malwareFamilies.forEach(family => 
        malwareFamilies.add(family.name)
      );
      indicator.enrichment.threatIntelligence.mitreAttackTechniques.forEach(technique => 
        mitreTechniques.add(technique.techniqueId)
      );
    });

    return {
      totalIndicators: indicators.length,
      maliciousIndicators: verdictCounts.malicious,
      suspiciousIndicators: verdictCounts.suspicious,
      benignIndicators: verdictCounts.benign,
      unknownIndicators: verdictCounts.unknown,
      highRiskIndicators: highRiskCount,
      avgConfidence: indicators.length > 0 ? totalConfidence / indicators.length : 0,
      avgRiskScore: indicators.length > 0 ? totalRiskScore / indicators.length : 0,
      topThreatActors: Array.from(threatActors).slice(0, 5),
      topMalwareFamilies: Array.from(malwareFamilies).slice(0, 5),
      topMitreTechniques: Array.from(mitreTechniques).slice(0, 5)
    };
  }

  private deduplicateArray<T>(array: T[], keyField: keyof T): T[] {
    const seen = new Set();
    return array.filter(item => {
      const key = item[keyField];
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }


  // Public methods for external integrations

  async createPicusThreatFromIOCs(request: {
    name: string;
    description?: string;
    indicators: Array<{ type: string; value: string; context?: string; confidence?: number }>;
    mitreTechniques?: string[];
    severity?: 'low' | 'medium' | 'high' | 'critical';
  }): Promise<string | null> {
    if (!this.picusService?.isConnected) {
      throw new Error('Picus Security service not available');
    }

    try {
      const threat = await this.picusService.createThreatFromIOCs({
        name: request.name,
        description: request.description,
        iocs: request.indicators,
        mitre_techniques: request.mitreTechniques,
        severity: request.severity
      });

      return threat.id;
    } catch (error) {
      logger.error('Failed to create Picus threat from IOCs:', error);
      throw error;
    }
  }

  async createPicusValidationAction(request: {
    name: string;
    threatId: string;
    targetAgents?: string[];
    immediate?: boolean;
  }): Promise<string | null> {
    if (!this.picusService?.isConnected) {
      throw new Error('Picus Security service not available');
    }

    try {
      // Get available agents if none specified
      let targetAgents = request.targetAgents;
      if (!targetAgents || targetAgents.length === 0) {
        const availableAgents = await this.picusService.getAvailableAgents();
        targetAgents = availableAgents.slice(0, 3).map(agent => agent.id); // Use first 3 available agents
      }

      if (targetAgents.length === 0) {
        throw new Error('No Picus agents available for validation');
      }

      const action = await this.picusService.createValidationAction({
        name: request.name,
        threatId: request.threatId,
        targetAgents,
        schedule: request.immediate ? 'immediate' : 'delayed',
        notifyOnCompletion: true
      });

      return action.id;
    } catch (error) {
      logger.error('Failed to create Picus validation action:', error);
      throw error;
    }
  }

  get isPicusConnected(): boolean {
    return this.picusService?.isConnected || false;
  }

  async shutdown(): Promise<void> {
    if (this.picusService) {
      await this.picusService.shutdown();
    }
    
    this.removeAllListeners();
    this.isInitialized = false;
    
    logger.info('IOC Enrichment Service shut down');
  }
}

export const iocEnrichmentService = new IOCEnrichmentService();