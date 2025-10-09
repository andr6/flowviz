/**
 * TTP Pattern Matcher
 * Calculates similarity between attack patterns based on MITRE ATT&CK techniques
 */

export interface TTPatternSimilarity {
  similarity_score: number; // 0.0 to 1.0
  shared_techniques: string[];
  shared_tactics: string[];
  technique_overlap_ratio: number;
  tactic_overlap_ratio: number;
  sequence_similarity: number;
  behavioral_similarity: number;
}

export class TTPatternMatcher {
  // MITRE ATT&CK tactic hierarchy weights
  private readonly TACTIC_WEIGHTS = {
    reconnaissance: 1.0,
    'resource-development': 1.0,
    'initial-access': 1.2,
    execution: 1.1,
    persistence: 1.3,
    'privilege-escalation': 1.3,
    'defense-evasion': 1.2,
    'credential-access': 1.3,
    discovery: 1.0,
    'lateral-movement': 1.2,
    collection: 1.1,
    'command-and-control': 1.2,
    exfiltration: 1.4,
    impact: 1.5,
  };

  /**
   * Calculate TTP similarity between two flows
   */
  calculateTTPSimilarity(nodes1: any[], nodes2: any[]): TTPatternSimilarity {
    // Extract techniques and tactics from both flows
    const flow1Techniques = this.extractTechniques(nodes1);
    const flow2Techniques = this.extractTechniques(nodes2);
    const flow1Tactics = this.extractTactics(nodes1);
    const flow2Tactics = this.extractTactics(nodes2);

    // Calculate technique overlap
    const sharedTechniques = this.findIntersection(flow1Techniques, flow2Techniques);
    const techniqueOverlapRatio = this.calculateJaccardSimilarity(
      flow1Techniques,
      flow2Techniques
    );

    // Calculate tactic overlap
    const sharedTactics = this.findIntersection(flow1Tactics, flow2Tactics);
    const tacticOverlapRatio = this.calculateJaccardSimilarity(flow1Tactics, flow2Tactics);

    // Calculate sequence similarity (if techniques appear in similar order)
    const sequenceSimilarity = this.calculateSequenceSimilarity(nodes1, nodes2);

    // Calculate behavioral similarity (based on weighted tactics)
    const behavioralSimilarity = this.calculateBehavioralSimilarity(
      flow1Tactics,
      flow2Tactics
    );

    // Calculate overall similarity score (weighted combination)
    const similarityScore =
      techniqueOverlapRatio * 0.4 + // 40% weight on technique overlap
      tacticOverlapRatio * 0.25 + // 25% weight on tactic overlap
      sequenceSimilarity * 0.15 + // 15% weight on sequence similarity
      behavioralSimilarity * 0.2; // 20% weight on behavioral similarity

    return {
      similarity_score: Math.min(similarityScore, 1.0),
      shared_techniques: Array.from(sharedTechniques),
      shared_tactics: Array.from(sharedTactics),
      technique_overlap_ratio: techniqueOverlapRatio,
      tactic_overlap_ratio: tacticOverlapRatio,
      sequence_similarity: sequenceSimilarity,
      behavioral_similarity: behavioralSimilarity,
    };
  }

  /**
   * Extract MITRE ATT&CK techniques from nodes
   */
  private extractTechniques(nodes: any[]): Set<string> {
    const techniques = new Set<string>();
    nodes.forEach((node) => {
      const technique =
        node.data?.technique ||
        node.data?.mitre_technique ||
        node.data?.attack_technique;

      if (technique) {
        // Normalize technique ID (e.g., T1055.001 -> T1055)
        const normalizedTechnique = this.normalizeTechnique(technique);
        techniques.add(normalizedTechnique);

        // Also add sub-technique if present
        if (technique.includes('.')) {
          techniques.add(technique);
        }
      }
    });
    return techniques;
  }

