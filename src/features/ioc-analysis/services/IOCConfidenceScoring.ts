import { IOC, IOCType } from '../types/IOC';
import { EnrichmentResult, ThreatLevel, ConfidenceLevel } from '../../ioc-enrichment/types/EnrichmentTypes';

export interface ConfidenceScore {
  score: number; // 0-100
  level: ConfidenceLevel;
  explanation: ConfidenceExplanation;
  factors: ConfidenceFactor[];
  providerAgreement: number; // 0-100, percentage of providers that agree
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendation: string;
}

export interface ConfidenceExplanation {
  summary: string;
  keyFactors: string[];
  redFlags: string[];
  supportingEvidence: string[];
  limitationsAndUncertainties: string[];
  algorithmVersion: string;
}

export interface ConfidenceFactor {
  name: string;
  description: string;
  weight: number; // 0-1
  score: number; // 0-100
  impact: 'positive' | 'negative' | 'neutral';
  category: FactorCategory;
  evidence: string[];
  reliability: number; // 0-1, how reliable this factor is
}

export type FactorCategory = 
  | 'source_reputation'
  | 'provider_consensus' 
  | 'historical_context'
  | 'technical_validation'
  | 'threat_intelligence'
  | 'behavioral_analysis'
  | 'network_context'
  | 'temporal_analysis'
  | 'attribution_strength'
  | 'infrastructure_analysis';

export interface MLFeatures {
  // Provider-based features
  providerCount: number;
  providerAgreementRate: number;
  avgProviderScore: number;
  highQualityProviderRatio: number;
  
  // Temporal features
  ageInDays: number;
  firstSeenAge: number;
  lastActivityAge: number;
  activityFrequency: number;
  
  // Enrichment features
  enrichmentDepth: number;
  relatedIOCCount: number;
  maliciousRelationshipRatio: number;
  
  // Technical features
  structuralValidity: number;
  contextualRelevance: number;
  
  // Threat intelligence features
  campaignAssociation: number;
  actorAttribution: number;
  familyClassification: number;
  
  // Behavioral features
  sandboxDetections: number;
  behaviorComplexity: number;
  evasionTechniques: number;
}

export interface ConfidenceTrend {
  timestamp: Date;
  score: number;
  triggers: string[];
  newEvidence: string[];
}

export interface ConfidenceAlert {
  id: string;
  iocId: string;
  type: 'confidence_drop' | 'new_evidence' | 'provider_disagreement' | 'threshold_crossed';
  severity: 'low' | 'medium' | 'high';
  message: string;
  details: string;
  timestamp: Date;
  acknowledged: boolean;
}

export class IOCConfidenceScoringService {
  private static instance: IOCConfidenceScoringService;
  private confidenceHistory: Map<string, ConfidenceTrend[]> = new Map();
  private alerts: ConfidenceAlert[] = [];
  
  // Algorithm weights - can be tuned based on performance
  private readonly algorithmWeights = {
    sourceReputation: 0.25,
    providerConsensus: 0.30,
    historicalContext: 0.15,
    technicalValidation: 0.15,
    threatIntelligence: 0.10,
    behavioralAnalysis: 0.05
  };
  
  // Provider reliability scores
  private readonly providerReliability = {
    virustotal: 0.95,
    shodan: 0.85,
    abuseipdb: 0.90,
    urlvoid: 0.75,
    hybrid_analysis: 0.90,
    misp: 0.85,
    otx: 0.80,
    threatfox: 0.85,
    malwarebazaar: 0.90,
    urlhaus: 0.88,
    circl_hashlookup: 0.82,
    greynoise: 0.83,
    censys: 0.87,
    passivetotal: 0.85
  } as const;

  static getInstance(): IOCConfidenceScoringService {
    if (!IOCConfidenceScoringService.instance) {
      IOCConfidenceScoringService.instance = new IOCConfidenceScoringService();
    }
    return IOCConfidenceScoringService.instance;
  }

