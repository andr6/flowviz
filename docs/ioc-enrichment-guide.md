# IOC Enrichment System Guide

ThreatFlow's IOC (Indicator of Compromise) enrichment system provides comprehensive threat intelligence gathering from multiple providers, automated analysis, and actionable intelligence for security teams.

## Features Overview

### 🔍 Multi-Provider Intelligence
- **12+ Threat Intelligence Sources** - VirusTotal, Shodan, AbuseIPDB, URLVoid, GreyNoise, Censys, PassiveTotal, and more
- **Automated Provider Selection** - Intelligent provider routing based on IOC type and priority
- **Parallel Processing** - Concurrent enrichment across multiple providers with rate limiting
- **Smart Caching** - Configurable TTL-based caching to optimize API usage

### 🎯 IOC Classification & Scoring
- **Multi-Algorithm Scoring** - Weighted scoring from multiple intelligence sources
- **Threat Level Classification** - Automatic classification as benign, suspicious, malicious, or critical
- **Confidence Indicators** - Evidence-based confidence scoring (low, medium, high, verified)
- **Risk Assessment** - Business impact analysis and mitigation recommendations

### 🔄 Enrichment Pipeline
- **Batch Processing** - Bulk enrichment of up to 100 IOCs simultaneously
- **Real-time Updates** - Live progress tracking and streaming results
- **Error Handling** - Robust retry logic with exponential backoff
- **Job Management** - Queue management with priority scheduling

### 🤖 Automated Workflows
- **Rule Engine** - Configurable enrichment rules and automated actions
- **Picus Integration** - Threat validation and security control testing
- **Threat Context** - Campaign attribution and MITRE ATT&CK mapping
- **Relationship Analysis** - IOC correlation and threat actor attribution

## Quick Start

### 1. Basic IOC Enrichment (API)

```bash
# Enrich a single IOC
curl -X POST http://localhost:3001/api/ioc-enrichment/enrich \
  -H "Content-Type: application/json" \
  -d '{
    "value": "192.168.1.100",
    "type": "ip_address",
    "providers": ["virustotal", "shodan", "abuseipdb"],
    "confidence": "medium",
    "tags": ["investigation", "suspicious"]
  }'
```

### 2. Bulk IOC Enrichment

```bash
# Enrich multiple IOCs
curl -X POST http://localhost:3001/api/ioc-enrichment/bulk-enrich \
  -H "Content-Type: application/json" \
  -d '{
    "iocs": [
      {
        "value": "malware.example.com",
        "type": "domain"
      },
      {
        "value": "1.2.3.4",
        "type": "ip_address"
      },
      {
        "value": "http://phishing.example.com/login",
        "type": "url"
      }
    ],
    "providers": ["virustotal", "urlvoid", "greynoise"],
    "maxConcurrency": 3,
    "forceRefresh": false
  }'
```

### 3. Using the Dashboard (React Component)

```typescript
import { IOCEnrichmentDashboard } from '@/features/ioc-enrichment';

function SecurityDashboard() {
  const handleIOCEnriched = (ioc, results) => {
    console.log('IOC enriched:', ioc.value, results.length, 'providers');
  };

  const handleJobCompleted = (job) => {
    console.log('Enrichment job completed:', job.id);
  };

  return (
    <IOCEnrichmentDashboard
      onIOCEnriched={handleIOCEnriched}
      onJobCompleted={handleJobCompleted}
    />
  );
}
```

### 4. Programmatic Service Usage

```typescript
import { multiProviderEnrichmentService } from '@/features/ioc-enrichment';

// Create IOC object
const ioc = {
  id: 'ioc-1',
  value: '192.168.1.100',
  type: 'ip_address',
  firstSeen: new Date(),
  lastSeen: new Date(),
  source: 'manual',
  confidence: 'medium',
  tags: ['investigation'],
  metadata: {},
};

// Enrich with specific providers
const results = await multiProviderEnrichmentService.enrichIOC(ioc, {
  providers: ['virustotal', 'shodan', 'abuseipdb'],
  forceRefresh: true,
  maxConcurrency: 3,
});

console.log('Enrichment results:', results);
```

## Supported IOC Types

