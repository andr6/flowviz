/**
 * Detection Rule Generators
 *
 * Comprehensive detection rule generation for multiple SIEM/EDR platforms
 * Supports: Sigma, YARA, Snort, Suricata, Splunk SPL, Microsoft KQL, Elastic DSL
 */

import type { MITRETechnique, DetectionRuleType } from '../types';

// ============================================================================
// Rule Generation Interface
// ============================================================================

export interface RuleGenerationContext {
  technique: MITRETechnique;
  iocs?: Array<{
    type: string;
    value: string;
    reputation?: string;
  }>;
  processes?: string[];
  fileHashes?: string[];
  networkIndicators?: Array<{
    ip?: string;
    domain?: string;
    port?: number;
  }>;
  registryKeys?: string[];
}

export interface GeneratedRule {
  ruleType: DetectionRuleType;
  ruleName: string;
  ruleContent: string;
  confidenceScore: number;
  platforms: string[];
  notes?: string;
}

// ============================================================================
// Sigma Rule Generator
// ============================================================================

export class SigmaRuleGenerator {
  generate(context: RuleGenerationContext): GeneratedRule {
    const { technique, processes, fileHashes, registryKeys } = context;

    let detectionLogic = '';
    let logsource = 'process_creation';
    let category = 'process_creation';

    // Determine appropriate logsource based on technique
    if (technique.techniqueId.startsWith('T1003')) {
      // Credential Access
      logsource = 'security';
      category = 'credential_access';
      detectionLogic = this.generateCredentialAccessDetection(technique, context);
    } else if (technique.techniqueId.startsWith('T1055')) {
      // Process Injection
      detectionLogic = this.generateProcessInjectionDetection(technique, context);
    } else if (technique.techniqueId.startsWith('T1547')) {
      // Persistence
      logsource = 'registry_event';
      category = 'persistence';
      detectionLogic = this.generatePersistenceDetection(technique, context);
    } else if (technique.techniqueId.startsWith('T1071')) {
      // Command and Control
      logsource = 'network_connection';
      category = 'network_connection';
      detectionLogic = this.generateC2Detection(technique, context);
    } else {
      detectionLogic = this.generateGenericDetection(technique, context);
    }

    const rule = `title: ${technique.techniqueName} Detection
id: ${this.generateUUID()}
status: experimental
description: Detects ${technique.techniqueName} (${technique.techniqueId}) based on known patterns and indicators
references:
    - https://attack.mitre.org/techniques/${technique.techniqueId}
author: ThreatFlow Playbook Generator
date: ${this.getCurrentDate()}
modified: ${this.getCurrentDate()}
tags:
    - attack.${this.getTacticTag(technique.tactic)}
    - attack.${technique.techniqueId.toLowerCase()}
logsource:
    category: ${category}
    product: windows
detection:
${detectionLogic}
falsepositives:
    - Legitimate administrative activity
    - Security tools and monitoring software
level: ${this.getSeverityLevel(technique)}`;

    return {
      ruleType: 'sigma',
      ruleName: `Sigma: ${technique.techniqueName}`,
      ruleContent: rule,
      confidenceScore: 0.75,
      platforms: ['Windows', 'Linux', 'macOS'],
      notes: 'Review and adjust detection logic for your environment',
    };
  }

  private generateCredentialAccessDetection(technique: MITRETechnique, context: RuleGenerationContext): string {
    return `    selection:
        EventID:
            - 4624  # Account logon
            - 4625  # Failed logon
            - 4648  # Logon using explicit credentials
        LogonType:
            - 3  # Network
            - 9  # NewCredentials
    suspicious_tools:
        Image|endswith:
            - '\\\\mimikatz.exe'
            - '\\\\procdump.exe'
            - '\\\\lsass.exe'
    condition: selection or suspicious_tools`;
  }

  private generateProcessInjectionDetection(technique: MITRETechnique, context: RuleGenerationContext): string {
    return `    selection:
        EventID: 1  # Process creation
    injection_indicators:
        CommandLine|contains:
            - 'VirtualAlloc'
            - 'WriteProcessMemory'
            - 'CreateRemoteThread'
            - 'NtMapViewOfSection'
    suspicious_parent:
        ParentImage|endswith:
            - '\\\\powershell.exe'
            - '\\\\cmd.exe'
            - '\\\\wscript.exe'
    condition: selection and (injection_indicators or suspicious_parent)`;
  }

