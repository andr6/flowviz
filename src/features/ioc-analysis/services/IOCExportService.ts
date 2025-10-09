import { v4 as uuidv4 } from 'uuid';

import { IOC, IOA, IOCIOAAnalysisResult, IOCExportFormat, NetworkIOC, FileIOC, VulnerabilityIOC } from '../types/IOC';

export class IOCExportService {
  /**
   * Export IOCs and IOAs in the specified format
   */
  async export(analysisResult: IOCIOAAnalysisResult, format: IOCExportFormat): Promise<string> {
    const { iocs, ioas, summary, relationships, timeline, reportMetadata } = analysisResult;
    
    // Filter by confidence if specified
    const filteredIOCs = this.filterByConfidence(iocs, format.confidenceThreshold);
    const filteredIOAs = this.filterByConfidence(ioas, format.confidenceThreshold);

    switch (format.format) {
      case 'json':
        return this.exportToJSON(filteredIOCs, filteredIOAs, summary, relationships, timeline, reportMetadata, format);
      
      case 'csv':
        return this.exportToCSV(filteredIOCs, filteredIOAs, format);
      
      case 'stix':
        return this.exportToSTIX(filteredIOCs, filteredIOAs, relationships, format);
      
      case 'misp':
        return this.exportToMISP(filteredIOCs, filteredIOAs, format);
      
      case 'opencti':
        return this.exportToOpenCTI(filteredIOCs, filteredIOAs, relationships, format);
      
      case 'yara':
        return this.exportToYARA(filteredIOCs, format);
      
      case 'suricata':
        return this.exportToSuricata(filteredIOCs, format);
      
      default:
        throw new Error(`Unsupported export format: ${format.format}`);
    }
  }

