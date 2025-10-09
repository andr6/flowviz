import type { Pool } from 'pg';
import type { SavedFlow } from '../../flow-storage/services/LocalStorageService';

export interface Campaign {
  id: string;
  name: string;
  description: string;
  confidence_score: number;
  sophistication_level: 'low' | 'medium' | 'high' | 'advanced';
  campaign_status: 'active' | 'dormant' | 'concluded';
  first_seen: Date;
  last_seen: Date;
  duration_days: number;
  related_flows: string[];
  flow_count: number;
  shared_ttps: string[];
  ttp_pattern_signature: string;
  primary_tactics: string[];
  shared_iocs: any[];
  indicators_count: number;
  unique_ioc_count: number;
  c2_servers: string[];
  domains: string[];
  infrastructure_fingerprint: string;
  suspected_actor?: string;
  attribution_confidence?: 'low' | 'medium' | 'high';
  attribution_reasoning?: string;
  known_apt_group?: string;
  affected_organizations: string[];
  affected_systems_count: number;
  estimated_impact: 'minimal' | 'moderate' | 'significant' | 'severe';
  behavior_summary: string;
  objectives: string[];
  capabilities: string[];
  organization_id: string;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
  metadata: Record<string, any>;
}

export class CampaignDetector {
  constructor(private pool: Pool) {}

  /**
   * Create a campaign from a cluster of correlated flows
   */
  async createCampaignFromFlows(
    flowIds: string[],
    organizationId: string
  ): Promise<Campaign> {
    // Fetch all flows
    const flowsResult = await this.pool.query(
      'SELECT * FROM saved_flows WHERE id = ANY($1)',
      [flowIds]
    );
    const flows = flowsResult.rows as SavedFlow[];

    if (flows.length === 0) {
      throw new Error('No flows found for campaign creation');
    }

    // Extract campaign characteristics
    const sharedTTPs = this.extractSharedTTPs(flows);
    const sharedIOCs = this.extractSharedIOCs(flows);
    const infrastructure = this.extractInfrastructure(flows);
    const timeline = this.calculateTimeline(flows);
    const sophistication = this.assessSophistication(flows);
    const impact = this.estimateImpact(flows);
    const behavior = this.analyzeBehavior(flows);
    const attribution = await this.suggestAttribution(flows, sharedTTPs, infrastructure);

    // Generate campaign name
    const campaignName = this.generateCampaignName(flows, sharedTTPs, attribution);

    // Generate TTP pattern signature (hash of sorted TTPs)
    const ttpSignature = this.generateTTPSignature(sharedTTPs);

    // Generate infrastructure fingerprint
    const infraFingerprint = this.generateInfrastructureFingerprint(infrastructure);

    // Calculate confidence score based on multiple factors
    const confidenceScore = this.calculateCampaignConfidence(
      flows.length,
      sharedTTPs.length,
      sharedIOCs.length,
      infrastructure.c2Servers.length + infrastructure.domains.length
    );

    const campaign: Partial<Campaign> = {
      name: campaignName,
      description: `Campaign detected from ${flows.length} correlated flows with ${sharedTTPs.length} shared TTPs`,
      confidence_score: confidenceScore,
      sophistication_level: sophistication,
      campaign_status: this.determineCampaignStatus(timeline.lastSeen),
      first_seen: timeline.firstSeen,
      last_seen: timeline.lastSeen,
      duration_days: timeline.durationDays,
      related_flows: flowIds,
      flow_count: flows.length,
      shared_ttps: sharedTTPs,
      ttp_pattern_signature: ttpSignature,
      primary_tactics: this.extractPrimaryTactics(flows),
      shared_iocs: sharedIOCs,
      indicators_count: this.countTotalIndicators(flows),
      unique_ioc_count: sharedIOCs.length,
      c2_servers: infrastructure.c2Servers,
      domains: infrastructure.domains,
      infrastructure_fingerprint: infraFingerprint,
      suspected_actor: attribution.actor,
      attribution_confidence: attribution.confidence,
      attribution_reasoning: attribution.reasoning,
      known_apt_group: attribution.aptGroup,
      affected_organizations: this.extractAffectedOrganizations(flows),
      affected_systems_count: this.countAffectedSystems(flows),
      estimated_impact: impact,
      behavior_summary: behavior.summary,
      objectives: behavior.objectives,
      capabilities: behavior.capabilities,
      organization_id: organizationId,
      created_at: new Date(),
      updated_at: new Date(),
      metadata: {
        detection_method: 'automated_correlation',
        correlation_algorithm: 'graph_based_community_detection',
        flows_analyzed: flows.length,
      },
    };

    // Insert into database
    const result = await this.pool.query(
      `INSERT INTO campaigns (
        name, description, confidence_score, sophistication_level, campaign_status,
        first_seen, last_seen, duration_days, related_flows, flow_count,
        shared_ttps, ttp_pattern_signature, primary_tactics, shared_iocs,
        indicators_count, unique_ioc_count, c2_servers, domains,
        infrastructure_fingerprint, suspected_actor, attribution_confidence,
        attribution_reasoning, known_apt_group, affected_organizations,
        affected_systems_count, estimated_impact, behavior_summary,
        objectives, capabilities, organization_id, created_at, updated_at, metadata
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33
      ) RETURNING *`,
      [
        campaign.name,
        campaign.description,
        campaign.confidence_score,
        campaign.sophistication_level,
        campaign.campaign_status,
        campaign.first_seen,
        campaign.last_seen,
        campaign.duration_days,
        campaign.related_flows,
        campaign.flow_count,
        campaign.shared_ttps,
        campaign.ttp_pattern_signature,
        campaign.primary_tactics,
        JSON.stringify(campaign.shared_iocs),
        campaign.indicators_count,
        campaign.unique_ioc_count,
        campaign.c2_servers,
        campaign.domains,
        campaign.infrastructure_fingerprint,
        campaign.suspected_actor,
        campaign.attribution_confidence,
        campaign.attribution_reasoning,
        campaign.known_apt_group,
        campaign.affected_organizations,
        campaign.affected_systems_count,
        campaign.estimated_impact,
        campaign.behavior_summary,
        campaign.objectives,
        campaign.capabilities,
        campaign.organization_id,
        campaign.created_at,
        campaign.updated_at,
        JSON.stringify(campaign.metadata),
      ]
    );

    // Create campaign events for each flow
    await this.createCampaignEvents(result.rows[0].id, flows);

    return result.rows[0] as Campaign;
  }