  private generatePersistenceDetection(technique: MITRETechnique, context: RuleGenerationContext): string {
    const regKeys = context.registryKeys || [
      'HKLM\\\\Software\\\\Microsoft\\\\Windows\\\\CurrentVersion\\\\Run',
      'HKCU\\\\Software\\\\Microsoft\\\\Windows\\\\CurrentVersion\\\\Run',
    ];

    return `    selection:
        EventID: 13  # Registry value set
        TargetObject|contains:
${regKeys.map(k => `            - '${k}'`).join('\n')}
    condition: selection`;
  }

  private generateC2Detection(technique: MITRETechnique, context: RuleGenerationContext): string {
    const indicators = context.networkIndicators || [];
    const domains = indicators.map(i => i.domain).filter(Boolean);

    return `    selection:
        EventID: 3  # Network connection
        Initiated: 'true'
    suspicious_destinations:
${domains.length > 0 ? domains.map(d => `        DestinationHostname|contains: '${d}'`).join('\n') : '        DestinationPort:\n            - 443\n            - 8080\n            - 4444'}
    condition: selection and suspicious_destinations`;
  }

  private generateGenericDetection(technique: MITRETechnique, context: RuleGenerationContext): string {
    return `    selection:
        EventID: 1  # Process creation
    keywords:
        CommandLine|contains:
            - '${technique.techniqueName.toLowerCase()}'
    condition: selection and keywords`;
  }

  private getTacticTag(tactic?: string): string {
    if (!tactic) return 'execution';
    return tactic.toLowerCase().replace(/ /g, '_');
  }

  private getSeverityLevel(technique: MITRETechnique): string {
    // Higher severity for privilege escalation, lateral movement, impact
    const highSeverityTactics = ['privilege-escalation', 'lateral-movement', 'impact', 'exfiltration'];
    if (technique.tactic && highSeverityTactics.some(t => technique.tactic?.toLowerCase().includes(t))) {
      return 'high';
    }
    return 'medium';
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  private getCurrentDate(): string {
    return new Date().toISOString().split('T')[0];
  }
}

// ============================================================================
// YARA Rule Generator
// ============================================================================

export class YARARuleGenerator {
  generate(context: RuleGenerationContext): GeneratedRule {
    const { technique, fileHashes, processes } = context;

    const ruleName = this.sanitizeRuleName(technique.techniqueName);
    const strings = this.generateStrings(technique, context);

    const rule = `rule ${ruleName}_${technique.techniqueId.replace(/\./g, '_')}
{
    meta:
        description = "Detects ${technique.techniqueName}"
        technique_id = "${technique.techniqueId}"
        technique_name = "${technique.techniqueName}"
        tactic = "${technique.tactic || 'Unknown'}"
        author = "ThreatFlow Playbook Generator"
        date = "${this.getCurrentDate()}"
        severity = "medium"
        reference = "https://attack.mitre.org/techniques/${technique.techniqueId}"

    strings:
${strings}

    condition:
        uint16(0) == 0x5A4D and  // PE header
        (
            any of ($str*) or
            any of ($api*)
        )
}`;

    return {
      ruleType: 'yara',
      ruleName: `YARA: ${technique.techniqueName}`,
      ruleContent: rule,
      confidenceScore: 0.7,
      platforms: ['Windows', 'Linux'],
      notes: 'Add specific malware signatures for better detection',
    };
  }

