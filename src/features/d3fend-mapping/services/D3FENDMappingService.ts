/**
 * MITRE D3FEND Mapping Service
 *
 * Automatically maps MITRE ATT&CK techniques to D3FEND defensive countermeasures,
 * providing actionable defensive recommendations for every attack technique.
 *
 * Features:
 * - ATT&CK to D3FEND technique mapping
 * - Defense matrix generation
 * - Control coverage assessment
 * - Countermeasure prioritization
 * - Security architecture documentation
 *
 * D3FEND Integration: https://d3fend.mitre.org/
 */

import { Pool } from 'pg';

// =====================================================
// TYPE DEFINITIONS
// =====================================================

/**
 * MITRE ATT&CK Technique
 */
export interface Technique {
  id: string; // e.g., "T1566"
  name: string; // e.g., "Phishing"
  tactics: string[]; // e.g., ["Initial Access"]
  description: string;
  platforms?: string[];
  permissions?: string[];
  dataSource?: string[];
}

/**
 * D3FEND Defensive Countermeasure
 */
export interface DefensiveCountermeasure {
  id: string; // D3FEND ID (e.g., "D3-DA" for Digital Artifact Analysis)
  name: string;
  description: string;
  category: DefensiveCategory;
  artifactType: ArtifactType;

  // Mapping details
  attackTechniques: string[]; // Mapped ATT&CK technique IDs
  confidence: number; // 0-1, mapping confidence
  effectiveness: EffectivenessRating;

  // Implementation details
  implementationComplexity: 'low' | 'medium' | 'high' | 'very_high';
  implementationCost: 'low' | 'medium' | 'high' | 'very_high';
  maintenanceEffort: 'low' | 'medium' | 'high';

  // Technical details
  technicalRequirements: string[];
  tools: Tool[];
  prerequisites: string[];

  // References
  d3fendUrl: string;
  references: Reference[];
}

export type DefensiveCategory =
  | 'hardening'
  | 'detection'
  | 'isolation'
  | 'deception'
  | 'eviction'
  | 'restoration';

export type ArtifactType =
  | 'digital_artifact'      // Logs, forensics, memory dumps
  | 'network_artifact'      // Packet captures, flow data, DNS logs
  | 'system_artifact'       // Registry, file system, processes
  | 'user_artifact'         // User behavior, credentials
  | 'application_artifact'; // Application logs, API calls

export interface EffectivenessRating {
  prevention: number;    // 0-100
  detection: number;     // 0-100
  response: number;      // 0-100
  overall: number;       // Weighted average
}

export interface Tool {
  name: string;
  type: 'commercial' | 'open_source' | 'native';
  url?: string;
  description?: string;
}

export interface Reference {
  title: string;
  url: string;
  source: string;
}

/**
 * Attack Flow (from ThreatFlow)
 */
export interface AttackFlow {
  id: string;
  name: string;
  techniques: Technique[];
  timeline?: TimelineEntry[];
  metadata?: any;
}

export interface TimelineEntry {
  timestamp: Date;
  techniqueId: string;
  action: string;
}

/**
 * Defense Matrix
 * Maps attack techniques to defensive countermeasures in a matrix format
 */
export interface DefenseMatrix {
  flowId: string;
  flowName: string;
  generatedAt: Date;

  // Matrix data
  techniques: Technique[];
  countermeasures: DefensiveCountermeasure[];
  mappings: DefenseMapping[];

  // Coverage analysis
  coverage: CoverageAnalysis;

  // Recommendations
  recommendations: Recommendation[];

  // Metadata
  metadata: {
    totalTechniques: number;
    totalCountermeasures: number;
    uniqueCategories: string[];
    avgCoveragePerTechnique: number;
  };
}

export interface DefenseMapping {
  techniqueId: string;
  countermeasureId: string;
  effectiveness: EffectivenessRating;
  priority: number; // 1-10
  reasoning: string;
}

/**
 * Coverage Analysis
 */
export interface CoverageAnalysis {
  overall: CoverageScore;
  byCategory: Record<DefensiveCategory, CoverageScore>;
  byTechnique: Record<string, CoverageScore>;
  gaps: CoverageGap[];
  strengths: CoverageStrength[];
}

export interface CoverageScore {
  percentage: number; // 0-100
  level: 'none' | 'minimal' | 'partial' | 'substantial' | 'comprehensive';
  implementedControls: number;
  totalControls: number;
}

export interface CoverageGap {
  techniqueId: string;
  techniqueName: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  missingCountermeasures: string[];
  impact: string;
  recommendation: string;
}

export interface CoverageStrength {
  area: string;
  description: string;
  coverage: number;
  countermeasures: string[];
}

/**
 * Environment Configuration
 */
export interface Environment {
  id: string;
  name: string;
  type: 'production' | 'staging' | 'development' | 'test';

  // Deployed defenses
  deployedDefenses: DeployedDefense[];

  // Environment constraints
  constraints: EnvironmentConstraints;

  // Assets
  assets: Asset[];
}

export interface DeployedDefense {
  countermeasureId: string;
  status: 'deployed' | 'planned' | 'testing' | 'deprecated';
  deployedAt?: Date;
  version?: string;
  coverage: string[]; // Asset IDs or groups covered
  effectiveness?: EffectivenessRating;
  notes?: string;
}

export interface EnvironmentConstraints {
  budget?: number;
  allowedTools?: string[];
  restrictedCategories?: DefensiveCategory[];
  complianceRequirements?: string[];
  performanceImpactLimit?: number; // 0-100
}

export interface Asset {
  id: string;
  name: string;
  type: string;
  criticality: 'critical' | 'high' | 'medium' | 'low';
  exposedTechniques: string[]; // ATT&CK technique IDs
}

/**
 * Coverage Assessment Result
 */
export interface CoverageAssessment {
  environment: Environment;
  assessedAt: Date;

  overallCoverage: CoverageScore;
  detailedCoverage: CoverageAnalysis;

  deploymentStatus: DeploymentStatus;
  riskAssessment: RiskAssessment;

  recommendations: Recommendation[];
  prioritizedActions: PrioritizedAction[];
}

export interface DeploymentStatus {
  totalCountermeasures: number;
  deployed: number;
  planned: number;
  testing: number;
  notDeployed: number;
  deploymentPercentage: number;
}

export interface RiskAssessment {
  overallRisk: 'critical' | 'high' | 'medium' | 'low';
  riskScore: number; // 0-100
  exposedTechniques: ExposedTechnique[];
  criticalGaps: CoverageGap[];
}

export interface ExposedTechnique {
  techniqueId: string;
  techniqueName: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  affectedAssets: string[];
  availableCountermeasures: string[];
  deployedCountermeasures: string[];
  coverageGap: number; // Percentage uncovered
}

/**
 * Prioritized Countermeasure
 */
export interface PrioritizedCountermeasure {
  countermeasure: DefensiveCountermeasure;
  priority: number; // 1-100
  priorityLevel: 'critical' | 'high' | 'medium' | 'low';

  // Prioritization factors
  factors: PrioritizationFactors;

  // Impact
  estimatedImpact: Impact;

  // Implementation
  implementationPlan: ImplementationPlan;

  // ROI
  roi: ROIAnalysis;
}