  /**
   * Calculate comprehensive confidence score for an IOC
   */
  async calculateConfidenceScore(
    ioc: IOC, 
    enrichmentResults: EnrichmentResult[]
  ): Promise<ConfidenceScore> {
    const features = this.extractMLFeatures(ioc, enrichmentResults);
    const factors = this.calculateConfidenceFactors(ioc, enrichmentResults, features);
    
    // Calculate weighted score
    const score = this.calculateWeightedScore(factors);
    const level = this.scoreToConfidenceLevel(score);
    const providerAgreement = this.calculateProviderAgreement(enrichmentResults);
    const riskLevel = this.calculateRiskLevel(score, factors);
    
    const explanation = this.generateExplanation(score, factors, enrichmentResults);
    const recommendation = this.generateRecommendation(score, level, factors);
    
    // Store trend data
    this.updateConfidenceTrend(ioc.id, score, factors);
    
    // Check for alerts
    this.checkForConfidenceAlerts(ioc, score, factors);
    
    return {
      score,
      level,
      explanation,
      factors,
      providerAgreement,
      riskLevel,
      recommendation
    };
  }

  /**
   * Extract ML features from IOC and enrichment data
   */
  private extractMLFeatures(ioc: IOC, enrichmentResults: EnrichmentResult[]): MLFeatures {
    const validResults = enrichmentResults.filter(r => r.success);
    const maliciousResults = validResults.filter(r => r.data.threatLevel === 'malicious');
    
    return {
      // Provider-based features
      providerCount: validResults.length,
      providerAgreementRate: this.calculateProviderAgreement(enrichmentResults) / 100,
      avgProviderScore: validResults.reduce((sum, r) => sum + r.data.score, 0) / validResults.length || 0,
      highQualityProviderRatio: validResults.filter(r => 
        this.providerReliability[r.provider] >= 0.85
      ).length / validResults.length || 0,
      
      // Temporal features
      ageInDays: this.daysSince(ioc.firstSeen),
      firstSeenAge: this.daysSince(ioc.firstSeen),
      lastActivityAge: this.daysSince(ioc.lastSeen),
      activityFrequency: this.calculateActivityFrequency(ioc),
      
      // Enrichment features
      enrichmentDepth: this.calculateEnrichmentDepth(validResults),
      relatedIOCCount: validResults.reduce((sum, r) => sum + r.data.relationships.length, 0),
      maliciousRelationshipRatio: maliciousResults.length / validResults.length || 0,
      
      // Technical features
      structuralValidity: this.validateIOCStructure(ioc),
      contextualRelevance: this.calculateContextualRelevance(ioc, validResults),
      
      // Threat intelligence features
      campaignAssociation: this.calculateCampaignAssociation(validResults),
      actorAttribution: this.calculateActorAttribution(validResults),
      familyClassification: this.calculateFamilyClassification(validResults),
      
      // Behavioral features
      sandboxDetections: this.calculateSandboxDetections(validResults),
      behaviorComplexity: this.calculateBehaviorComplexity(validResults),
      evasionTechniques: this.calculateEvasionTechniques(validResults)
    };
  }

  /**
   * Calculate individual confidence factors
   */
  private calculateConfidenceFactors(
    ioc: IOC, 
    enrichmentResults: EnrichmentResult[], 
    features: MLFeatures
  ): ConfidenceFactor[] {
    return [
      this.calculateSourceReputationFactor(enrichmentResults),
      this.calculateProviderConsensusFactor(enrichmentResults, features),
      this.calculateHistoricalContextFactor(ioc, features),
      this.calculateTechnicalValidationFactor(ioc, features),
      this.calculateThreatIntelligenceFactor(enrichmentResults, features),
      this.calculateBehavioralAnalysisFactor(enrichmentResults, features),
      this.calculateNetworkContextFactor(ioc, enrichmentResults),
      this.calculateTemporalAnalysisFactor(ioc, features),
      this.calculateAttributionStrengthFactor(enrichmentResults),
      this.calculateInfrastructureAnalysisFactor(ioc, enrichmentResults)
    ];
  }

  private calculateSourceReputationFactor(enrichmentResults: EnrichmentResult[]): ConfidenceFactor {
    const validResults = enrichmentResults.filter(r => r.success);
    const avgReliability = validResults.reduce((sum, r) => 
      sum + (this.providerReliability[r.provider] || 0.5), 0
    ) / validResults.length || 0;
    
    const score = avgReliability * 100;
    const evidence = validResults.map(r => 
      `${r.provider}: ${this.providerReliability[r.provider]?.toFixed(2) || '0.50'} reliability`
    );
    
    return {
      name: 'Source Reputation',
      description: 'Reliability and reputation of information sources',
      weight: this.algorithmWeights.sourceReputation,
      score,
      impact: score > 70 ? 'positive' : score < 50 ? 'negative' : 'neutral',
      category: 'source_reputation',
      evidence,
      reliability: 0.95
    };
  }