  private generateStrings(technique: MITRETechnique, context: RuleGenerationContext): string {
    const strings: string[] = [];

    // Common malicious strings based on technique
    if (technique.techniqueId.startsWith('T1003')) {
      // Credential Dumping
      strings.push('$str1 = "lsass" ascii wide');
      strings.push('$str2 = "mimikatz" ascii wide nocase');
      strings.push('$str3 = "SAM" ascii wide');
      strings.push('$api1 = "LsaEnumerateLogonSessions" ascii');
      strings.push('$api2 = "SeDebugPrivilege" ascii');
    } else if (technique.techniqueId.startsWith('T1055')) {
      // Process Injection
      strings.push('$api1 = "VirtualAllocEx" ascii');
      strings.push('$api2 = "WriteProcessMemory" ascii');
      strings.push('$api3 = "CreateRemoteThread" ascii');
      strings.push('$api4 = "NtMapViewOfSection" ascii');
    } else if (technique.techniqueId.startsWith('T1071')) {
      // Application Layer Protocol
      strings.push('$str1 = "User-Agent:" ascii');
      strings.push('$str2 = "POST" ascii');
      strings.push('$str3 = "GET" ascii');
      strings.push('$api1 = "InternetOpenA" ascii');
      strings.push('$api2 = "HttpSendRequestA" ascii');
    } else {
      // Generic strings
      strings.push('$str1 = { 4D 5A 90 00 }  // PE header');
      strings.push('$api1 = "CreateProcessA" ascii');
      strings.push('$api2 = "ShellExecuteA" ascii');
    }

    // Add file hashes if available
    if (context.fileHashes && context.fileHashes.length > 0) {
      context.fileHashes.slice(0, 3).forEach((hash, i) => {
        strings.push(`$hash${i + 1} = "${hash}" ascii`);
      });
    }

    return strings.map(s => `        ${s}`).join('\n');
  }

  private sanitizeRuleName(name: string): string {
    return name.replace(/[^a-zA-Z0-9_]/g, '_');
  }

  private getCurrentDate(): string {
    return new Date().toISOString().split('T')[0];
  }
}

// ============================================================================
// Snort/Suricata Rule Generator
// ============================================================================

export class SnortRuleGenerator {
  generate(context: RuleGenerationContext): GeneratedRule {
    const { technique, networkIndicators } = context;

    const rules: string[] = [];
    const sid = this.generateSID();

    if (networkIndicators && networkIndicators.length > 0) {
      for (const indicator of networkIndicators) {
        if (indicator.ip) {
          rules.push(this.generateIPRule(technique, indicator.ip, sid + rules.length));
        }
        if (indicator.domain) {
          rules.push(this.generateDomainRule(technique, indicator.domain, sid + rules.length));
        }
      }
    } else {
      // Generate generic rule
      rules.push(this.generateGenericRule(technique, sid));
    }

    return {
      ruleType: 'snort',
      ruleName: `Snort: ${technique.techniqueName}`,
      ruleContent: rules.join('\n\n'),
      confidenceScore: 0.65,
      platforms: ['Network'],
      notes: 'Deploy to Snort/Suricata IDS',
    };
  }

  private generateIPRule(technique: MITRETechnique, ip: string, sid: number): string {
    return `alert tcp any any -> ${ip} any (
    msg:"${technique.techniqueId} - ${technique.techniqueName} - Suspicious Connection to Known Malicious IP";
    flow:to_server,established;
    reference:url,attack.mitre.org/techniques/${technique.techniqueId};
    classtype:trojan-activity;
    sid:${sid};
    rev:1;
)`;
  }

  private generateDomainRule(technique: MITRETechnique, domain: string, sid: number): string {
    return `alert dns any any -> any 53 (
    msg:"${technique.techniqueId} - ${technique.techniqueName} - DNS Query to Suspicious Domain";
    dns_query;
    content:"${domain}";
    nocase;
    reference:url,attack.mitre.org/techniques/${technique.techniqueId};
    classtype:trojan-activity;
    sid:${sid};
    rev:1;
)`;
  }

  private generateGenericRule(technique: MITRETechnique, sid: number): string {
    return `alert tcp any any -> any any (
    msg:"${technique.techniqueId} - ${technique.techniqueName} - Potential ${technique.tactic || 'Malicious'} Activity";
    flow:to_server,established;
    reference:url,attack.mitre.org/techniques/${technique.techniqueId};
    classtype:misc-activity;
    sid:${sid};
    rev:1;
)`;
  }