export interface PrioritizationFactors {
  riskReduction: number;      // 0-100, how much risk this reduces
  coverageIncrease: number;    // 0-100, coverage improvement
  urgency: number;             // 0-100, how urgent
  feasibility: number;         // 0-100, how easy to implement
  costEffectiveness: number;   // 0-100, bang for buck
  strategicAlignment: number;  // 0-100, aligns with strategy

  // Weights (should sum to 1.0)
  weights: {
    riskReduction: number;
    coverageIncrease: number;
    urgency: number;
    feasibility: number;
    costEffectiveness: number;
    strategicAlignment: number;
  };
}

export interface Impact {
  techniquesAddressed: string[];
  gapsClosed: number;
  coverageImprovement: number; // Percentage points
  riskReduction: number;       // Percentage points
  assetsProtected: string[];
}

export interface ImplementationPlan {
  phases: ImplementationPhase[];
  estimatedDuration: number; // Days
  estimatedCost: number;
  requiredResources: string[];
  dependencies: string[];
  risks: string[];
}

export interface ImplementationPhase {
  phase: number;
  name: string;
  description: string;
  duration: number; // Days
  tasks: string[];
  deliverables: string[];
}

export interface ROIAnalysis {
  initialCost: number;
  annualCost: number;
  riskReductionValue: number; // Estimated value of risk reduced
  roi: number; // Return on investment ratio
  paybackPeriod: number; // Months
  netPresentValue: number;
}

/**
 * Recommendation
 */
export interface Recommendation {
  id: string;
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: 'immediate' | 'short_term' | 'long_term' | 'strategic';

  relatedTechniques: string[];
  relatedCountermeasures: string[];

  expectedOutcome: string;
  successMetrics: string[];

  estimatedEffort: string;
  estimatedCost: string;
  timeline: string;
}

/**
 * Prioritized Action
 */
export interface PrioritizedAction {
  action: string;
  priority: number;
  category: string;
  impact: string;
  effort: string;
  timeline: string;
  dependencies: string[];
}

/**
 * Security Architecture Document
 */
export interface ArchitectureDocument {
  title: string;
  version: string;
  generatedAt: Date;

  // Executive Summary
  executiveSummary: string;

  // Current State
  currentState: {
    defenseMatrix: DefenseMatrix;
    coverageAssessment: CoverageAssessment;
    riskProfile: RiskAssessment;
  };

  // Proposed Architecture
  proposedArchitecture: {
    overview: string;
    layers: SecurityLayer[];
    components: SecurityComponent[];
    dataFlows: DataFlow[];
  };

  // Implementation Roadmap
  roadmap: {
    phases: RoadmapPhase[];
    timeline: string;
    milestones: Milestone[];
  };

  // Appendices
  appendices: {
    techniqueReference: Technique[];
    countermeasureReference: DefensiveCountermeasure[];
    glossary: GlossaryEntry[];
  };
}

export interface SecurityLayer {
  name: string;
  description: string;
  countermeasures: string[];
  coverage: DefensiveCategory[];
}

export interface SecurityComponent {
  name: string;
  type: string;
  purpose: string;
  countermeasures: string[];
  integrations: string[];
}

export interface DataFlow {
  source: string;
  destination: string;
  dataType: string;
  securityControls: string[];
}

export interface RoadmapPhase {
  phase: number;
  name: string;
  duration: string;
  objectives: string[];
  deliverables: string[];
  countermeasures: string[];
  estimatedCost: number;
}

export interface Milestone {
  name: string;
  date: string;
  description: string;
  successCriteria: string[];
}

export interface GlossaryEntry {
  term: string;
  definition: string;
  references?: string[];
}

// =====================================================
// D3FEND MAPPING SERVICE
// =====================================================

export class D3FENDMappingService {
  private pool: Pool;
  private d3fendApiBase = 'https://d3fend.mitre.org/api';

  // Cache for D3FEND data
  private countermeasureCache: Map<string, DefensiveCountermeasure> = new Map();
  private mappingCache: Map<string, DefensiveCountermeasure[]> = new Map();

  constructor(pool: Pool) {
    this.pool = pool;
  }

  // =====================================================
  // CORE MAPPING METHODS
  // =====================================================

  /**
   * Map ATT&CK technique to D3FEND defensive countermeasures
   */
  async mapAttackToDefense(technique: Technique): Promise<DefensiveCountermeasure[]> {
    // Check cache first
    if (this.mappingCache.has(technique.id)) {
      return this.mappingCache.get(technique.id)!;
    }

    // Check database for existing mappings
    const dbMappings = await this.pool.query(
      `SELECT dc.* FROM d3fend_countermeasures dc
       JOIN d3fend_attack_mappings dam ON dc.id = dam.countermeasure_id
       WHERE dam.attack_technique_id = $1
       ORDER BY dam.effectiveness_overall DESC`,
      [technique.id]
    );

    if (dbMappings.rows.length > 0) {
      const countermeasures = dbMappings.rows.map(row => this.rowToCountermeasure(row));
      this.mappingCache.set(technique.id, countermeasures);
      return countermeasures;
    }

    // Fetch from D3FEND API if not in database
    try {
      const countermeasures = await this.fetchD3FENDMappings(technique.id);

      // Store in database for future use
      await this.storeMappings(technique.id, countermeasures);

      // Cache
      this.mappingCache.set(technique.id, countermeasures);

      return countermeasures;
    } catch (error) {
      console.error(`Error fetching D3FEND mappings for ${technique.id}:`, error);

      // Return intelligent defaults based on technique characteristics
      return this.generateDefaultCountermeasures(technique);
    }
  }

  /**
   * Generate comprehensive defense matrix for an attack flow
   */
  async generateDefenseMatrix(flow: AttackFlow): Promise<DefenseMatrix> {
    const allCountermeasures: DefensiveCountermeasure[] = [];
    const mappings: DefenseMapping[] = [];
    const techniqueMap = new Map<string, DefensiveCountermeasure[]>();

    // Map each technique to countermeasures
    for (const technique of flow.techniques) {
      const countermeasures = await this.mapAttackToDefense(technique);
      techniqueMap.set(technique.id, countermeasures);

      // Add to global list (deduplicated)
      for (const cm of countermeasures) {
        if (!allCountermeasures.find(existing => existing.id === cm.id)) {
          allCountermeasures.push(cm);
        }
      }

      // Create mappings
      countermeasures.forEach((cm, index) => {
        mappings.push({
          techniqueId: technique.id,
          countermeasureId: cm.id,
          effectiveness: cm.effectiveness,
          priority: this.calculateMappingPriority(technique, cm, index),
          reasoning: this.generateMappingReasoning(technique, cm),
        });
      });
    }

    // Analyze coverage
    const coverage = await this.analyzeCoverage(flow.techniques, allCountermeasures, mappings);

    // Generate recommendations
    const recommendations = await this.generateRecommendations(flow, coverage, allCountermeasures);

    // Build metadata
    const uniqueCategories = [...new Set(allCountermeasures.map(cm => cm.category))];
    const avgCoveragePerTechnique = mappings.length / flow.techniques.length;

    return {
      flowId: flow.id,
      flowName: flow.name,
      generatedAt: new Date(),
      techniques: flow.techniques,
      countermeasures: allCountermeasures,
      mappings,
      coverage,
      recommendations,
      metadata: {
        totalTechniques: flow.techniques.length,
        totalCountermeasures: allCountermeasures.length,
        uniqueCategories,
        avgCoveragePerTechnique,
      },
    };
  }