  /**
   * Extract TTPs that appear in multiple flows
   */
  private extractSharedTTPs(flows: SavedFlow[]): string[] {
    const ttpCounts = new Map<string, number>();

    flows.forEach((flow) => {
      const ttps = new Set<string>();
      if (flow.graph?.nodes) {
        flow.graph.nodes.forEach((node: any) => {
          if (node.data?.technique) {
            ttps.add(node.data.technique);
          }
          if (node.data?.mitre_technique) {
            ttps.add(node.data.mitre_technique);
          }
        });
      }

      ttps.forEach((ttp) => {
        ttpCounts.set(ttp, (ttpCounts.get(ttp) || 0) + 1);
      });
    });

    // Return TTPs that appear in at least 2 flows or 30% of flows
    const threshold = Math.max(2, Math.ceil(flows.length * 0.3));
    return Array.from(ttpCounts.entries())
      .filter(([, count]) => count >= threshold)
      .map(([ttp]) => ttp)
      .sort();
  }

  /**
   * Extract IOCs that appear in multiple flows
   */
  private extractSharedIOCs(flows: SavedFlow[]): any[] {
    const iocMap = new Map<string, { ioc: any; count: number }>();

    flows.forEach((flow) => {
      const iocs = flow.metadata?.iocs || [];
      iocs.forEach((ioc: any) => {
        const key = `${ioc.type}:${ioc.value}`;
        if (iocMap.has(key)) {
          iocMap.get(key)!.count++;
        } else {
          iocMap.set(key, { ioc, count: 1 });
        }
      });
    });

    // Return IOCs that appear in at least 2 flows
    return Array.from(iocMap.values())
      .filter((item) => item.count >= 2)
      .map((item) => ({ ...item.ioc, appearance_count: item.count }))
      .sort((a, b) => b.appearance_count - a.appearance_count);
  }

