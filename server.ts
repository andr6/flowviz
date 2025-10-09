import path from 'path';
import { fileURLToPath } from 'url';

import Anthropic from '@anthropic-ai/sdk';
import { Readability } from '@mozilla/readability';
import cors from 'cors';


// Note: Provider management is handled in the client-side code
// Server acts as a proxy and passes provider info to the API calls
import dotenv from 'dotenv';
import express from 'express';
import { fileTypeFromBuffer } from 'file-type';
import helmet from 'helmet';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { JSDOM } from 'jsdom';
import fetch from 'node-fetch';
import PDFParser from 'pdf2json';

import { validateUrl, secureFetch, rateLimits, handleFetchError } from './security-utils.js';
import { configService } from './src/shared/services/config/ConfigurationService.ts';

// Enterprise services and routes
import { databaseService } from './src/shared/services/database/DatabaseService.ts';
import authRoutes from './src/api/routes/auth.ts';
import investigationRoutes from './src/api/routes/investigations.ts';
import picusRoutes from './src/api/routes/picus.ts';
import siemRoutes from './src/api/routes/siem.ts';
import { alertTriageService } from './src/features/alert-triage/services/AlertTriageService.ts';
import { caseManagementService } from './src/features/case-management/services/CaseManagementService.ts';
import { IOCExtractorService } from './src/features/ioc-analysis/services/IOCExtractorService.ts';
import { iocEnrichmentService } from './src/features/ioc-enrichment/services/IOCEnrichmentService.ts';
import { threatIntelligenceService } from './src/features/threat-intelligence/services/ThreatIntelligenceService.ts';
import { picusSecurityService } from './src/integrations/picus/services/PicusSecurityService.ts';
import { siemIntegrationService } from './src/integrations/siem/SIEMIntegrationService.ts';

// Load environment variables from .env file
dotenv.config();

// Load and validate configuration
const config = configService.load();
const validation = configService.validateApiKeys();

if (!validation.valid) {
  console.error('❌ Configuration validation failed:');
  validation.missing.forEach(msg => console.error(`  - ${msg}`));
  process.exit(1);
}

if (validation.warnings.length > 0) {
  console.warn('⚠️  Configuration warnings:');
  validation.warnings.forEach(msg => console.warn(`  - ${msg}`));
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = config.server.port;

// Security middleware - MUST come first
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", config.aiProviders.anthropic.baseUrl, config.aiProviders.openai.baseUrl, config.aiProviders.openrouter.baseUrl, config.aiProviders.ollama.baseUrl],
      scriptSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false, // Needed for some React dev tools
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Enable CORS for specific origins only
app.use(cors({
  origin (origin, callback) {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) {return callback(null, true);}
    
    // Use configuration service for allowed origins
    const allowedOrigins = config.server.corsOrigins;
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    return callback(new Error('Not allowed by CORS'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
}));

// Parse JSON bodies with size limits from configuration
const maxRequestSize = config.server.maxRequestSize;
app.use(express.json({ limit: maxRequestSize }));
app.use(express.urlencoded({ extended: true, limit: maxRequestSize }));
app.use(express.raw({ type: 'application/pdf', limit: maxRequestSize }));

// SECURITY FIXES: Global security middleware
import { reliabilityService } from './src/server/middleware/ReliabilityService.js';

// Add correlation ID for request tracking
app.use(reliabilityService.createCorrelationId());

// Add security headers
app.use(securityFixes.createSecurityHeaders());

// Add content type validation
app.use(securityFixes.createContentTypeValidation());

// Add memory protection
app.use(securityFixes.createMemoryProtection());

// Add timeout protection
app.use(securityFixes.createTimeoutProtection(30000));

// Serve static files from dist folder in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
}

// Initialize enterprise services
const initializeServices = async () => {
  logger.info('Initializing enterprise services...');
  const services = [
    { name: 'Database', service: databaseService },
    { name: 'SIEM integration', service: siemIntegrationService },
    { name: 'Picus Security', service: picusSecurityService },
    { name: 'IOC Enrichment', service: iocEnrichmentService },
    { name: 'Threat Intelligence', service: threatIntelligenceService },
    { name: 'Alert Triage', service: alertTriageService },
    { name: 'Case Management', service: caseManagementService }
  ];

  for (const { name, service } of services) {
    try {
      await service.initialize();
      logger.info(`✅ ${name} service initialized`);
    } catch (error) {
      logger.warn(`⚠️  ${name} service failed to initialize: ${error.message}`);
      logger.debug(`${name} service error details:`, error);
    }
  }
  
  logger.info('Enterprise services initialization complete');
};

// Initialize services on startup
initializeServices();

// ENHANCED HEALTH CHECK SYSTEM
import { healthCheckService } from './src/server/middleware/HealthCheckService.js';

// Comprehensive health check endpoint
app.get('/healthz', healthCheckService.performHealthCheck.bind(healthCheckService));

// Kubernetes readiness probe
app.get('/ready', healthCheckService.readinessProbe.bind(healthCheckService));

// Simple liveness probe for load balancers
app.get('/health', healthCheckService.livenessProbe.bind(healthCheckService));

// Legacy health endpoint (for backward compatibility)
app.get('/api/health', async (_req, res) => {
  try {
    const dbStatus = await databaseService.healthCheck();
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      services: {
        database: dbStatus ? 'connected' : 'disconnected',
        siem: 'initialized',
        picusSecurity: 'initialized',
        iocEnrichment: 'initialized',
        threatIntelligence: 'initialized',
        alertTriage: 'initialized',
        caseManagement: 'initialized'
      },
      version: '2.0.0',
      features: [
        'Enterprise Authentication',
        'SIEM Integration',
        'Picus Security Integration',
        'IOC/IOA Enrichment', 
        'Threat Intelligence Feeds',
        'Automated Alert Triage',
        'Case Management',
        'Threat Hunting',
        'SOC Dashboard',
        'Compliance Reporting'
      ]
    });
  } catch (error) {
    res.json({ 
      status: 'degraded', 
      timestamp: new Date().toISOString(),
      error: error.message 
    });
  }
});