  /**
   * Extract MITRE ATT&CK tactics from nodes
   */
  private extractTactics(nodes: any[]): Set<string> {
    const tactics = new Set<string>();
    nodes.forEach((node) => {
      const tactic = node.data?.tactic || node.data?.attack_tactic;
      if (tactic) {
        tactics.add(this.normalizeTactic(tactic));
      }
    });
    return tactics;
  }

  /**
   * Normalize technique ID to base technique
   */
  private normalizeTechnique(technique: string): string {
    // Remove sub-technique (T1055.001 -> T1055)
    const match = technique.match(/T\d{4}/);
    return match ? match[0] : technique;
  }

  /**
   * Normalize tactic name
   */
  private normalizeTactic(tactic: string): string {
    return tactic.toLowerCase().trim().replace(/\s+/g, '-');
  }

  /**
   * Calculate Jaccard similarity coefficient
   */
  private calculateJaccardSimilarity<T>(set1: Set<T>, set2: Set<T>): number {
    if (set1.size === 0 && set2.size === 0) return 1.0;
    if (set1.size === 0 || set2.size === 0) return 0.0;

    const intersection = this.findIntersection(set1, set2);
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  }

  /**
   * Find intersection of two sets
   */
  private findIntersection<T>(set1: Set<T>, set2: Set<T>): Set<T> {
    return new Set([...set1].filter((item) => set2.has(item)));
  }

  /**
   * Calculate sequence similarity using Longest Common Subsequence (LCS)
   */
  private calculateSequenceSimilarity(nodes1: any[], nodes2: any[]): number {
    const sequence1 = this.extractTechniqueSequence(nodes1);
    const sequence2 = this.extractTechniqueSequence(nodes2);

    if (sequence1.length === 0 || sequence2.length === 0) return 0.0;

    const lcsLength = this.longestCommonSubsequence(sequence1, sequence2);
    const maxLength = Math.max(sequence1.length, sequence2.length);

    return lcsLength / maxLength;
  }

  /**
   * Extract technique sequence from nodes (ordered by position or timestamp)
   */
  private extractTechniqueSequence(nodes: any[]): string[] {
    return nodes
      .map((node) => ({
        technique: this.normalizeTechnique(
          node.data?.technique ||
            node.data?.mitre_technique ||
            node.data?.attack_technique ||
            ''
        ),
        position: node.position?.x || 0,
      }))
      .filter((item) => item.technique)
      .sort((a, b) => a.position - b.position)
      .map((item) => item.technique);
  }

