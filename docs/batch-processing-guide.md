# Batch Processing & Automation Guide

ThreatFlow's batch processing system enables enterprise-scale automated threat analysis with support for bulk document processing, scheduled analysis jobs, intelligent duplicate detection, and API-driven workflows.

## Features Overview

### 🚀 Bulk Document Processing
- **Drag & drop 100+ files** - PDF, TXT, DOC, DOCX, HTML, JSON
- **Multiple AI providers** - Claude, OpenAI, Ollama, OpenRouter
- **Smart progress tracking** - Real-time status and error handling
- **Configurable analysis depth** - Fast, Standard, Comprehensive

### ⏰ Scheduled Analysis
- **Cron-based scheduling** - Flexible timing with timezone support
- **Automated feed processing** - Daily threat intelligence ingestion
- **Retry policies** - Robust error handling and backoff strategies
- **Predefined templates** - Common use cases ready to go

### 🔍 Smart Duplicate Detection
- **Multi-algorithm detection** - Content, structural, and semantic analysis
- **Intelligent clustering** - Automatic grouping of similar documents
- **Confidence scoring** - Multiple similarity metrics
- **Performance optimized** - Hash-based pre-filtering

### 📊 Real-time Monitoring
- **Live job dashboard** - Progress tracking and metrics
- **Queue health monitoring** - Backlog alerts and performance stats
- **Detailed error reporting** - Comprehensive failure analysis
- **Resource utilization** - CPU, memory, and throughput metrics

### 🔌 API-Driven Automation
- **RESTful endpoints** - Submit jobs programmatically
- **Webhook integration** - External system triggers
- **Rate limiting** - Enterprise-grade protection
- **Authentication** - Secure user-based access

## Quick Start

### 1. Bulk Document Upload (UI)

```typescript
import { BulkUploadDialog } from '@/features/batch-processing';

function MyComponent() {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  
  const handleJobSubmitted = (jobId: string) => {
    console.log('Batch job started:', jobId);
    // Navigate to job monitoring dashboard
  };

  return (
    <>
      <Button onClick={() => setUploadDialogOpen(true)}>
        Upload Documents
      </Button>
      
      <BulkUploadDialog
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        onSubmit={handleJobSubmitted}
      />
    </>
  );
}
```

### 2. Programmatic Batch Submission

```typescript
import { batchProcessingService } from '@/features/batch-processing';

// Submit bulk document analysis
const jobId = await batchProcessingService.submitBulkDocumentAnalysis(
  files, // File[] or DocumentSource[]
  {
    aiProvider: 'claude',
    analysisDepth: 'comprehensive',
    enableDuplicateDetection: true,
    enableIOCExtraction: true,
    batchSize: 5,
    priority: 'high',
    userId: 'user-123',
    tags: ['incident-response', 'malware-analysis'],
  }
);

console.log('Job submitted:', jobId);
```

### 3. Schedule Automated Analysis

```typescript
import { scheduledAnalysisService } from '@/features/batch-processing';

// Daily threat feed analysis at 6:00 AM UTC
const scheduledJobId = await scheduledAnalysisService.createDailyThreatFeedAnalysis(
  'user-123',
  [
    'https://feeds.example.com/threats.xml',
    'https://intel.example.com/iocs.json',
  ],
  {
    time: '06:00',
    timezone: 'UTC',
    aiProvider: 'claude',
  }
);

// Weekly comprehensive analysis on Mondays at 2:00 AM
const weeklyJobId = await scheduledAnalysisService.createWeeklyComprehensiveAnalysis(
  'user-123',
  documentSources,
  {
    dayOfWeek: 1, // Monday
    time: '02:00',
    timezone: 'America/New_York',
  }
);
```

### 4. API Integration

```bash
# Submit bulk URL analysis
curl -X POST http://localhost:3001/api/batch/submit-url-analysis \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <token>" \\
  -d '{
    "urls": [
      "https://example.com/threat-report-1.html",
      "https://example.com/threat-report-2.html"
    ],
    "aiProvider": "claude",
    "priority": "high",
    "tags": ["external-api", "automation"]
  }'

# Get job status
curl -X GET http://localhost:3001/api/batch/jobs/<job-id> \\
  -H "Authorization: Bearer <token>"

# Cancel job
curl -X POST http://localhost:3001/api/batch/jobs/<job-id>/cancel \\
  -H "Authorization: Bearer <token>"
```

### 5. Webhook Integration

```bash
# External systems can trigger batch jobs
curl -X POST http://localhost:3001/api/batch/webhook \\
  -H "Content-Type: application/json" \\
  -d '{
    "apiKey": "your-webhook-api-key",
    "type": "bulk_document_analysis",
    "sources": [
      {
        "type": "s3",
        "location": "s3://my-bucket/threats/",
        "credentials": {
          "accessKey": "...",
          "secretKey": "..."
        }
      }
    ],
    "config": {
      "aiProvider": "claude",
      "analysisDepth": "standard",
      "batchSize": 10,
      "priority": "normal"
    }
  }'
```

## Advanced Configuration

### Custom Duplicate Detection

