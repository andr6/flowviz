export const DIRECT_FLOW_PROMPT = `You are an expert in cyber threat intelligence and MITRE ATT&CK. Analyze this article and create React Flow nodes and edges directly, while also extracting comprehensive IOCs (Indicators of Compromise) and IOAs (Indicators of Attack).

IMPORTANT: Return only a valid JSON object with "nodes", "edges", and "ioc_analysis" objects. No text before or after.

CRITICAL ORDERING FOR STREAMING VISUALIZATION:
1. Order ALL nodes strictly chronologically based on the attack timeline
2. In the "edges" array, place each edge IMMEDIATELY after its corresponding source node appears in the "nodes" array
3. Group by attack stages in order: Initial Access → Execution → Persistence → Privilege Escalation → Defense Evasion → Credential Access → Discovery → Lateral Movement → Collection → Exfiltration → Command & Control → Impact
4. This creates a narrative flow where connections appear as the story unfolds
5. IMPORTANT: The order of items in BOTH arrays matters for real-time streaming

Extract from the ENTIRE article including main text, IOC sections, detection/prevention recommendations, and technical appendices. Be thorough - extract ALL techniques mentioned or implied.

OUTPUT FORMAT: Create React Flow nodes and edges using ONLY these official AFB node types:
- **action**: MITRE ATT&CK techniques (T1078, T1190, etc.)
- **tool**: Legitimate software used in attacks (net.exe, powershell.exe, etc.)
- **malware**: Malicious software (webshells, backdoors, trojans, etc.)  
- **asset**: Target systems and resources (servers, workstations, databases, etc.)
- **infrastructure**: Adversary-controlled resources (C2 servers, domains, IP addresses)
- **url**: Web resources and links (malicious URLs, download links)
- **vulnerability**: Only CVE-identified vulnerabilities (CVE-YYYY-NNNN format)
- **AND_operator**: Logic gates requiring ALL conditions
- **OR_operator**: Logic gates where ANY condition can be met

STRICT EXTRACTION RULES - NO SPECULATION OR INFERENCE:
- ONLY extract information explicitly stated in the source text
- Command-line executions → tool nodes ONLY if exact commands are quoted in the article
- Malicious files/scripts → malware nodes ONLY if specific file names/hashes are mentioned
- IP addresses and domains → infrastructure nodes ONLY if explicitly listed
- Target computers/networks → asset nodes ONLY if specifically named in the text
- Web links → url nodes ONLY if actual URLs are provided
- Only CVEs → vulnerability nodes ONLY if CVE numbers are explicitly mentioned
- DO NOT infer, assume, or generate plausible technical details not in the source
- DO NOT create example commands or typical attack patterns
- If technical details are vague, keep descriptions general
- CRITICAL: For command_line fields, ONLY include commands explicitly quoted in the article
- CRITICAL: Each source_excerpt must be 2-3 complete sentences directly copied from the source text
- Source excerpts are used to validate extraction accuracy - they must prove the node exists in the source

EDGE TYPES (Create connections that show attack progression):
- action → tool/malware: "Uses"
- action → asset: "Targets"  
- action → infrastructure: "Communicates with"
- action → url: "Connects to"
- vulnerability → asset: "Affects"
- action → action: "Leads to" (IMPORTANT: Connect actions in chronological sequence)

NARRATIVE FLOW INSTRUCTIONS:
1. Start with Initial Access techniques (TA0001)
2. Progress through Execution → Persistence → Privilege Escalation → etc.
3. Connect each action to the next logical step in the attack timeline
4. Use "Leads to" edges to show attack progression between techniques
5. Order nodes so the attack story unfolds from top to bottom

IOC/IOA EXTRACTION REQUIREMENTS:
Extract ALL indicators of compromise (IOCs) and indicators of attack (IOAs) from the ENTIRE article, including:

REQUIRED IOC CATEGORIES TO EXTRACT (BE EXTREMELY THOROUGH):
- **Network IOCs**: IP addresses (IPv4/IPv6), domain names (VALIDATED against IANA TLD registry), URLs, email addresses, ASN numbers, user-agent strings, MAC addresses, ports, protocols
  * DOMAIN VALIDATION REQUIREMENTS:
    - ONLY extract domains with legitimate TLDs from IANA registry (300+ valid TLDs including .com, .org, .net, all country codes, new gTLDs)
    - REJECT sentence fragments like "payload.In", "attack.At", "impact.As", "months.Ago", "effect.On", "system.As"
    - REJECT common English words with periods that appear in text flow
    - VALIDATE domain structure: must have proper subdomain + valid TLD format
    - CONFIRM the extracted domain is actually a network indicator, not grammatical text
    - STRICT SENTENCE FRAGMENT REJECTION: Before extracting any domain, verify it's not:
      * A word followed by period and capitalized word (sentence structure)
      * Common English words like: attacks, months, files, appears, seems, continues, works, shows, finds, else, etc.
      * Grammatical constructs where period separates sentence elements
      * Text that flows naturally as part of a sentence rather than a network identifier
    - CONTEXT VALIDATION: The "domain" must be mentioned in a network/technical context, not as part of natural language flow
- **File IOCs**: 
  * ALL HASH TYPES: MD5 (32 chars), SHA1 (40 chars), SHA256 (64 chars), SHA512 (128 chars), SSDEEP, IMPHASH, PEHASH
  * File identifiers: filenames, file paths, file extensions, file sizes, compilation timestamps
  * Mutexes, services, named pipes, scheduled tasks
- **Registry IOCs**: Registry keys, registry values, registry modifications, RunKeys, startup entries
- **Process IOCs**: Process names, command lines, process IDs, service names, DLL names, injection techniques
- **Certificate IOCs**: Certificate serials, thumbprints, certificate authorities, certificate subjects, certificate issuers
- **Vulnerability IOCs**: CVE numbers, vulnerability descriptions, exploit details, patch levels, affected software versions
- **Cryptocurrency**: Bitcoin addresses, Ethereum addresses, Monero addresses, other cryptocurrency wallets
- **Authentication IOCs**: Usernames, passwords (if mentioned), API keys, tokens, certificates
- **Cloud IOCs**: AWS/Azure/GCP resources, S3 buckets, container images, cloud instances
- **Custom IOCs**: YARA rules, Sigma rules, custom signatures, IOCs in code/scripts

REQUIRED IOA CATEGORIES TO EXTRACT:
- **Initial Access**: Techniques for gaining initial foothold (T1078, T1190, etc.)
- **Execution**: Code execution methods (T1059, T1203, etc.)
- **Persistence**: Maintaining access (T1053, T1547, etc.)
- **Privilege Escalation**: Gaining higher privileges (T1055, T1068, etc.)
- **Defense Evasion**: Avoiding detection (T1027, T1070, etc.)
- **Credential Access**: Credential harvesting (T1003, T1555, etc.)
- **Discovery**: System/network reconnaissance (T1082, T1018, etc.)
- **Lateral Movement**: Moving through network (T1021, T1076, etc.)
- **Collection**: Data gathering (T1005, T1039, etc.)
- **Command & Control**: Communication methods (T1071, T1090, etc.)
- **Exfiltration**: Data theft methods (T1041, T1048, etc.)
- **Impact**: Destructive actions (T1485, T1486, etc.)

IOC/IOA EXTRACTION INSTRUCTIONS (MANDATORY - BE EXTREMELY AGGRESSIVE):
1. **COMPREHENSIVE SCANNING**: Examine EVERY SINGLE WORD of the article - headers, body, IOC sections, appendices, footnotes, technical details, code blocks, command outputs, logs
2. **MULTI-PASS ANALYSIS**: 
   - Pass 1: Look for obvious IOCs (explicit hashes, IPs, domains)
   - Pass 2: Look for obfuscated/defanged IOCs (brackets, dots replaced)
   - Pass 3: Look for IOCs in command lines, file paths, log entries
   - Pass 4: Look for IOCs mentioned in behavioral descriptions
3. **HASH DETECTION PRIORITY**: File hashes are CRITICAL - scan aggressively for:
   - Any 32-char hex string = potential MD5
   - Any 40-char hex string = potential SHA1 (MOST IMPORTANT)
   - Any 64-char hex string = potential SHA256
   - Any 128-char hex string = potential SHA512
   - Look for hash prefixes: "MD5:", "SHA1:", "SHA-1:", "hash:", "Hash:", "checksum:"
4. **IMAGE ANALYSIS**: If images/screenshots are present, extract ANY visible IOCs from text in images
5. **CONTEXT VALIDATION**: For each IOC/IOA, capture 2-3 sentences of surrounding context
6. **CONFIDENCE ASSESSMENT**: 
   - HIGH: Explicitly stated with clear context ("The malware file had SHA1 hash abc123...")
   - MEDIUM: Defanged or partially obscured ("hash was abc[removed]123")
   - LOW: Inferred from general description or pattern matching
7. **MALICIOUSNESS ASSESSMENT**: Mark as malicious if associated with threats, suspicious if unclear
8. **AGGRESSIVE EXTRACTION**: When in doubt, EXTRACT IT - false positives are better than missed IOCs (EXCEPT for domains - be EXTREMELY strict on domain validation)
   **CRITICAL DOMAIN EXCEPTION**: For domains ONLY, be conservative and strict. NEVER extract sentence fragments. Better to miss a domain than extract grammatical text.
9. **VALIDATION**: Ensure proper formats but don't discard edge cases
10. **CRITICAL DOMAIN VALIDATION**: For ALL domain extractions, validate against IANA TLD registry:
    - Valid gTLDs: com, org, net, edu, gov, mil, int, biz, info, name, pro, app, dev, tech, online, website, etc.
    - Valid ccTLDs: All 2-letter country codes (us, uk, de, fr, etc.) EXCEPT problematic ones in sentence context
    - REJECT: Words followed by periods that are part of sentence structure
    - CONTEXT CHECK: Ensure the "domain" is actually referenced as a network resource, not grammatical text
11. **EXAMPLES TO FIND**:
    - "SHA1: a1b2c3d4e5f6..." → type: "sha1", value: "a1b2c3d4e5f6..."
    - "The file hash a1b2c3d4e5f6... was detected" → type: "sha1", value: "a1b2c3d4e5f6..."
    - "contacted 192.168.1[.]1" → type: "ipv4", value: "192.168.1.1"
    - "evil[.]com domain" → type: "domain", value: "evil.com"
    - "c2-server.net was used" → type: "domain", value: "c2-server.net"
    - "facebook[.]windows-software-downloads[.]com" → type: "domain", value: "facebook.windows-software-downloads.com"
    - "77[.]90[.]153[.]225" → type: "ipv4", value: "77.90.153.225"
    - "bitbucket[.]org/user/repo/" → type: "url", value: "bitbucket.org/user/repo/"
    
12. **EXAMPLES TO REJECT (NOT VALID DOMAINS)**:
    - "payload.In this blog..." → REJECT (sentence fragment)
    - "attack.At first glance..." → REJECT (sentence fragment)
    - "impact.As we continue..." → REJECT (sentence fragment)
    - "months.Ago the campaign..." → REJECT (sentence fragment)
    - "system.As shown in..." → REJECT (sentence fragment)
    - "attacks.What we found..." → REJECT (sentence fragment)
    - "months.The campaign..." → REJECT (sentence fragment)
    - "else.Fig 1 shows..." → REJECT (sentence fragment)
    - "files.In the directory..." → REJECT (sentence fragment)
    - "appears.To be malicious..." → REJECT (sentence fragment)
    - "seems.To indicate..." → REJECT (sentence fragment)
    - "continues.The attack..." → REJECT (sentence fragment)
    - "works.As expected..." → REJECT (sentence fragment)
    - "shows.The results..." → REJECT (sentence fragment)
    - "finds.The evidence..." → REJECT (sentence fragment)

SPECIFIC EXTRACTION PATTERNS (CRITICAL - BE EXHAUSTIVE):
- **IP Addresses**: Extract ALL IPv4/IPv6, including defanged formats:
  * Standard: 192.168.1.1, 10.0.0.1
  * Defanged: 192.168.1[.]1 → normalize to 192.168.1.1
  * Defanged: 77[.]90[.]153[.]225 → normalize to 77.90.153.225
  * Include CIDR notation and private IPs
- **Domains**: Extract ALL legitimate domains/subdomains, defanged (evil[.]com → evil.com), TLD variations, IDN domains
  * CRITICAL: Use comprehensive TLD validation - ONLY extract domains with valid Top-Level Domains from IANA registry
  * EXCLUDE false positives like: "payload.In", "attack.At", "impact.As", "appeal.To", "months.Ago", "effect.On"
  * Valid TLDs include: .com, .org, .net, .edu, .gov, .mil, .int, plus 300+ country codes and gTLDs
  * REJECT domains that are clearly sentence fragments or common English words with periods
  * Examples of INVALID domains to reject: "delivery.In", "system.As", "process.At", "service.To", "data.On", "attacks.What", "months.The", "else.Fig", "files.In", "appears.To", "seems.To", "continues.The", "works.As", "shows.The", "finds.The"
  * CRITICAL SENTENCE PATTERN REJECTION: Reject ANY text matching these patterns:
    - [word].[Capitalized_word] where the first word is common English (attacks, months, files, appears, seems, continues, works, shows, finds, else, etc.)
    - Any period followed by articles (The, A, An), pronouns (It, They, We, You), or common sentence starters
    - Text that reads naturally as sentence flow rather than network identifiers
  * Examples of VALID domains to extract: "malware.com", "c2-server.net", "evil-domain.org", "threat.co.uk", "suspicious-site.info"
- **File Hashes**: Extract ALL hash formats:
  * MD5: 32 hexadecimal characters (a-f0-9)
  * SHA1: 40 hexadecimal characters (most common file hash)
  * SHA256: 64 hexadecimal characters
  * SHA512: 128 hexadecimal characters
  * SSDEEP: fuzzy hashes with format like "192:+f9u6/M8Aw==:+f9u6/M8Aw=="
  * IMPHASH: PE import table hashes
  * Look for patterns like "SHA1:", "MD5:", "hash:", or standalone hex strings
- **File Indicators**: Extract ALL filenames, paths, extensions, including:
  * Windows paths (C:\Windows\...), Linux paths (/etc/...), obfuscated paths
  * Executable names (.exe, .dll, .bat, .ps1, .sh, .jar, .zip)
  * Temporary files, log files, configuration files
- **Network Indicators**: Extract ALL URLs, including:
  * HTTP/HTTPS URLs, FTP URLs, file:// URLs
  * Base64 encoded URLs, URL-shortened links
  * WebDAV shares, SMB shares (\\server\share)
- **Process Indicators**: Extract ALL command lines, process names, service names:
  * PowerShell commands, CMD commands, bash commands
  * Encoded/obfuscated commands (base64, hex, URL encoding)
  * Service names, scheduled task names, registry run keys
- **Registry Keys**: Extract ALL registry modifications:
  * HKLM, HKCU, HKCR registry paths
  * Startup locations, service entries, shell extensions
- **Certificates**: Extract certificate thumbprints, serial numbers, issuer information
- **CVEs**: Extract ALL vulnerability references (CVE-YYYY-NNNN format)
- **Cryptocurrency**: Extract wallet addresses for Bitcoin, Ethereum, Monero, etc.
- **Email Addresses**: Extract ALL email addresses, including those in headers, from/to fields
- **User Agents**: Extract browser/tool user agent strings
- **API Keys/Tokens**: Extract any mentioned API keys, access tokens, secrets

CRITICAL JSON FORMAT - Follow this EXACT structure:
{
  "nodes": [
    ONLY NODE OBJECTS HERE - NO EDGE OBJECTS IN THIS ARRAY
    {
      "id": "action-1",
      "type": "action",
      "data": {
        "type": "action",
        "name": "Valid Accounts",
        "description": "How this technique was used in this specific attack",
        "technique_id": "T1078",
        "tactic_id": "TA0001",
        "tactic_name": "Initial Access",
        "source_excerpt": "2-3 complete sentences directly quoted from the source article that support this technique. Include surrounding context to validate the extraction.",
        "confidence": "high"
      }
    },
    {
      "id": "tool-1", 
      "type": "tool",
      "data": {
        "type": "tool",
        "name": "Net.exe",
        "description": "Used to enumerate domain users", 
        "command_line": "net user /domain",
        "source_excerpt": "2-3 complete sentences from the source that mention this specific command or tool usage",
        "confidence": "high"
      }
    },
    {
      "id": "asset-1",
      "type": "asset",
      "data": {
        "type": "asset",
        "name": "Domain Controller",
        "description": "Target system compromised",
        "role": "Server",
        "source_excerpt": "2-3 complete sentences from the source describing this asset or target system",
        "confidence": "high"
      }
    }
  ],
  "edges": [
    ONLY EDGE OBJECTS HERE - NO NODE OBJECTS IN THIS ARRAY
    {
      "id": "edge-1",
      "source": "action-1", 
      "target": "tool-1",
      "type": "floating",
      "label": "Uses"
    },
    {
      "id": "edge-2",
      "source": "action-1",
      "target": "asset-1", 
      "type": "floating",
      "label": "Targets"
    }
  ],
  "ioc_analysis": {
    "indicators": [
      {
        "type": "ipv4|ipv6|domain|url|email|md5|sha1|sha256|sha512|ssdeep|imphash|filename|filepath|registry-key|registry-value|process-name|command-line|pid|mutex|service|user-agent|asn|certificate-serial|certificate-thumbprint|yara-rule|cve|vulnerability|bitcoin-address|monero-address|custom",
        "value": "actual IOC value extracted from text/images (normalize: remove brackets, clean formatting)",
        "confidence": "high|medium|low",
        "source_location": "specific paragraph/section/line where found",
        "context": "surrounding text that validates this IOC (2-3 sentences)",
        "malicious": true|false|null,
        "description": "Brief description of what this IOC represents and its role in the attack",
        "tags": ["hash", "file", "network", "malware", "c2", "persistence", "execution", "etc"]
      }
    ],
    "behaviors": [
      {
        "name": "Credential Dumping Behavior",
        "category": "credential-access",
        "description": "Pattern indicating credential harvesting activities",
        "confidence": "high|medium|low",
        "source_location": "where this behavior was described",
        "context": "supporting evidence from the text",
        "mitre_attack_id": "T1003",
        "mitre_tactic": "Credential Access",
        "mitre_technique": "OS Credential Dumping",
        "severity": "critical|high|medium|low|info",
        "related_iocs": ["list of related IOC indices"],
        "signatures": [
          {
            "type": "regex|behavioral|network|file|process",
            "pattern": "specific pattern or signature",
            "description": "what this signature detects",
            "confidence": 0.85
          }
        ]
      }
    ],
    "summary": {
      "total_iocs": 0,
      "total_ioas": 0,
      "iocs_by_type": {
        "ipv4": 0, "ipv6": 0, "domain": 0, "url": 0, "email": 0,
        "md5": 0, "sha1": 0, "sha256": 0, "sha512": 0, "ssdeep": 0,
        "filename": 0, "filepath": 0, "registry-key": 0, "registry-value": 0,
        "process-name": 0, "command-line": 0, "pid": 0, "mutex": 0, "service": 0,
        "user-agent": 0, "asn": 0, "certificate-serial": 0, "certificate-thumbprint": 0,
        "yara-rule": 0, "cve": 0, "vulnerability": 0,
        "bitcoin-address": 0, "monero-address": 0, "custom": 0
      },
      "ioas_by_category": {
        "initial-access": 0, "execution": 0, "persistence": 0, "privilege-escalation": 0,
        "defense-evasion": 0, "credential-access": 0, "discovery": 0, "lateral-movement": 0,
        "collection": 0, "command-and-control": 0, "exfiltration": 0, "impact": 0
      },
      "confidence_distribution": {
        "high": 0, "medium": 0, "low": 0
      },
      "malicious_vs_suspicious": {
        "confirmed_malicious": 0,
        "likely_malicious": 0,
        "suspicious": 0,
        "benign": 0,
        "unknown": 0
      },
      "hash_breakdown": {
        "total_hashes": 0,
        "md5_count": 0,
        "sha1_count": 0,
        "sha256_count": 0,
        "sha512_count": 0,
        "other_hashes": 0
      }
    },
    "extraction_metadata": {
      "sources_analyzed": ["article_text", "headers", "technical_appendices", "ioc_sections", "code_blocks", "command_outputs", "log_entries", "images", "screenshots"],
      "extraction_patterns_used": [
        "ip_addresses", "domains", "urls", "emails", 
        "md5_hashes", "sha1_hashes", "sha256_hashes", "sha512_hashes", "ssdeep_hashes",
        "file_paths", "filenames", "registry_keys", "registry_values",
        "command_lines", "process_names", "service_names", "mutexes",
        "certificates", "cve_numbers", "cryptocurrency_addresses",
        "user_agents", "api_keys", "defanged_indicators"
      ],
      "confidence_factors": [
        "explicit_mention_with_labels", "context_clues", "format_validation",
        "defanged_indicator_patterns", "hash_length_validation", "domain_validation",
        "ip_format_validation", "threat_intelligence_correlation"
      ],
      "validation_notes": "Comprehensive multi-pass extraction with aggressive pattern matching. Prioritized file hashes (especially SHA1) and network indicators. Normalized defanged IOCs.",
      "extraction_coverage": {
        "text_analysis_complete": true,
        "hash_detection_complete": true,
        "network_indicator_extraction_complete": true,
        "file_indicator_extraction_complete": true,
        "registry_analysis_complete": true,
        "process_analysis_complete": true
      }
    }
  }
}

Article text:
`;

export function createDirectFlowContinuationPrompt(chunkIndex: number, totalChunks: number): string {
  return `Continue analyzing the article for attack techniques. This is part ${chunkIndex + 1} of ${totalChunks}.
      
IMPORTANT: Return additional nodes and edges in the same JSON format. 
Increment node IDs from where the previous chunk left off (e.g., if last was "action-5", start with "action-6").

Article text (continuation):
`;
}