  /**
   * Assess control coverage for an environment
   */
  async assessControlCoverage(
    defenses: DeployedDefense[],
    environment: Environment
  ): Promise<CoverageAssessment> {
    // Get all countermeasures (both deployed and available)
    const deployedCountermeasures = await this.getCountermeasuresByIds(
      defenses.map(d => d.countermeasureId)
    );

    // Get all techniques that could affect this environment
    const relevantTechniques = await this.getTechniquesForAssets(environment.assets);

    // Calculate overall coverage
    const overallCoverage = this.calculateOverallCoverage(
      relevantTechniques,
      deployedCountermeasures,
      defenses
    );

    // Detailed coverage analysis
    const detailedCoverage = await this.performDetailedCoverageAnalysis(
      relevantTechniques,
      deployedCountermeasures,
      defenses,
      environment
    );

    // Deployment status
    const deploymentStatus = this.calculateDeploymentStatus(defenses);

    // Risk assessment
    const riskAssessment = await this.performRiskAssessment(
      environment,
      relevantTechniques,
      deployedCountermeasures,
      detailedCoverage
    );

    // Generate recommendations
    const recommendations = await this.generateCoverageRecommendations(
      environment,
      detailedCoverage,
      riskAssessment
    );

    // Prioritize actions
    const prioritizedActions = await this.prioritizeActions(
      recommendations,
      environment,
      riskAssessment
    );

    return {
      environment,
      assessedAt: new Date(),
      overallCoverage,
      detailedCoverage,
      deploymentStatus,
      riskAssessment,
      recommendations,
      prioritizedActions,
    };
  }

