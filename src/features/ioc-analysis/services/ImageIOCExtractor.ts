import { IOC } from '../types/IOC';

import { IOCExtractorService } from './IOCExtractorService';

/**
 * Service for extracting IOCs from images using OCR and AI vision models
 */
export class ImageIOCExtractor {
  private textExtractor: IOCExtractorService;

  constructor() {
    this.textExtractor = new IOCExtractorService({
      enabledExtractors: { text: true, image: true, metadata: true },
      confidence: { imageOCR: 0.6, textRegexMatch: 0.7, aiExtracted: 0.8, contextualMatch: 0.7 }
    });
  }

  /**
   * Extract IOCs from image using multiple methods
   */
  async extractFromImage(
    imageData: string | ArrayBuffer | Blob,
    imageUrl?: string,
    metadata?: { filename?: string; source?: string }
  ): Promise<IOC[]> {
    const extractedIOCs: IOC[] = [];

    try {
      // Method 1: OCR-based extraction (using browser APIs or external service)
      const ocrIOCs = await this.extractUsingOCR(imageData, imageUrl, metadata);
      extractedIOCs.push(...ocrIOCs);

      // Method 2: AI Vision model extraction (using AI provider vision capabilities)
      const aiVisionIOCs = await this.extractUsingAIVision(imageData, imageUrl, metadata);
      extractedIOCs.push(...aiVisionIOCs);

      // Method 3: Metadata extraction (EXIF, filename, etc.)
      const metadataIOCs = await this.extractFromMetadata(imageData, metadata);
      extractedIOCs.push(...metadataIOCs);

      // Deduplicate and return
      return this.deduplicateIOCs(extractedIOCs);
    } catch (error) {
      console.error('Image IOC extraction failed:', error);
      return [];
    }
  }

  /**
   * Extract IOCs using OCR (Optical Character Recognition)
   */
  private async extractUsingOCR(
    imageData: string | ArrayBuffer | Blob,
    imageUrl?: string,
    metadata?: any
  ): Promise<IOC[]> {
    try {
      // Option 1: Use Tesseract.js (client-side OCR)
      if (typeof window !== 'undefined' && (window as any).Tesseract) {
        return await this.extractUsingTesseract(imageData, metadata);
      }

      // Option 2: Use browser's experimental OCR APIs
      if ('TextDetector' in window) {
        return await this.extractUsingTextDetector(imageData, metadata);
      }

      // Option 3: Use AI provider vision APIs (Claude Vision, GPT-4V, etc.)
      if (imageUrl || typeof imageData === 'string') {
        return await this.extractUsingAIProviderOCR(imageData, metadata);
      }

      console.warn('No OCR method available in current environment');
      return [];
    } catch (error) {
      console.error('OCR extraction failed:', error);
      return [];
    }
  }

  /**
   * Extract IOCs using AI Vision models
   */
  private async extractUsingAIVision(
    imageData: string | ArrayBuffer | Blob,
    imageUrl?: string,
    metadata?: any
  ): Promise<IOC[]> {
    try {
      // This would integrate with AI providers that support vision
      // For now, return placeholder
      const visionPrompt = `Analyze this cybersecurity-related image and extract all visible IOCs including:
- IP addresses and domains
- File hashes (MD5, SHA1, SHA256)
- URLs and email addresses
- File paths and names
- Command line strings
- Registry keys
- Process names
- Any other technical indicators visible in the image

Return results in JSON format with type, value, confidence, and context for each IOC found.`;

      // This would make actual API call to vision-capable AI model
      // const result = await aiProvider.analyzeImage(imageData, visionPrompt);
      
      console.warn('AI Vision IOC extraction not yet implemented - requires AI provider integration');
      return [];
    } catch (error) {
      console.error('AI Vision extraction failed:', error);
      return [];
    }
  }

  /**
   * Extract IOCs from image metadata
   */
  private async extractFromMetadata(
    imageData: string | ArrayBuffer | Blob,
    metadata?: { filename?: string; source?: string }
  ): Promise<IOC[]> {
    const iocs: IOC[] = [];
    const now = new Date();

    try {
      // Extract from filename if provided
      if (metadata?.filename) {
        const filenameIOCs = await this.textExtractor.extractFromText(
          metadata.filename,
          'image-filename'
        );
        iocs.push(...filenameIOCs);
      }

      // Extract from EXIF data (if available)
      if (imageData instanceof Blob || imageData instanceof ArrayBuffer) {
        const exifIOCs = await this.extractFromEXIF(imageData);
        iocs.push(...exifIOCs);
      }

      // Extract from source URL if provided
      if (metadata?.source) {
        const sourceIOCs = await this.textExtractor.extractFromText(
          metadata.source,
          'image-source'
        );
        iocs.push(...sourceIOCs);
      }

      return iocs;
    } catch (error) {
      console.error('Metadata extraction failed:', error);
      return [];
    }
  }