  /**
   * Calculate Longest Common Subsequence length
   */
  private longestCommonSubsequence(seq1: string[], seq2: string[]): number {
    const m = seq1.length;
    const n = seq2.length;
    const dp: number[][] = Array(m + 1)
      .fill(null)
      .map(() => Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (seq1[i - 1] === seq2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    return dp[m][n];
  }

  /**
   * Calculate behavioral similarity based on weighted tactics
   */
  private calculateBehavioralSimilarity(tactics1: Set<string>, tactics2: Set<string>): number {
    if (tactics1.size === 0 && tactics2.size === 0) return 1.0;
    if (tactics1.size === 0 || tactics2.size === 0) return 0.0;

    // Calculate weighted overlap
    let weightedIntersection = 0;
    let weightedUnion = 0;

    const allTactics = new Set([...tactics1, ...tactics2]);

    allTactics.forEach((tactic) => {
      const weight = this.TACTIC_WEIGHTS[tactic as keyof typeof this.TACTIC_WEIGHTS] || 1.0;

      if (tactics1.has(tactic) && tactics2.has(tactic)) {
        weightedIntersection += weight;
      }

      if (tactics1.has(tactic) || tactics2.has(tactic)) {
        weightedUnion += weight;
      }
    });

    return weightedUnion > 0 ? weightedIntersection / weightedUnion : 0.0;
  }

  /**
   * Identify attack pattern fingerprint
   */
  generatePatternFingerprint(nodes: any[]): string {
    const techniques = Array.from(this.extractTechniques(nodes)).sort();
    const tactics = Array.from(this.extractTactics(nodes)).sort();

    return `tactics:${tactics.join(',')}|techniques:${techniques.join(',')}`;
  }

  /**
   * Match against known attack patterns
   */
  matchKnownPattern(
    nodes: any[],
    knownPatterns: Array<{ name: string; techniques: string[]; tactics: string[] }>
  ): Array<{ name: string; similarity: number }> {
    const techniques = this.extractTechniques(nodes);
    const tactics = this.extractTactics(nodes);

    return knownPatterns
      .map((pattern) => {
        const patternTechniques = new Set(pattern.techniques);
        const patternTactics = new Set(pattern.tactics.map((t) => this.normalizeTactic(t)));

        const techniqueSim = this.calculateJaccardSimilarity(techniques, patternTechniques);
        const tacticSim = this.calculateJaccardSimilarity(tactics, patternTactics);

        const similarity = techniqueSim * 0.6 + tacticSim * 0.4;

        return {
          name: pattern.name,
          similarity,
        };
      })
      .filter((match) => match.similarity >= 0.3)
      .sort((a, b) => b.similarity - a.similarity);
  }

  /**
   * Identify kill chain stage
   */
  identifyKillChainStage(nodes: any[]): string[] {
    const tactics = this.extractTactics(nodes);
    const stages: string[] = [];

    const killChainMapping: Record<string, string> = {
      reconnaissance: 'Reconnaissance',
      'resource-development': 'Weaponization',
      'initial-access': 'Delivery',
      execution: 'Exploitation',
      persistence: 'Installation',
      'privilege-escalation': 'Installation',
      'defense-evasion': 'Installation',
      'credential-access': 'Installation',
      discovery: 'Installation',
      'lateral-movement': 'Command & Control',
      collection: 'Actions on Objectives',
      'command-and-control': 'Command & Control',
      exfiltration: 'Actions on Objectives',
      impact: 'Actions on Objectives',
    };

    tactics.forEach((tactic) => {
      const stage = killChainMapping[tactic];
      if (stage && !stages.includes(stage)) {
        stages.push(stage);
      }
    });

    return stages;
  }

  /**
   * Calculate attack sophistication score
   */
  calculateSophisticationScore(nodes: any[]): number {
    const techniques = this.extractTechniques(nodes);
    const tactics = this.extractTactics(nodes);

    let score = 0;

    // More diverse tactics = higher sophistication
    score += Math.min(tactics.size * 0.1, 0.3);

    // Advanced techniques increase score
    const advancedTechniques = [
      'T1055', // Process Injection
      'T1027', // Obfuscated Files
      'T1070', // Indicator Removal
      'T1134', // Access Token Manipulation
      'T1564', // Hide Artifacts
      'T1548', // Abuse Elevation Control
      'T1620', // Reflective Code Loading
    ];

    advancedTechniques.forEach((advTech) => {
      if (Array.from(techniques).some((t) => t.startsWith(advTech))) {
        score += 0.1;
      }
    });

    // More techniques = higher sophistication
    score += Math.min(techniques.size * 0.05, 0.3);

    return Math.min(score, 1.0);
  }

  /**
   * Detect evasion techniques
   */
  detectEvasionTechniques(nodes: any[]): string[] {
    const techniques = this.extractTechniques(nodes);
    const evasionTechniques: string[] = [];

    const knownEvasion = [
      'T1027', // Obfuscated Files or Information
      'T1070', // Indicator Removal
      'T1112', // Modify Registry
      'T1140', // Deobfuscate/Decode Files
      'T1202', // Indirect Command Execution
      'T1218', // System Binary Proxy Execution
      'T1497', // Virtualization/Sandbox Evasion
      'T1562', // Impair Defenses
      'T1564', // Hide Artifacts
      'T1574', // Hijack Execution Flow
    ];

    knownEvasion.forEach((evasion) => {
      if (Array.from(techniques).some((t) => t.startsWith(evasion))) {
        evasionTechniques.push(evasion);
      }
    });

    return evasionTechniques;
  }
}