| Type | Description | Supported Providers |
|------|-------------|-------------------|
| `ip_address` | IPv4/IPv6 addresses | VirusTotal, Shodan, AbuseIPDB, GreyNoise, Censys, PassiveTotal |
| `domain` | Domain names | VirusTotal, URLVoid, PassiveTotal |
| `url` | URLs and URIs | VirusTotal, URLVoid |
| `file_hash` | MD5, SHA1, SHA256 hashes | VirusTotal, Hybrid Analysis, MalwareBazaar |
| `email` | Email addresses | VirusTotal |
| `cve` | CVE identifiers | MISP, OTX |
| `registry_key` | Windows registry keys | VirusTotal |
| `file_path` | File paths | VirusTotal |
| `user_agent` | User agent strings | VirusTotal |
| `certificate` | SSL certificates | VirusTotal, Censys |
| `mutex` | Mutex names | VirusTotal |
| `process_name` | Process names | VirusTotal |
| `yara_rule` | YARA rule names | VirusTotal |

## Provider Configuration

### Environment Variables

```bash
# VirusTotal
VIRUSTOTAL_API_KEY=your_api_key_here

# Shodan
SHODAN_API_KEY=your_api_key_here

# AbuseIPDB
ABUSEIPDB_API_KEY=your_api_key_here

# URLVoid
URLVOID_API_KEY=your_api_key_here

# GreyNoise
GREYNOISE_API_KEY=your_api_key_here

# Censys
CENSYS_API_ID=your_api_id_here
CENSYS_API_SECRET=your_api_secret_here

# PassiveTotal (RiskIQ)
PASSIVETOTAL_API_KEY=your_api_key_here
```

### Provider Details

#### VirusTotal
- **Rate Limit**: 4 requests/minute (free), 1000 requests/day
- **Supported Types**: IP addresses, domains, URLs, file hashes
- **Features**: Malware detection, URL scanning, IP reputation
- **Priority**: 9 (highest)

#### Shodan
- **Rate Limit**: 10 requests/minute
- **Supported Types**: IP addresses
- **Features**: Service discovery, vulnerability scanning, geolocation
- **Priority**: 8

#### AbuseIPDB
- **Rate Limit**: 1000 requests/minute, 3000 requests/day
- **Supported Types**: IP addresses
- **Features**: IP abuse reports, confidence scoring, ISP information
- **Priority**: 7

#### URLVoid
- **Rate Limit**: 10 requests/minute, 1000 requests/day
- **Supported Types**: Domains, URLs
- **Features**: Website reputation, blacklist checking
- **Priority**: 6

#### GreyNoise
- **Rate Limit**: 50 requests/minute, 10000 requests/day
- **Supported Types**: IP addresses
- **Features**: Internet noise classification, benign traffic identification
- **Priority**: 5

## API Endpoints Reference

### POST /api/ioc-enrichment/enrich
Enrich a single IOC with threat intelligence.

**Request Body:**
```json
{
  "value": "192.168.1.100",
  "type": "ip_address",
  "confidence": "medium",
  "tags": ["investigation"],
  "providers": ["virustotal", "shodan"],
  "forceRefresh": false,
  "maxConcurrency": 3,
  "includeRelationships": true,
  "includeTimeline": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "ioc": {
      "id": "ioc-123",
      "value": "192.168.1.100",
      "type": "ip_address",
      "confidence": "medium"
    },
    "results": [
      {
        "iocId": "ioc-123",
        "provider": "virustotal",
        "timestamp": "2024-01-15T10:30:00Z",
        "success": true,
        "data": {
          "threatLevel": "suspicious",
          "confidence": "medium",
          "score": 65,
          "reputation": {
            "malicious": 12,
            "suspicious": 8,
            "harmless": 45,
            "undetected": 15
          },
          "attributes": {
            "country": "US",
            "asn": "AS15169",
            "lastAnalysisDate": "2024-01-15T10:29:00Z"
          },
          "detections": [
            {
              "engine": "Kaspersky",
              "category": "malware",
              "result": "Trojan.Generic"
            }
          ]
        }
      }
    ],
    "enrichmentCount": 2,
    "successfulEnrichments": 2
  }
}
```

### POST /api/ioc-enrichment/bulk-enrich
Start bulk enrichment job for multiple IOCs.

**Request Body:**
```json
{
  "iocs": [
    {
      "value": "malware.example.com",
      "type": "domain"
    },
    {
      "value": "1.2.3.4",
      "type": "ip_address"
    }
  ],
  "providers": ["virustotal", "urlvoid"],
  "maxConcurrency": 2,
  "forceRefresh": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "jobId": "mp-enrichment-1642248600000-abc123def",
    "iocsCount": 2,
    "providers": ["virustotal", "urlvoid"],
    "estimatedCompletionTime": "2 minutes"
  }
}
```

### GET /api/ioc-enrichment/job/:jobId
Get job status and results.