  /**
   * Extract infrastructure information
   */
  private extractInfrastructure(flows: SavedFlow[]): {
    c2Servers: string[];
    domains: string[];
  } {
    const c2Set = new Set<string>();
    const domainSet = new Set<string>();

    flows.forEach((flow) => {
      const iocs = flow.metadata?.iocs || [];
      iocs.forEach((ioc: any) => {
        if (ioc.type === 'ip' || ioc.type === 'ipv4' || ioc.type === 'ipv6') {
          c2Set.add(ioc.value);
        }
        if (ioc.type === 'domain' || ioc.type === 'url') {
          try {
            const domain = ioc.type === 'url' ? new URL(ioc.value).hostname : ioc.value;
            domainSet.add(domain);
          } catch {
            domainSet.add(ioc.value);
          }
        }
      });

      // Also check nodes for infrastructure
      if (flow.graph?.nodes) {
        flow.graph.nodes.forEach((node: any) => {
          if (node.type === 'infrastructure' || node.data?.category === 'infrastructure') {
            if (node.data?.ip) c2Set.add(node.data.ip);
            if (node.data?.domain) domainSet.add(node.data.domain);
          }
        });
      }
    });

    return {
      c2Servers: Array.from(c2Set),
      domains: Array.from(domainSet),
    };
  }

  /**
   * Calculate campaign timeline
   */
  private calculateTimeline(flows: SavedFlow[]): {
    firstSeen: Date;
    lastSeen: Date;
    durationDays: number;
  } {
    const dates = flows
      .map((flow) => new Date(flow.created_at || flow.metadata?.created_at || Date.now()))
      .sort((a, b) => a.getTime() - b.getTime());

    const firstSeen = dates[0];
    const lastSeen = dates[dates.length - 1];
    const durationDays = Math.ceil(
      (lastSeen.getTime() - firstSeen.getTime()) / (1000 * 60 * 60 * 24)
    );

    return { firstSeen, lastSeen, durationDays };
  }

  /**
   * Assess sophistication level based on TTPs and techniques
   */
  private assessSophistication(flows: SavedFlow[]): 'low' | 'medium' | 'high' | 'advanced' {
    let score = 0;

    // Advanced TTPs increase score
    const advancedTTPs = [
      'T1055', // Process Injection
      'T1027', // Obfuscated Files or Information
      'T1070', // Indicator Removal
      'T1548', // Abuse Elevation Control
      'T1134', // Access Token Manipulation
      'T1564', // Hide Artifacts
    ];

    flows.forEach((flow) => {
      if (flow.graph?.nodes) {
        flow.graph.nodes.forEach((node: any) => {
          const technique = node.data?.technique || node.data?.mitre_technique;
          if (advancedTTPs.some((ttp) => technique?.includes(ttp))) {
            score += 2;
          }
        });
      }

      // Multiple stages indicate sophistication
      const uniqueTactics = new Set(
        flow.graph?.nodes
          ?.map((node: any) => node.data?.tactic)
          .filter(Boolean) || []
      );
      if (uniqueTactics.size >= 5) score += 3;
      if (uniqueTactics.size >= 7) score += 2;

      // Custom malware indicates sophistication
      if (flow.metadata?.malware_family || flow.metadata?.custom_malware) {
        score += 2;
      }
    });

    if (score >= 15) return 'advanced';
    if (score >= 10) return 'high';
    if (score >= 5) return 'medium';
    return 'low';
  }

  /**
   * Estimate impact based on affected systems and tactics
   */
  private estimateImpact(flows: SavedFlow[]): 'minimal' | 'moderate' | 'significant' | 'severe' {
    let impactScore = 0;

    const highImpactTactics = ['impact', 'exfiltration', 'command-and-control'];

    flows.forEach((flow) => {
      // Check for high-impact tactics
      if (flow.graph?.nodes) {
        flow.graph.nodes.forEach((node: any) => {
          if (highImpactTactics.includes(node.data?.tactic?.toLowerCase())) {
            impactScore += 3;
          }
        });
      }

      // Check for data exfiltration
      if (flow.metadata?.data_exfiltrated) impactScore += 4;

      // Check for ransomware
      if (flow.metadata?.attack_type?.toLowerCase().includes('ransomware')) {
        impactScore += 5;
      }
    });

    // More flows = broader impact
    impactScore += Math.min(flows.length, 10);

    if (impactScore >= 20) return 'severe';
    if (impactScore >= 12) return 'significant';
    if (impactScore >= 6) return 'moderate';
    return 'minimal';
  }