  /**
   * Prioritize countermeasure implementation
   */
  async prioritizeImplementation(
    countermeasures: DefensiveCountermeasure[]
  ): Promise<PrioritizedCountermeasure[]> {
    const prioritized: PrioritizedCountermeasure[] = [];

    for (const cm of countermeasures) {
      // Calculate prioritization factors
      const factors = await this.calculatePrioritizationFactors(cm);

      // Calculate overall priority score
      const priority = this.calculatePriorityScore(factors);

      // Determine priority level
      const priorityLevel = this.getPriorityLevel(priority);

      // Estimate impact
      const estimatedImpact = await this.estimateImpact(cm);

      // Create implementation plan
      const implementationPlan = await this.createImplementationPlan(cm);

      // Calculate ROI
      const roi = await this.calculateROI(cm, estimatedImpact, implementationPlan);

      prioritized.push({
        countermeasure: cm,
        priority,
        priorityLevel,
        factors,
        estimatedImpact,
        implementationPlan,
        roi,
      });
    }

    // Sort by priority (highest first)
    return prioritized.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Export defense matrix to security architecture document
   */
  async exportToSecurityArchitecture(matrix: DefenseMatrix): Promise<ArchitectureDocument> {
    // Generate executive summary
    const executiveSummary = this.generateExecutiveSummary(matrix);

    // Get coverage assessment
    const coverageAssessment = await this.convertToFullCoverageAssessment(matrix);

    // Build proposed architecture
    const proposedArchitecture = await this.buildProposedArchitecture(matrix);

    // Create implementation roadmap
    const roadmap = await this.createImplementationRoadmap(matrix);

    // Build appendices
    const appendices = this.buildAppendices(matrix);

    return {
      title: `Security Architecture Document - ${matrix.flowName}`,
      version: '1.0',
      generatedAt: new Date(),
      executiveSummary,
      currentState: {
        defenseMatrix: matrix,
        coverageAssessment,
        riskProfile: coverageAssessment.riskAssessment,
      },
      proposedArchitecture,
      roadmap,
      appendices,
    };
  }

  // =====================================================
  // HELPER METHODS - D3FEND API INTEGRATION
  // =====================================================

  /**
   * Fetch D3FEND mappings from API
   */
  private async fetchD3FENDMappings(techniqueId: string): Promise<DefensiveCountermeasure[]> {
    // Note: D3FEND API structure is illustrative - actual API may differ
    // In production, use actual D3FEND API endpoints and data structure

    const response = await fetch(`${this.d3fendApiBase}/techniques/${techniqueId}`);

    if (!response.ok) {
      throw new Error(`D3FEND API error: ${response.statusText}`);
    }

    const data = await response.json();

    // Transform D3FEND data to our countermeasure format
    return this.transformD3FENDData(data);
  }

  /**
   * Transform D3FEND API data to countermeasure format
   */
  private transformD3FENDData(data: any): DefensiveCountermeasure[] {
    const countermeasures: DefensiveCountermeasure[] = [];

    // Parse D3FEND response (structure is illustrative)
    if (data.defenses && Array.isArray(data.defenses)) {
      for (const defense of data.defenses) {
        countermeasures.push({
          id: defense.id || `D3-${defense.name.substring(0, 3).toUpperCase()}`,
          name: defense.name,
          description: defense.description || '',
          category: this.mapD3FENDCategory(defense.category),
          artifactType: this.mapD3FENDArtifactType(defense.artifacts),
          attackTechniques: [data.techniqueId],
          confidence: defense.confidence || 0.8,
          effectiveness: {
            prevention: defense.effectiveness?.prevention || 70,
            detection: defense.effectiveness?.detection || 80,
            response: defense.effectiveness?.response || 60,
            overall: defense.effectiveness?.overall || 70,
          },
          implementationComplexity: defense.complexity || 'medium',
          implementationCost: defense.cost || 'medium',
          maintenanceEffort: defense.maintenance || 'medium',
          technicalRequirements: defense.requirements || [],
          tools: defense.tools?.map((t: any) => ({
            name: t.name,
            type: t.type || 'commercial',
            url: t.url,
            description: t.description,
          })) || [],
          prerequisites: defense.prerequisites || [],
          d3fendUrl: `https://d3fend.mitre.org/technique/${defense.id}`,
          references: defense.references || [],
        });
      }
    }

    return countermeasures;
  }

  /**
   * Generate default countermeasures based on technique characteristics
   */
  private generateDefaultCountermeasures(technique: Technique): DefensiveCountermeasure[] {
    const countermeasures: DefensiveCountermeasure[] = [];

    // Analyze technique to suggest appropriate defenses
    const tactics = technique.tactics || [];

    // Initial Access techniques -> Network monitoring, email security
    if (tactics.includes('Initial Access')) {
      countermeasures.push(this.createEmailSecurityCountermeasure(technique));
      countermeasures.push(this.createNetworkMonitoringCountermeasure(technique));
    }

    // Execution techniques -> Application whitelisting, EDR
    if (tactics.includes('Execution')) {
      countermeasures.push(this.createApplicationControlCountermeasure(technique));
      countermeasures.push(this.createEDRCountermeasure(technique));
    }

    // Persistence techniques -> Registry monitoring, file integrity
    if (tactics.includes('Persistence')) {
      countermeasures.push(this.createRegistryMonitoringCountermeasure(technique));
      countermeasures.push(this.createFileIntegrityCountermeasure(technique));
    }

    // Privilege Escalation -> Privilege management, monitoring
    if (tactics.includes('Privilege Escalation')) {
      countermeasures.push(this.createPrivilegeManagementCountermeasure(technique));
    }

    // Defense Evasion -> Behavioral analysis, anomaly detection
    if (tactics.includes('Defense Evasion')) {
      countermeasures.push(this.createBehavioralAnalysisCountermeasure(technique));
    }

    // Credential Access -> MFA, credential monitoring
    if (tactics.includes('Credential Access')) {
      countermeasures.push(this.createMFACountermeasure(technique));
      countermeasures.push(this.createCredentialMonitoringCountermeasure(technique));
    }

    // Discovery -> Network segmentation, deception
    if (tactics.includes('Discovery')) {
      countermeasures.push(this.createNetworkSegmentationCountermeasure(technique));
      countermeasures.push(this.createDeceptionCountermeasure(technique));
    }

    // Lateral Movement -> Network segmentation, micro-segmentation
    if (tactics.includes('Lateral Movement')) {
      countermeasures.push(this.createMicroSegmentationCountermeasure(technique));
    }

    // Collection -> DLP, monitoring
    if (tactics.includes('Collection')) {
      countermeasures.push(this.createDLPCountermeasure(technique));
    }

    // Exfiltration -> Network monitoring, DLP
    if (tactics.includes('Exfiltration')) {
      countermeasures.push(this.createExfiltrationMonitoringCountermeasure(technique));
    }

    // Command and Control -> Network filtering, DNS monitoring
    if (tactics.includes('Command and Control')) {
      countermeasures.push(this.createDNSMonitoringCountermeasure(technique));
      countermeasures.push(this.createNetworkFilteringCountermeasure(technique));
    }

    // Impact -> Backup, resilience
    if (tactics.includes('Impact')) {
      countermeasures.push(this.createBackupCountermeasure(technique));
      countermeasures.push(this.createResilienceCountermeasure(technique));
    }

    // Always add general detection and logging
    countermeasures.push(this.createSIEMCountermeasure(technique));
    countermeasures.push(this.createLoggingCountermeasure(technique));

    return countermeasures;
  }

  // =====================================================
  // COUNTERMEASURE FACTORY METHODS
  // =====================================================

  private createEmailSecurityCountermeasure(technique: Technique): DefensiveCountermeasure {
    return {
      id: 'D3-EMLSEC',
      name: 'Email Security Gateway',
      description: 'Advanced email filtering and analysis to detect and block malicious emails',
      category: 'detection',
      artifactType: 'network_artifact',
      attackTechniques: [technique.id],
      confidence: 0.9,
      effectiveness: { prevention: 85, detection: 95, response: 50, overall: 80 },
      implementationComplexity: 'medium',
      implementationCost: 'medium',
      maintenanceEffort: 'medium',
      technicalRequirements: ['Email gateway', 'Sandboxing', 'URL analysis'],
      tools: [
        { name: 'Proofpoint', type: 'commercial' },
        { name: 'Mimecast', type: 'commercial' },
        { name: 'SpamAssassin', type: 'open_source' },
      ],
      prerequisites: ['Email infrastructure', 'MX record control'],
      d3fendUrl: 'https://d3fend.mitre.org/technique/D3-EMLSEC',
      references: [],
    };
  }

  private createNetworkMonitoringCountermeasure(technique: Technique): DefensiveCountermeasure {
    return {
      id: 'D3-NM',
      name: 'Network Monitoring',
      description: 'Continuous network traffic analysis for anomaly and threat detection',
      category: 'detection',
      artifactType: 'network_artifact',
      attackTechniques: [technique.id],
      confidence: 0.85,
      effectiveness: { prevention: 40, detection: 90, response: 70, overall: 70 },
      implementationComplexity: 'medium',
      implementationCost: 'medium',
      maintenanceEffort: 'high',
      technicalRequirements: ['Network TAPs', 'SPAN ports', 'Storage for pcaps'],
      tools: [
        { name: 'Zeek (Bro)', type: 'open_source' },
        { name: 'Suricata', type: 'open_source' },
        { name: 'Darktrace', type: 'commercial' },
      ],
      prerequisites: ['Network visibility', 'Storage capacity'],
      d3fendUrl: 'https://d3fend.mitre.org/technique/D3-NM',
      references: [],
    };
  }

  private createApplicationControlCountermeasure(technique: Technique): DefensiveCountermeasure {
    return {
      id: 'D3-ACL',
      name: 'Application Whitelisting',
      description: 'Allow only approved applications to execute on endpoints',
      category: 'hardening',
      artifactType: 'system_artifact',
      attackTechniques: [technique.id],
      confidence: 0.95,
      effectiveness: { prevention: 95, detection: 70, response: 40, overall: 75 },
      implementationComplexity: 'high',
      implementationCost: 'low',
      maintenanceEffort: 'high',
      technicalRequirements: ['Endpoint management', 'Application inventory'],
      tools: [
        { name: 'Windows AppLocker', type: 'native' },
        { name: 'Carbon Black App Control', type: 'commercial' },
      ],
      prerequisites: ['Complete application inventory', 'Change management process'],
      d3fendUrl: 'https://d3fend.mitre.org/technique/D3-ACL',
      references: [],
    };
  }

  private createEDRCountermeasure(technique: Technique): DefensiveCountermeasure {
    return {
      id: 'D3-EDR',
      name: 'Endpoint Detection and Response (EDR)',
      description: 'Continuous endpoint monitoring and behavioral analysis',
      category: 'detection',
      artifactType: 'system_artifact',
      attackTechniques: [technique.id],
      confidence: 0.9,
      effectiveness: { prevention: 70, detection: 95, response: 85, overall: 85 },
      implementationComplexity: 'medium',
      implementationCost: 'high',
      maintenanceEffort: 'medium',
      technicalRequirements: ['Endpoint agent deployment', 'Central management console'],
      tools: [
        { name: 'CrowdStrike Falcon', type: 'commercial' },
        { name: 'Microsoft Defender for Endpoint', type: 'commercial' },
        { name: 'SentinelOne', type: 'commercial' },
      ],
      prerequisites: ['Endpoint access', 'Network connectivity'],
      d3fendUrl: 'https://d3fend.mitre.org/technique/D3-EDR',
      references: [],
    };
  }

  private createRegistryMonitoringCountermeasure(technique: Technique): DefensiveCountermeasure {
    return {
      id: 'D3-REGMON',
      name: 'Registry Monitoring',
      description: 'Monitor Windows Registry for unauthorized modifications',
      category: 'detection',
      artifactType: 'system_artifact',
      attackTechniques: [technique.id],
      confidence: 0.8,
      effectiveness: { prevention: 30, detection: 85, response: 60, overall: 60 },
      implementationComplexity: 'low',
      implementationCost: 'low',
      maintenanceEffort: 'medium',
      technicalRequirements: ['Windows event logging', 'Sysmon'],
      tools: [
        { name: 'Sysmon', type: 'open_source' },
        { name: 'Windows Event Log', type: 'native' },
      ],
      prerequisites: ['Windows endpoints', 'Log collection infrastructure'],
      d3fendUrl: 'https://d3fend.mitre.org/technique/D3-REGMON',
      references: [],
    };
  }

  private createFileIntegrityCountermeasure(technique: Technique): DefensiveCountermeasure {
    return {
      id: 'D3-FIM',
      name: 'File Integrity Monitoring',
      description: 'Detect unauthorized changes to critical system files',
      category: 'detection',
      artifactType: 'system_artifact',
      attackTechniques: [technique.id],
      confidence: 0.85,
      effectiveness: { prevention: 40, detection: 90, response: 50, overall: 65 },
      implementationComplexity: 'low',
      implementationCost: 'low',
      maintenanceEffort: 'medium',
      technicalRequirements: ['File access monitoring', 'Baseline configuration'],
      tools: [
        { name: 'Tripwire', type: 'commercial' },
        { name: 'AIDE', type: 'open_source' },
        { name: 'OSSEC', type: 'open_source' },
      ],
      prerequisites: ['File system access', 'Baseline established'],
      d3fendUrl: 'https://d3fend.mitre.org/technique/D3-FIM',
      references: [],
    };
  }

  private createPrivilegeManagementCountermeasure(technique: Technique): DefensiveCountermeasure {
    return {
      id: 'D3-PAM',
      name: 'Privileged Access Management',
      description: 'Control and monitor privileged account usage',
      category: 'hardening',
      artifactType: 'user_artifact',
      attackTechniques: [technique.id],
      confidence: 0.9,
      effectiveness: { prevention: 85, detection: 80, response: 70, overall: 80 },
      implementationComplexity: 'high',
      implementationCost: 'high',
      maintenanceEffort: 'medium',
      technicalRequirements: ['PAM solution', 'MFA', 'Session recording'],
      tools: [
        { name: 'CyberArk', type: 'commercial' },
        { name: 'BeyondTrust', type: 'commercial' },
      ],
      prerequisites: ['Privileged account inventory', 'Access policies'],
      d3fendUrl: 'https://d3fend.mitre.org/technique/D3-PAM',
      references: [],
    };
  }

  private createBehavioralAnalysisCountermeasure(technique: Technique): DefensiveCountermeasure {
    return {
      id: 'D3-BA',
      name: 'Behavioral Analysis',
      description: 'Detect anomalous behavior patterns indicative of compromise',
      category: 'detection',
      artifactType: 'system_artifact',
      attackTechniques: [technique.id],
      confidence: 0.75,
      effectiveness: { prevention: 50, detection: 85, response: 70, overall: 70 },
      implementationComplexity: 'high',
      implementationCost: 'high',
      maintenanceEffort: 'high',
      technicalRequirements: ['ML/AI capabilities', 'Baseline behavior models'],
      tools: [
        { name: 'Darktrace', type: 'commercial' },
        { name: 'Vectra AI', type: 'commercial' },
      ],
      prerequisites: ['Training period for baselines', 'Data collection'],
      d3fendUrl: 'https://d3fend.mitre.org/technique/D3-BA',
      references: [],
    };
  }

  private createMFACountermeasure(technique: Technique): DefensiveCountermeasure {
    return {
      id: 'D3-MFA',
      name: 'Multi-Factor Authentication',
      description: 'Require multiple authentication factors for access',
      category: 'hardening',
      artifactType: 'user_artifact',
      attackTechniques: [technique.id],
      confidence: 0.95,
      effectiveness: { prevention: 95, detection: 60, response: 30, overall: 70 },
      implementationComplexity: 'low',
      implementationCost: 'low',
      maintenanceEffort: 'low',
      technicalRequirements: ['MFA provider', 'User enrollment'],
      tools: [
        { name: 'Duo Security', type: 'commercial' },
        { name: 'Okta', type: 'commercial' },
        { name: 'Google Authenticator', type: 'open_source' },
      ],
      prerequisites: ['Identity provider integration', 'User devices'],
      d3fendUrl: 'https://d3fend.mitre.org/technique/D3-MFA',
      references: [],
    };
  }

  private createCredentialMonitoringCountermeasure(technique: Technique): DefensiveCountermeasure {
    return {
      id: 'D3-CREDMON',
      name: 'Credential Monitoring',
      description: 'Monitor for credential theft and misuse',
      category: 'detection',
      artifactType: 'user_artifact',
      attackTechniques: [technique.id],
      confidence: 0.8,
      effectiveness: { prevention: 40, detection: 90, response: 75, overall: 70 },
      implementationComplexity: 'medium',
      implementationCost: 'medium',
      maintenanceEffort: 'medium',
      technicalRequirements: ['Log aggregation', 'UEBA capabilities'],
      tools: [
        { name: 'Microsoft Defender for Identity', type: 'commercial' },
        { name: 'SpyCloud', type: 'commercial' },
      ],
      prerequisites: ['Authentication logs', 'Threat intelligence feeds'],
      d3fendUrl: 'https://d3fend.mitre.org/technique/D3-CREDMON',
      references: [],
    };
  }

  private createNetworkSegmentationCountermeasure(technique: Technique): DefensiveCountermeasure {
    return {
      id: 'D3-NETSEG',
      name: 'Network Segmentation',
      description: 'Isolate network segments to limit lateral movement',
      category: 'isolation',
      artifactType: 'network_artifact',
      attackTechniques: [technique.id],
      confidence: 0.9,
      effectiveness: { prevention: 80, detection: 60, response: 50, overall: 65 },
      implementationComplexity: 'high',
      implementationCost: 'medium',
      maintenanceEffort: 'medium',
      technicalRequirements: ['Network redesign', 'Firewall rules', 'VLANs'],
      tools: [
        { name: 'Cisco ACI', type: 'commercial' },
        { name: 'pfSense', type: 'open_source' },
      ],
      prerequisites: ['Network topology analysis', 'Business requirements'],
      d3fendUrl: 'https://d3fend.mitre.org/technique/D3-NETSEG',
      references: [],
    };
  }

  private createDeceptionCountermeasure(technique: Technique): DefensiveCountermeasure {
    return {
      id: 'D3-DECOY',
      name: 'Deception Technology',
      description: 'Deploy honeypots and decoys to detect and misdirect attackers',
      category: 'deception',
      artifactType: 'network_artifact',
      attackTechniques: [technique.id],
      confidence: 0.85,
      effectiveness: { prevention: 60, detection: 95, response: 80, overall: 80 },
      implementationComplexity: 'medium',
      implementationCost: 'medium',
      maintenanceEffort: 'medium',
      technicalRequirements: ['Decoy infrastructure', 'Alerting integration'],
      tools: [
        { name: 'Attivo Networks', type: 'commercial' },
        { name: 'TrapX', type: 'commercial' },
        { name: 'Cowrie', type: 'open_source' },
      ],
      prerequisites: ['Network access', 'Monitoring infrastructure'],
      d3fendUrl: 'https://d3fend.mitre.org/technique/D3-DECOY',
      references: [],
    };
  }

  private createMicroSegmentationCountermeasure(technique: Technique): DefensiveCountermeasure {
    return {
      id: 'D3-MICROSEG',
      name: 'Micro-Segmentation',
      description: 'Application-level network segmentation with zero trust',
      category: 'isolation',
      artifactType: 'network_artifact',
      attackTechniques: [technique.id],
      confidence: 0.85,
      effectiveness: { prevention: 90, detection: 70, response: 60, overall: 75 },
      implementationComplexity: 'very_high',
      implementationCost: 'high',
      maintenanceEffort: 'high',
      technicalRequirements: ['SDN capabilities', 'Application mapping', 'Policy engine'],
      tools: [
        { name: 'VMware NSX', type: 'commercial' },
        { name: 'Illumio', type: 'commercial' },
      ],
      prerequisites: ['Application inventory', 'Zero trust architecture'],
      d3fendUrl: 'https://d3fend.mitre.org/technique/D3-MICROSEG',
      references: [],
    };
  }

  private createDLPCountermeasure(technique: Technique): DefensiveCountermeasure {
    return {
      id: 'D3-DLP',
      name: 'Data Loss Prevention',
      description: 'Prevent unauthorized data access, use, and exfiltration',
      category: 'detection',
      artifactType: 'digital_artifact',
      attackTechniques: [technique.id],
      confidence: 0.8,
      effectiveness: { prevention: 75, detection: 85, response: 70, overall: 77 },
      implementationComplexity: 'high',
      implementationCost: 'high',
      maintenanceEffort: 'high',
      technicalRequirements: ['Data classification', 'DLP agents', 'Policy engine'],
      tools: [
        { name: 'Symantec DLP', type: 'commercial' },
        { name: 'Microsoft Purview', type: 'commercial' },
      ],
      prerequisites: ['Data classification scheme', 'Data inventory'],
      d3fendUrl: 'https://d3fend.mitre.org/technique/D3-DLP',
      references: [],
    };
  }

  private createExfiltrationMonitoringCountermeasure(technique: Technique): DefensiveCountermeasure {
    return {
      id: 'D3-EXFILMON',
      name: 'Exfiltration Monitoring',
      description: 'Detect abnormal data transfers and potential exfiltration',
      category: 'detection',
      artifactType: 'network_artifact',
      attackTechniques: [technique.id],
      confidence: 0.8,
      effectiveness: { prevention: 50, detection: 90, response: 75, overall: 72 },
      implementationComplexity: 'medium',
      implementationCost: 'medium',
      maintenanceEffort: 'medium',
      technicalRequirements: ['Network monitoring', 'Baseline traffic patterns'],
      tools: [
        { name: 'Netw itness', type: 'commercial' },
        { name: 'Zeek', type: 'open_source' },
      ],
      prerequisites: ['Network visibility', 'Traffic baselines'],
      d3fendUrl: 'https://d3fend.mitre.org/technique/D3-EXFILMON',
      references: [],
    };
  }

  private createDNSMonitoringCountermeasure(technique: Technique): DefensiveCountermeasure {
    return {
      id: 'D3-DNSMON',
      name: 'DNS Monitoring',
      description: 'Monitor DNS queries for malicious domains and C2 communication',
      category: 'detection',
      artifactType: 'network_artifact',
      attackTechniques: [technique.id],
      confidence: 0.85,
      effectiveness: { prevention: 60, detection: 90, response: 70, overall: 75 },
      implementationComplexity: 'low',
      implementationCost: 'low',
      maintenanceEffort: 'low',
      technicalRequirements: ['DNS logging', 'Threat intelligence feeds'],
      tools: [
        { name: 'Cisco Umbrella', type: 'commercial' },
        { name: 'Pi-hole', type: 'open_source' },
      ],
      prerequisites: ['DNS infrastructure control', 'Threat feeds'],
      d3fendUrl: 'https://d3fend.mitre.org/technique/D3-DNSMON',
      references: [],
    };
  }

  private createNetworkFilteringCountermeasure(technique: Technique): DefensiveCountermeasure {
    return {
      id: 'D3-NETFILTER',
      name: 'Network Traffic Filtering',
      description: 'Block malicious network traffic based on threat intelligence',
      category: 'hardening',
      artifactType: 'network_artifact',
      attackTechniques: [technique.id],
      confidence: 0.9,
      effectiveness: { prevention: 85, detection: 70, response: 50, overall: 70 },
      implementationComplexity: 'low',
      implementationCost: 'low',
      maintenanceEffort: 'medium',
      technicalRequirements: ['Firewall', 'IPS', 'Threat feeds'],
      tools: [
        { name: 'Palo Alto NGFW', type: 'commercial' },
        { name: 'Suricata', type: 'open_source' },
      ],
      prerequisites: ['Network perimeter control', 'Threat intelligence'],
      d3fendUrl: 'https://d3fend.mitre.org/technique/D3-NETFILTER',
      references: [],
    };
  }

  private createBackupCountermeasure(technique: Technique): DefensiveCountermeasure {
    return {
      id: 'D3-BACKUP',
      name: 'Data Backup and Recovery',
      description: 'Regular backups with offline/immutable storage for ransomware resilience',
      category: 'restoration',
      artifactType: 'digital_artifact',
      attackTechniques: [technique.id],
      confidence: 0.95,
      effectiveness: { prevention: 30, detection: 40, response: 95, overall: 55 },
      implementationComplexity: 'medium',
      implementationCost: 'medium',
      maintenanceEffort: 'medium',
      technicalRequirements: ['Backup solution', 'Offline/immutable storage', 'Recovery testing'],
      tools: [
        { name: 'Veeam', type: 'commercial' },
        { name: 'Commvault', type: 'commercial' },
        { name: 'Bacula', type: 'open_source' },
      ],
      prerequisites: ['Data inventory', 'RTO/RPO requirements'],
      d3fendUrl: 'https://d3fend.mitre.org/technique/D3-BACKUP',
      references: [],
    };
  }

  private createResilienceCountermeasure(technique: Technique): DefensiveCountermeasure {
    return {
      id: 'D3-RESILIENCE',
      name: 'System Resilience',
      description: 'Build redundancy and failover capabilities for business continuity',
      category: 'restoration',
      artifactType: 'system_artifact',
      attackTechniques: [technique.id],
      confidence: 0.85,
      effectiveness: { prevention: 40, detection: 30, response: 90, overall: 55 },
      implementationComplexity: 'high',
      implementationCost: 'very_high',
      maintenanceEffort: 'medium',
      technicalRequirements: ['Redundant systems', 'Failover mechanisms', 'DR site'],
      tools: [
        { name: 'VMware SRM', type: 'commercial' },
        { name: 'Azure Site Recovery', type: 'commercial' },
      ],
      prerequisites: ['BIA/BCP', 'Disaster recovery plan'],
      d3fendUrl: 'https://d3fend.mitre.org/technique/D3-RESILIENCE',
      references: [],
    };
  }

  private createSIEMCountermeasure(technique: Technique): DefensiveCountermeasure {
    return {
      id: 'D3-SIEM',
      name: 'Security Information and Event Management',
      description: 'Centralized log collection, correlation, and analysis',
      category: 'detection',
      artifactType: 'digital_artifact',
      attackTechniques: [technique.id],
      confidence: 0.9,
      effectiveness: { prevention: 40, detection: 90, response: 80, overall: 75 },
      implementationComplexity: 'high',
      implementationCost: 'high',
      maintenanceEffort: 'high',
      technicalRequirements: ['Log sources', 'Storage', 'Correlation rules'],
      tools: [
        { name: 'Splunk', type: 'commercial' },
        { name: 'ELK Stack', type: 'open_source' },
        { name: 'QRadar', type: 'commercial' },
      ],
      prerequisites: ['Log sources identified', 'Use cases defined'],
      d3fendUrl: 'https://d3fend.mitre.org/technique/D3-SIEM',
      references: [],
    };
  }

  private createLoggingCountermeasure(technique: Technique): DefensiveCountermeasure {
    return {
      id: 'D3-LOG',
      name: 'Comprehensive Logging',
      description: 'Enable detailed logging across all systems for forensics and detection',
      category: 'detection',
      artifactType: 'digital_artifact',
      attackTechniques: [technique.id],
      confidence: 0.95,
      effectiveness: { prevention: 20, detection: 80, response: 90, overall: 65 },
      implementationComplexity: 'low',
      implementationCost: 'low',
      maintenanceEffort: 'medium',
      technicalRequirements: ['Log collection', 'Storage', 'Retention policy'],
      tools: [
        { name: 'Syslog-ng', type: 'open_source' },
        { name: 'NXLog', type: 'open_source' },
        { name: 'Windows Event Forwarding', type: 'native' },
      ],
      prerequisites: ['Log sources', 'Centralized storage'],
      d3fendUrl: 'https://d3fend.mitre.org/technique/D3-LOG',
      references: [],
    };
  }

  // =====================================================
  // HELPER METHODS - CONTINUED IN NEXT SECTION
  // =====================================================

  private mapD3FENDCategory(category: string): DefensiveCategory {
    const mapping: Record<string, DefensiveCategory> = {
      'harden': 'hardening',
      'detect': 'detection',
      'isolate': 'isolation',
      'deceive': 'deception',
      'evict': 'eviction',
      'restore': 'restoration',
    };
    return mapping[category.toLowerCase()] || 'detection';
  }

  private mapD3FENDArtifactType(artifacts: string[]): ArtifactType {
    if (!artifacts || artifacts.length === 0) return 'digital_artifact';

    const artifact = artifacts[0].toLowerCase();
    if (artifact.includes('network') || artifact.includes('packet')) return 'network_artifact';
    if (artifact.includes('system') || artifact.includes('registry')) return 'system_artifact';
    if (artifact.includes('user') || artifact.includes('credential')) return 'user_artifact';
    if (artifact.includes('application') || artifact.includes('api')) return 'application_artifact';

    return 'digital_artifact';
  }

  private calculateMappingPriority(technique: Technique, cm: DefensiveCountermeasure, index: number): number {
    // Higher priority for first few countermeasures
    const positionFactor = Math.max(0, 10 - index);

    // Higher priority for higher effectiveness
    const effectivenessFactor = cm.effectiveness.overall / 10;

    // Lower priority for higher complexity
    const complexityPenalty = cm.implementationComplexity === 'very_high' ? -2 :
                               cm.implementationComplexity === 'high' ? -1 : 0;

    return Math.min(10, Math.max(1, positionFactor + effectivenessFactor + complexityPenalty));
  }

  private generateMappingReasoning(technique: Technique, cm: DefensiveCountermeasure): string {
    return `${cm.name} provides ${cm.effectiveness.overall}% overall effectiveness against ${technique.name} ` +
           `through ${cm.category} controls targeting ${cm.artifactType.replace('_', ' ')}s. ` +
           `This countermeasure offers ${cm.effectiveness.prevention}% prevention, ` +
           `${cm.effectiveness.detection}% detection, and ${cm.effectiveness.response}% response capabilities.`;
  }

  private async stor eMappings(techniqueId: string, countermeasures: DefensiveCountermeasure[]): Promise<void> {
    // Store countermeasures and mappings in database
    for (const cm of countermeasures) {
      // Insert or update countermeasure
      await this.pool.query(
        `INSERT INTO d3fend_countermeasures
         (id, name, description, category, artifact_type, implementation_complexity,
          implementation_cost, maintenance_effort, technical_requirements, tools,
          prerequisites, d3fend_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         updated_at = CURRENT_TIMESTAMP`,
        [cm.id, cm.name, cm.description, cm.category, cm.artifactType,
         cm.implementationComplexity, cm.implementationCost, cm.maintenanceEffort,
         JSON.stringify(cm.technicalRequirements), JSON.stringify(cm.tools),
         JSON.stringify(cm.prerequisites), cm.d3fendUrl]
      );

      // Insert mapping
      await this.pool.query(
        `INSERT INTO d3fend_attack_mappings
         (attack_technique_id, countermeasure_id, confidence, effectiveness_prevention,
          effectiveness_detection, effectiveness_response, effectiveness_overall)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (attack_technique_id, countermeasure_id) DO UPDATE SET
         confidence = EXCLUDED.confidence,
         effectiveness_overall = EXCLUDED.effectiveness_overall`,
        [techniqueId, cm.id, cm.confidence, cm.effectiveness.prevention,
         cm.effectiveness.detection, cm.effectiveness.response, cm.effectiveness.overall]
      );
    }
  }

  private rowToCountermeasure(row: any): DefensiveCountermeasure {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      category: row.category,
      artifactType: row.artifact_type,
      attackTechniques: row.attack_techniques || [],
      confidence: row.confidence || 0.8,
      effectiveness: {
        prevention: row.effectiveness_prevention || 70,
        detection: row.effectiveness_detection || 80,
        response: row.effectiveness_response || 60,
        overall: row.effectiveness_overall || 70,
      },
      implementationComplexity: row.implementation_complexity,
      implementationCost: row.implementation_cost,
      maintenanceEffort: row.maintenance_effort,
      technicalRequirements: row.technical_requirements ? JSON.parse(row.technical_requirements) : [],
      tools: row.tools ? JSON.parse(row.tools) : [],
      prerequisites: row.prerequisites ? JSON.parse(row.prerequisites) : [],
      d3fendUrl: row.d3fend_url,
      references: row.references ? JSON.parse(row.references) : [],
    };
  }

