
export interface URLValidationResult {
  url: string;
  isValid: boolean;
  isReachable: boolean;
  isSecure: boolean;
  statusCode?: number;
  contentType?: string;
  title?: string;
  description?: string;
  favicon?: string;
  preview?: URLPreview;
  metadata?: URLMetadata;
  warnings: string[];
  errors: string[];
  timestamp: number;
}

export interface URLPreview {
  title: string;
  description: string;
  image?: string;
  favicon?: string;
  siteName?: string;
  url: string;
  type: 'website' | 'article' | 'pdf' | 'image' | 'video' | 'unknown';
  wordCount?: number;
  readingTime?: number;
}

export interface URLMetadata {
  title?: string;
  description?: string;
  keywords?: string[];
  author?: string;
  publishedDate?: string;
  modifiedDate?: string;
  lang?: string;
  charset?: string;
  robots?: string;
  canonical?: string;
  ogData?: OpenGraphData;
  twitterData?: TwitterCardData;
  structured?: StructuredData[];
}

export interface OpenGraphData {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
  siteName?: string;
  locale?: string;
}

export interface TwitterCardData {
  card?: string;
  title?: string;
  description?: string;
  image?: string;
  creator?: string;
  site?: string;
}

export interface StructuredData {
  type: string;
  data: any;
}

export interface ValidationOptions {
  timeout: number; // milliseconds
  followRedirects: boolean;
  maxRedirects: number;
  checkSSL: boolean;
  extractPreview: boolean;
  extractMetadata: boolean;
  checkContent: boolean;
  userAgent: string;
  headers: { [key: string]: string };
}

const DEFAULT_OPTIONS: ValidationOptions = {
  timeout: 10000,
  followRedirects: true,
  maxRedirects: 5,
  checkSSL: true,
  extractPreview: true,
  extractMetadata: true,
  checkContent: true,
  userAgent: 'ThreatFlow URL Validator 1.0',
  headers: {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate',
    'DNT': '1',
    'Connection': 'keep-alive',
  },
};