  /**
   * Analyze behavior patterns
   */
  private analyzeBehavior(flows: SavedFlow[]): {
    summary: string;
    objectives: string[];
    capabilities: string[];
  } {
    const objectives = new Set<string>();
    const capabilities = new Set<string>();
    const tactics = new Set<string>();

    flows.forEach((flow) => {
      if (flow.graph?.nodes) {
        flow.graph.nodes.forEach((node: any) => {
          if (node.data?.tactic) tactics.add(node.data.tactic);
        });
      }
    });

    // Infer objectives from tactics
    if (tactics.has('exfiltration')) objectives.add('Data theft');
    if (tactics.has('impact')) objectives.add('System disruption');
    if (tactics.has('persistence')) objectives.add('Long-term access');
    if (tactics.has('lateral-movement')) objectives.add('Network expansion');
    if (tactics.has('credential-access')) objectives.add('Credential harvesting');

    // Infer capabilities
    if (tactics.size >= 7) capabilities.add('Full kill chain execution');
    if (tactics.has('defense-evasion')) capabilities.add('Advanced evasion');
    if (tactics.has('privilege-escalation')) capabilities.add('Privilege escalation');
    if (tactics.has('command-and-control')) capabilities.add('C2 infrastructure');

    const summary = `Multi-stage attack campaign with ${tactics.size} distinct tactics across ${flows.length} incidents. Primary focus on ${Array.from(objectives)[0] || 'system compromise'}.`;

    return {
      summary,
      objectives: Array.from(objectives),
      capabilities: Array.from(capabilities),
    };
  }

  /**
   * Suggest attribution based on patterns
   */
  private async suggestAttribution(
    flows: SavedFlow[],
    sharedTTPs: string[],
    infrastructure: { c2Servers: string[]; domains: string[] }
  ): Promise<{
    actor: string | undefined;
    confidence: 'low' | 'medium' | 'high' | undefined;
    reasoning: string;
    aptGroup: string | undefined;
  }> {
    // Query known threat actor profiles for matching patterns
    try {
      const result = await this.pool.query(
        `SELECT * FROM threat_actor_profiles
         WHERE known_ttps && $1
         ORDER BY array_length(known_ttps, 1) DESC
         LIMIT 5`,
        [sharedTTPs]
      );

      if (result.rows.length > 0) {
        const topMatch = result.rows[0];
        const matchedTTPs = sharedTTPs.filter((ttp) =>
          topMatch.known_ttps.includes(ttp)
        );
        const matchRatio = matchedTTPs.length / sharedTTPs.length;

        let confidence: 'low' | 'medium' | 'high' | undefined;
        if (matchRatio >= 0.7) confidence = 'high';
        else if (matchRatio >= 0.4) confidence = 'medium';
        else confidence = 'low';

        return {
          actor: topMatch.actor_name,
          confidence,
          reasoning: `Matched ${matchedTTPs.length}/${sharedTTPs.length} TTPs with known actor profile`,
          aptGroup: topMatch.actor_type === 'nation_state' ? topMatch.actor_name : undefined,
        };
      }
    } catch (error) {
      console.warn('Attribution lookup failed:', error);
    }

    return {
      actor: undefined,
      confidence: undefined,
      reasoning: 'No matching threat actor profiles found',
      aptGroup: undefined,
    };
  }

  /**
   * Generate campaign name
   */
  private generateCampaignName(
    flows: SavedFlow[],
    sharedTTPs: string[],
    attribution: { actor?: string; aptGroup?: string }
  ): string {
    if (attribution.actor) {
      return `${attribution.actor} Campaign ${new Date().getFullYear()}`;
    }

    // Generate name based on primary tactic or malware
    const primaryTactic = this.extractPrimaryTactics(flows)[0];
    const year = new Date().getFullYear();
    const month = new Date().toLocaleString('en-US', { month: 'short' });

    if (primaryTactic) {
      return `${primaryTactic.replace(/-/g, ' ')} Campaign ${month} ${year}`;
    }

    return `Uncategorized Campaign ${month} ${year}`;
  }

  /**
   * Extract primary tactics from flows
   */
  private extractPrimaryTactics(flows: SavedFlow[]): string[] {
    const tacticCounts = new Map<string, number>();

    flows.forEach((flow) => {
      if (flow.graph?.nodes) {
        flow.graph.nodes.forEach((node: any) => {
          if (node.data?.tactic) {
            tacticCounts.set(node.data.tactic, (tacticCounts.get(node.data.tactic) || 0) + 1);
          }
        });
      }
    });

    return Array.from(tacticCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([tactic]) => tactic);
  }