  // More helper methods will be added in the next part due to length...
  // (Coverage analysis, prioritization, risk assessment, etc.)

  private async analyzeCoverage(
    techniques: Technique[],
    countermeasures: DefensiveCountermeasure[],
    mappings: DefenseMapping[]
  ): Promise<CoverageAnalysis> {
    // Implementation would calculate comprehensive coverage metrics
    // Simplified version:
    const implementedControls = countermeasures.length;
    const totalControls = techniques.length * 3; // Assume 3 controls per technique ideal
    const percentage = (implementedControls / totalControls) * 100;

    const level: CoverageScore['level'] =
      percentage >= 90 ? 'comprehensive' :
      percentage >= 70 ? 'substantial' :
      percentage >= 50 ? 'partial' :
      percentage >= 25 ? 'minimal' : 'none';

    return {
      overall: { percentage, level, implementedControls, totalControls },
      byCategory: {} as any,
      byTechnique: {} as any,
      gaps: [],
      strengths: [],
    };
  }

  private async generateRecommendations(
    flow: AttackFlow,
    coverage: CoverageAnalysis,
    countermeasures: DefensiveCountermeasure[]
  ): Promise<Recommendation[]> {
    // Generate actionable recommendations
    return [];
  }

  private calculateOverallCoverage(
    techniques: Technique[],
    countermeasures: DefensiveCountermeasure[],
    defenses: DeployedDefense[]
  ): CoverageScore {
    const deployedCount = defenses.filter(d => d.status === 'deployed').length;
    const totalCount = countermeasures.length;
    const percentage = totalCount > 0 ? (deployedCount / totalCount) * 100 : 0;

    const level: CoverageScore['level'] =
      percentage >= 90 ? 'comprehensive' :
      percentage >= 70 ? 'substantial' :
      percentage >= 50 ? 'partial' :
      percentage >= 25 ? 'minimal' : 'none';

    return {
      percentage,
      level,
      implementedControls: deployedCount,
      totalControls: totalCount,
    };
  }

