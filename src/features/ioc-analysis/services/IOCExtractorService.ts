import { v4 as uuidv4 } from 'uuid';

import { isValidDomain, extractValidDomains } from '../../../shared/data/validTlds';
import { IOC, IOA, IOCType, IOCIOAAnalysisResult, IOCExtractionConfig, NetworkIOC, FileIOC, VulnerabilityIOC, ProcessIOC, RegistryIOC } from '../types/IOC';

export class IOCExtractorService {
  private config: IOCExtractionConfig;

  // Comprehensive IOC extraction patterns
  private readonly patterns: Record<IOCType, RegExp[]> = {
    // Network IOCs
    ipv4: [
      // Standard IPv4 addresses
      /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
      /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
      // Defanged IPv4 addresses with [.]
      /\b(?:\d{1,3}\[\.\]){3}\d{1,3}\b/g,
      // Defanged IPv4 with mixed formats
      /\b(?:\d{1,3}(?:\[\.\]|\.)){2}\d{1,3}[\[\.]?\.]?\d{1,3}\b/g
    ],
    ipv6: [
      /\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b/g,
      /\b(?:[0-9a-fA-F]{0,4}:){0,7}:(?:[0-9a-fA-F]{0,4}:){0,7}[0-9a-fA-F]{0,4}\b/g
    ],
    domain: [
      // Standard domains - will be filtered through comprehensive TLD validation
      /\b[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?))+\b/g,
      // Defanged domains with [.] format
      /\b[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\[\.\]([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?))+\b/g,
      // Mixed defanged domains (combination of . and [.])
      /\b[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?([\[\.]\.|\.\[\.\]|\.|\[\.\])([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?[\[\.]\.|\.\[\.\]|\.|\[\.\])*[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\b/g
    ],
    url: [
      // Standard URLs
      /https?:\/\/(?:[-\w.])+(?:\:[0-9]+)?(?:\/(?:[\w\/_.])*(?:\?(?:[\w&=%.])*)?(?:\#(?:[\w.])*)?)?/g,
      /ftp:\/\/(?:[-\w.])+(?:\:[0-9]+)?(?:\/(?:[\w\/_.])*)?/g,
      // Repository URLs (GitHub, GitLab, Bitbucket)
      /(?:github|gitlab|bitbucket)[\[\.]?\.]?(?:com|org)\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+/gi,
      // Defanged URLs with [://] or [.]
      /https?\[\:\]\/\/(?:[-\w\[\.]]+)+(?:\:[0-9]+)?(?:\/(?:[\w\/_\[\.]]*)*(?:\?(?:[\w&=%\[\.]]*)*)?(?:\#(?:[\w\[\.]]*)*)?)?/g,
      // Shortened URLs and suspicious domains
      /(?:bit\.ly|tinyurl|t\.co|goo\.gl|grabify\.link|iplogger|2no\.co)\/[a-zA-Z0-9]+/gi,
      // Domain-only patterns that could be URLs
      /(?:^|\s)([a-zA-Z0-9][-a-zA-Z0-9]*\.)+[a-zA-Z]{2,}(?:\/[^\s]*)?(?=\s|$)/g
    ],
    email: [
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
    ],
    'user-agent': [
      /User-Agent:\s*([^\r\n]+)/gi,
      /Mozilla\/[0-9.]+ \([^)]+\)[^\r\n]*/gi
    ],
    asn: [
      /AS\d+/gi,
      /ASN\s*:?\s*\d+/gi
    ],

    // File IOCs - Hashes
    md5: [
      /\b[a-fA-F0-9]{32}\b/g
    ],
    sha1: [
      /\b[a-fA-F0-9]{40}\b/g,
      /(?:SHA1|sha1)[:\s]+([a-fA-F0-9]{40})\b/g,
      /(?:SHA-1|sha-1)[:\s]+([a-fA-F0-9]{40})\b/g,
      /(?:hash|Hash)[:\s]+([a-fA-F0-9]{40})\b/g,
      /([a-fA-F0-9]{40})(?:\s|$)/g
    ],
    sha256: [
      /\b[a-fA-F0-9]{64}\b/g
    ],
    sha512: [
      /\b[a-fA-F0-9]{128}\b/g
    ],
    ssdeep: [
      /\b\d+:[a-zA-Z0-9+/]+:[a-zA-Z0-9+/]+\b/g
    ],
    imphash: [
      /\b[a-fA-F0-9]{32}\b/g,
      /(?:imphash|IMPHASH)[:\s]+([a-fA-F0-9]{32})\b/g
    ],
    pehash: [
      /\b[a-fA-F0-9]{40}\b/g,
      /(?:pehash|PEHASH)[:\s]+([a-fA-F0-9]{40})\b/g
    ],
    
    // File paths and names - much more restrictive patterns
    filename: [
      // Only match files with specific threat-relevant extensions and proper filename structure
      /\b[a-zA-Z0-9_\-]{3,50}\.(?:exe|dll|bat|cmd|ps1|vbs|js|jar|scr|pif|msi)\b/gi,
      // Match document files only if they have proper filename structure (no sentence fragments)
      /\b[a-zA-Z0-9_\-]{4,30}\.(?:zip|rar|7z|pdf|doc|docx|xls|xlsx|ppt|pptx)\b/gi
    ],
    filepath: [
      /[A-Za-z]:\\(?:[^\\/:*?"<>|\r\n]+\\)*[^\\/:*?"<>|\r\n]*/g,
      /\/(?:[^\/\s]+\/)*[^\/\s]+/g,
      /%[A-Za-z_]+%\\[^\\/:*?"<>|\r\n]+/g
    ],
    
    // System IOCs
    mutex: [
      /mutex[:\s]+[\w\-_{}]+/gi,
      /Global\\[\w\-_{}]+/gi,
      /Local\\[\w\-_{}]+/gi
    ],
    service: [
      /service[:\s]+[\w\-_]+/gi,
      /svchost\.exe\s*-k\s*[\w\-_]+/gi
    ],

    // Registry
    'registry-key': [
      /HKEY_(?:LOCAL_MACHINE|CURRENT_USER|CLASSES_ROOT|USERS|CURRENT_CONFIG)\\[^\\r\\n]*/gi,
      /HKLM\\[^\\r\\n]*/gi,
      /HKCU\\[^\\r\\n]*/gi
    ],
    'registry-value': [
      /REG_(?:SZ|DWORD|BINARY|EXPAND_SZ|MULTI_SZ):\s*[^\r\n]*/gi
    ],

    // Process IOCs
    'process-name': [
      /\b[\w\-\.]+\.exe\b/gi,
      /\b[\w\-\.]+\.dll\b/gi
    ],
    'command-line': [
      /cmd\.exe\s+\/c\s+[^\r\n]+/gi,
      /powershell(?:\.exe)?\s+(?:-(?:Command|EncodedCommand|ExecutionPolicy|WindowStyle|NoProfile|NonInteractive)\s+[^\r\n\s]+\s*)*[^\r\n]+/gi,
      /(?:cmd|powershell|wmic|net|netstat|tasklist|schtasks|rundll32|regsvr32|certutil|bitsadmin|sc|reg)\s+[^\r\n]+/gi,
      /(?:c:|cmd|powershell)(?:[^>]*>?\s*)?[^\r\n]+\.(?:exe|bat|cmd|ps1|vbs|js)\b[^\r\n]*/gi,
      /(?:^|\s)(?:[a-zA-Z]:[\\\/])?(?:[\w\-\.]+[\\\/])*[\w\-\.]+\.(?:exe|bat|cmd|ps1|vbs|js)\s+[^\r\n]+/gm
    ],
    pid: [
      /PID[:\s]+\d+/gi,
      /Process\s+ID[:\s]+\d+/gi
    ],

    // Certificate IOCs
    'certificate-serial': [
      /Serial\s+Number[:\s]+[a-fA-F0-9:]+/gi,
      /Certificate\s+Serial[:\s]+[a-fA-F0-9:]+/gi
    ],
    'certificate-thumbprint': [
      /Thumbprint[:\s]+[a-fA-F0-9]+/gi,
      /SHA1[:\s]+[a-fA-F0-9]+/gi
    ],

    // YARA
    'yara-rule': [
      /rule\s+\w+\s*\{[^}]+\}/gis
    ],

    // Vulnerabilities
    cve: [
      /CVE-\d{4}-\d{4,7}/gi
    ],
    vulnerability: [
      /(?:vulnerability|vuln|exploit)[:\s]+[^\r\n]+/gi,
      /CVSS[:\s]+[\d\.]+/gi
    ],

    // Cryptocurrency
    'bitcoin-address': [
      /\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b/g,
      /\bbc1[a-z0-9]{39,59}\b/g
    ],
    'monero-address': [
      /\b4[0-9AB][1-9A-HJ-NP-Za-km-z]{93}\b/g
    ],

    // Other
    'credit-card': [
      /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3[0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/g
    ],
    'phone-number': [
      /\+?[1-9]\d{1,14}/g,
      /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g
    ],
    custom: []
  };

  // Private IP ranges to filter out if configured
  private readonly privateIPRanges = [
    /^10\./,
    /^192\.168\./,
    /^172\.(?:1[6-9]|2[0-9]|3[01])\./,
    /^127\./,
    /^169\.254\./,
    /^224\./
  ];

  constructor(config: Partial<IOCExtractionConfig> = {}) {
    this.config = {
      enabledExtractors: {
        text: true,
        image: true,
        metadata: true,
        ...config.enabledExtractors
      },
      confidence: {
        textRegexMatch: 0.7,
        imageOCR: 0.5,
        aiExtracted: 0.9,
        contextualMatch: 0.8,
        ...config.confidence
      },
      filters: {
        minConfidence: 'low',
        excludePrivateIPs: true,
        excludePrivateDomains: false,
        includeObfuscated: true,
        validateHashes: true,
        ...config.filters
      },
      customPatterns: config.customPatterns || []
    };

    // Add custom patterns to the patterns object
    for (const custom of this.config.customPatterns) {
      if (!this.patterns[custom.type]) {
        this.patterns[custom.type] = [];
      }
      this.patterns[custom.type].push(custom.pattern);
    }
  }

  /**
   * Extract IOCs from text content
   */
  async extractFromText(text: string, sourceLocation?: string): Promise<IOC[]> {
    const extractedIOCs: IOC[] = [];
    const now = new Date();

    // Define processing order to prioritize file-related IOCs over domain matching
    const processingOrder = [
      // Process file-related IOCs first
      'md5', 'sha1', 'sha256', 'sha512', 'ssdeep', 'imphash', 'pehash',
      'filename', 'filepath', 'process-name', 'command-line',
      // Then network IOCs
      'ipv4', 'ipv6', 'url', 'email', 'domain',
      // Then other IOCs
      'user-agent', 'asn', 'mutex', 'service', 'registry-key', 'registry-value',
      'pid', 'certificate-serial', 'certificate-thumbprint', 'yara-rule',
      'cve', 'vulnerability', 'bitcoin-address', 'monero-address',
      'credit-card', 'phone-number', 'custom'
    ];

    // Track already extracted values to avoid conflicts
    const extractedValues = new Set<string>();

    // Process IOCs in priority order
    for (const type of processingOrder) {
      // Special handling for domains using comprehensive TLD validation
      if (type === 'domain') {
        const validDomains = this.extractDomainsWithValidation(text);
        for (const domain of validDomains) {
          const valueKey = domain.toLowerCase();
          if (extractedValues.has(valueKey)) {
            continue;
          }

          const ioc = this.createIOC(
            'domain',
            domain,
            'text',
            sourceLocation,
            this.getContext(text, domain),
            now
          );
          if (ioc) {
            extractedIOCs.push(ioc);
            extractedValues.add(valueKey);
          }
        }
        continue;
      }

      // Regular pattern matching for other IOC types
      const patterns = this.patterns[type as IOCType];
      if (!patterns) {continue;}

      for (const pattern of patterns) {
        const matches = text.match(pattern);
        if (matches) {
          for (const match of matches) {
            const cleanMatch = this.cleanExtractedValue(type as IOCType, match.trim());
            if (cleanMatch && this.validateIOC(type as IOCType, cleanMatch)) {
              // Skip if this value was already extracted as a different type
              const valueKey = cleanMatch.toLowerCase();
              if (extractedValues.has(valueKey)) {
                continue;
              }

              // For filename IOCs, require context that suggests it's threat-relevant
              if (type === 'filename') {
                const context = this.getContext(text, match);
                if (!this.hasFileIOCContext(cleanMatch, context)) {
                  continue;
                }
              }

              const ioc = this.createIOC(
                type as IOCType,
                cleanMatch,
                'text',
                sourceLocation,
                this.getContext(text, match),
                now
              );
              if (ioc) {
                extractedIOCs.push(ioc);
                extractedValues.add(valueKey);
                // Debug logging for SHA1 IOCs
                if (type === 'sha1') {
                  console.log(`✅ SHA1 IOC extracted: ${cleanMatch} from match: ${match}`);
                }
              }
            } else if (type === 'sha1') {
              console.log(`❌ SHA1 match failed validation: ${match} -> ${cleanMatch}`);
            }
          }
        }
      }
    }

    return this.deduplicateIOCs(extractedIOCs);
  }

  /**
   * Extract IOCs from images using OCR (placeholder - would integrate with actual OCR service)
   */
  async extractFromImage(imageData: string | ArrayBuffer, sourceLocation?: string): Promise<IOC[]> {
    if (!this.config.enabledExtractors.image) {
      return [];
    }

    // Placeholder for OCR implementation
    // In a real implementation, you would:
    // 1. Use OCR service (Tesseract.js, Google Vision API, etc.)
    // 2. Extract text from image
    // 3. Run text extraction on the OCR results
    console.warn('Image IOC extraction not yet implemented - requires OCR service');
    
    return [];
  }

  /**
   * Create IOC analysis result with comprehensive metadata
   */
  createAnalysisResult(iocs: IOC[], ioas: IOA[] = []): IOCIOAAnalysisResult {
    const now = new Date();
    
    // Calculate summary statistics
    const iocsByType: Record<IOCType, number> = {} as Record<IOCType, number>;
    const confidenceDistribution: Record<string, number> = { low: 0, medium: 0, high: 0 };
    const sourceDistribution: Record<string, number> = { text: 0, image: 0, metadata: 0 };
    const tlpDistribution: Record<string, number> = { WHITE: 0, GREEN: 0, AMBER: 0, RED: 0 };

    iocs.forEach(ioc => {
      iocsByType[ioc.type] = (iocsByType[ioc.type] || 0) + 1;
      confidenceDistribution[ioc.confidence]++;
      sourceDistribution[ioc.source]++;
      if (ioc.tlp) {
        tlpDistribution[ioc.tlp]++;
      }
    });

    const ioasByCategory: Record<string, number> = {};
    const severityDistribution: Record<string, number> = { info: 0, low: 0, medium: 0, high: 0, critical: 0 };

    ioas.forEach(ioa => {
      ioasByCategory[ioa.category] = (ioasByCategory[ioa.category] || 0) + 1;
      severityDistribution[ioa.severity]++;
    });

    return {
      iocs,
      ioas,
      summary: {
        totalIOCs: iocs.length,
        totalIOAs: ioas.length,
        iocsByType,
        ioasByCategory: ioasByCategory as any,
        confidenceDistribution,
        sourceDistribution: sourceDistribution as any,
        tlpDistribution,
        severityDistribution
      },
      relationships: [],
      timeline: this.createTimeline(iocs, ioas),
      reportMetadata: {
        analysisDate: now,
        version: '1.0.0',
        tools: ['ThreatFlow-IOC-Extractor'],
        sources: ['text', 'image'],
        totalProcessingTime: 0
      }
    };
  }

  private createIOC(
    type: IOCType,
    value: string,
    source: 'text' | 'image' | 'metadata',
    sourceLocation?: string,
    context?: string,
    timestamp = new Date()
  ): IOC | null {
    const baseIOC = {
      id: uuidv4(),
      type,
      value,
      confidence: this.calculateConfidence(type, value, source, context),
      source,
      sourceLocation,
      context,
      firstSeen: timestamp,
      lastSeen: timestamp,
      tags: this.generateTags(type, value),
      description: this.generateDescription(type, value),
      malicious: this.assessMaliciousness(type, value),
      tlp: 'WHITE' as const
    };

    // Create specialized IOC types
    switch (type) {
      case 'ipv4':
      case 'ipv6':
      case 'domain':
      case 'url':
      case 'email':
      case 'user-agent':
      case 'asn':
        return {
          ...baseIOC,
          type,
          port: this.extractPort(value),
          protocol: this.extractProtocol(value),
        } as NetworkIOC;

      case 'md5':
      case 'sha1':
      case 'sha256':
      case 'sha512':
      case 'ssdeep':
      case 'filename':
      case 'filepath':
        return {
          ...baseIOC,
          type,
          fileType: this.extractFileType(value),
        } as FileIOC;

      case 'registry-key':
      case 'registry-value':
        return {
          ...baseIOC,
          type,
          hive: this.extractRegistryHive(value),
        } as RegistryIOC;

      case 'process-name':
      case 'command-line':
      case 'pid':
        return {
          ...baseIOC,
          type,
          arguments: this.extractProcessArguments(value),
        } as ProcessIOC;

      case 'cve':
      case 'vulnerability':
        return {
          ...baseIOC,
          type,
          cvssScore: this.extractCVSSScore(context || ''),
        } as VulnerabilityIOC;

      default:
        return baseIOC;
    }
  }

  private validateIOC(type: IOCType, value: string): boolean {
    // Filter out private IPs if configured
    if (type === 'ipv4' && this.config.filters.excludePrivateIPs) {
      return !this.privateIPRanges.some(range => range.test(value));
    }

    // Validate hash lengths
    if (this.config.filters.validateHashes) {
      switch (type) {
        case 'md5': return value.length === 32;
        case 'sha1': return value.length === 40;
        case 'sha256': return value.length === 64;
        case 'sha512': return value.length === 128;
      }
    }

    // Enhanced domain validation using comprehensive TLD list
    if (type === 'domain') {
      return isValidDomain(value);
    }

    // Enhanced filename validation - require associated checksum for file IOCs
    if (type === 'filename') {
      return this.isValidFilenameIOC(value);
    }

    // Process name validation - should end with .exe or .dll
    if (type === 'process-name') {
      return value.match(/\.(exe|dll)$/i) !== null;
    }

    // Command line validation - should contain executable or command
    if (type === 'command-line') {
      const hasExecutable = value.match(/\.(exe|bat|cmd|ps1|vbs|js)\b/i);
      const hasCommand = value.match(/\b(cmd|powershell|wmic|net|netstat|tasklist|schtasks|rundll32|regsvr32|certutil|bitsadmin|sc|reg)\b/i);
      return hasExecutable !== null || hasCommand !== null;
    }

    // Basic validation
    if (!value || value.length < 3) {return false;}
    
    return true;
  }

  private cleanExtractedValue(type: IOCType, match: string): string | null {
    // First normalize defanged indicators
    let cleanedMatch = this.normalizeDefangedIndicator(match);
    
    // Handle prefixed patterns that need cleaning
    switch (type) {
      case 'sha1':
        // Extract hash from patterns like "SHA1: <hash>", "SHA-1: <hash>", "hash: <hash>"
        const sha1Match = cleanedMatch.match(/(?:SHA1|sha1|SHA-1|sha-1|hash|Hash)[:\s]+([a-fA-F0-9]{40})/i);
        if (sha1Match) {return sha1Match[1];}
        // Also handle standalone 40-char hex strings
        const standaloneMatch = cleanedMatch.match(/^([a-fA-F0-9]{40})(?:\s|$)/);
        return standaloneMatch ? standaloneMatch[1] : cleanedMatch;
      
      case 'imphash':
        // Extract hash from patterns like "imphash: <hash>"
        const imphashMatch = match.match(/(?:imphash|IMPHASH)[:\s]+([a-fA-F0-9]{32})/i);
        return imphashMatch ? imphashMatch[1] : match;
      
      case 'pehash':
        // Extract hash from patterns like "pehash: <hash>"
        const pehashMatch = match.match(/(?:pehash|PEHASH)[:\s]+([a-fA-F0-9]{40})/i);
        return pehashMatch ? pehashMatch[1] : match;
      
      case 'certificate-thumbprint':
        // Extract hash from patterns like "SHA1: <hash>" or "Thumbprint: <hash>"
        const thumbprintMatch = match.match(/(?:SHA1|Thumbprint)[:\s]+([a-fA-F0-9]+)/i);
        return thumbprintMatch ? thumbprintMatch[1] : match;
      
      case 'certificate-serial':
        // Extract serial from patterns like "Serial Number: <serial>" or "Certificate Serial: <serial>"
        const serialMatch = match.match(/(?:Serial\s+Number|Certificate\s+Serial)[:\s]+([a-fA-F0-9:]+)/i);
        return serialMatch ? serialMatch[1] : match;
      
      case 'user-agent':
        // Extract user agent string from "User-Agent: <string>" pattern
        const uaMatch = match.match(/User-Agent:\s*([^\r\n]+)/i);
        return uaMatch ? uaMatch[1] : match;
      
      case 'asn':
        // Extract ASN number from "AS<number>" or "ASN: <number>" patterns
        const asnMatch = match.match(/(?:AS|ASN\s*:?\s*)(\d+)/i);
        return asnMatch ? `AS${asnMatch[1]}` : match;
      
      case 'mutex':
        // Extract mutex name from "mutex: <name>" pattern
        const mutexMatch = match.match(/mutex[:\s]+([\w\-_{}]+)/i);
        return mutexMatch ? mutexMatch[1] : match;
      
      case 'service':
        // Extract service name from "service: <name>" pattern
        const serviceMatch = match.match(/service[:\s]+([\w\-_]+)/i);
        return serviceMatch ? serviceMatch[1] : match;
      
      case 'registry-value':
        // Extract registry value from "REG_<type>: <value>" pattern
        const regValueMatch = match.match(/REG_(?:SZ|DWORD|BINARY|EXPAND_SZ|MULTI_SZ):\s*([^\r\n]*)/i);
        return regValueMatch ? regValueMatch[1] : match;
      
      case 'pid':
        // Extract PID number from "PID: <number>" or "Process ID: <number>" patterns
        const pidMatch = match.match(/(?:PID|Process\s+ID)[:\s]+(\d+)/i);
        return pidMatch ? pidMatch[1] : match;
      
      case 'vulnerability':
        // Extract vulnerability description from "vulnerability: <desc>" or "vuln: <desc>" patterns
        const vulnMatch = match.match(/(?:vulnerability|vuln|exploit)[:\s]+([^\r\n]+)/i);
        if (vulnMatch) {return vulnMatch[1];}
        // Also handle CVSS patterns
        const cvssMatch = match.match(/CVSS[:\s]+([\d\.]+)/i);
        return cvssMatch ? `CVSS Score: ${cvssMatch[1]}` : match;
      
      default:
        // For other types, return the cleaned match
        return cleanedMatch;
    }
  }

  private calculateConfidence(type: IOCType, value: string, source: string, context?: string): 'low' | 'medium' | 'high' {
    let score = this.config.confidence.textRegexMatch;

    // Adjust based on source
    switch (source) {
      case 'text':
        score = this.config.confidence.textRegexMatch;
        break;
      case 'image':
        score = this.config.confidence.imageOCR;
        break;
      case 'metadata':
        score = this.config.confidence.aiExtracted;
        break;
    }

    // Increase confidence for contextual matches
    if (context) {
      const threatKeywords = ['malware', 'trojan', 'backdoor', 'c2', 'command', 'control', 'exploit', 'attack', 'malicious'];
      if (threatKeywords.some(keyword => context.toLowerCase().includes(keyword))) {
        score += 0.2;
      }
    }

    // Hash validation increases confidence
    if (['md5', 'sha1', 'sha256', 'sha512', 'imphash', 'pehash'].includes(type) && this.isValidHash(type, value)) {
      score += 0.1;
    }

    if (score >= 0.8) {return 'high';}
    if (score >= 0.6) {return 'medium';}
    return 'low';
  }

  private getContext(text: string, match: string, contextLength = 100): string {
    const index = text.indexOf(match);
    if (index === -1) {return '';}
    
    const start = Math.max(0, index - contextLength);
    const end = Math.min(text.length, index + match.length + contextLength);
    
    return text.substring(start, end).trim();
  }

  private deduplicateIOCs(iocs: IOC[]): IOC[] {
    const seen = new Map<string, IOC>();
    
    for (const ioc of iocs) {
      const key = `${ioc.type}:${ioc.value.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.set(key, ioc);
      } else {
        // Merge with existing, keeping highest confidence
        const existing = seen.get(key)!;
        if (this.getConfidenceScore(ioc.confidence) > this.getConfidenceScore(existing.confidence)) {
          seen.set(key, { ...existing, ...ioc });
        }
      }
    }
    
    return Array.from(seen.values());
  }

  private getConfidenceScore(confidence: 'low' | 'medium' | 'high'): number {
    switch (confidence) {
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
    }
  }

  private generateTags(type: IOCType, value: string): string[] {
    const tags: string[] = [type];
    
    // Add contextual tags
    if (['ipv4', 'ipv6', 'domain'].includes(type)) {
      tags.push('network');
    }
    
    if (['md5', 'sha1', 'sha256', 'sha512', 'imphash', 'pehash', 'ssdeep'].includes(type)) {
      tags.push('hash', 'file');
    }
    
    if (type === 'cve') {
      tags.push('vulnerability', 'cve');
    }
    
    return tags;
  }

  private generateDescription(type: IOCType, value: string): string {
    switch (type) {
      case 'ipv4':
      case 'ipv6':
        return `IP address: ${value}`;
      case 'domain':
        return `Domain name: ${value}`;
      case 'url':
        return `URL: ${value}`;
      case 'email':
        return `Email address: ${value}`;
      case 'md5':
      case 'sha1':
      case 'sha256':
      case 'sha512':
      case 'imphash':
      case 'pehash':
        return `${type.toUpperCase()} hash: ${value}`;
      case 'ssdeep':
        return `SSDEEP fuzzy hash: ${value}`;
      case 'cve':
        return `CVE vulnerability: ${value}`;
      default:
        return `${type}: ${value}`;
    }
  }

  private assessMaliciousness(type: IOCType, value: string): boolean | undefined {
    // Basic heuristics - in production, this would check against threat intel feeds
    if (type === 'domain' && value.includes('bit.ly')) {return undefined;} // Suspicious but not definitively malicious
    if (type === 'cve') {return true;} // CVEs represent vulnerabilities
    
    return undefined; // Unknown
  }

  private extractPort(value: string): number | undefined {
    const match = value.match(/:(\d+)$/);
    return match ? parseInt(match[1]) : undefined;
  }

  private extractProtocol(value: string): string | undefined {
    const match = value.match(/^(https?|ftp):/);
    return match ? match[1] : undefined;
  }

  private extractFileType(value: string): string | undefined {
    const match = value.match(/\.([a-zA-Z0-9]+)$/);
    return match ? match[1].toLowerCase() : undefined;
  }

  private extractRegistryHive(value: string): string | undefined {
    const match = value.match(/^(HKEY_[A-Z_]+|HK[A-Z]{2})/);
    return match ? match[1] : undefined;
  }

  private extractProcessArguments(value: string): string[] | undefined {
    if (!value.includes(' ')) {return undefined;}
    return value.split(' ').slice(1);
  }

  private extractCVSSScore(context: string): number | undefined {
    const match = context.match(/CVSS[:\s]+([\d\.]+)/i);
    return match ? parseFloat(match[1]) : undefined;
  }

  private isValidHash(type: IOCType, value: string): boolean {
    if (!/^[a-fA-F0-9]+$/.test(value)) {return false;}
    
    switch (type) {
      case 'md5': return value.length === 32;
      case 'sha1': return value.length === 40;
      case 'sha256': return value.length === 64;
      case 'sha512': return value.length === 128;
      case 'imphash': return value.length === 32;
      case 'pehash': return value.length === 40;
      default: return false;
    }
  }

  private looksLikeFilename(value: string): boolean {
    // Check if string has executable or document file extensions (but not TLD extensions)
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

  private createTimeline(iocs: IOC[], ioas: IOA[]) {
    const timeline = [];
    
    for (const ioc of iocs) {
      timeline.push({
        timestamp: ioc.firstSeen,
        iocId: ioc.id,
        event: 'IOC_DETECTED',
        description: `${ioc.type.toUpperCase()} detected: ${ioc.value}`,
        source: ioc.source
      });
    }
    
    for (const ioa of ioas) {
      timeline.push({
        timestamp: ioa.firstObserved,
        ioaId: ioa.id,
        event: 'IOA_DETECTED',
        description: `${ioa.category.toUpperCase()} behavior: ${ioa.name}`,
        source: ioa.source
      });
    }
    
    return timeline.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Add method to use comprehensive domain extraction that filters out false positives
   */
  private extractDomainsWithValidation(text: string): string[] {
    return extractValidDomains(text);
  }

  /**
   * Normalize defanged indicators by removing defanging characters
   */
  private normalizeDefangedIndicator(indicator: string): string {
    // Remove common defanging patterns
    return indicator
      // Remove [.] -> .
      .replace(/\[\.\]/g, '.')
      // Remove [://] -> ://
      .replace(/\[\:\/\/\]/g, '://')
      // Remove [/] -> /
      .replace(/\[\/\]/g, '/')
      // Remove [@] -> @
      .replace(/\[@\]/g, '@')
      // Remove hXXp -> http
      .replace(/^hXXp/gi, 'http')
      // Remove hxxp -> http
      .replace(/^hxxp/gi, 'http')
      // Remove other bracket patterns
      .replace(/\[([^\]]+)\]/g, '$1')
      .trim();
  }

  /**
   * Validate filename IOCs - require context indicating actual hash association
   */
  private isValidFilenameIOC(value: string): boolean {
    // Reject obvious sentence fragments and grammatical constructs
    if (this.isSentenceFragment(value)) {
      return false;
    }

    // Don't treat obvious domains as filenames
    const parts = value.split('.');
    if (parts.length === 2) {
      const tld = parts[1].toLowerCase();
      if (['com', 'org', 'net', 'edu', 'gov', 'mil'].includes(tld)) {
        return false;
      }
    }

    // Basic format validation
    if (!value || value.length < 4 || value.length > 255 || !value.includes('.')) {
      return false;
    }

    // Must be exactly 2 parts (filename.extension) for basic validation
    if (parts.length !== 2) {
      return false;
    }

    const filename = parts[0];
    const extension = parts[1].toLowerCase();

    // Filename part must be proper format (no sentence fragments)
    if (!this.isValidFilename(filename)) {
      return false;
    }

    // Require minimum length and specific extensions for threat relevance
    const threatRelevantExtensions = [
      'exe', 'dll', 'bat', 'cmd', 'ps1', 'vbs', 'js', 'jar', 'scr', 'pif', 'msi',
      'zip', 'rar', '7z', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'
    ];

    // Must have a threat-relevant extension
    if (!threatRelevantExtensions.includes(extension)) {
      return false;
    }

    // For executables, be more strict - they should look like real malware names
    if (['exe', 'dll', 'scr', 'pif', 'msi'].includes(extension)) {
      // Reject generic system filenames unless they're known to be abused
      const systemFilenames = ['system', 'windows', 'microsoft', 'update', 'service', 'driver'];
      if (systemFilenames.some(sys => filename.toLowerCase().includes(sys)) && filename.length < 20) {
        return false;
      }
      
      // Require minimum length for executable names to avoid false positives
      if (filename.length < 4) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if a string looks like a sentence fragment rather than a filename
   */
  private isSentenceFragment(value: string): boolean {
    const parts = value.split('.');
    if (parts.length !== 2) return false;
    
    const beforeDot = parts[0].toLowerCase();
    const afterDot = parts[1].toLowerCase();
    
    // Common sentence ending patterns that create false filename matches
    const sentenceEnders = [
      'attacks', 'months', 'years', 'days', 'weeks', 'hours', 'minutes', 'seconds',
      'else', 'also', 'then', 'thus', 'hence', 'therefore', 'however', 'moreover',
      'appeal', 'site', 'page', 'link', 'attack', 'threat', 'issue', 'problem',
      'solution', 'method', 'process', 'system', 'service', 'application', 'tool',
      'malware', 'virus', 'trojan', 'backdoor', 'payload', 'exploit'
    ];
    
    const sentenceStarters = [
      'what', 'when', 'where', 'why', 'how', 'who', 'which', 'that', 'this',
      'the', 'a', 'an', 'and', 'or', 'but', 'so', 'if', 'then', 'else',
      'once', 'after', 'before', 'during', 'while', 'since', 'until',
      'here', 'there', 'now', 'then', 'today', 'tomorrow', 'yesterday',
      'fig', 'figure', 'image', 'table', 'chart', 'graph', 'diagram'
    ];
    
    // Check if this looks like a sentence fragment
    if (sentenceEnders.includes(beforeDot) && sentenceStarters.includes(afterDot)) {
      return true;
    }
    
    // Check for common English words that shouldn't be filenames
    const commonWords = [
      'attacks', 'months', 'else', 'appeal', 'site', 'here', 'there', 'what',
      'when', 'where', 'how', 'fig', 'figure', 'table', 'once', 'after'
    ];
    
    if (commonWords.includes(beforeDot)) {
      return true;
    }
    
    return false;
  }

  /**
   * Validate that a filename part looks like an actual filename
   */
  private isValidFilename(filename: string): boolean {
    // Must be reasonable length
    if (filename.length < 2 || filename.length > 64) {
      return false;
    }
    
    // Must contain only valid filename characters (letters, numbers, underscore, hyphen)
    if (!/^[a-zA-Z0-9_\-]+$/.test(filename)) {
      return false;
    }
    
    // Should start with a letter or number (not special character)
    if (!/^[a-zA-Z0-9]/.test(filename)) {
      return false;
    }
    
    // Reject obvious English words that appear in sentences
    const englishWords = [
      'attacks', 'months', 'years', 'days', 'weeks', 'hours', 'else', 'also',
      'then', 'thus', 'hence', 'however', 'appeal', 'site', 'page', 'link',
      'here', 'there', 'what', 'when', 'where', 'why', 'how', 'which',
      'once', 'after', 'before', 'during', 'while', 'since', 'until'
    ];
    
    if (englishWords.includes(filename.toLowerCase())) {
      return false;
    }
    
    return true;
  }

  /**
   * Check if filename has context suggesting it's a real threat IOC
   */
  private hasFileIOCContext(filename: string, context: string): boolean {
    // Look for threat-relevant context keywords around the filename
    const threatKeywords = [
      // Hash-related keywords
      'hash', 'md5', 'sha1', 'sha256', 'sha512', 'checksum', 'digest',
      // Threat-related keywords  
      'malware', 'trojan', 'backdoor', 'virus', 'ransomware', 'payload',
      'dropper', 'loader', 'downloader', 'rat', 'bot', 'implant',
      // Analysis-related keywords
      'sample', 'specimen', 'artifact', 'binary', 'executable', 'file',
      'detected', 'identified', 'observed', 'found', 'discovered',
      // IOC-specific keywords
      'ioc', 'indicator', 'compromise', 'threat', 'suspicious', 'malicious'
    ];

    const contextLower = context.toLowerCase();
    
    // Check if any threat keywords appear near the filename
    const hasContext = threatKeywords.some(keyword => contextLower.includes(keyword));
    
    // Also check if there's a hash nearby (within 200 chars)
    const hashPatterns = [
      /[a-fA-F0-9]{32}/, // MD5
      /[a-fA-F0-9]{40}/, // SHA1
      /[a-fA-F0-9]{64}/, // SHA256
      /[a-fA-F0-9]{128}/ // SHA512
    ];
    
    const hasNearbyHash = hashPatterns.some(pattern => pattern.test(context));
    
    return hasContext || hasNearbyHash;
  }
}