**Response:**
```json
{
  "success": true,
  "data": {
    "job": {
      "id": "mp-enrichment-1642248600000-abc123def",
      "status": "running",
      "progress": {
        "total": 4,
        "completed": 2,
        "failed": 0,
        "skipped": 0
      },
      "results": [...],
      "errors": [],
      "createdAt": "2024-01-15T10:30:00Z",
      "startedAt": "2024-01-15T10:30:05Z"
    },
    "progressPercentage": 50
  }
}
```

### GET /api/ioc-enrichment/stats
Get service statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "multiProvider": {
      "cacheSize": 1250,
      "activeJobs": 3,
      "completedJobs": 127
    },
    "enabledProviders": [
      "virustotal",
      "shodan",
      "abuseipdb",
      "urlvoid",
      "greynoise"
    ],
    "cacheEnabled": true,
    "cacheTtl": 3600
  }
}
```

### GET /api/ioc-enrichment/providers
Get available providers and their status.

**Response:**
```json
{
  "success": true,
  "data": {
    "providers": [
      {
        "name": "virustotal",
        "enabled": true,
        "supportedTypes": ["ip_address", "domain", "url", "file_hash"],
        "priority": 9,
        "rateLimits": {
          "requestsPerMinute": 4,
          "requestsPerDay": 1000
        }
      }
    ],
    "picusConnected": true,
    "totalProviders": 7,
    "enabledProviders": 5
  }
}
```

## Picus Security Integration

### POST /api/ioc-enrichment/enrich-with-picus
Use the existing Picus-integrated enrichment service.

**Request Body:**
```json
{
  "indicators": [
    {
      "type": "ip-addr",
      "value": "1.2.3.4",
      "context": "observed in network logs"
    }
  ],
  "sources": ["threat_intelligence", "picus_security"],
  "priority": "high",
  "organizationId": "org-123"
}
```

### POST /api/ioc-enrichment/create-picus-threat
Create Picus threat from IOCs for validation.

**Request Body:**
```json
{
  "name": "Suspicious IP Activity",
  "description": "Multiple suspicious IPs observed",
  "indicators": [
    {
      "type": "ip-addr",
      "value": "1.2.3.4"
    }
  ],
  "mitreTechniques": ["T1071.001"],
  "severity": "high"
}
```

### POST /api/ioc-enrichment/create-validation-action
Create validation action for Picus testing.

**Request Body:**
```json
{
  "name": "Validate IP Blocking",
  "threatId": "threat-123",
  "targetAgents": ["agent-1", "agent-2"],
  "immediate": true
}
```

## Advanced Configuration

### Custom Provider Configuration

```typescript
import { multiProviderEnrichmentService } from '@/features/ioc-enrichment';

// Update configuration
multiProviderEnrichmentService.updateConfig({
  caching: {
    enabled: true,
    ttl: 7200, // 2 hours
    maxSize: 20000,
    cleanupInterval: 3600, // 1 hour
  },
  providers: {
    virustotal: {
      enabled: true,
      priority: 10,
      timeout: 45000, // 45 seconds
      retries: 5,
    },
  },
  rateLimiting: {
    virustotal: {
      requestsPerMinute: 4,
      requestsPerDay: 1000,
      backoffMultiplier: 2,
    },
  },
  scoring: {
    weights: {
      reputation: 0.5,
      detections: 0.3,
      relationships: 0.1,
      timeline: 0.05,
      sandbox: 0.05,
    },
    thresholds: {
      suspicious: 35,
      malicious: 65,
      critical: 85,
    },
  },
});
```

### Event Handling

```typescript
import { multiProviderEnrichmentService } from '@/features/ioc-enrichment';

// Listen for enrichment events
multiProviderEnrichmentService.on('iocEnriched', ({ ioc, results }) => {
  console.log(`IOC ${ioc.value} enriched with ${results.length} results`);
});

multiProviderEnrichmentService.on('jobCompleted', (job) => {
  console.log(`Job ${job.id} completed: ${job.progress.completed}/${job.progress.total}`);
});

multiProviderEnrichmentService.on('providerError', ({ ioc, provider, error }) => {
  console.log(`Provider ${provider} failed for IOC ${ioc.value}:`, error);
});