  private calculateProviderConsensusFactor(
    enrichmentResults: EnrichmentResult[], 
    features: MLFeatures
  ): ConfidenceFactor {
    const agreementRate = features.providerAgreementRate * 100;
    const score = Math.min(100, agreementRate * 1.2); // Boost high agreement
    
    const evidence = [
      `${features.providerCount} providers analyzed`,
      `${agreementRate.toFixed(1)}% provider agreement`,
      `Average provider score: ${features.avgProviderScore.toFixed(1)}`
    ];
    
    return {
      name: 'Provider Consensus',
      description: 'Agreement between multiple threat intelligence providers',
      weight: this.algorithmWeights.providerConsensus,
      score,
      impact: score > 75 ? 'positive' : score < 40 ? 'negative' : 'neutral',
      category: 'provider_consensus',
      evidence,
      reliability: 0.90
    };
  }

  private calculateHistoricalContextFactor(ioc: IOC, features: MLFeatures): ConfidenceFactor {
    // Newer IOCs get lower historical confidence, older ones with activity get higher
    const ageScore = Math.min(100, features.ageInDays * 2); // Mature after ~50 days
    const activityScore = features.activityFrequency * 100;
    const score = (ageScore * 0.3 + activityScore * 0.7);
    
    const evidence = [
      `IOC age: ${features.ageInDays} days`,
      `Activity frequency: ${features.activityFrequency.toFixed(2)}`,
      `First seen: ${ioc.firstSeen.toLocaleDateString()}`,
      `Last seen: ${ioc.lastSeen.toLocaleDateString()}`
    ];
    
    return {
      name: 'Historical Context',
      description: 'IOC maturity and historical activity patterns',
      weight: this.algorithmWeights.historicalContext,
      score,
      impact: score > 60 ? 'positive' : 'neutral',
      category: 'historical_context',
      evidence,
      reliability: 0.80
    };
  }

  private calculateTechnicalValidationFactor(ioc: IOC, features: MLFeatures): ConfidenceFactor {
    const structuralScore = features.structuralValidity * 100;
    const contextualScore = features.contextualRelevance * 100;
    const score = (structuralScore * 0.6 + contextualScore * 0.4);
    
    const evidence = [
      `Structural validity: ${structuralScore.toFixed(1)}%`,
      `Contextual relevance: ${contextualScore.toFixed(1)}%`,
      `IOC type: ${ioc.type}`,
      `Source context available: ${!!ioc.context}`
    ];
    
    return {
      name: 'Technical Validation',
      description: 'Technical correctness and contextual relevance',
      weight: this.algorithmWeights.technicalValidation,
      score,
      impact: score > 80 ? 'positive' : score < 60 ? 'negative' : 'neutral',
      category: 'technical_validation',
      evidence,
      reliability: 0.88
    };
  }

  private calculateThreatIntelligenceFactor(
    enrichmentResults: EnrichmentResult[], 
    features: MLFeatures
  ): ConfidenceFactor {
    const campaignScore = features.campaignAssociation * 100;
    const actorScore = features.actorAttribution * 100;
    const familyScore = features.familyClassification * 100;
    const score = (campaignScore * 0.4 + actorScore * 0.3 + familyScore * 0.3);
    
    const evidence = [
      `Campaign association: ${campaignScore.toFixed(1)}%`,
      `Actor attribution: ${actorScore.toFixed(1)}%`,
      `Malware family classification: ${familyScore.toFixed(1)}%`
    ];
    
    return {
      name: 'Threat Intelligence',
      description: 'Attribution to known campaigns, actors, and malware families',
      weight: this.algorithmWeights.threatIntelligence,
      score,
      impact: score > 70 ? 'positive' : 'neutral',
      category: 'threat_intelligence',
      evidence,
      reliability: 0.85
    };
  }