```typescript
import { duplicateDetectionService } from '@/features/batch-processing';

// Generate document fingerprint
const fingerprint = await duplicateDetectionService.generateFingerprint(
  'doc-123',
  'threat-report.pdf',
  documentContent,
  {
    iocs: ['1.2.3.4', 'malware.exe'],
    entities: ['APT28', 'Russia'],
    keywords: ['phishing', 'credential theft'],
  }
);

// Detect duplicates with custom threshold
const duplicates = await duplicateDetectionService.detectDuplicates(
  fingerprint,
  0.90 // 90% similarity threshold
);

// Get clustering statistics
const stats = duplicateDetectionService.getStatistics();
console.log('Duplicate rate:', stats.duplicateRate);
```

### Custom Scheduled Jobs

```typescript
import { scheduledAnalysisService } from '@/features/batch-processing';

// Create custom scheduled job
const jobId = await scheduledAnalysisService.createScheduledJob(
  'Hourly IOC Feed Analysis',
  'Process new IOCs every hour from threat feeds',
  '0 * * * *', // Every hour at minute 0
  {
    type: 'ioc_extraction_pipeline',
    sources: [
      {
        type: 'url',
        location: 'https://feeds.threatintel.com/hourly-iocs.json',
        filters: {
          dateRange: { hours: 1 },
          fileTypes: ['json', 'xml'],
        },
      },
    ],
    processing: {
      aiProvider: 'claude',
      analysisDepth: 'fast',
      enableDuplicateDetection: true,
      enableIOCExtraction: true,
      batchSize: 20,
      priority: 'normal',
    },
    output: {
      format: 'stix',
      destination: 'database',
      retentionDays: 30,
    },
    filters: {
      keywords: ['ioc', 'indicator', 'hash', 'ip', 'domain'],
      excludeKeywords: ['false positive', 'benign'],
    },
  },
  {
    timezone: 'UTC',
    enabled: true,
    userId: 'security-team',
    tags: ['ioc', 'hourly', 'feeds'],
    retryPolicy: {
      maxRetries: 3,
      backoffMultiplier: 2,
      maxBackoffMs: 300000,
      retryableErrors: ['Network error', 'Rate limit'],
    },
  }
);
```

## Monitoring and Metrics

### Job Dashboard Component

```typescript
import { BatchJobDashboard } from '@/features/batch-processing';

function AdminDashboard() {
  return (
    <div>
      <h1>Batch Processing Operations</h1>
      <BatchJobDashboard />
    </div>
  );
}
```

### Metrics API

```typescript
import { batchProcessingService } from '@/features/batch-processing';

// Get comprehensive metrics
const metrics = batchProcessingService.getMetrics();

console.log('Active jobs:', metrics.activeJobs);
console.log('Success rate:', (1 - metrics.errorRate) * 100, '%');
console.log('Throughput:', metrics.throughputPerHour, 'jobs/hour');
console.log('Queue backlog:', metrics.queueHealth.backlogSize);
```

## Performance Optimization

### Batch Size Tuning

```typescript
// For fast processing of many small documents
const jobId = await batchProcessingService.submitBulkDocumentAnalysis(files, {
  batchSize: 10, // Process 10 files simultaneously
  analysisDepth: 'fast',
  priority: 'high',
});

// For thorough analysis of large documents
const jobId = await batchProcessingService.submitBulkDocumentAnalysis(files, {
  batchSize: 3, // Process 3 files simultaneously
  analysisDepth: 'comprehensive',
  priority: 'normal',
});
```

### Resource Management

```typescript
// Monitor resource utilization
const metrics = batchProcessingService.getMetrics();

if (metrics.resourceUtilization.cpu > 80) {
  console.warn('High CPU usage detected');
  // Reduce batch sizes or pause low-priority jobs
}

if (metrics.queueHealth.backlogSize > 100) {
  console.warn('Large queue backlog detected');
  // Scale up processing capacity or increase batch sizes
}
```

## Error Handling and Recovery

### Job Status Monitoring

```typescript
// Monitor job progress
const job = batchProcessingService.getJob(jobId);

switch (job?.status) {
  case 'queued':
    console.log('Job is waiting in queue');
    break;
  case 'running':
    console.log('Progress:', job.progress.percentage, '%');
    break;
  case 'completed':
    console.log('Job completed successfully');
    console.log('Results:', job.results?.length);
    break;
  case 'failed':
    console.error('Job failed:', job.errors);
    break;
  case 'cancelled':
    console.log('Job was cancelled');
    break;
}
```

### Retry Failed Jobs

```typescript
// Handle failed jobs
const userJobs = batchProcessingService.getUserJobs('user-123');
const failedJobs = userJobs.filter(job => job.status === 'failed');

for (const failedJob of failedJobs) {
  // Analyze failure reason
  const retryableErrors = ['Network error', 'Timeout', 'Rate limit'];
  const shouldRetry = failedJob.errors?.some(error =>
    retryableErrors.some(retryable => 
      error.message.toLowerCase().includes(retryable.toLowerCase())
    )
  );

  if (shouldRetry) {
    // Create new job with same configuration
    const newJobId = await batchProcessingService.submitJob(
      failedJob.type,
      failedJob.config,
      failedJob.priority,
      failedJob.metadata
    );
    console.log('Retried failed job as:', newJobId);
  }
}
```