  /**
   * Extract IOCs using Tesseract.js OCR library
   */
  private async extractUsingTesseract(
    imageData: string | ArrayBuffer | Blob,
    metadata?: any
  ): Promise<IOC[]> {
    try {
      const { createWorker } = (window as any).Tesseract;
      const worker = await createWorker();
      await worker.loadLanguage('eng');
      await worker.initialize('eng');

      // Configure for better technical text recognition
      await worker.setParameters({
        tessedit_char_whitelist: '0123456789ABCDEFabcdef.:/-_()[]{}@#$%^&*+=|\\~`'
      });

      const { data: { text } } = await worker.recognize(imageData);
      await worker.terminate();

      // Extract IOCs from OCR text
      const ocrIOCs = await this.textExtractor.extractFromText(text, 'image-ocr');
      
      // Mark as image source and adjust confidence
      return ocrIOCs.map(ioc => ({
        ...ioc,
        source: 'image' as const,
        sourceLocation: 'ocr-extracted',
        confidence: this.adjustOCRConfidence(ioc.confidence, text, ioc.value)
      }));
    } catch (error) {
      console.error('Tesseract OCR failed:', error);
      return [];
    }
  }

  /**
   * Extract IOCs using browser TextDetector API (experimental)
   */
  private async extractUsingTextDetector(
    imageData: string | ArrayBuffer | Blob,
    metadata?: any
  ): Promise<IOC[]> {
    try {
      const detector = new (window as any).TextDetector();
      const canvas = await this.imageToCanvas(imageData);
      const detectedText = await detector.detect(canvas);

      let fullText = '';
      for (const textItem of detectedText) {
        fullText += `${textItem.rawValue  } `;
      }

      // Extract IOCs from detected text
      const textIOCs = await this.textExtractor.extractFromText(fullText, 'image-textdetector');
      
      return textIOCs.map(ioc => ({
        ...ioc,
        source: 'image' as const,
        sourceLocation: 'textdetector-extracted'
      }));
    } catch (error) {
      console.error('TextDetector extraction failed:', error);
      return [];
    }
  }

  /**
   * Extract IOCs using AI provider OCR/Vision APIs
   */
  private async extractUsingAIProviderOCR(
    imageData: string | ArrayBuffer | Blob,
    metadata?: any
  ): Promise<IOC[]> {
    try {
      // This would integrate with existing AI providers in the app
      // For now, return placeholder
      console.warn('AI Provider OCR not yet implemented - requires integration with existing AI providers');
      return [];
    } catch (error) {
      console.error('AI Provider OCR failed:', error);
      return [];
    }
  }

  /**
   * Extract IOCs from EXIF data
   */
  private async extractFromEXIF(imageData: ArrayBuffer | Blob): Promise<IOC[]> {
    try {
      // This would use an EXIF library like piexifjs or exif-js
      // For now, return placeholder
      console.warn('EXIF extraction not yet implemented - requires EXIF parsing library');
      return [];
    } catch (error) {
      console.error('EXIF extraction failed:', error);
      return [];
    }
  }

  /**
   * Convert image data to canvas for processing
   */
  private async imageToCanvas(imageData: string | ArrayBuffer | Blob): Promise<HTMLCanvasElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        resolve(canvas);
      };
      
      img.onerror = reject;
      
      if (typeof imageData === 'string') {
        img.src = imageData;
      } else {
        const url = URL.createObjectURL(imageData instanceof ArrayBuffer ? new Blob([imageData]) : imageData);
        img.src = url;
        img.onload = () => {
          URL.revokeObjectURL(url);
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }
          
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          resolve(canvas);
        };
      }
    });
  }

  /**
   * Adjust OCR confidence based on text quality and IOC validation
   */
  private adjustOCRConfidence(
    baseConfidence: 'low' | 'medium' | 'high',
    ocrText: string,
    iocValue: string
  ): 'low' | 'medium' | 'high' {
    // Lower confidence for OCR results
    if (baseConfidence === 'high') {return 'medium';}
    if (baseConfidence === 'medium') {return 'low';}
    return 'low';
  }

  /**
   * Deduplicate IOCs extracted from multiple methods
   */
  private deduplicateIOCs(iocs: IOC[]): IOC[] {
    const seen = new Map<string, IOC>();
    
    for (const ioc of iocs) {
      const key = `${ioc.type}:${ioc.value.toLowerCase()}`;
      if (!seen.has(key) || this.getConfidenceScore(ioc.confidence) > this.getConfidenceScore(seen.get(key)!.confidence)) {
        seen.set(key, ioc);
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

  /**
   * Batch process multiple images
   */
  async extractFromImages(images: Array<{
    data: string | ArrayBuffer | Blob;
    url?: string;
    metadata?: { filename?: string; source?: string };
  }>): Promise<IOC[]> {
    const allIOCs: IOC[] = [];
    
    for (const image of images) {
      try {
        const imageIOCs = await this.extractFromImage(image.data, image.url, image.metadata);
        allIOCs.push(...imageIOCs);
      } catch (error) {
        console.error(`Failed to extract IOCs from image:`, error);
      }
    }
    
    return this.deduplicateIOCs(allIOCs);
  }
}