  private calculateBehavioralAnalysisFactor(
    enrichmentResults: EnrichmentResult[], 
    features: MLFeatures
  ): ConfidenceFactor {
    const sandboxScore = Math.min(100, features.sandboxDetections * 20);
    const complexityScore = features.behaviorComplexity * 100;
    const evasionScore = features.evasionTechniques * 100;
    const score = (sandboxScore * 0.5 + complexityScore * 0.3 + evasionScore * 0.2);
    
    const evidence = [
      `Sandbox detections: ${features.sandboxDetections}`,
      `Behavior complexity: ${complexityScore.toFixed(1)}%`,
      `Evasion techniques: ${evasionScore.toFixed(1)}%`
    ];
    
    return {
      name: 'Behavioral Analysis',
      description: 'Dynamic analysis and behavioral indicators',
      weight: this.algorithmWeights.behavioralAnalysis,
      score,
      impact: score > 60 ? 'positive' : 'neutral',
      category: 'behavioral_analysis',
      evidence,
      reliability: 0.82
    };
  }

  private calculateNetworkContextFactor(ioc: IOC, enrichmentResults: EnrichmentResult[]): ConfidenceFactor {
    const validResults = enrichmentResults.filter(r => r.success);
    const hasGeoData = validResults.some(r => r.data.geolocation);
    const hasWhoisData = validResults.some(r => r.data.whois);
    const hasCertData = validResults.some(r => r.data.certificates?.length);
    
    const contextScore = (
      (hasGeoData ? 30 : 0) +
      (hasWhoisData ? 40 : 0) +
      (hasCertData ? 30 : 0)
    );
    
    const evidence = [
      hasGeoData ? 'Geolocation data available' : 'No geolocation data',
      hasWhoisData ? 'WHOIS data available' : 'No WHOIS data',
      hasCertData ? 'Certificate data available' : 'No certificate data'
    ];
    
    return {
      name: 'Network Context',
      description: 'Network infrastructure and context information',
      weight: 0.08,
      score: contextScore,
      impact: contextScore > 60 ? 'positive' : 'neutral',
      category: 'network_context',
      evidence,
      reliability: 0.75
    };
  }

  private calculateTemporalAnalysisFactor(ioc: IOC, features: MLFeatures): ConfidenceFactor {
    const recentActivity = features.lastActivityAge < 30 ? 1 : Math.max(0, 1 - features.lastActivityAge / 365);
    const activityPattern = features.activityFrequency;
    const score = (recentActivity * 60 + activityPattern * 40);
    
    const evidence = [
      `Last activity: ${features.lastActivityAge} days ago`,
      `Activity pattern score: ${(activityPattern * 100).toFixed(1)}%`,
      `IOC age: ${features.ageInDays} days`
    ];
    
    return {
      name: 'Temporal Analysis',
      description: 'Recent activity and temporal patterns',
      weight: 0.07,
      score,
      impact: score > 50 ? 'positive' : 'neutral',
      category: 'temporal_analysis',
      evidence,
      reliability: 0.78
    };
  }

  private calculateAttributionStrengthFactor(enrichmentResults: EnrichmentResult[]): ConfidenceFactor {
    const validResults = enrichmentResults.filter(r => r.success);
    const attributionSources = validResults.filter(r => 
      r.data.attributes?.campaign || r.data.attributes?.actor || r.data.attributes?.family
    );
    
    const score = Math.min(100, (attributionSources.length / validResults.length) * 120);
    
    const evidence = [
      `${attributionSources.length}/${validResults.length} sources with attribution`,
      ...attributionSources.slice(0, 3).map(r => 
        `${r.provider}: ${Object.keys(r.data.attributes || {}).join(', ')}`
      )
    ];
    
    return {
      name: 'Attribution Strength',
      description: 'Strength of attribution to known threats',
      weight: 0.06,
      score,
      impact: score > 60 ? 'positive' : 'neutral',
      category: 'attribution_strength',
      evidence,
      reliability: 0.83
    };
  }