## Security Considerations

### Rate Limiting
- **Batch submissions**: 10 requests per 15 minutes per IP
- **API calls**: 60 requests per minute per IP
- **Webhook endpoints**: 50 requests per 5 minutes per IP

### Authentication
- **JWT tokens** required for all user-specific operations
- **API keys** for webhook endpoints
- **User isolation** - users can only access their own jobs

### File Security
- **Type validation** - Only allowed file types accepted
- **Size limits** - Configurable maximum file sizes
- **Content scanning** - Files scanned for malicious content
- **Secure storage** - Temporary files cleaned up after processing

## Integration Examples

### SIEM Integration

```python
# Python script to submit SIEM logs for analysis
import requests
import json

def submit_siem_logs(log_files, api_token):
    headers = {
        'Authorization': f'Bearer {api_token}',
        'Content-Type': 'application/json'
    }
    
    # Convert log files to document sources
    sources = [
        {
            'type': 'file',
            'location': log_file,
            'filters': {
                'dateRange': {'hours': 24},
                'keywords': ['alert', 'warning', 'error', 'suspicious']
            }
        }
        for log_file in log_files
    ]
    
    payload = {
        'type': 'bulk_document_analysis',
        'sources': sources,
        'config': {
            'aiProvider': 'claude',
            'analysisDepth': 'standard',
            'enableIOCExtraction': True,
            'batchSize': 5,
            'priority': 'high'
        }
    }
    
    response = requests.post(
        'http://localhost:3001/api/batch/webhook',
        headers=headers,
        json=payload
    )
    
    return response.json()

# Usage
result = submit_siem_logs([
    '/var/log/security.log',
    '/var/log/firewall.log',
    '/var/log/ids.log'
], 'your-api-token')

print(f"Job submitted: {result['jobId']}")
```

### Threat Feed Automation

```javascript
// Node.js script for automated threat feed processing
const axios = require('axios');
const cron = require('node-cron');

class ThreatFeedProcessor {
  constructor(apiToken, baseUrl = 'http://localhost:3001') {
    this.apiToken = apiToken;
    this.baseUrl = baseUrl;
    this.headers = {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json'
    };
  }

  async processThreatFeeds(feeds) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/batch/submit-url-analysis`,
        {
          urls: feeds,
          aiProvider: 'claude',
          priority: 'normal',
          tags: ['threat-feed', 'automated']
        },
        { headers: this.headers }
      );

      console.log('Threat feed analysis started:', response.data.jobId);
      return response.data.jobId;
    } catch (error) {
      console.error('Failed to submit threat feeds:', error.message);
      throw error;
    }
  }

  startScheduledProcessing(feeds) {
    // Process feeds every 6 hours
    cron.schedule('0 */6 * * *', async () => {
      console.log('Starting scheduled threat feed processing...');
      await this.processThreatFeeds(feeds);
    });

    console.log('Scheduled threat feed processing started (every 6 hours)');
  }
}

// Usage
const processor = new ThreatFeedProcessor('your-api-token');

const threatFeeds = [
  'https://feeds.malwaredomainlist.com/hostslist/hosts.txt',
  'https://intel.malwaredomains.com/feeds/suspiciousdomains_High.txt',
  'https://threatfeeds.io/indicators.json'
];

processor.startScheduledProcessing(threatFeeds);
```

## Troubleshooting

### Common Issues

1. **High Memory Usage**
   - Reduce batch sizes for large documents
   - Enable duplicate detection to avoid processing identical files
   - Monitor queue backlog and clear completed jobs

2. **Slow Processing**
   - Check AI provider rate limits
   - Optimize batch sizes based on document types
   - Use 'fast' analysis depth for quick processing

3. **Failed Jobs**
   - Check API keys and provider configuration
   - Verify file formats and sizes
   - Review error logs for specific failure reasons

4. **Queue Backlog**
   - Increase batch processing concurrency
   - Pause low-priority scheduled jobs during peak times
   - Scale up infrastructure resources

### Debug Mode

```typescript
// Enable detailed logging
process.env.LOG_LEVEL = 'debug';

// Monitor job execution
batchProcessingService.on('jobStarted', (job) => {
  console.log('Job started:', job.id, job.type);
});

batchProcessingService.on('jobProgress', (job) => {
  console.log('Progress:', job.id, job.progress.percentage + '%');
});

batchProcessingService.on('jobCompleted', (job) => {
  console.log('Job completed:', job.id, 'in', 
    job.completedAt.getTime() - job.startedAt.getTime(), 'ms');
});

batchProcessingService.on('jobFailed', (job) => {
  console.error('Job failed:', job.id, job.errors);
});
```

This comprehensive batch processing system transforms ThreatFlow into an enterprise-grade platform capable of handling large-scale threat analysis operations with full automation and monitoring capabilities.