// Enterprise API routes
app.use('/api/auth', authRoutes);
app.use('/api/investigations', investigationRoutes);  
app.use('/api/siem', siemRoutes);
app.use('/api/picus', picusRoutes);

// Test AI provider connection endpoint
app.post('/api/test-provider', async (req, res) => {
  try {
    const { provider, config } = req.body;
    
    let testResult = { success: false, error: 'Unknown provider' };
    
    switch (provider) {
      case 'claude':
        if (!config.apiKey) {
          testResult = { success: false, error: 'API key required' };
          break;
        }
        try {
          const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': config.apiKey,
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
              model: config.model || 'claude-3-5-sonnet-20241022',
              max_tokens: 10,
              messages: [{ role: 'user', content: 'Test' }],
            }),
          });
          testResult = { success: response.ok, error: response.ok ? null : await response.text() };
        } catch (error) {
          testResult = { success: false, error: error.message };
        }
        break;
        
      case 'ollama':
        try {
          const response = await fetch(`${config.baseUrl}/api/tags`);
          testResult = { success: response.ok, error: response.ok ? null : 'Connection failed' };
        } catch (error) {
          testResult = { success: false, error: 'Cannot connect to Ollama server' };
        }
        break;
        
      case 'openai':
        if (!config.apiKey) {
          testResult = { success: false, error: 'API key required' };
          break;
        }
        try {
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${config.apiKey}`,
            },
            body: JSON.stringify({
              model: config.model || 'gpt-4o',
              messages: [{ role: 'user', content: 'Test' }],
              max_tokens: 5,
            }),
          });
          testResult = { success: response.ok, error: response.ok ? null : await response.text() };
        } catch (error) {
          testResult = { success: false, error: error.message };
        }
        break;
        
      case 'openrouter':
        if (!config.apiKey) {
          testResult = { success: false, error: 'API key required' };
          break;
        }
        try {
          const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${config.apiKey}`,
              'HTTP-Referer': 'http://localhost:5173',
              'X-Title': 'ThreatFlow',
            },
            body: JSON.stringify({
              model: config.model || 'anthropic/claude-3.5-sonnet',
              messages: [{ role: 'user', content: 'Test' }],
              max_tokens: 5,
            }),
          });
          testResult = { success: response.ok, error: response.ok ? null : await response.text() };
        } catch (error) {
          testResult = { success: false, error: error.message };
        }
        break;
    }
    
    res.json(testResult);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Test Picus connection endpoint
app.post('/api/test-picus', async (req, res) => {
  try {
    const { config } = req.body;
    
    if (!config.baseUrl || !config.refreshToken) {
      return res.json({ 
        success: false, 
        error: 'Base URL and refresh token are required' 
      });
    }
    
    try {
      // Test authentication with Picus API using refresh token
      const authResponse = await fetch(`${config.baseUrl}/v1/auth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refresh_token: config.refreshToken
        }),
        timeout: 10000, // 10 second timeout
      });
      
      if (!authResponse.ok) {
        const errorText = await authResponse.text();
        return res.json({ 
          success: false, 
          error: `Authentication failed: ${authResponse.status} ${errorText}` 
        });
      }
      
      const authData = await authResponse.json();
      
      if (!authData.token) {
        return res.json({ 
          success: false, 
          error: 'No access token received from Picus API' 
        });
      }
      
      // Test a simple API call with the access token
      const testResponse = await fetch(`${config.baseUrl}/v1/agents`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authData.token}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });
      
      if (!testResponse.ok) {
        return res.json({ 
          success: false, 
          error: `API test failed: ${testResponse.status}` 
        });
      }
      
      const testData = await testResponse.json();
      const agentCount = Array.isArray(testData.data) ? testData.data.length : 0;
      
      res.json({ 
        success: true, 
        message: `Successfully connected to Picus Security. Found ${agentCount} agents.`
      });
      
    } catch (error) {
      logger.error('Picus connection test failed:', error);
      res.json({ 
        success: false, 
        error: `Connection failed: ${error.message}` 
      });
    }
    
  } catch (error) {
    logger.error('Picus test endpoint error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error during Picus test' 
    });
  }
});

// Import security fixes
import { securityFixes } from './src/server/middleware/SecurityFixesService.js';
import { logger } from './src/shared/utils/logger.js';

// Secure image fetch endpoint with rate limiting and validation  
app.get('/api/fetch-image', 
  rateLimits.images, 
  securityFixes.createSSRFProtection(),
  securityFixes.createAPIKeyProtection(),
  async (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }
  
  logger.debug(`Fetching image from: ${url}`);
  
  try {
    // Step 1: Validate URL to prevent SSRF attacks
    const validatedUrl = validateUrl(url);
    
    // Step 2: Secure fetch with image-specific settings
    const response = await secureFetch(validatedUrl, {
      timeout: 15000, // 15 seconds for images
      maxSize: parseInt(process.env.MAX_IMAGE_SIZE) || 5 * 1024 * 1024, // Default 5MB limit for images
      headers: {
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
      }
    });
    
    logger.debug(`Image response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      logger.error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      return res.status(response.status).json({ 
        error: `Failed to fetch image: ${response.statusText}` 
      });
    }
    
    // Step 3: Validate content type
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.startsWith('image/')) {
      return res.status(400).json({ 
        error: 'Invalid content type. Only image content is supported.' 
      });
    }
    
    // Step 4: Get image data with size validation
    const buffer = await response.arrayBuffer();
    const nodeBuffer = Buffer.from(buffer);
    
    if (nodeBuffer.length > (parseInt(process.env.MAX_IMAGE_SIZE) || 3 * 1024 * 1024)) { // Configurable limit for processed images
      return res.status(413).json({ 
        error: 'Image too large. Maximum size is 3MB.' 
      });
    }
    
    // Step 5: Detect and validate file type
    const fileType = await fileTypeFromBuffer(nodeBuffer);
    const mediaType = fileType?.mime || contentType || 'image/jpeg';
    
    // Only allow common image formats
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(mediaType)) {
      return res.status(400).json({ 
        error: `Unsupported image format: ${mediaType}. Allowed: ${allowedTypes.join(', ')}` 
      });
    }
    
    // Step 6: Convert to base64
    const base64 = nodeBuffer.toString('base64');
    
    logger.info(`Image fetched: ${mediaType}, ${Math.round(base64.length/1024)}KB`);
    res.json({ base64, mediaType });
    
  } catch (error) {
    const errorResponse = handleFetchError(error, 'image');
    res.status(errorResponse.status).json({
      error: errorResponse.error,
      details: errorResponse.details
    });
  }
});