  private generateSID(): number {
    return 1000000 + Math.floor(Math.random() * 100000);
  }
}

// ============================================================================
// Splunk SPL Generator
// ============================================================================

export class SplunkSPLGenerator {
  generate(context: RuleGenerationContext): GeneratedRule {
    const { technique, processes, networkIndicators } = context;

    let spl = '';

    if (technique.techniqueId.startsWith('T1003')) {
      spl = this.generateCredentialAccessSPL(technique, context);
    } else if (technique.techniqueId.startsWith('T1055')) {
      spl = this.generateProcessInjectionSPL(technique, context);
    } else if (technique.techniqueId.startsWith('T1071')) {
      spl = this.generateC2SPL(technique, context);
    } else {
      spl = this.generateGenericSPL(technique, context);
    }

    return {
      ruleType: 'splunk_spl',
      ruleName: `Splunk: ${technique.techniqueName}`,
      ruleContent: spl,
      confidenceScore: 0.8,
      platforms: ['Splunk'],
      notes: 'Save as Splunk alert and configure appropriate actions',
    };
  }

  private generateCredentialAccessSPL(technique: MITRETechnique, context: RuleGenerationContext): string {
    return `index=windows sourcetype=WinEventLog:Security EventCode IN (4624, 4625, 4648)
| where LogonType IN (3, 9)
| eval technique="${technique.techniqueId}"
| eval technique_name="${technique.techniqueName}"
| stats count by _time, Computer, Account_Name, LogonType, technique
| where count > 5
| table _time, Computer, Account_Name, LogonType, count, technique, technique_name`;
  }

  private generateProcessInjectionSPL(technique: MITRETechnique, context: RuleGenerationContext): string {
    const processes = context.processes || ['powershell.exe', 'cmd.exe', 'wscript.exe'];

    return `index=windows sourcetype=WinEventLog:Sysmon EventCode=1
| search ParentImage IN ("*\\\\${processes.join('*", "*\\\\')}*")
| search CommandLine IN ("*VirtualAlloc*", "*WriteProcessMemory*", "*CreateRemoteThread*")
| eval technique="${technique.techniqueId}"
| eval technique_name="${technique.techniqueName}"
| table _time, Computer, ParentImage, Image, CommandLine, User, technique`;
  }

  private generateC2SPL(technique: MITRETechnique, context: RuleGenerationContext): string {
    const indicators = context.networkIndicators || [];
    const domains = indicators.map(i => i.domain).filter(Boolean);

    const domainFilter = domains.length > 0
      ? `| search dest IN ("${domains.join('", "')}")`
      : '| search dest_port IN (4444, 8080, 443)';

    return `index=network sourcetype=firewall action=allowed
${domainFilter}
| eval technique="${technique.techniqueId}"
| eval technique_name="${technique.techniqueName}"
| stats count by _time, src, dest, dest_port, technique
| where count > 10
| table _time, src, dest, dest_port, count, technique`;
  }

  private generateGenericSPL(technique: MITRETechnique, context: RuleGenerationContext): string {
    return `index=* sourcetype=*
| search "${technique.techniqueName}"
| eval technique="${technique.techniqueId}"
| eval technique_name="${technique.techniqueName}"
| stats count by _time, host, sourcetype, technique
| table _time, host, sourcetype, count, technique`;
  }
}

// ============================================================================
// Microsoft KQL Generator (Azure Sentinel, Defender)
// ============================================================================

export class MicrosoftKQLGenerator {
  generate(context: RuleGenerationContext): GeneratedRule {
    const { technique } = context;

    let kql = '';

    if (technique.techniqueId.startsWith('T1003')) {
      kql = this.generateCredentialAccessKQL(technique, context);
    } else if (technique.techniqueId.startsWith('T1055')) {
      kql = this.generateProcessInjectionKQL(technique, context);
    } else if (technique.techniqueId.startsWith('T1071')) {
      kql = this.generateC2KQL(technique, context);
    } else {
      kql = this.generateGenericKQL(technique, context);
    }

    return {
      ruleType: 'kql',
      ruleName: `KQL: ${technique.techniqueName}`,
      ruleContent: kql,
      confidenceScore: 0.85,
      platforms: ['Azure Sentinel', 'Microsoft Defender'],
      notes: 'Deploy as Azure Sentinel analytics rule',
    };
  }