  private calculateInfrastructureAnalysisFactor(ioc: IOC, enrichmentResults: EnrichmentResult[]): ConfidenceFactor {
    const validResults = enrichmentResults.filter(r => r.success);
    const infraScore = validResults.reduce((sum, r) => {
      const relationships = r.data.relationships.length;
      const timeline = r.data.timeline.length;
      return sum + Math.min(50, relationships * 10 + timeline * 5);
    }, 0) / validResults.length || 0;
    
    const totalRelationships = validResults.reduce((sum, r) => sum + r.data.relationships.length, 0);
    
    const evidence = [
      `Total relationships: ${totalRelationships}`,
      `Infrastructure complexity score: ${infraScore.toFixed(1)}`,
      `Sources with timeline data: ${validResults.filter(r => r.data.timeline.length > 0).length}`
    ];
    
    return {
      name: 'Infrastructure Analysis',
      description: 'Related infrastructure and attack patterns',
      weight: 0.05,
      score: infraScore,
      impact: infraScore > 40 ? 'positive' : 'neutral',
      category: 'infrastructure_analysis',
      evidence,
      reliability: 0.80
    };
  }

  private calculateWeightedScore(factors: ConfidenceFactor[]): number {
    const weightedSum = factors.reduce((sum, factor) => {
      return sum + (factor.score * factor.weight * factor.reliability);
    }, 0);
    
    const totalWeight = factors.reduce((sum, factor) => sum + factor.weight, 0);
    
    return Math.round(weightedSum / totalWeight);
  }

  private scoreToConfidenceLevel(score: number): ConfidenceLevel {
    if (score >= 85) return 'verified';
    if (score >= 70) return 'high';
    if (score >= 50) return 'medium';
    return 'low';
  }

  private calculateProviderAgreement(enrichmentResults: EnrichmentResult[]): number {
    const validResults = enrichmentResults.filter(r => r.success);
    if (validResults.length < 2) return 0;
    
    const threatLevels = validResults.map(r => r.data.threatLevel);
    const mode = this.getMostCommon(threatLevels);
    const agreement = threatLevels.filter(level => level === mode).length;
    
    return Math.round((agreement / validResults.length) * 100);
  }

  private calculateRiskLevel(score: number, factors: ConfidenceFactor[]): 'low' | 'medium' | 'high' | 'critical' {
    const redFlags = factors.filter(f => f.impact === 'negative').length;
    
    if (score >= 85 && redFlags === 0) return 'low';
    if (score >= 70 && redFlags <= 1) return 'medium';
    if (score >= 50 || redFlags <= 2) return 'high';
    return 'critical';
  }

  private generateExplanation(
    score: number, 
    factors: ConfidenceFactor[], 
    enrichmentResults: EnrichmentResult[]
  ): ConfidenceExplanation {
    const topFactors = factors
      .sort((a, b) => (b.score * b.weight) - (a.score * a.weight))
      .slice(0, 3);
    
    const redFlags = factors.filter(f => f.impact === 'negative');
    const supportingFactors = factors.filter(f => f.impact === 'positive');
    
    return {
      summary: this.generateSummary(score, topFactors),
      keyFactors: topFactors.map(f => 
        `${f.name}: ${f.score.toFixed(1)}% (${f.impact})`
      ),
      redFlags: redFlags.map(f => 
        `${f.name}: ${f.description} (Score: ${f.score.toFixed(1)}%)`
      ),
      supportingEvidence: supportingFactors.flatMap(f => f.evidence).slice(0, 5),
      limitationsAndUncertainties: this.generateLimitations(factors, enrichmentResults),
      algorithmVersion: '2.1.0'
    };
  }

  private generateSummary(score: number, topFactors: ConfidenceFactor[]): string {
    const level = this.scoreToConfidenceLevel(score);
    const primaryFactor = topFactors[0];
    
    return `This IOC has ${level} confidence (${score}%) primarily based on ${primaryFactor.name.toLowerCase()} analysis. ${
      score > 70 ? 'Multiple indicators support this assessment.' : 
      score > 50 ? 'Some uncertainty remains in the analysis.' :
      'Significant uncertainty exists - additional verification recommended.'
    }`;
  }

  private generateRecommendation(score: number, level: ConfidenceLevel, factors: ConfidenceFactor[]): string {
    const redFlags = factors.filter(f => f.impact === 'negative').length;
    
    if (level === 'verified') {
      return 'High confidence assessment. Recommended for immediate action based on security policies.';
    } else if (level === 'high') {
      return 'Strong indicators present. Recommended for priority investigation and potential blocking.';
    } else if (level === 'medium') {
      return redFlags > 0 
        ? 'Moderate confidence with some concerns. Monitor closely and gather additional intelligence.'
        : 'Moderate confidence. Consider additional validation before taking action.';
    } else {
      return 'Low confidence assessment. Requires manual review and additional intelligence gathering before action.';
    }
  }