  /**
   * Export to structured JSON format
   */
  private exportToJSON(
    iocs: IOC[], 
    ioas: IOA[], 
    summary: any, 
    relationships: any[], 
    timeline: any[], 
    metadata: any, 
    format: IOCExportFormat
  ): string {
    const exportData: any = {
      metadata: {
        ...metadata,
        exportedAt: new Date().toISOString(),
        exportFormat: 'json',
        tlpLevel: format.tlpLevel || 'WHITE',
        version: '1.0'
      }
    };

    if (format.includeIOCs) {
      exportData.indicators = iocs.map(ioc => ({
        id: ioc.id,
        type: ioc.type,
        value: ioc.value,
        confidence: ioc.confidence,
        source: ioc.source,
        sourceLocation: ioc.sourceLocation,
        context: ioc.context,
        firstSeen: ioc.firstSeen.toISOString(),
        lastSeen: ioc.lastSeen.toISOString(),
        tags: ioc.tags,
        description: ioc.description,
        malicious: ioc.malicious,
        tlp: ioc.tlp,
        ...this.getTypeSpecificFields(ioc)
      }));
    }

    if (format.includeIOAs) {
      exportData.behaviors = ioas.map(ioa => ({
        id: ioa.id,
        name: ioa.name,
        description: ioa.description,
        category: ioa.category,
        confidence: ioa.confidence,
        source: ioa.source,
        mitreAttackId: ioa.mitreAttackId,
        mitreTactic: ioa.mitreTactic,
        mitreTechnique: ioa.mitreTechnique,
        severity: ioa.severity,
        signatures: ioa.signatures,
        relatedIOCs: ioa.relatedIOCs,
        firstObserved: ioa.firstObserved.toISOString(),
        lastObserved: ioa.lastObserved.toISOString(),
        tags: ioa.tags
      }));
    }

    if (format.includeRelationships) {
      exportData.relationships = relationships;
    }

    if (format.includeTimeline) {
      exportData.timeline = timeline.map(event => ({
        ...event,
        timestamp: event.timestamp.toISOString()
      }));
    }

    exportData.summary = summary;

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Export to CSV format
   */
  private exportToCSV(iocs: IOC[], ioas: IOA[], format: IOCExportFormat): string {
    const csvLines: string[] = [];
    
    if (format.includeIOCs) {
      // IOC CSV headers
      csvLines.push('Type,IOC_Type,Value,Confidence,Source,First_Seen,Last_Seen,Tags,Description,TLP,Context');
      
      for (const ioc of iocs) {
        const row = [
          'IOC',
          ioc.type,
          this.csvEscape(ioc.value),
          ioc.confidence,
          ioc.source,
          ioc.firstSeen.toISOString(),
          ioc.lastSeen.toISOString(),
          this.csvEscape(ioc.tags.join(';')),
          this.csvEscape(ioc.description || ''),
          ioc.tlp || 'WHITE',
          this.csvEscape(ioc.context || '')
        ];
        csvLines.push(row.join(','));
      }
    }

    if (format.includeIOAs) {
      // Add separator if both IOCs and IOAs
      if (format.includeIOCs) {
        csvLines.push(''); // Empty line
      }
      
      // IOA CSV headers
      csvLines.push('Type,IOA_Category,Name,Description,Confidence,Source,MITRE_ID,Tactic,Technique,Severity,First_Observed,Last_Observed,Tags');
      
      for (const ioa of ioas) {
        const row = [
          'IOA',
          ioa.category,
          this.csvEscape(ioa.name),
          this.csvEscape(ioa.description),
          ioa.confidence,
          ioa.source,
          ioa.mitreAttackId || '',
          ioa.mitreTactic || '',
          ioa.mitreTechnique || '',
          ioa.severity,
          ioa.firstObserved.toISOString(),
          ioa.lastObserved.toISOString(),
          this.csvEscape(ioa.tags.join(';'))
        ];
        csvLines.push(row.join(','));
      }
    }

    return csvLines.join('\n');
  }

  /**
   * Export to STIX 2.1 format
   */
  private exportToSTIX(iocs: IOC[], ioas: IOA[], relationships: any[], format: IOCExportFormat): string {
    const now = new Date().toISOString();
    const bundleId = `bundle--${uuidv4()}`;
    
    const stixObjects: any[] = [];

    // Convert IOCs to STIX indicators
    if (format.includeIOCs) {
      for (const ioc of iocs) {
        const stixIndicator = {
          type: 'indicator',
          spec_version: '2.1',
          id: `indicator--${uuidv4()}`,
          created: ioc.firstSeen.toISOString(),
          modified: ioc.lastSeen.toISOString(),
          pattern: this.generateSTIXPattern(ioc),
          labels: this.generateSTIXLabels(ioc),
          confidence: this.mapConfidenceToSTIX(ioc.confidence),
          description: ioc.description,
          external_references: [],
          object_marking_refs: [this.getTLPMarkingRef(format.tlpLevel || 'WHITE')],
          custom_properties: {
            x_flowviz_type: ioc.type,
            x_flowviz_source: ioc.source,
            x_flowviz_context: ioc.context,
            x_flowviz_tags: ioc.tags
          }
        };
        stixObjects.push(stixIndicator);
      }
    }

    // Convert IOAs to STIX attack patterns or malware behaviors
    if (format.includeIOAs) {
      for (const ioa of ioas) {
        const stixBehavior = {
          type: 'attack-pattern',
          spec_version: '2.1',
          id: `attack-pattern--${uuidv4()}`,
          created: ioa.firstObserved.toISOString(),
          modified: ioa.lastObserved.toISOString(),
          name: ioa.name,
          description: ioa.description,
          external_references: ioa.mitreAttackId ? [{
            source_name: 'mitre-attack',
            external_id: ioa.mitreAttackId,
            url: `https://attack.mitre.org/techniques/${ioa.mitreAttackId}`
          }] : [],
          kill_chain_phases: [{
            kill_chain_name: 'mitre-attack',
            phase_name: this.mapCategoryToKillChain(ioa.category)
          }],
          object_marking_refs: [this.getTLPMarkingRef(format.tlpLevel || 'WHITE')],
          custom_properties: {
            x_flowviz_category: ioa.category,
            x_flowviz_severity: ioa.severity,
            x_flowviz_signatures: ioa.signatures,
            x_flowviz_tags: ioa.tags
          }
        };
        stixObjects.push(stixBehavior);
      }
    }

    const stixBundle = {
      type: 'bundle',
      id: bundleId,
      spec_version: '2.1',
      objects: stixObjects
    };

    return JSON.stringify(stixBundle, null, 2);
  }

  /**
   * Export to MISP format
   */
  private exportToMISP(iocs: IOC[], ioas: IOA[], format: IOCExportFormat): string {
    const mispEvent = {
      Event: {
        id: null,
        orgc_id: '1',
        org_id: '1',
        date: new Date().toISOString().split('T')[0],
        threat_level_id: '2',
        info: 'FlowViz IOC/IOA Analysis Results',
        published: false,
        uuid: uuidv4(),
        attribute_count: iocs.length,
        analysis: '1',
        timestamp: Math.floor(Date.now() / 1000).toString(),
        distribution: '0',
        sharing_group_id: '0',
        Attribute: [],
        Tag: [{
          name: `tlp:${  (format.tlpLevel || 'white').toLowerCase()}`,
          colour: this.getTLPColor(format.tlpLevel || 'WHITE')
        }]
      }
    };

    // Convert IOCs to MISP attributes
    if (format.includeIOCs) {
      for (const ioc of iocs) {
        const attribute = {
          id: null,
          type: this.mapTypeToMISP(ioc.type),
          category: this.mapCategoryToMISP(ioc.type),
          to_ids: ioc.malicious === true,
          uuid: uuidv4(),
          event_id: null,
          distribution: '0',
          timestamp: Math.floor(ioc.firstSeen.getTime() / 1000).toString(),
          comment: ioc.description || '',
          sharing_group_id: '0',
          deleted: false,
          disable_correlation: false,
          object_id: '0',
          object_relation: null,
          value: ioc.value,
          Tag: ioc.tags.map(tag => ({
            name: tag,
            colour: '#0088cc'
          }))
        };
        mispEvent.Event.Attribute.push(attribute);
      }
    }

    return JSON.stringify(mispEvent, null, 2);
  }

  /**
   * Export to OpenCTI format
   */
  private exportToOpenCTI(iocs: IOC[], ioas: IOA[], relationships: any[], format: IOCExportFormat): string {
    const bundle = {
      type: 'bundle',
      id: `bundle--${uuidv4()}`,
      objects: []
    };

    // Convert IOCs to OpenCTI observables
    if (format.includeIOCs) {
      for (const ioc of iocs) {
        const observable = {
          type: 'x-opencti-observable',
          id: `x-opencti-observable--${uuidv4()}`,
          entity_type: this.mapTypeToOpenCTI(ioc.type),
          observable_value: ioc.value,
          labels: ioc.tags,
          confidence: this.mapConfidenceToNumber(ioc.confidence),
          created: ioc.firstSeen.toISOString(),
          modified: ioc.lastSeen.toISOString(),
          description: ioc.description,
          x_opencti_source: ioc.source,
          x_opencti_context: ioc.context
        };
        (bundle.objects as any[]).push(observable);
      }
    }

    // Convert IOAs to OpenCTI attack patterns
    if (format.includeIOAs) {
      for (const ioa of ioas) {
        const attackPattern = {
          type: 'attack-pattern',
          id: `attack-pattern--${uuidv4()}`,
          name: ioa.name,
          description: ioa.description,
          created: ioa.firstObserved.toISOString(),
          modified: ioa.lastObserved.toISOString(),
          labels: ioa.tags,
          confidence: this.mapConfidenceToNumber(ioa.confidence),
          x_opencti_severity: ioa.severity,
          x_opencti_category: ioa.category
        };
        (bundle.objects as any[]).push(attackPattern);
      }
    }

    return JSON.stringify(bundle, null, 2);
  }

  /**
   * Export to YARA rules format
   */
  private exportToYARA(iocs: IOC[], format: IOCExportFormat): string {
    const yaraRules: string[] = [];
    const ruleHeader = `/*
 * FlowViz Generated YARA Rules
 * Generated: ${new Date().toISOString()}
 * TLP: ${format.tlpLevel || 'WHITE'}
 */

import "pe"
import "hash"

`;

    yaraRules.push(ruleHeader);

    // Group IOCs by type for more efficient rules
    const hashIOCs = iocs.filter(ioc => ['md5', 'sha1', 'sha256'].includes(ioc.type));
    const fileIOCs = iocs.filter(ioc => ['filename', 'filepath'].includes(ioc.type));
    const stringIOCs = iocs.filter(ioc => ['domain', 'url', 'email'].includes(ioc.type));

    // Generate hash-based rule
    if (hashIOCs.length > 0) {
      yaraRules.push(this.generateHashYARARule(hashIOCs));
    }

    // Generate file-based rule
    if (fileIOCs.length > 0) {
      yaraRules.push(this.generateFileYARARule(fileIOCs));
    }

    // Generate string-based rule
    if (stringIOCs.length > 0) {
      yaraRules.push(this.generateStringYARARule(stringIOCs));
    }

    return yaraRules.join('\n\n');
  }

  /**
   * Export to Suricata rules format
   */
  private exportToSuricata(iocs: IOC[], format: IOCExportFormat): string {
    const suricataRules: string[] = [];
    const header = `# FlowViz Generated Suricata Rules
# Generated: ${new Date().toISOString()}
# TLP: ${format.tlpLevel || 'WHITE'}

`;

    suricataRules.push(header);

    let ruleId = 1000000;
    for (const ioc of iocs) {
      const rule = this.generateSuricataRule(ioc, ruleId++);
      if (rule) {
        suricataRules.push(rule);
      }
    }

    return suricataRules.join('\n');
  }

  // Helper methods
  private filterByConfidence<T extends { confidence: 'low' | 'medium' | 'high' }>(
    items: T[], 
    threshold?: 'low' | 'medium' | 'high'
  ): T[] {
    if (!threshold) {return items;}
    
    const levels = { low: 1, medium: 2, high: 3 };
    const minLevel = levels[threshold];
    
    return items.filter(item => levels[item.confidence] >= minLevel);
  }

  private getTypeSpecificFields(ioc: IOC): any {
    const fields: any = {};
    
    if ('port' in ioc) {fields.port = (ioc as NetworkIOC).port;}
    if ('protocol' in ioc) {fields.protocol = (ioc as NetworkIOC).protocol;}
    if ('geolocation' in ioc) {fields.geolocation = (ioc as NetworkIOC).geolocation;}
    if ('fileSize' in ioc) {fields.fileSize = (ioc as FileIOC).fileSize;}
    if ('fileType' in ioc) {fields.fileType = (ioc as FileIOC).fileType;}
    if ('cvssScore' in ioc) {fields.cvssScore = (ioc as VulnerabilityIOC).cvssScore;}
    
    return fields;
  }

  private csvEscape(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  private generateSTIXPattern(ioc: IOC): string {
    switch (ioc.type) {
      case 'ipv4':
        return `[ipv4-addr:value = '${ioc.value}']`;
      case 'ipv6':
        return `[ipv6-addr:value = '${ioc.value}']`;
      case 'domain':
        return `[domain-name:value = '${ioc.value}']`;
      case 'url':
        return `[url:value = '${ioc.value}']`;
      case 'email':
        return `[email-addr:value = '${ioc.value}']`;
      case 'md5':
        return `[file:hashes.MD5 = '${ioc.value}']`;
      case 'sha1':
        return `[file:hashes.SHA-1 = '${ioc.value}']`;
      case 'sha256':
        return `[file:hashes.SHA-256 = '${ioc.value}']`;
      case 'filename':
        return `[file:name = '${ioc.value}']`;
      default:
        return `[x-custom:value = '${ioc.value}']`;
    }
  }

  private generateSTIXLabels(ioc: IOC): string[] {
    const labels = ['malicious-activity'];
    if (ioc.tags.length > 0) {
      labels.push(...ioc.tags);
    }
    return labels;
  }

  private mapConfidenceToSTIX(confidence: 'low' | 'medium' | 'high'): number {
    switch (confidence) {
      case 'high': return 85;
      case 'medium': return 50;
      case 'low': return 15;
    }
  }

  private mapConfidenceToNumber(confidence: 'low' | 'medium' | 'high'): number {
    switch (confidence) {
      case 'high': return 85;
      case 'medium': return 50;
      case 'low': return 15;
    }
  }

  private getTLPMarkingRef(tlp: string): string {
    switch (tlp.toUpperCase()) {
      case 'RED': return 'marking-definition--5e57c739-391a-4eb3-b6be-7d15ca92d5ed';
      case 'AMBER': return 'marking-definition--f88d31f6-486f-44da-b317-01333bde0b82';
      case 'GREEN': return 'marking-definition--34098fce-860f-48ae-8e50-ebd3cc5e41da';
      case 'WHITE': 
      default: return 'marking-definition--613f2e26-407d-48c7-9eca-b8e91df99dc9';
    }
  }

  private getTLPColor(tlp: string): string {
    switch (tlp.toUpperCase()) {
      case 'RED': return '#cc0000';
      case 'AMBER': return '#ff6600';
      case 'GREEN': return '#33cc00';
      case 'WHITE':
      default: return '#ffffff';
    }
  }

  private mapCategoryToKillChain(category: string): string {
    switch (category) {
      case 'initial-access': return 'initial-access';
      case 'execution': return 'execution';
      case 'persistence': return 'persistence';
      case 'privilege-escalation': return 'privilege-escalation';
      case 'defense-evasion': return 'defense-evasion';
      case 'credential-access': return 'credential-access';
      case 'discovery': return 'discovery';
      case 'lateral-movement': return 'lateral-movement';
      case 'collection': return 'collection';
      case 'command-and-control': return 'command-and-control';
      case 'exfiltration': return 'exfiltration';
      case 'impact': return 'impact';
      default: return 'unknown';
    }
  }

  private mapTypeToMISP(type: string): string {
    switch (type) {
      case 'ipv4': return 'ip-dst';
      case 'ipv6': return 'ip-dst';
      case 'domain': return 'domain';
      case 'url': return 'url';
      case 'email': return 'email-src';
      case 'md5': return 'md5';
      case 'sha1': return 'sha1';
      case 'sha256': return 'sha256';
      case 'filename': return 'filename';
      default: return 'other';
    }
  }

  private mapCategoryToMISP(type: string): string {
    if (['ipv4', 'ipv6', 'domain', 'url'].includes(type)) {return 'Network activity';}
    if (['md5', 'sha1', 'sha256', 'filename'].includes(type)) {return 'Payload delivery';}
    if (['email'].includes(type)) {return 'Social engineering';}
    return 'Other';
  }

  private mapTypeToOpenCTI(type: string): string {
    switch (type) {
      case 'ipv4': return 'IPv4-Addr';
      case 'ipv6': return 'IPv6-Addr';
      case 'domain': return 'Domain-Name';
      case 'url': return 'Url';
      case 'email': return 'Email-Addr';
      case 'md5':
      case 'sha1':
      case 'sha256':
      case 'filename': return 'File';
      default: return 'X-OpenCTI-Cryptographic-Key';
    }
  }

  private generateHashYARARule(hashIOCs: IOC[]): string {
    const hashes = hashIOCs.map(ioc => `        ${ioc.type}(0) == "${ioc.value}"`).join(' or\n');
    
    return `rule FlowViz_Malicious_Hashes {
    meta:
        description = "FlowViz detected malicious file hashes"
        author = "FlowViz"
        date = "${new Date().toISOString().split('T')[0]}"
        version = "1.0"
        
    condition:
${hashes}
}`;
  }

  private generateFileYARARule(fileIOCs: IOC[]): string {
    const strings = fileIOCs.map((ioc, index) => 
      `        $file${index} = "${ioc.value}"`
    ).join('\n');
    
    const condition = fileIOCs.map((_, index) => `$file${index}`).join(' or ');
    
    return `rule FlowViz_Suspicious_Files {
    meta:
        description = "FlowViz detected suspicious file names/paths"
        author = "FlowViz"
        date = "${new Date().toISOString().split('T')[0]}"
        version = "1.0"
        
    strings:
${strings}
        
    condition:
        ${condition}
}`;
  }

  private generateStringYARARule(stringIOCs: IOC[]): string {
    const strings = stringIOCs.map((ioc, index) => 
      `        $str${index} = "${ioc.value}"`
    ).join('\n');
    
    const condition = stringIOCs.map((_, index) => `$str${index}`).join(' or ');
    
    return `rule FlowViz_Network_IOCs {
    meta:
        description = "FlowViz detected network indicators"
        author = "FlowViz"
        date = "${new Date().toISOString().split('T')[0]}"
        version = "1.0"
        
    strings:
${strings}
        
    condition:
        ${condition}
}`;
  }

  private generateSuricataRule(ioc: IOC, ruleId: number): string | null {
    switch (ioc.type) {
      case 'ipv4':
        return `alert ip any any -> ${ioc.value} any (msg:"FlowViz: Malicious IP ${ioc.value}"; sid:${ruleId}; rev:1; classtype:trojan-activity;)`;
      
      case 'domain':
        return `alert dns any any -> any any (msg:"FlowViz: Malicious domain ${ioc.value}"; dns_query; content:"${ioc.value}"; sid:${ruleId}; rev:1; classtype:trojan-activity;)`;
      
      case 'url':
        return `alert http any any -> any any (msg:"FlowViz: Malicious URL ${ioc.value}"; http_uri; content:"${ioc.value}"; sid:${ruleId}; rev:1; classtype:trojan-activity;)`;
      
      default:
        return null;
    }
  }
}