multiProviderEnrichmentService.on('jobProgress', ({ jobId, progress, percentage }) => {
  console.log(`Job ${jobId} progress: ${percentage}%`);
});
```

## Threat Intelligence Analysis

### Scoring Algorithm

The system uses a weighted scoring approach:

1. **Reputation Score (40%)**: Based on provider verdicts and detection ratios
2. **Detection Score (30%)**: Number and quality of detections across engines
3. **Relationship Score (10%)**: Connections to known threats and campaigns
4. **Timeline Score (10%)**: Temporal analysis and activity patterns
5. **Sandbox Score (10%)**: Dynamic analysis results (when available)

### Threat Level Classification

- **Critical (90-100)**: Confirmed malicious with high confidence
- **Malicious (70-89)**: Likely malicious with medium-high confidence
- **Suspicious (40-69)**: Potentially malicious, requires investigation
- **Benign (1-39)**: Likely legitimate with low risk
- **Unknown (0)**: Insufficient data for classification

### Confidence Indicators

- **Verified**: Multiple high-confidence sources confirm threat
- **High**: Strong evidence from reputable sources
- **Medium**: Moderate evidence, some uncertainty
- **Low**: Limited evidence, high uncertainty

## Performance Optimization

### Batch Size Recommendations

```typescript
// For fast processing of many small IOCs
const results = await multiProviderEnrichmentService.enrichIOCsBulk(iocs, {
  maxConcurrency: 5,
  providers: ['greynoise', 'abuseipdb'], // Fast providers
});

// For thorough analysis with comprehensive providers
const results = await multiProviderEnrichmentService.enrichIOCsBulk(iocs, {
  maxConcurrency: 2,
  providers: ['virustotal', 'shodan', 'urlvoid'], // Comprehensive but slower
});
```

### Cache Optimization

```typescript
// Monitor cache performance
const stats = multiProviderEnrichmentService.getStats();
console.log('Cache hit ratio:', (stats.cacheHits / stats.totalRequests) * 100);

// Optimize cache settings
multiProviderEnrichmentService.updateConfig({
  caching: {
    enabled: true,
    ttl: 3600, // 1 hour for fast-changing threats
    maxSize: 15000, // Increased cache size
    cleanupInterval: 1800, // More frequent cleanup
  },
});
```

## Error Handling

### Retry Strategy

The system implements intelligent retry logic:

1. **Exponential Backoff**: Delay increases with each retry
2. **Retryable Errors**: Network timeouts, rate limits, server errors
3. **Non-Retryable Errors**: Invalid API keys, malformed requests
4. **Circuit Breaker**: Temporary provider suspension on repeated failures

### Error Types

```typescript
// Handle specific error types
multiProviderEnrichmentService.on('providerError', ({ provider, error }) => {
  if (error.includes('rate limit')) {
    console.log(`Rate limit hit for ${provider}, will retry automatically`);
  } else if (error.includes('unauthorized')) {
    console.log(`API key issue for ${provider}, check configuration`);
  } else if (error.includes('timeout')) {
    console.log(`Timeout for ${provider}, network issues detected`);
  }
});
```

## Security Considerations

### API Security
- **Rate Limiting**: Multiple tiers prevent abuse
- **Input Validation**: Comprehensive validation prevents injection
- **API Key Protection**: Environment variable storage only
- **Request Size Limits**: Prevent resource exhaustion

### Data Privacy
- **Cache Encryption**: Sensitive data encrypted at rest
- **Audit Logging**: All enrichment activities logged
- **Data Retention**: Configurable TTL for data cleanup
- **Provider Isolation**: Each provider runs in isolation

## Integration Examples

### SIEM Integration

```python
# Python script for SIEM integration
import requests
import json

def enrich_siem_alerts(alerts):
    """Enrich SIEM alerts with threat intelligence"""
    
    iocs = []
    for alert in alerts:
        if alert['type'] == 'network':
            iocs.append({
                'value': alert['src_ip'],
                'type': 'ip_address',
                'source': 'siem',
                'tags': ['alert', alert['rule_name']]
            })
    
    # Bulk enrich IOCs
    response = requests.post(
        'http://localhost:3001/api/ioc-enrichment/bulk-enrich',
        headers={'Content-Type': 'application/json'},
        json={
            'iocs': iocs,
            'providers': ['virustotal', 'abuseipdb', 'greynoise'],
            'maxConcurrency': 3
        }
    )
    
    return response.json()['data']['jobId']

# Monitor enrichment job
def check_enrichment_status(job_id):
    response = requests.get(
        f'http://localhost:3001/api/ioc-enrichment/job/{job_id}'
    )
    return response.json()['data']
```

### Threat Hunting Workflow

```javascript
// Node.js threat hunting automation
const axios = require('axios');