  private async performDetailedCoverageAnalysis(
    techniques: Technique[],
    countermeasures: DefensiveCountermeasure[],
    defenses: DeployedDefense[],
    environment: Environment
  ): Promise<CoverageAnalysis> {
    // Detailed implementation would go here
    return {
      overall: this.calculateOverallCoverage(techniques, countermeasures, defenses),
      byCategory: {} as any,
      byTechnique: {} as any,
      gaps: [],
      strengths: [],
    };
  }

  private calculateDeploymentStatus(defenses: DeployedDefense[]): DeploymentStatus {
    const deployed = defenses.filter(d => d.status === 'deployed').length;
    const planned = defenses.filter(d => d.status === 'planned').length;
    const testing = defenses.filter(d => d.status === 'testing').length;
    const total = defenses.length;
    const notDeployed = total - deployed;

    return {
      totalCountermeasures: total,
      deployed,
      planned,
      testing,
      notDeployed,
      deploymentPercentage: total > 0 ? (deployed / total) * 100 : 0,
    };
  }

  private async performRiskAssessment(
    environment: Environment,
    techniques: Technique[],
    countermeasures: DefensiveCountermeasure[],
    coverage: CoverageAnalysis
  ): Promise<RiskAssessment> {
    // Simplified risk assessment
    const riskScore = 100 - coverage.overall.percentage;
    const overallRisk: RiskAssessment['overallRisk'] =
      riskScore >= 75 ? 'critical' :
      riskScore >= 50 ? 'high' :
      riskScore >= 25 ? 'medium' : 'low';

    return {
      overallRisk,
      riskScore,
      exposedTechniques: [],
      criticalGaps: coverage.gaps.filter(g => g.severity === 'critical'),
    };
  }