  private generateCredentialAccessKQL(technique: MITRETechnique, context: RuleGenerationContext): string {
    return `// ${technique.techniqueId} - ${technique.techniqueName} Detection
SecurityEvent
| where EventID in (4624, 4625, 4648)
| where LogonType in (3, 9)
| extend TechniqueID = "${technique.techniqueId}"
| extend TechniqueName = "${technique.techniqueName}"
| summarize Count = count() by TimeGenerated, Computer, TargetUserName, LogonType, TechniqueID
| where Count > 5
| project TimeGenerated, Computer, TargetUserName, LogonType, Count, TechniqueID, TechniqueName`;
  }

  private generateProcessInjectionKQL(technique: MITRETechnique, context: RuleGenerationContext): string {
    return `// ${technique.techniqueId} - ${technique.techniqueName} Detection
DeviceProcessEvents
| where ProcessCommandLine contains "VirtualAlloc"
    or ProcessCommandLine contains "WriteProcessMemory"
    or ProcessCommandLine contains "CreateRemoteThread"
| where InitiatingProcessFileName in~ ("powershell.exe", "cmd.exe", "wscript.exe")
| extend TechniqueID = "${technique.techniqueId}"
| extend TechniqueName = "${technique.techniqueName}"
| project TimeGenerated, DeviceName, FileName, ProcessCommandLine, InitiatingProcessFileName, TechniqueID, TechniqueName`;
  }

  private generateC2KQL(technique: MITRETechnique, context: RuleGenerationContext): string {
    const indicators = context.networkIndicators || [];
    const domains = indicators.map(i => i.domain).filter(Boolean);

    const domainFilter = domains.length > 0
      ? `| where RemoteUrl has_any ("${domains.join('", "')}")`
      : '| where RemotePort in (443, 8080, 4444)';

    return `// ${technique.techniqueId} - ${technique.techniqueName} Detection
DeviceNetworkEvents
| where ActionType == "ConnectionSuccess"
${domainFilter}
| extend TechniqueID = "${technique.techniqueId}"
| extend TechniqueName = "${technique.techniqueName}"
| summarize Count = count() by TimeGenerated, DeviceName, RemoteIP, RemoteUrl, RemotePort, TechniqueID
| where Count > 10
| project TimeGenerated, DeviceName, RemoteIP, RemoteUrl, RemotePort, Count, TechniqueID, TechniqueName`;
  }

  private generateGenericKQL(technique: MITRETechnique, context: RuleGenerationContext): string {
    return `// ${technique.techniqueId} - ${technique.techniqueName} Detection
union
    SecurityEvent,
    DeviceProcessEvents,
    DeviceNetworkEvents
| where TimeGenerated > ago(1h)
| extend TechniqueID = "${technique.techniqueId}"
| extend TechniqueName = "${technique.techniqueName}"
| project TimeGenerated, Computer, TechniqueID, TechniqueName`;
  }
}

// ============================================================================
// Elastic Query DSL Generator
// ============================================================================

export class ElasticDSLGenerator {
  generate(context: RuleGenerationContext): GeneratedRule {
    const { technique } = context;

    const dsl = this.generateElasticRule(technique, context);

    return {
      ruleType: 'elastic_dsl',
      ruleName: `Elastic: ${technique.techniqueName}`,
      ruleContent: JSON.stringify(dsl, null, 2),
      confidenceScore: 0.75,
      platforms: ['Elastic SIEM'],
      notes: 'Deploy as Elastic Security detection rule',
    };
  }

  private generateElasticRule(technique: MITRETechnique, context: RuleGenerationContext): any {
    return {
      name: `${technique.techniqueId} - ${technique.techniqueName}`,
      description: `Detects ${technique.techniqueName} based on known patterns`,
      risk_score: this.getRiskScore(technique),
      severity: this.getSeverity(technique),
      type: 'query',
      query: this.buildQuery(technique, context),
      language: 'kuery',
      filters: [],
      threat: [
        {
          framework: 'MITRE ATT&CK',
          tactic: {
            id: this.getTacticId(technique.tactic),
            name: technique.tactic || 'Unknown',
            reference: `https://attack.mitre.org/tactics/${this.getTacticId(technique.tactic)}`,
          },
          technique: [
            {
              id: technique.techniqueId,
              name: technique.techniqueName,
              reference: `https://attack.mitre.org/techniques/${technique.techniqueId}`,
            },
          ],
        },
      ],
      actions: [],
      enabled: false,
      interval: '5m',
      from: 'now-6m',
      index: ['logs-*', 'winlogbeat-*'],
      max_signals: 100,
    };
  }