  private generateLimitations(factors: ConfidenceFactor[], enrichmentResults: EnrichmentResult[]): string[] {
    const limitations: string[] = [];
    
    const lowReliabilityFactors = factors.filter(f => f.reliability < 0.8);
    if (lowReliabilityFactors.length > 0) {
      limitations.push(`Some factors have lower reliability: ${lowReliabilityFactors.map(f => f.name).join(', ')}`);
    }
    
    const failedProviders = enrichmentResults.filter(r => !r.success);
    if (failedProviders.length > 0) {
      limitations.push(`${failedProviders.length} provider(s) failed to respond, potentially affecting completeness`);
    }
    
    const providerCount = enrichmentResults.filter(r => r.success).length;
    if (providerCount < 3) {
      limitations.push('Limited provider coverage may affect consensus accuracy');
    }
    
    return limitations;
  }

  // Helper methods
  private daysSince(date: Date): number {
    return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  }

  private calculateActivityFrequency(ioc: IOC): number {
    const daysSinceFirst = this.daysSince(ioc.firstSeen);
    const daysSinceLast = this.daysSince(ioc.lastSeen);
    
    if (daysSinceFirst === 0) return 1;
    
    // Activity frequency based on recency and span
    const activitySpan = daysSinceFirst - daysSinceLast;
    return Math.min(1, Math.max(0, 1 - (daysSinceLast / 30))); // Decay over 30 days
  }

  private calculateEnrichmentDepth(results: EnrichmentResult[]): number {
    return results.reduce((sum, r) => {
      const depth = (
        (r.data.reputation ? 1 : 0) +
        (r.data.relationships.length > 0 ? 1 : 0) +
        (r.data.timeline.length > 0 ? 1 : 0) +
        (r.data.geolocation ? 1 : 0) +
        (r.data.whois ? 1 : 0) +
        (r.data.certificates?.length ? 1 : 0) +
        (r.data.detections.length > 0 ? 1 : 0) +
        (r.data.sandbox ? 1 : 0)
      );
      return sum + depth;
    }, 0) / results.length || 0;
  }

  private validateIOCStructure(ioc: IOC): number {
    // Basic structure validation based on IOC type
    const patterns: Record<IOCType, RegExp> = {
      ipv4: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
      ipv6: /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/,
      domain: /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/,
      url: /^https?:\/\/.+/,
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      md5: /^[a-f0-9]{32}$/i,
      sha1: /^[a-f0-9]{40}$/i,
      sha256: /^[a-f0-9]{64}$/i,
      sha512: /^[a-f0-9]{128}$/i,
      // Add patterns for other types
    } as any;
    
    const pattern = patterns[ioc.type];
    return pattern ? (pattern.test(ioc.value) ? 1.0 : 0.0) : 0.8; // Unknown types get moderate score
  }

  private calculateContextualRelevance(ioc: IOC, results: EnrichmentResult[]): number {
    // Score based on available context and metadata
    let score = 0;
    
    if (ioc.context) score += 0.3;
    if (ioc.description) score += 0.2;
    if (ioc.tags.length > 0) score += 0.2;
    if (results.some(r => r.data.attributes && Object.keys(r.data.attributes).length > 0)) score += 0.3;
    
    return Math.min(1.0, score);
  }

  private calculateCampaignAssociation(results: EnrichmentResult[]): number {
    const campaignResults = results.filter(r => r.data.attributes?.campaign);
    return campaignResults.length / Math.max(1, results.length);
  }

  private calculateActorAttribution(results: EnrichmentResult[]): number {
    const actorResults = results.filter(r => r.data.attributes?.actor);
    return actorResults.length / Math.max(1, results.length);
  }

  private calculateFamilyClassification(results: EnrichmentResult[]): number {
    const familyResults = results.filter(r => r.data.attributes?.family);
    return familyResults.length / Math.max(1, results.length);
  }