// Common security threats in URLs
const SUSPICIOUS_PATTERNS = [
  /bit\.ly|tinyurl|goo\.gl|t\.co|ow\.ly|is\.gd|buff\.ly/i, // URL shorteners
  /[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/,      // IP addresses
  /[а-яё]/i,                                                // Cyrillic characters (IDN attacks)
  /[א-ת]/i,                                                 // Hebrew characters
  /[ا-ي]/i,                                                 // Arabic characters
  /xn--/i,                                                  // Punycode
  /-{2,}/,                                                  // Multiple hyphens
  /[0-9]{10,}/,                                            // Long numeric strings
];

const MALICIOUS_DOMAINS = [
  'malware.com',
  'phishing.example',
  'suspicious.site',
  // Add more known malicious domains
];

const SAFE_DOMAINS = [
  'github.com',
  'stackoverflow.com',
  'wikipedia.org',
  'microsoft.com',
  'google.com',
  'amazon.com',
  'cloudflare.com',
  'mozilla.org',
  // Add more trusted domains
];

class URLValidationService {
  private cache: Map<string, URLValidationResult> = new Map();
  private options: ValidationOptions = { ...DEFAULT_OPTIONS };
  private callbacks: Set<(result: URLValidationResult) => void> = new Set();

  // Set validation options
  setOptions(options: Partial<ValidationOptions>): void {
    this.options = { ...this.options, ...options };
  }

  getOptions(): ValidationOptions {
    return { ...this.options };
  }

  // Basic URL format validation
  private validateURLFormat(url: string): { valid: boolean; error?: string; normalized?: string } {
    try {
      // Normalize URL
      let normalizedUrl = url.trim();
      
      // Add protocol if missing
      if (!/^https?:\/\//i.test(normalizedUrl)) {
        normalizedUrl = `https://${  normalizedUrl}`;
      }

      const urlObj = new URL(normalizedUrl);
      
      // Check for suspicious patterns
      const suspiciousPattern = SUSPICIOUS_PATTERNS.find(pattern => pattern.test(urlObj.href));
      if (suspiciousPattern) {
        return { 
          valid: true, 
          normalized: normalizedUrl,
          error: 'URL contains suspicious patterns that may indicate malicious content'
        };
      }

      // Check against known malicious domains
      if (MALICIOUS_DOMAINS.some(domain => urlObj.hostname.includes(domain))) {
        return { 
          valid: false, 
          error: 'URL is on the list of known malicious domains'
        };
      }

      return { valid: true, normalized: normalizedUrl };
    } catch (error) {
      return { 
        valid: false, 
        error: 'Invalid URL format'
      };
    }
  }

  // Check if URL is reachable
  private async checkReachability(url: string): Promise<{
    reachable: boolean;
    statusCode?: number;
    contentType?: string;
    headers?: { [key: string]: string };
    error?: string;
  }> {
    try {
      // In a real implementation, this would use a proxy server to avoid CORS
      // For now, we'll simulate the check
      const response = await this.simulateHTTPRequest(url);
      
      return {
        reachable: response.status >= 200 && response.status < 400,
        statusCode: response.status,
        contentType: response.contentType,
        headers: response.headers,
      };
    } catch (error) {
      return {
        reachable: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // Simulate HTTP request (in real implementation, use server-side proxy)
  private async simulateHTTPRequest(url: string): Promise<{
    status: number;
    contentType: string;
    headers: { [key: string]: string };
    body: string;
  }> {
    // Simulate different responses based on URL patterns
    const urlObj = new URL(url);
    
    // Simulate timeout
    await new Promise(resolve => setTimeout(resolve, Math.random() * 2000));

    if (urlObj.hostname.includes('github.com')) {
      return {
        status: 200,
        contentType: 'text/html; charset=utf-8',
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'server': 'GitHub.com',
        },
        body: `
          <html>
            <head>
              <title>GitHub Repository</title>
              <meta name="description" content="GitHub repository for threat intelligence">
              <meta property="og:title" content="Threat Intelligence Repository">
              <meta property="og:description" content="Collection of threat intelligence indicators and reports">
              <meta property="og:image" content="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png">
            </head>
            <body>Sample GitHub content</body>
          </html>
        `,
      };
    }

    if (urlObj.pathname.endsWith('.pdf')) {
      return {
        status: 200,
        contentType: 'application/pdf',
        headers: {
          'content-type': 'application/pdf',
          'content-length': '1234567',
        },
        body: 'PDF content',
      };
    }

    // Default response
    return {
      status: 200,
      contentType: 'text/html; charset=utf-8',
      headers: {
        'content-type': 'text/html; charset=utf-8',
      },
      body: `
        <html>
          <head>
            <title>Sample Website</title>
            <meta name="description" content="Sample website for URL validation">
          </head>
          <body>Sample content</body>
        </html>
      `,
    };
  }

  // Extract preview data from HTML
  private extractPreviewData(html: string, url: string): URLPreview {
    // In a real implementation, use a proper HTML parser
    const preview: URLPreview = {
      title: '',
      description: '',
      url,
      type: 'website',
    };

    // Extract title
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/is);
    if (titleMatch) {
      preview.title = titleMatch[1].trim();
    }

    // Extract meta description
    const descMatch = html.match(/<meta\s+name=["\']description["\'][^>]+content=["\']([^"\']*)["\'][^>]*>/i);
    if (descMatch) {
      preview.description = descMatch[1].trim();
    }

    // Extract Open Graph data
    const ogTitle = html.match(/<meta\s+property=["\']og:title["\'][^>]+content=["\']([^"\']*)["\'][^>]*>/i);
    if (ogTitle) {
      preview.title = ogTitle[1].trim();
    }

    const ogDesc = html.match(/<meta\s+property=["\']og:description["\'][^>]+content=["\']([^"\']*)["\'][^>]*>/i);
    if (ogDesc) {
      preview.description = ogDesc[1].trim();
    }

    const ogImage = html.match(/<meta\s+property=["\']og:image["\'][^>]+content=["\']([^"\']*)["\'][^>]*>/i);
    if (ogImage) {
      preview.image = ogImage[1].trim();
    }

    const ogSiteName = html.match(/<meta\s+property=["\']og:site_name["\'][^>]+content=["\']([^"\']*)["\'][^>]*>/i);
    if (ogSiteName) {
      preview.siteName = ogSiteName[1].trim();
    }

    // Estimate reading time
    const textContent = html.replace(/<[^>]*>/g, '').trim();
    const wordCount = textContent.split(/\s+/).length;
    preview.wordCount = wordCount;
    preview.readingTime = Math.ceil(wordCount / 200); // Average 200 words per minute

    // Determine content type
    if (url.includes('github.com')) {
      preview.type = 'article';
    } else if (url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      preview.type = 'image';
    } else if (url.match(/\.(mp4|avi|mov|wmv)$/i)) {
      preview.type = 'video';
    } else if (url.match(/\.pdf$/i)) {
      preview.type = 'pdf';
    }

    return preview;
  }

  // Extract detailed metadata
  private extractMetadata(html: string, url: string): URLMetadata {
    const metadata: URLMetadata = {};

    // Basic meta tags
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/is);
    if (titleMatch) {
      metadata.title = titleMatch[1].trim();
    }

    const descMatch = html.match(/<meta\s+name=["\']description["\'][^>]+content=["\']([^"\']*)["\'][^>]*>/i);
    if (descMatch) {
      metadata.description = descMatch[1].trim();
    }

    const keywordsMatch = html.match(/<meta\s+name=["\']keywords["\'][^>]+content=["\']([^"\']*)["\'][^>]*>/i);
    if (keywordsMatch) {
      metadata.keywords = keywordsMatch[1].split(',').map(k => k.trim());
    }

    const authorMatch = html.match(/<meta\s+name=["\']author["\'][^>]+content=["\']([^"\']*)["\'][^>]*>/i);
    if (authorMatch) {
      metadata.author = authorMatch[1].trim();
    }

    // Open Graph data
    metadata.ogData = {
      title: this.extractMetaProperty(html, 'og:title'),
      description: this.extractMetaProperty(html, 'og:description'),
      image: this.extractMetaProperty(html, 'og:image'),
      url: this.extractMetaProperty(html, 'og:url'),
      type: this.extractMetaProperty(html, 'og:type'),
      siteName: this.extractMetaProperty(html, 'og:site_name'),
      locale: this.extractMetaProperty(html, 'og:locale'),
    };

    // Twitter Card data
    metadata.twitterData = {
      card: this.extractMetaProperty(html, 'twitter:card'),
      title: this.extractMetaProperty(html, 'twitter:title'),
      description: this.extractMetaProperty(html, 'twitter:description'),
      image: this.extractMetaProperty(html, 'twitter:image'),
      creator: this.extractMetaProperty(html, 'twitter:creator'),
      site: this.extractMetaProperty(html, 'twitter:site'),
    };

    return metadata;
  }

  // Extract meta property value
  private extractMetaProperty(html: string, property: string): string | undefined {
    const regex = new RegExp(`<meta\\s+(?:property|name)=["']${property}["'][^>]+content=["']([^"']*)["'][^>]*>`, 'i');
    const match = html.match(regex);
    return match ? match[1].trim() : undefined;
  }

  // Validate single URL
  async validateURL(url: string, useCache: boolean = true): Promise<URLValidationResult> {
    const normalizedUrl = url.trim();
    
    // Check cache first
    if (useCache && this.cache.has(normalizedUrl)) {
      const cached = this.cache.get(normalizedUrl)!;
      // Return cached result if less than 5 minutes old
      if (Date.now() - cached.timestamp < 5 * 60 * 1000) {
        return cached;
      }
    }

    const result: URLValidationResult = {
      url: normalizedUrl,
      isValid: false,
      isReachable: false,
      isSecure: false,
      warnings: [],
      errors: [],
      timestamp: Date.now(),
    };

    try {
      // 1. Format validation
      const formatValidation = this.validateURLFormat(normalizedUrl);
      if (!formatValidation.valid) {
        result.errors.push(formatValidation.error || 'Invalid URL format');
        this.cache.set(normalizedUrl, result);
        this.notifyValidation(result);
        return result;
      }

      result.isValid = true;
      result.url = formatValidation.normalized || normalizedUrl;

      // Check HTTPS
      result.isSecure = result.url.startsWith('https://');
      if (!result.isSecure) {
        result.warnings.push('URL does not use HTTPS encryption');
      }

      if (formatValidation.error) {
        result.warnings.push(formatValidation.error);
      }

      // 2. Reachability check
      if (this.options.checkContent) {
        const reachabilityCheck = await this.checkReachability(result.url);
        result.isReachable = reachabilityCheck.reachable;
        result.statusCode = reachabilityCheck.statusCode;
        result.contentType = reachabilityCheck.contentType;

        if (!result.isReachable) {
          result.errors.push(reachabilityCheck.error || 'URL is not reachable');
        } else if (result.statusCode && result.statusCode >= 400) {
          result.warnings.push(`Server returned status code ${result.statusCode}`);
        }

        // 3. Content extraction
        if (result.isReachable && this.options.extractPreview) {
          try {
            const response = await this.simulateHTTPRequest(result.url);
            
            if (response.contentType.includes('text/html')) {
              // Extract preview
              if (this.options.extractPreview) {
                result.preview = this.extractPreviewData(response.body, result.url);
                result.title = result.preview.title;
                result.description = result.preview.description;
              }

              // Extract metadata
              if (this.options.extractMetadata) {
                result.metadata = this.extractMetadata(response.body, result.url);
              }
            } else if (response.contentType.includes('application/pdf')) {
              result.preview = {
                title: 'PDF Document',
                description: 'PDF document for threat intelligence analysis',
                url: result.url,
                type: 'pdf',
              };
            } else if (response.contentType.includes('image/')) {
              result.preview = {
                title: 'Image',
                description: 'Image file for threat intelligence analysis',
                url: result.url,
                type: 'image',
                image: result.url,
              };
            }
          } catch (error) {
            result.warnings.push('Failed to extract content preview');
          }
        }
      } else {
        // Skip reachability check but mark as potentially reachable
        result.isReachable = true;
      }

      // 4. Security assessment
      const urlObj = new URL(result.url);
      
      // Check for trusted domains
      if (SAFE_DOMAINS.some(domain => urlObj.hostname.includes(domain))) {
        result.warnings = result.warnings.filter(w => !w.includes('suspicious patterns'));
      }

      // Additional security checks
      if (urlObj.hostname.match(/^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$/)) {
        result.warnings.push('URL uses IP address instead of domain name');
      }

      if (urlObj.hostname.includes('xn--')) {
        result.warnings.push('URL contains internationalized domain name (IDN)');
      }

      if (urlObj.pathname.includes('..')) {
        result.warnings.push('URL contains path traversal patterns');
      }

    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Validation failed');
    }

    // Cache result
    this.cache.set(normalizedUrl, result);
    
    // Notify subscribers
    this.notifyValidation(result);

    return result;
  }

  // Validate multiple URLs
  async validateURLs(urls: string[]): Promise<URLValidationResult[]> {
    const results = await Promise.all(
      urls.map(url => this.validateURL(url))
    );
    return results;
  }

  // Get cached validation result
  getCachedResult(url: string): URLValidationResult | null {
    return this.cache.get(url.trim()) || null;
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear();
  }

  // Clear expired cache entries
  clearExpiredCache(): void {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes

    for (const [url, result] of this.cache.entries()) {
      if (now - result.timestamp > maxAge) {
        this.cache.delete(url);
      }
    }
  }

  // Get cache statistics
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0, // Would need to track hits/misses
    };
  }

  // Prevalidate common URLs
  async prevalidateCommonURLs(): Promise<void> {
    const commonUrls = [
      'https://github.com',
      'https://mitre.org',
      'https://attack.mitre.org',
      'https://cve.mitre.org',
      'https://nvd.nist.gov',
    ];

    await Promise.all(commonUrls.map(url => this.validateURL(url, false)));
  }

  // Check if URL is likely to contain threat intelligence
  assessThreatIntelRelevance(result: URLValidationResult): {
    score: number; // 0-100
    indicators: string[];
    confidence: 'low' | 'medium' | 'high';
  } {
    let score = 0;
    const indicators: string[] = [];
    
    // Check domain reputation
    const urlObj = new URL(result.url);
    const threateIntelDomains = [
      'mitre.org',
      'attack.mitre.org',
      'cve.mitre.org',
      'nvd.nist.gov',
      'cisa.gov',
      'us-cert.gov',
      'fireeye.com',
      'crowdstrike.com',
      'mandiant.com',
      'virustotal.com',
    ];

    if (threateIntelDomains.some(domain => urlObj.hostname.includes(domain))) {
      score += 40;
      indicators.push('Trusted threat intelligence domain');
    }

    // Check title and description for relevant keywords
    const threatKeywords = [
      'cve', 'vulnerability', 'threat', 'malware', 'apt', 'attack',
      'exploit', 'security', 'incident', 'breach', 'phishing',
      'ransomware', 'trojan', 'backdoor', 'botnet', 'c2', 'ioc',
      'indicator', 'compromise', 'forensic', 'analysis'
    ];

    const content = [
      result.title || '',
      result.description || '',
      result.preview?.title || '',
      result.preview?.description || ''
    ].join(' ').toLowerCase();

    let keywordMatches = 0;
    threatKeywords.forEach(keyword => {
      if (content.includes(keyword)) {
        keywordMatches++;
      }
    });

    if (keywordMatches > 0) {
      score += Math.min(keywordMatches * 5, 30);
      indicators.push(`Contains ${keywordMatches} threat intelligence keywords`);
    }

    // Check file type relevance
    if (result.contentType?.includes('application/pdf')) {
      score += 15;
      indicators.push('PDF document (common for threat reports)');
    }

    // Determine confidence
    let confidence: 'low' | 'medium' | 'high';
    if (score >= 70) {confidence = 'high';}
    else if (score >= 40) {confidence = 'medium';}
    else {confidence = 'low';}

    return { score, indicators, confidence };
  }

  // Subscribe to validation updates
  onValidation(callback: (result: URLValidationResult) => void): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  // Notify validation
  private notifyValidation(result: URLValidationResult): void {
    this.callbacks.forEach(callback => callback(result));
  }

  // Export validation history
  exportValidationHistory(): URLValidationResult[] {
    return Array.from(this.cache.values()).sort((a, b) => b.timestamp - a.timestamp);
  }

  // Import validation history
  importValidationHistory(results: URLValidationResult[]): void {
    results.forEach(result => {
      this.cache.set(result.url, result);
    });
  }
}

// Export singleton instance
export const urlValidationService = new URLValidationService();