  private buildQuery(technique: MITRETechnique, context: RuleGenerationContext): string {
    if (technique.techniqueId.startsWith('T1003')) {
      return 'event.code:(4624 or 4625 or 4648) and winlog.event_data.LogonType:(3 or 9)';
    } else if (technique.techniqueId.startsWith('T1055')) {
      return 'event.code:1 and process.command_line:(*VirtualAlloc* or *WriteProcessMemory* or *CreateRemoteThread*)';
    } else if (technique.techniqueId.startsWith('T1071')) {
      return 'event.category:network and destination.port:(443 or 8080 or 4444)';
    }
    return `event.action:* and process.name:*`;
  }

  private getRiskScore(technique: MITRETechnique): number {
    const highRiskTactics = ['privilege-escalation', 'lateral-movement', 'impact'];
    if (technique.tactic && highRiskTactics.some(t => technique.tactic?.toLowerCase().includes(t))) {
      return 75;
    }
    return 50;
  }

  private getSeverity(technique: MITRETechnique): string {
    const highRiskTactics = ['privilege-escalation', 'lateral-movement', 'impact'];
    if (technique.tactic && highRiskTactics.some(t => technique.tactic?.toLowerCase().includes(t))) {
      return 'high';
    }
    return 'medium';
  }

  private getTacticId(tactic?: string): string {
    if (!tactic) return 'TA0002';
    const tacticMap: Record<string, string> = {
      'initial-access': 'TA0001',
      'execution': 'TA0002',
      'persistence': 'TA0003',
      'privilege-escalation': 'TA0004',
      'defense-evasion': 'TA0005',
      'credential-access': 'TA0006',
      'discovery': 'TA0007',
      'lateral-movement': 'TA0008',
      'collection': 'TA0009',
      'exfiltration': 'TA0010',
      'command-and-control': 'TA0011',
      'impact': 'TA0040',
    };
    return tacticMap[tactic.toLowerCase()] || 'TA0002';
  }
}

// ============================================================================
// Rule Generator Factory
// ============================================================================

export class DetectionRuleGeneratorFactory {
  private generators: Map<DetectionRuleType, any>;

  constructor() {
    this.generators = new Map([
      ['sigma', new SigmaRuleGenerator()],
      ['yara', new YARARuleGenerator()],
      ['snort', new SnortRuleGenerator()],
      ['suricata', new SnortRuleGenerator()], // Snort and Suricata share syntax
      ['splunk_spl', new SplunkSPLGenerator()],
      ['kql', new MicrosoftKQLGenerator()],
      ['elastic_dsl', new ElasticDSLGenerator()],
    ]);
  }

  /**
   * Generate detection rule for specific platform
   */
  generateRule(ruleType: DetectionRuleType, context: RuleGenerationContext): GeneratedRule | null {
    const generator = this.generators.get(ruleType);
    if (!generator) {
      console.warn(`No generator found for rule type: ${ruleType}`);
      return null;
    }

    try {
      return generator.generate(context);
    } catch (error) {
      console.error(`Failed to generate ${ruleType} rule:`, error);
      return null;
    }
  }

  /**
   * Generate detection rules for all supported platforms
   */
  generateAllRules(context: RuleGenerationContext): GeneratedRule[] {
    const rules: GeneratedRule[] = [];

    for (const [ruleType] of this.generators) {
      const rule = this.generateRule(ruleType, context);
      if (rule) {
        rules.push(rule);
      }
    }

    return rules;
  }

  /**
   * Get list of supported rule types
   */
  getSupportedRuleTypes(): DetectionRuleType[] {
    return Array.from(this.generators.keys());
  }
}

// ============================================================================
// Export
// ============================================================================

export const ruleGeneratorFactory = new DetectionRuleGeneratorFactory();