  private calculateSandboxDetections(results: EnrichmentResult[]): number {
    return results.reduce((sum, r) => {
      return sum + (r.data.sandbox ? r.data.sandbox.behaviors.length : 0);
    }, 0);
  }

  private calculateBehaviorComplexity(results: EnrichmentResult[]): number {
    const sandboxResults = results.filter(r => r.data.sandbox);
    if (sandboxResults.length === 0) return 0;
    
    const avgComplexity = sandboxResults.reduce((sum, r) => {
      const behavior = r.data.sandbox!;
      const complexity = (
        behavior.behaviors.length * 0.3 +
        behavior.network.length * 0.2 +
        behavior.files.length * 0.2 +
        behavior.registry.length * 0.1 +
        behavior.mitreTactics.length * 0.1 +
        behavior.mitreAttacks.length * 0.1
      );
      return sum + Math.min(1, complexity / 10); // Normalize
    }, 0);
    
    return avgComplexity / sandboxResults.length;
  }

  private calculateEvasionTechniques(results: EnrichmentResult[]): number {
    const sandboxResults = results.filter(r => r.data.sandbox);
    if (sandboxResults.length === 0) return 0;
    
    const evasionKeywords = ['evasion', 'obfuscation', 'anti-vm', 'anti-debug', 'stealth'];
    const evasionCount = sandboxResults.reduce((sum, r) => {
      const behaviors = r.data.sandbox!.behaviors;
      return sum + behaviors.filter(b => 
        evasionKeywords.some(keyword => 
          b.description.toLowerCase().includes(keyword)
        )
      ).length;
    }, 0);
    
    return Math.min(1, evasionCount / 5); // Normalize
  }

  private getMostCommon<T>(arr: T[]): T | undefined {
    if (arr.length === 0) return undefined;
    
    const counts = arr.reduce((acc, item) => {
      acc[item as any] = (acc[item as any] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b) as T;
  }

  private updateConfidenceTrend(iocId: string, score: number, factors: ConfidenceFactor[]): void {
    const trends = this.confidenceHistory.get(iocId) || [];
    const significantFactors = factors.filter(f => f.score > 70 || f.impact === 'negative');
    
    trends.push({
      timestamp: new Date(),
      score,
      triggers: significantFactors.map(f => f.name),
      newEvidence: significantFactors.flatMap(f => f.evidence).slice(0, 3)
    });
    
    // Keep only last 30 entries
    if (trends.length > 30) {
      trends.splice(0, trends.length - 30);
    }
    
    this.confidenceHistory.set(iocId, trends);
  }

  private checkForConfidenceAlerts(ioc: IOC, score: number, factors: ConfidenceFactor[]): void {
    const trends = this.confidenceHistory.get(ioc.id) || [];
    
    // Check for significant confidence drop
    if (trends.length > 1) {
      const lastScore = trends[trends.length - 2].score;
      if (lastScore - score > 20) {
        this.alerts.push({
          id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          iocId: ioc.id,
          type: 'confidence_drop',
          severity: 'high',
          message: `Confidence dropped significantly from ${lastScore}% to ${score}%`,
          details: `IOC ${ioc.value} experienced a ${lastScore - score}% confidence drop`,
          timestamp: new Date(),
          acknowledged: false
        });
      }
    }
    
    // Check for provider disagreement
    const negativeFactors = factors.filter(f => f.impact === 'negative');
    if (negativeFactors.length >= 2) {
      this.alerts.push({
        id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        iocId: ioc.id,
        type: 'provider_disagreement',
        severity: 'medium',
        message: 'Multiple negative confidence factors detected',
        details: `Factors: ${negativeFactors.map(f => f.name).join(', ')}`,
        timestamp: new Date(),
        acknowledged: false
      });
    }
  }

  /**
   * Get confidence trends for an IOC
   */
  getConfidenceTrends(iocId: string): ConfidenceTrend[] {
    return this.confidenceHistory.get(iocId) || [];
  }

  /**
   * Get confidence alerts
   */
  getConfidenceAlerts(iocId?: string): ConfidenceAlert[] {
    return iocId 
      ? this.alerts.filter(alert => alert.iocId === iocId)
      : this.alerts;
  }

  /**
   * Acknowledge confidence alert
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      return true;
    }
    return false;
  }
}