  /**
   * Generate TTP signature (hash of sorted TTPs)
   */
  private generateTTPSignature(ttps: string[]): string {
    return ttps.sort().join('|');
  }

  /**
   * Generate infrastructure fingerprint
   */
  private generateInfrastructureFingerprint(infrastructure: {
    c2Servers: string[];
    domains: string[];
  }): string {
    const combined = [...infrastructure.c2Servers, ...infrastructure.domains].sort();
    return combined.join('|');
  }

  /**
   * Calculate campaign confidence score
   */
  private calculateCampaignConfidence(
    flowCount: number,
    ttpCount: number,
    iocCount: number,
    infraCount: number
  ): number {
    let score = 0;

    // More flows = higher confidence
    score += Math.min(flowCount * 0.1, 0.3);

    // Shared TTPs
    score += Math.min(ttpCount * 0.05, 0.35);

    // Shared IOCs
    score += Math.min(iocCount * 0.03, 0.2);

    // Shared infrastructure
    score += Math.min(infraCount * 0.05, 0.15);

    return Math.min(score, 1.0);
  }

  /**
   * Determine campaign status based on last seen date
   */
  private determineCampaignStatus(
    lastSeen: Date
  ): 'active' | 'dormant' | 'concluded' {
    const daysSinceLastSeen =
      (Date.now() - lastSeen.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceLastSeen <= 7) return 'active';
    if (daysSinceLastSeen <= 90) return 'dormant';
    return 'concluded';
  }

  /**
   * Extract affected organizations
   */
  private extractAffectedOrganizations(flows: SavedFlow[]): string[] {
    const orgs = new Set<string>();
    flows.forEach((flow) => {
      if (flow.metadata?.organization) {
        orgs.add(flow.metadata.organization);
      }
    });
    return Array.from(orgs);
  }

  /**
   * Count affected systems
   */
  private countAffectedSystems(flows: SavedFlow[]): number {
    const systems = new Set<string>();
    flows.forEach((flow) => {
      if (flow.graph?.nodes) {
        flow.graph.nodes.forEach((node: any) => {
          if (node.data?.hostname) systems.add(node.data.hostname);
          if (node.data?.ip) systems.add(node.data.ip);
        });
      }
    });
    return systems.size;
  }

  /**
   * Count total indicators across all flows
   */
  private countTotalIndicators(flows: SavedFlow[]): number {
    let count = 0;
    flows.forEach((flow) => {
      count += (flow.metadata?.iocs || []).length;
    });
    return count;
  }

  /**
   * Create campaign events for timeline
   */
  private async createCampaignEvents(campaignId: string, flows: SavedFlow[]): Promise<void> {
    const events = flows.map((flow) => ({
      campaign_id: campaignId,
      event_type: 'flow_detected',
      event_title: flow.name || 'Attack Flow Detected',
      event_description: flow.metadata?.description || `Flow with ${flow.graph?.nodes?.length || 0} nodes detected`,
      flow_id: flow.id,
      event_data: {
        node_count: flow.graph?.nodes?.length || 0,
        edge_count: flow.graph?.edges?.length || 0,
        ioc_count: (flow.metadata?.iocs || []).length,
      },
      event_timestamp: new Date(flow.created_at || flow.metadata?.created_at || Date.now()),
      added_at: new Date(),
    }));

    if (events.length > 0) {
      const values = events
        .map(
          (_, i) =>
            `($${i * 8 + 1}, $${i * 8 + 2}, $${i * 8 + 3}, $${i * 8 + 4}, $${i * 8 + 5}, $${i * 8 + 6}, $${i * 8 + 7}, $${i * 8 + 8})`
        )
        .join(', ');

      const params = events.flatMap((e) => [
        e.campaign_id,
        e.event_type,
        e.event_title,
        e.event_description,
        e.flow_id,
        JSON.stringify(e.event_data),
        e.event_timestamp,
        e.added_at,
      ]);

      await this.pool.query(
        `INSERT INTO campaign_events (
          campaign_id, event_type, event_title, event_description, flow_id,
          event_data, event_timestamp, added_at
        ) VALUES ${values}`,
        params
      );
    }
  }
}