// Secure article fetch endpoint with rate limiting and proper parsing
app.get('/api/fetch-article', 
  rateLimits.articles, 
  securityFixes.createSSRFProtection(),
  async (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }
  
  logger.debug(`Fetching article from: ${url}`);
  
  try {
    // Step 1: Validate URL to prevent SSRF attacks
    const validatedUrl = validateUrl(url);
    
    // Step 2: Secure fetch with article-specific settings
    const response = await secureFetch(validatedUrl, {
      timeout: 30000, // 30 seconds for articles
      maxSize: 10 * 1024 * 1024, // 10MB limit
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      }
    });
    
    logger.debug(`Article response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      logger.error(`Failed to fetch article: ${response.status} ${response.statusText}`);
      return res.status(response.status).json({ 
        error: `Failed to fetch article: ${response.statusText}` 
      });
    }
    
    // Step 3: Validate content type
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('text/html')) {
      return res.status(400).json({ 
        error: 'Invalid content type. Only HTML content is supported.' 
      });
    }
    
    // Step 4: Get HTML with size check
    const html = await response.text();
    if (html.length > (parseInt(process.env.MAX_ARTICLE_SIZE) || 5 * 1024 * 1024)) { // Configurable limit
      return res.status(413).json({ 
        error: 'Content too large. Maximum size is 5MB.' 
      });
    }
    
    // Step 5: Parse with Mozilla Readability for better content extraction
    const dom = new JSDOM(html, { url: validatedUrl.href });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();
    
    if (!article) {
      // Fallback to original HTML if Readability fails
      logger.warn('Readability parsing failed, falling back to raw HTML');
      res.json({ contents: html });
      return;
    }
    
    // Return enhanced content with better structure
    const enhancedHtml = `
      <html>
        <head><title>${article.title || 'Article'}</title></head>
        <body>
          <h1>${article.title || 'Article'}</h1>
          ${article.byline ? `<p class="byline">${article.byline}</p>` : ''}
          <div class="content">${article.content}</div>
        </body>
      </html>
    `;
    
    logger.info(`Successfully parsed article: "${article.title}", content length: ${enhancedHtml.length} characters`);
    res.json({ 
      contents: enhancedHtml,
      metadata: {
        title: article.title,
        byline: article.byline,
        excerpt: article.excerpt,
        length: article.length,
        readTime: Math.ceil(article.length / 200) // rough reading time in minutes
      }
    });
    
  } catch (error) {
    const errorResponse = handleFetchError(error, 'article');
    res.status(errorResponse.status).json({
      error: errorResponse.error,
      details: errorResponse.details
    });
  }
});

// Secure PDF parsing endpoint with rate limiting and validation
app.post('/api/parse-pdf', rateLimits.articles, async (req, res) => {
  try {
    logger.debug('PDF parsing request received');
    
    // Check if we have PDF data in the request body
    if (!req.body || req.body.length === 0) {
      return res.status(400).json({ error: 'No PDF data provided' });
    }

    // Validate content type
    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.includes('application/pdf')) {
      return res.status(400).json({ 
        error: 'Invalid content type. Only PDF files are supported.' 
      });
    }

    // Validate file size
    const maxPdfSize = parseInt(process.env.MAX_PDF_SIZE) || 10 * 1024 * 1024; // 10MB default
    if (req.body.length > maxPdfSize) {
      return res.status(413).json({ 
        error: `PDF file too large. Maximum size is ${Math.round(maxPdfSize / 1024 / 1024)}MB.` 
      });
    }

    logger.debug(`Processing PDF: ${Math.round(req.body.length / 1024)}KB`);

    // Parse PDF content with pdf2json
    const pdfParser = new PDFParser();
    
    return new Promise<void>((resolve, reject) => {
      pdfParser.on('pdfParser_dataError', (error) => {
        logger.error('PDF parsing error:', error);
        res.status(500).json({ 
          error: 'Failed to parse PDF', 
          details: error.parserError || error.message || 'Unknown PDF parsing error'
        });
        reject(error);
      });

      pdfParser.on('pdfParser_dataReady', (pdfData) => {
        try {
          // Extract text from all pages
          let extractedText = '';
          
          if (pdfData.Pages && pdfData.Pages.length > 0) {
            for (const page of pdfData.Pages) {
              if (page.Texts && page.Texts.length > 0) {
                for (const text of page.Texts) {
                  if (text.R && text.R.length > 0) {
                    for (const run of text.R) {
                      if (run.T) {
                        // SECURITY FIX: Sanitize PDF content to prevent XSS
                        const decodedText = decodeURIComponent(run.T);
                        extractedText += `${securityFixes.sanitizeInput(decodedText)  } `;
                      }
                    }
                  }
                }
                extractedText += '\n'; // Add newline after each page
              }
            }
          }
          
          if (!extractedText.trim()) {
            res.status(400).json({
              error: 'Could not extract text from PDF. The file may be corrupted or contain only images.'
            });
            reject(new Error('No text extracted'));
            return;
          }

          // Clean up the extracted text
          const cleanedText = extractedText
            .replace(/\s+/g, ' ') // Replace multiple spaces with single space
            .replace(/\n\s*\n/g, '\n\n') // Replace multiple newlines with double newlines
            .trim();

          logger.info(`Successfully parsed PDF: ${cleanedText.length} characters extracted, ${pdfData.Pages.length} pages`);
          
          res.json({ 
            text: cleanedText,
            metadata: {
              pages: pdfData.Pages.length,
              textLength: cleanedText.length,
              info: pdfData.Meta || {},
              version: 'pdf2json'
            }
          });
          
          resolve();
        } catch (error) {
          logger.error('PDF text extraction error:', error);
          res.status(500).json({ 
            error: 'Failed to extract text from PDF', 
            details: error.message 
          });
          reject(error);
        }
      });

      // Parse the PDF buffer
      pdfParser.parseBuffer(req.body);
    });
    
  } catch (error) {
    logger.error('PDF parsing error:', error);
    res.status(500).json({ 
      error: 'Failed to parse PDF', 
      details: error.message 
    });
  }
});

// Vision analysis endpoint for secure server-side processing
app.post('/api/vision-analysis', rateLimits.streaming, async (req, res) => {
  try {
    const { images, articleText } = req.body;
    
    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: 'Missing or invalid images array' });
    }
    
    if (!articleText || typeof articleText !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid articleText' });
    }
    
    logger.info(`Vision analysis request: ${images.length} images, ${articleText.length} chars of text`);
    
    // Initialize Anthropic client with server API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Server configuration error: Anthropic API key not configured' });
    }
    
    const anthropic = new Anthropic({ apiKey });
    
    // Build the vision analysis prompt
    const prompt = buildVisionPrompt(articleText, images.length);
    
    // Build message content with images
    const messageContent = buildMessageContent(images, prompt);
    
    // Make the API call
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      temperature: 0.1,
      messages: [
        {
          role: 'user',
          content: messageContent,
        }
      ],
    });
    
    const analysisText = response.content[0]?.type === 'text' ? response.content[0].text : '';
    const confidence = assessConfidence(analysisText, images.length);
    
    // Post-process vision analysis with IOC validation
    const iocExtractor = new IOCExtractorService({
      filters: {
        excludePrivateIPs: true,
        validateHashes: true,
        includeObfuscated: true
      }
    });
    
    // Extract and validate IOCs from the vision analysis result
    const extractedIOCs = await iocExtractor.extractFromText(analysisText, 'vision-analysis');
    const validDomains = extractedIOCs.filter(ioc => ioc.type === 'domain').map(ioc => ioc.value);
    const validIPs = extractedIOCs.filter(ioc => ioc.type === 'ipv4' || ioc.type === 'ipv6').map(ioc => ioc.value);
    
    logger.info(`Vision analysis completed: ${analysisText.length} chars, ${confidence} confidence, ${extractedIOCs.length} validated IOCs`);
    logger.info(`Validated IOCs - Domains: ${validDomains.length}, IPs: ${validIPs.length}`);
    
    res.json({
      analysisText,
      confidence,
      relevantImages: images,
      extractedIOCs,
      validatedIOCs: {
        domains: validDomains,
        ipAddresses: validIPs,
        total: extractedIOCs.length
      },
      tokensUsed: response.usage?.input_tokens + response.usage?.output_tokens || 0
    });
    
  } catch (error) {
    logger.error('Vision analysis error:', error);
    res.status(500).json({ 
      error: 'Vision analysis failed', 
      details: error.message 
    });
  }
});

// Vision analysis utilities
function buildVisionPrompt(articleText, imageCount) {
  return `You are analyzing ${imageCount} images from a cybersecurity article to enhance threat intelligence analysis.

Article context (first 1000 chars):
${articleText.substring(0, 1000)}...

Please analyze the images and provide:
1. Technical details visible in screenshots (commands, file paths, network indicators)
2. Attack techniques or tools shown
3. Any MITRE ATT&CK relevant information
4. System configurations or vulnerabilities displayed

CRITICAL IOC EXTRACTION GUIDELINES:
- For DOMAINS: Only extract if they have valid TLDs (com, org, net, edu, gov, mil, country codes, etc.)
- REJECT sentence fragments that end with periods followed by words (e.g., "payload.In", "attack.At", "impact.As")
- For defanged indicators: Extract facebook[.]windows-software-downloads[.]com as facebook.windows-software-downloads.com
- For IP addresses: Extract both standard (1.2.3.4) and defanged (1[.]2[.]3[.]4) formats
- For URLs: Extract both standard (http://example.com) and defanged (hXXp://example[.]com) formats
- Validate ALL domains against real TLD lists - reject grammatical constructs

EXAMPLES TO EXTRACT:
✅ facebook[.]windows-software-downloads[.]com → facebook.windows-software-downloads.com
✅ 77[.]90[.]153[.]225 → 77.90.153.225
✅ hXXp://malicious[.]domain[.]com → http://malicious.domain.com
✅ github.com/user/repo
✅ example.com, google.com

EXAMPLES TO REJECT:
❌ payload.In (sentence fragment)
❌ attack.At (sentence fragment)  
❌ impact.As (sentence fragment)
❌ months.Ago (sentence fragment)
❌ files.In (sentence fragment)
❌ appears.To (sentence fragment)

Focus on actionable technical intelligence that supplements the article text. Ensure all IOCs are valid and not sentence fragments.`;
}

function buildMessageContent(images, prompt) {
  const content = [{ type: 'text', text: prompt }];
  
  for (const image of images) {
    if (image.base64Data && image.mediaType) {
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: image.mediaType,
          data: image.base64Data
        }
      });
    }
  }
  
  return content;
}

function assessConfidence(analysisText, imageCount) {
  if (!analysisText || analysisText.length < 100) {return 'low';}
  
  const technicalIndicators = [
    /T\d{4}/, // MITRE technique IDs
    /CVE-\d{4}-\d+/, // CVE references
    /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/, // IP addresses
    /[a-f0-9]{32,}/ // Hashes
  ];
  
  const matches = technicalIndicators.reduce((count, pattern) => 
    count + (analysisText.match(pattern) || []).length, 0);
    
  if (matches >= 3 && imageCount >= 2) {return 'high';}
  if (matches >= 1 || imageCount >= 1) {return 'medium';}
  return 'low';
}

// AI streaming endpoint for SSE - PROTECTED with strict rate limiting
app.post('/api/ai-stream', rateLimits.streaming, async (req, res) => {
  logger.info('Starting full-pipeline streaming request...');
  logger.debug('Request body received', { hasUrl: !!req.body.url, hasText: !!req.body.text });
  
  // Set up SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  try {
    const { url, text, pdf, system, provider } = req.body;
    
    // Support multiple AI providers
    let apiKey;
    let model;
    let baseUrl;
    
    switch (provider?.currentProvider || 'claude') {
      case 'claude':
        apiKey = provider?.claude?.apiKey || process.env.ANTHROPIC_API_KEY;
        model = provider?.claude?.model || 'claude-sonnet-4-20250514';
        if (!apiKey || apiKey === 'your_anthropic_api_key_here') {
          logger.error('Missing Claude API key configuration', { hasProviderKey: !!provider?.claude?.apiKey, envKey: `${process.env.ANTHROPIC_API_KEY?.slice(0, 10)  }...` });
          res.write(`data: ${JSON.stringify({ type: 'error', error: 'Claude API key not configured. Please set your Anthropic API key in Settings.' })}\n\n`);
          res.end();
          return;
        }
        break;
      case 'ollama':
        baseUrl = provider?.ollama?.baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
        model = provider?.ollama?.model || process.env.OLLAMA_MODEL || 'llama3.2-vision:latest';
        break;
      case 'openai':
        apiKey = provider?.openai?.apiKey || process.env.OPENAI_API_KEY;
        model = provider?.openai?.model || process.env.OPENAI_MODEL || 'gpt-4o';
        if (!apiKey || apiKey === 'your_openai_api_key_here') {
          logger.error('Missing OpenAI API key configuration');
          res.write(`data: ${JSON.stringify({ type: 'error', error: 'OpenAI API key not configured. Please set your OpenAI API key in Settings.' })}\n\n`);
          res.end();
          return;
        }
        break;
      case 'openrouter':
        apiKey = provider?.openrouter?.apiKey || process.env.OPENROUTER_API_KEY;
        model = provider?.openrouter?.model || process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet';
        if (!apiKey || apiKey === 'your_openrouter_api_key_here') {
          logger.error('Missing OpenRouter API key configuration');
          res.write(`data: ${JSON.stringify({ type: 'error', error: 'OpenRouter API key not configured. Please set your OpenRouter API key in Settings.' })}\n\n`);
          res.end();
          return;
        }
        break;
      default:
        logger.error('Unsupported provider:', provider?.currentProvider);
        res.write(`data: ${JSON.stringify({ error: 'Unsupported AI provider' })}\n\n`);
        res.end();
        return;
    }
    
    logger.debug('Provider configuration', { 
      provider: provider?.currentProvider || 'claude', 
      hasApiKey: !!apiKey,
      model,
      baseUrl 
    });
    logger.debug('Processing request', { hasUrl: !!url, hasText: !!text, hasPdf: !!pdf, urlPreview: url?.substring(0, 50) });
    
    if (!url && !text && !pdf) {
      logger.warn('Request missing URL, text, and PDF');
      res.write(`data: ${JSON.stringify({ error: 'Either URL, text, or PDF is required' })}\n\n`);
      res.end();
      return;
    }

    let finalText;

    if (url) {
      // Step 1: Stream content preparation progress for URL
      res.write(`data: ${JSON.stringify({ type: 'progress', stage: 'fetching_article', message: 'Fetching article content...' })}\n\n`);
      
      // Validate and fetch article using existing logic
      const validatedUrl = validateUrl(url);
      const response = await secureFetch(validatedUrl, { timeout: 30000 });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch article: ${response.statusText}`);
      }

      const html = await response.text();
      
      // Parse with Readability
      const dom = new JSDOM(html, { url: validatedUrl.href });
      const readabilityReader = new Readability(dom.window.document);
      const article = readabilityReader.parse();
      
      if (!article) {
        throw new Error('Could not extract content from article');
      }

      res.write(`data: ${JSON.stringify({ type: 'progress', stage: 'processing_content', message: 'Processing article content...' })}\n\n`);

      // Build enhanced HTML
      const enhancedHtml = `
        <html>
          <head><title>${article.title || 'Article'}</title></head>
          <body>
            <h1>${article.title || 'Article'}</h1>
            ${article.byline ? `<p class="byline">${article.byline}</p>` : ''}
            <div class="content">${article.content}</div>
          </body>
        </html>
      `;

      // Extract text content
      const doc = new JSDOM(enhancedHtml).window.document;
      finalText = doc.body.textContent || doc.body.innerText || '';

      // Step 2: Process images with vision analysis if any
      res.write(`data: ${JSON.stringify({ type: 'progress', stage: 'analyzing_images', message: 'Analyzing images...' })}\n\n`);
      
      const imgElements = Array.from(dom.window.document.querySelectorAll('img'));
      
      if (imgElements.length > 0) {
        try {
          logger.info(`Found ${imgElements.length} images, starting vision analysis...`);
          
          // Download and process images
          const processedImages = [];
          for (const img of imgElements.slice(0, 5)) { // Limit to 5 images for performance
            const imgUrl = img.src;
            if (!imgUrl || !imgUrl.startsWith('http')) {continue;}
            
            try {
              // Use our secure image fetch endpoint internally
              const imageResponse = await secureFetch(validateUrl(imgUrl), {
                timeout: 15000,
                maxSize: parseInt(process.env.MAX_IMAGE_SIZE) || 3 * 1024 * 1024, // Configurable limit
                headers: { 'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8' }
              });
              
              if (imageResponse.ok) {
                const buffer = await imageResponse.arrayBuffer();
                const nodeBuffer = Buffer.from(buffer);
                const fileType = await fileTypeFromBuffer(nodeBuffer);
                const mediaType = fileType?.mime || imageResponse.headers.get('content-type') || 'image/jpeg';
                
                // Only process common image formats
                const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
                if (allowedTypes.includes(mediaType)) {
                  processedImages.push({
                    base64Data: nodeBuffer.toString('base64'),
                    mediaType,
                    url: imgUrl
                  });
                }
              }
            } catch (imgError) {
              logger.warn(`Failed to process image ${imgUrl}:`, imgError.message);
            }
          }
          
          // If we have images, analyze them with Claude
          if (processedImages.length > 0) {
            logger.info(`Processing ${processedImages.length} images with vision analysis`);
            
            const visionPrompt = `You are analyzing ${processedImages.length} images from a cybersecurity article to enhance threat intelligence analysis.

Article context (first 1000 chars):
${finalText.substring(0, 1000)}...

Please analyze the images and provide:
1. Technical details visible in screenshots (commands, file paths, network indicators)  
2. Attack techniques or tools shown
3. Any MITRE ATT&CK relevant information
4. System configurations or vulnerabilities displayed

Focus on actionable technical intelligence that supplements the article text.`;

            const messageContent = [{ type: 'text', text: visionPrompt }];
            for (const image of processedImages) {
              messageContent.push({
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: image.mediaType,
                  data: image.base64Data
                }
              });
            }
            
            const anthropic = new Anthropic({ apiKey });
            const visionResponse = await anthropic.messages.create({
              model: 'claude-3-5-sonnet-20241022',
              max_tokens: 4000,
              temperature: 0.1,
              messages: [{ role: 'user', content: messageContent }]
            });
            
            const visionAnalysis = visionResponse.content[0]?.type === 'text' ? visionResponse.content[0].text : '';
            if (visionAnalysis.trim()) {
              finalText = `${finalText}\n\n=== VISION ANALYSIS ===\n${visionAnalysis}`;
              logger.info(`✅ Vision analysis completed: ${visionAnalysis.length} characters added`);
            }
          }
        } catch (visionError) {
          logger.warn('Vision analysis failed:', visionError.message);
          // Continue without vision analysis
        }
      }
    } else if (pdf) {
      // Handle PDF processing
      res.write(`data: ${JSON.stringify({ type: 'progress', stage: 'processing_pdf', message: 'Extracting text from PDF...' })}\n\n`);
      
      try {
        // Parse PDF content with pdf2json
        const pdfBuffer = Buffer.from(pdf, 'base64');
        const pdfParser = new PDFParser();
        
        const parsedText = await new Promise<string>((resolve, reject) => {
          pdfParser.on('pdfParser_dataError', (error) => {
            reject(new Error(error.parserError || error.message || 'Unknown PDF parsing error'));
          });

          pdfParser.on('pdfParser_dataReady', (pdfData) => {
            try {
              // Extract text from all pages
              let extractedText = '';
              
              if (pdfData.Pages && pdfData.Pages.length > 0) {
                for (const page of pdfData.Pages) {
                  if (page.Texts && page.Texts.length > 0) {
                    for (const text of page.Texts) {
                      if (text.R && text.R.length > 0) {
                        for (const run of text.R) {
                          if (run.T) {
                            extractedText += `${decodeURIComponent(run.T)  } `;
                          }
                        }
                      }
                    }
                    extractedText += '\n'; // Add newline after each page
                  }
                }
              }
              
              if (!extractedText.trim()) {
                reject(new Error('Could not extract text from PDF. The file may be corrupted or contain only images.'));
                return;
              }

              // Clean up the extracted text
              const cleanedText = extractedText
                .replace(/\s+/g, ' ') // Replace multiple spaces with single space
                .replace(/\n\s*\n/g, '\n\n') // Replace multiple newlines with double newlines
                .trim();

              resolve(cleanedText);
            } catch (error) {
              reject(error);
            }
          });

          // Parse the PDF buffer
          pdfParser.parseBuffer(pdfBuffer);
        });
        
        finalText = parsedText;
        res.write(`data: ${JSON.stringify({ type: 'progress', stage: 'pdf_processed', message: `Extracted ${finalText.length} characters from PDF` })}\n\n`);
        logger.info(`Successfully processed PDF: ${finalText.length} characters extracted`);
        
      } catch (pdfError) {
        logger.error('PDF processing error:', pdfError);
        res.write(`data: ${JSON.stringify({ type: 'error', error: `PDF processing failed: ${pdfError.message}` })}\n\n`);
        res.end();
        return;
      }
    } else {
      // Use provided text directly
      res.write(`data: ${JSON.stringify({ type: 'progress', stage: 'processing_content', message: 'Processing text content...' })}\n\n`);
      finalText = text;
    }

    // Step 3: IOC Analysis before main AI analysis
    res.write(`data: ${JSON.stringify({ type: 'progress', stage: 'ioc_analysis', message: 'Extracting IOCs and IOAs...' })}\n\n`);
    
    // Simple IOC extraction from finalText
    const iocAnalysis = {
      indicators: [],
      behaviors: [],
      summary: { extraction_method: 'server-side-regex' }
    };
    
    // Extract SHA1 hashes
    const sha1Matches = finalText.match(/\b[a-fA-F0-9]{40}\b/g);
    if (sha1Matches) {
      sha1Matches.forEach(hash => {
        iocAnalysis.indicators.push({
          type: 'sha1',
          value: hash,
          confidence: 'high',
          context: finalText.substring(Math.max(0, finalText.indexOf(hash) - 50), Math.min(finalText.length, finalText.indexOf(hash) + hash.length + 50))
        });
      });
    }
    
    // Extract MD5 hashes
    const md5Matches = finalText.match(/\b[a-fA-F0-9]{32}\b/g);
    if (md5Matches) {
      md5Matches.forEach(hash => {
        iocAnalysis.indicators.push({
          type: 'md5',
          value: hash,
          confidence: 'high',
          context: finalText.substring(Math.max(0, finalText.indexOf(hash) - 50), Math.min(finalText.length, finalText.indexOf(hash) + hash.length + 50))
        });
      });
    }
    
    // Extract SHA256 hashes
    const sha256Matches = finalText.match(/\b[a-fA-F0-9]{64}\b/g);
    if (sha256Matches) {
      sha256Matches.forEach(hash => {
        iocAnalysis.indicators.push({
          type: 'sha256',
          value: hash,
          confidence: 'high',
          context: finalText.substring(Math.max(0, finalText.indexOf(hash) - 50), Math.min(finalText.length, finalText.indexOf(hash) + hash.length + 50))
        });
      });
    }
    
    // Extract IP addresses
    const ipMatches = finalText.match(/\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g);
    if (ipMatches) {
      ipMatches.forEach(ip => {
        // Filter out private IPs for now
        if (!ip.match(/^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.|127\.)/)) {
          iocAnalysis.indicators.push({
            type: 'ipv4',
            value: ip,
            confidence: 'medium',
            context: finalText.substring(Math.max(0, finalText.indexOf(ip) - 50), Math.min(finalText.length, finalText.indexOf(ip) + ip.length + 50))
          });
        }
      });
    }
    
    // Extract domains (basic pattern)
    const domainMatches = finalText.match(/\b[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}\b/g);
    if (domainMatches) {
      domainMatches.forEach(domain => {
        // Simple filter for suspicious domains
        if (domain.length > 4 && !domain.match(/\.(com|org|net|gov|edu|mil|int)$/) || domain.includes('bit.ly') || domain.includes('tinyurl')) {
          iocAnalysis.indicators.push({
            type: 'domain',
            value: domain,
            confidence: 'medium',
            context: finalText.substring(Math.max(0, finalText.indexOf(domain) - 50), Math.min(finalText.length, finalText.indexOf(domain) + domain.length + 50))
          });
        }
      });
    }
    
    // Send IOC analysis results
    if (iocAnalysis.indicators.length > 0) {
      res.write(`data: ${JSON.stringify({ type: 'ioc_analysis', data: iocAnalysis })}\n\n`);
      logger.info(`✅ IOC Analysis complete: Found ${iocAnalysis.indicators.length} indicators`);
    }

    // Step 4: Start AI streaming analysis
    res.write(`data: ${JSON.stringify({ type: 'progress', stage: 'ai_analysis', message: 'Starting AI analysis...' })}\n\n`);

    const analysisPrompt = `You are an expert in cyber threat intelligence and MITRE ATT&CK. Analyze this article and create React Flow nodes and edges directly.

IMPORTANT: Return only a valid JSON object with "nodes" and "edges" arrays. No text before or after.

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

CRITICAL JSON FORMAT - Follow this EXACT structure:
{
  "nodes": [
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
  ]
}

Article: "${finalText.substring(0, 50000)}"

Article text:
`;

    // Make API call based on selected provider
    let aiResponse;
    const fullPrompt = analysisPrompt + finalText.substring(0, 50000);
    const systemMessage = system || "You are an expert in cyber threat intelligence analysis.";
    
    switch (provider?.currentProvider || 'claude') {
      case 'claude':
        aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model,
            max_tokens: 16000,
            temperature: 0.1,
            stream: true,
            messages: [{ role: 'user', content: fullPrompt }],
            system: systemMessage
          }),
        });
        break;
        
      case 'ollama':
        aiResponse = await fetch(`${baseUrl}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            prompt: `${systemMessage}\n\n${fullPrompt}`,
            stream: true,
            options: {
              temperature: 0.1,
              num_predict: 16000,
            }
          }),
        });
        break;
        
      case 'openai':
        aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemMessage },
              { role: 'user', content: fullPrompt }
            ],
            max_tokens: 16000,
            temperature: 0.1,
            stream: true,
          }),
        });
        break;
        
      case 'openrouter':
        aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': 'http://localhost:5173',
            'X-Title': 'ThreatFlow',
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemMessage },
              { role: 'user', content: fullPrompt }
            ],
            max_tokens: 16000,
            temperature: 0.1,
            stream: true,
          }),
        });
        break;
        
      default:
        throw new Error(`Unsupported provider: ${provider?.currentProvider}`);
    }

    logger.info(`AI API Response Status: ${aiResponse.status} ${aiResponse.statusText}`);
    
    if (!aiResponse.ok) {
      const error = await aiResponse.text();
      logger.error(`AI API Error Response: ${error}`);
      res.write(`data: ${JSON.stringify({ type: 'error', error: `AI API Error: ${error}` })}\n\n`);
      res.end();
      return;
    }

    // Stream AI response - node-fetch uses different API than browser fetch
    if (!aiResponse.body) {
      throw new Error('No response body available');
    }

    // Handle streaming with node-fetch - it uses Node.js streams, not ReadableStream
    let totalBytes = 0;
    let buffer = '';
    
    aiResponse.body.on('data', (chunk) => {
      const data = chunk.toString();
      totalBytes += data.length;
      buffer += data;
      
      // Process complete lines
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer
      
      for (const line of lines) {
        if (line.trim().startsWith('data: ')) {
          const eventData = line.slice(6).trim();
          
          if (eventData === '[DONE]') {
            res.write(`data: [DONE]\n\n`);
            continue;
          }
          
          try {
            const parsed = JSON.parse(eventData);
            let normalizedEvent;
            
            // Normalize different provider formats to Claude's content_block_delta format
            switch (provider?.currentProvider || 'claude') {
              case 'claude':
                // Claude format is already correct
                normalizedEvent = parsed;
                break;
                
              case 'openrouter':
              case 'openai':
                // Convert OpenAI/OpenRouter format to Claude format
                if (parsed.choices && parsed.choices[0]?.delta?.content) {
                  normalizedEvent = {
                    type: 'content_block_delta',
                    delta: {
                      text: parsed.choices[0].delta.content
                    }
                  };
                } else {
                  // Pass through other events unchanged
                  normalizedEvent = parsed;
                }
                break;
                
              case 'ollama':
                // Convert Ollama format to Claude format
                if (parsed.response) {
                  normalizedEvent = {
                    type: 'content_block_delta',
                    delta: {
                      text: parsed.response
                    }
                  };
                } else {
                  normalizedEvent = parsed;
                }
                break;
                
              default:
                normalizedEvent = parsed;
            }
            
            res.write(`data: ${JSON.stringify(normalizedEvent)}\n\n`);
            logger.debug('Streaming normalized event', { 
              provider: provider?.currentProvider, 
              originalType: parsed.type || 'unknown',
              normalizedType: normalizedEvent.type || 'unknown',
              hasContent: !!(normalizedEvent.delta?.text || parsed.choices?.[0]?.delta?.content)
            });
            
          } catch (e) {
            // If JSON parsing fails, pass through as-is
            res.write(`data: ${eventData}\n\n`);
          }
        } else if (line.trim()) {
          // Pass through non-data lines (like ": OPENROUTER PROCESSING")
          res.write(`${line  }\n`);
        }
      }
    });

    aiResponse.body.on('end', () => {
      logger.info(`AI streaming completed successfully - Total bytes: ${totalBytes}`);
      res.write(`data: [DONE]\n\n`);
      res.end();
    });

    aiResponse.body.on('error', (error) => {
      logger.error('AI streaming error:', error);
      res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
      res.write(`data: [DONE]\n\n`);
      res.end();
    });

  } catch (err) {
    logger.error('Full-pipeline streaming error:', { message: err.message, stack: err.stack });
    res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
    res.write(`data: [DONE]\n\n`);
    res.end();
  }
});

// Proxy Anthropic API requests
app.use('/anthropic', createProxyMiddleware({
  target: 'https://api.anthropic.com',
  changeOrigin: true,
  pathRewrite: {
    '^/anthropic': '',
  },
  onProxyReq: () => {
    // CORS already handled by app.use(cors()) middleware - no need to override
  },
  onError: (err, _req, res) => {
    logger.error('Proxy error:', err);
    res.status(500).json({ 
      error: 'Proxy error', 
      message: err.message,
      timestamp: new Date().toISOString()
    });
  },
}));

// Error handling middleware
app.use((err, _req, res, _next) => {
  logger.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

// Serve React app for any non-API routes in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
} else {
  // 404 handler for development
  app.use('*', (req, res) => {
    res.status(404).json({
      error: 'Not found',
      message: `Route ${req.originalUrl} not found`,
      timestamp: new Date().toISOString()
    });
  });
}

// Add global error handler middleware
app.use(reliabilityService.createErrorHandler());

// Start server with enhanced monitoring
const server = app.listen(PORT, () => {
  logger.info(`🚀 ThreatFlow server running on port ${PORT}`);
  logger.info(`📊 Health monitoring endpoints:`);
  logger.info(`   • Comprehensive: http://localhost:${PORT}/healthz`);
  logger.info(`   • Readiness probe: http://localhost:${PORT}/ready`);
  logger.info(`   • Liveness probe: http://localhost:${PORT}/health`);
  logger.info(`🔒 Security features enabled:`);
  logger.info(`   • SSRF protection, XSS sanitization, secure tokens`);
  logger.info(`   • Rate limiting, memory protection, correlation IDs`);
  logger.info(`   • Circuit breakers, timeouts, graceful shutdown`);
});

// Setup graceful shutdown with cleanup
reliabilityService.createGracefulShutdown(server, async () => {
  logger.info('Running shutdown cleanup...');
  
  // Close database connections
  try {
    await databaseService.pool.end();
    logger.info('Database connections closed');
  } catch (error) {
    logger.error('Error closing database:', error);
  }
  
  // Close any other resources
  logger.info('All cleanup completed');
}); 