class ThreatHunter {
  constructor(baseUrl = 'http://localhost:3001') {
    this.baseUrl = baseUrl;
  }

  async huntThreatActorIOCs(actorName, iocList) {
    try {
      // Enrich IOCs with focus on attribution
      const enrichResponse = await axios.post(
        `${this.baseUrl}/api/ioc-enrichment/bulk-enrich`,
        {
          iocs: iocList.map(ioc => ({
            ...ioc,
            tags: ['threat-hunting', actorName]
          })),
          providers: ['virustotal', 'misp', 'otx'],
          includeRelationships: true,
          includeTimeline: true
        }
      );

      const jobId = enrichResponse.data.data.jobId;
      console.log(`Started threat hunting job: ${jobId}`);

      // Create Picus threat for validation
      const picusThreatResponse = await axios.post(
        `${this.baseUrl}/api/ioc-enrichment/create-picus-threat`,
        {
          name: `${actorName} IOCs Validation`,
          description: `Threat validation for ${actorName} indicators`,
          indicators: iocList,
          severity: 'high'
        }
      );

      console.log(`Created Picus threat: ${picusThreatResponse.data.data.threatId}`);

      return {
        enrichmentJobId: jobId,
        picusThreatId: picusThreatResponse.data.data.threatId
      };

    } catch (error) {
      console.error('Threat hunting failed:', error.message);
      throw error;
    }
  }

  async generateThreatReport(jobId) {
    const jobStatus = await axios.get(
      `${this.baseUrl}/api/ioc-enrichment/job/${jobId}`
    );

    const job = jobStatus.data.data.job;
    
    if (job.status !== 'completed') {
      throw new Error('Job not completed yet');
    }

    // Analyze results and generate report
    const maliciousIOCs = job.results.filter(result => 
      result.success && result.data.threatLevel === 'malicious'
    );

    const suspiciousIOCs = job.results.filter(result => 
      result.success && result.data.threatLevel === 'suspicious'
    );

    return {
      summary: {
        totalIOCs: job.progress.total,
        maliciousIOCs: maliciousIOCs.length,
        suspiciousIOCs: suspiciousIOCs.length,
        successRate: (job.progress.completed / job.progress.total) * 100
      },
      highPriorityIOCs: maliciousIOCs.map(result => ({
        ioc: result.iocId,
        provider: result.provider,
        score: result.data.score,
        detections: result.data.detections.length
      })),
      recommendations: this.generateRecommendations(maliciousIOCs, suspiciousIOCs)
    };
  }

  generateRecommendations(malicious, suspicious) {
    const recommendations = [];
    
    if (malicious.length > 0) {
      recommendations.push({
        priority: 'critical',
        action: 'Block malicious IOCs immediately',
        affected: malicious.length
      });
    }
    
    if (suspicious.length > 0) {
      recommendations.push({
        priority: 'high',
        action: 'Monitor suspicious IOCs closely',
        affected: suspicious.length
      });
    }
    
    return recommendations;
  }
}

// Usage
const hunter = new ThreatHunter();
const result = await hunter.huntThreatActorIOCs('APT28', [
  { value: '1.2.3.4', type: 'ip_address' },
  { value: 'evil.com', type: 'domain' }
]);
```

## Troubleshooting

### Common Issues

1. **High API Usage**
   - Enable caching with longer TTL
   - Reduce batch sizes and concurrency
   - Use faster providers for bulk operations

2. **Provider Failures**
   - Check API keys and quotas
   - Monitor rate limits and usage
   - Verify network connectivity

3. **Slow Performance**
   - Adjust batch sizes based on provider speed
   - Use appropriate concurrency levels
   - Enable caching for repeated queries

4. **Memory Issues**
   - Reduce cache size if needed
   - Monitor job queue size
   - Implement job cleanup policies

### Debug Mode

```bash
# Enable debug logging
export LOG_LEVEL=debug
export DEBUG_IOC_ENRICHMENT=true

# Start server with debug info
npm run server
```

### Health Checks

```bash
# Check service health
curl http://localhost:3001/api/ioc-enrichment/stats

# Verify provider status
curl http://localhost:3001/api/ioc-enrichment/providers

# Test basic enrichment
curl -X POST http://localhost:3001/api/ioc-enrichment/enrich \
  -H "Content-Type: application/json" \
  -d '{"value":"8.8.8.8","type":"ip_address","providers":["greynoise"]}'
```

This comprehensive IOC enrichment system transforms ThreatFlow into a powerful threat intelligence platform, enabling security teams to make informed decisions based on comprehensive, multi-source intelligence analysis.