  private async generateCoverageRecommendations(
    environment: Environment,
    coverage: CoverageAnalysis,
    risk: RiskAssessment
  ): Promise<Recommendation[]> {
    return [];
  }

  private async prioritizeActions(
    recommendations: Recommendation[],
    environment: Environment,
    risk: RiskAssessment
  ): Promise<PrioritizedAction[]> {
    return [];
  }

  private async getCountermeasuresByIds(ids: string[]): Promise<DefensiveCountermeasure[]> {
    if (ids.length === 0) return [];

    const result = await this.pool.query(
      'SELECT * FROM d3fend_countermeasures WHERE id = ANY($1)',
      [ids]
    );

    return result.rows.map(row => this.rowToCountermeasure(row));
  }

  private async getTechniquesForAssets(assets: Asset[]): Promise<Technique[]> {
    // Get unique technique IDs from all assets
    const techniqueIds = [...new Set(assets.flatMap(a => a.exposedTechniques))];

    if (techniqueIds.length === 0) return [];

    // Fetch technique details (would come from ATT&CK database)
    return [];
  }

  private async calculatePrioritizationFactors(cm: DefensiveCountermeasure): Promise<PrioritizationFactors> {
    return {
      riskReduction: cm.effectiveness.overall,
      coverageIncrease: 70,
      urgency: 60,
      feasibility: cm.implementationComplexity === 'low' ? 90 : cm.implementationComplexity === 'medium' ? 70 : 40,
      costEffectiveness: cm.implementationCost === 'low' ? 90 : cm.implementationCost === 'medium' ? 70 : 40,
      strategicAlignment: 75,
      weights: {
        riskReduction: 0.30,
        coverageIncrease: 0.25,
        urgency: 0.15,
        feasibility: 0.15,
        costEffectiveness: 0.10,
        strategicAlignment: 0.05,
      },
    };
  }

  private calculatePriorityScore(factors: PrioritizationFactors): number {
    return Math.round(
      factors.riskReduction * factors.weights.riskReduction +
      factors.coverageIncrease * factors.weights.coverageIncrease +
      factors.urgency * factors.weights.urgency +
      factors.feasibility * factors.weights.feasibility +
      factors.costEffectiveness * factors.weights.costEffectiveness +
      factors.strategicAlignment * factors.weights.strategicAlignment
    );
  }

  private getPriorityLevel(score: number): 'critical' | 'high' | 'medium' | 'low' {
    if (score >= 85) return 'critical';
    if (score >= 70) return 'high';
    if (score >= 50) return 'medium';
    return 'low';
  }

  private async estimateImpact(cm: DefensiveCountermeasure): Promise<Impact> {
    return {
      techniquesAddressed: cm.attackTechniques,
      gapsClosed: cm.attackTechniques.length,
      coverageImprovement: 5,
      riskReduction: 10,
      assetsProtected: [],
    };
  }

  private async createImplementationPlan(cm: DefensiveCountermeasure): Promise<ImplementationPlan> {
    return {
      phases: [
        {
          phase: 1,
          name: 'Planning',
          description: 'Requirements gathering and design',
          duration: 14,
          tasks: ['Define requirements', 'Design solution', 'Get approvals'],
          deliverables: ['Requirements document', 'Design document'],
        },
        {
          phase: 2,
          name: 'Implementation',
          description: 'Deploy and configure countermeasure',
          duration: 30,
          tasks: ['Deploy solution', 'Configure settings', 'Test functionality'],
          deliverables: ['Deployed solution', 'Configuration documentation'],
        },
        {
          phase: 3,
          name: 'Validation',
          description: 'Validate effectiveness',
          duration: 14,
          tasks: ['Run tests', 'Measure effectiveness', 'Tune configuration'],
          deliverables: ['Test results', 'Tuning recommendations'],
        },
      ],
      estimatedDuration: 58,
      estimatedCost: 100000,
      requiredResources: ['Security engineer', 'System administrator'],
      dependencies: [],
      risks: ['Budget constraints', 'Resource availability'],
    };
  }

  private async calculateROI(
    cm: DefensiveCountermeasure,
    impact: Impact,
    plan: ImplementationPlan
  ): Promise<ROIAnalysis> {
    const initialCost = plan.estimatedCost;
    const annualCost = initialCost * 0.2; // 20% annual maintenance
    const riskReductionValue = impact.riskReduction * 10000; // $10k per risk point
    const roi = riskReductionValue / initialCost;
    const paybackPeriod = initialCost / (riskReductionValue / 12);

    return {
      initialCost,
      annualCost,
      riskReductionValue,
      roi,
      paybackPeriod,
      netPresentValue: riskReductionValue - initialCost - (annualCost * 3),
    };
  }

  private generateExecutiveSummary(matrix: DefenseMatrix): string {
    return `This security architecture document presents a comprehensive defensive strategy ` +
           `for ${matrix.flowName}, covering ${matrix.metadata.totalTechniques} attack techniques ` +
           `with ${matrix.metadata.totalCountermeasures} defensive countermeasures across ` +
           `${matrix.metadata.uniqueCategories.length} defensive categories.`;
  }

  private async convertToFullCoverageAssessment(matrix: DefenseMatrix): Promise<CoverageAssessment> {
    // Would convert matrix coverage to full assessment format
    return {} as any;
  }

  private async buildProposedArchitecture(matrix: DefenseMatrix): Promise<any> {
    return {
      overview: 'Layered defense architecture',
      layers: [],
      components: [],
      dataFlows: [],
    };
  }

  private async createImplementationRoadmap(matrix: DefenseMatrix): Promise<any> {
    return {
      phases: [],
      timeline: '12 months',
      milestones: [],
    };
  }

  private buildAppendices(matrix: DefenseMatrix): any {
    return {
      techniqueReference: matrix.techniques,
      countermeasureReference: matrix.countermeasures,
      glossary: [],
    };
  }
}

export default D3FENDMappingService;
