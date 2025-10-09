
export type SupportedFormat = 'pdf' | 'docx' | 'pptx' | 'jpg' | 'jpeg' | 'png' | 'gif' | 'webp' | 'txt' | 'url';

export interface UploadFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  format: SupportedFormat;
  preview?: string; // base64 thumbnail
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  error?: string;
  extractedText?: string;
  metadata?: FileMetadata;
}

export interface FileMetadata {
  pageCount?: number;
  slideCount?: number;
  dimensions?: { width: number; height: number };
  author?: string;
  title?: string;
  subject?: string;
  keywords?: string[];
  createdAt?: Date;
  modifiedAt?: Date;
  language?: string;
}

export interface BatchUploadProgress {
  totalFiles: number;
  completedFiles: number;
  failedFiles: number;
  currentFile?: string;
  overallProgress: number;
  estimatedTimeRemaining?: number;
}

export interface ProcessingOptions {
  enableOCR: boolean;
  ocrLanguage: string;
  extractImages: boolean;
  preserveFormatting: boolean;
  combineResults: boolean;
  maxFileSize: number; // MB
  timeout: number; // seconds
}

const DEFAULT_OPTIONS: ProcessingOptions = {
  enableOCR: true,
  ocrLanguage: 'eng',
  extractImages: false,
  preserveFormatting: true,
  combineResults: false,
  maxFileSize: 50,
  timeout: 300,
};

// Supported file type mappings
const FILE_TYPE_MAP: { [key: string]: SupportedFormat } = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'application/msword': 'docx',
  'application/vnd.ms-powerpoint': 'pptx',
  'image/jpeg': 'jpeg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'text/plain': 'txt',
};

// File size limits by format (MB)
const SIZE_LIMITS: { [key in SupportedFormat]: number } = {
  pdf: 50,
  docx: 25,
  pptx: 100,
  jpg: 10,
  jpeg: 10,
  png: 10,
  gif: 10,
  webp: 10,
  txt: 5,
  url: 0,
};

class MultiFormatUploadService {
  private files: Map<string, UploadFile> = new Map();
  private batchProgress: BatchUploadProgress = {
    totalFiles: 0,
    completedFiles: 0,
    failedFiles: 0,
    overallProgress: 0,
  };
  private options: ProcessingOptions = { ...DEFAULT_OPTIONS };
  private callbacks: Set<(progress: BatchUploadProgress) => void> = new Set();
  private fileCallbacks: Set<(file: UploadFile) => void> = new Set();

  // Set processing options
  setOptions(options: Partial<ProcessingOptions>): void {
    this.options = { ...this.options, ...options };
  }

  getOptions(): ProcessingOptions {
    return { ...this.options };
  }

  // Validate file format and size
  validateFile(file: File): { valid: boolean; error?: string; format?: SupportedFormat } {
    const format = FILE_TYPE_MAP[file.type];
    
    if (!format) {
      return { valid: false, error: `Unsupported file type: ${file.type}` };
    }

    const maxSize = SIZE_LIMITS[format];
    if (file.size > maxSize * 1024 * 1024) {
      return { valid: false, error: `File too large. Maximum size for ${format.toUpperCase()} is ${maxSize}MB` };
    }

    if (file.size > this.options.maxFileSize * 1024 * 1024) {
      return { valid: false, error: `File exceeds maximum size limit of ${this.options.maxFileSize}MB` };
    }

    return { valid: true, format };
  }

  // Generate thumbnail preview
  private async generatePreview(file: File, format: SupportedFormat): Promise<string | undefined> {
    try {
      if (format.startsWith('image') || format === 'jpg' || format === 'jpeg' || format === 'png' || format === 'gif' || format === 'webp') {
        return await this.generateImagePreview(file);
      } else if (format === 'pdf') {
        return await this.generatePDFPreview(file);
      } else if (format === 'docx' || format === 'pptx') {
        return await this.generateDocumentPreview(format);
      }
      return undefined;
    } catch (error) {
      console.warn('Failed to generate preview:', error);
      return undefined;
    }
  }

  // Generate image thumbnail
  private async generateImagePreview(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        const maxSize = 150;
        const ratio = Math.min(maxSize / img.width, maxSize / img.height);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  // Generate PDF thumbnail (first page)
  private async generatePDFPreview(file: File): Promise<string> {
    // In a real implementation, you'd use pdf.js or similar
    // For now, return a generic PDF icon as base64
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxwYXRoIGQ9Ik0xNCAySDZhMiAyIDAgMCAwLTIgMnYxNmEyIDIgMCAwIDAgMiAyaDEyYTIgMiAwIDAgMCAyLTJWOGwtNi02eiIgZmlsbD0iI0YzRjRGNiIgc3Ryb2tlPSIjMzc0MTUxIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjxwYXRoIGQ9Im0xNCAyIDYgNi0xNCAwIDAuMDA2LTZ6IiBmaWxsPSIjMzc0MTUxIi8+PHRleHQgeD0iMTIiIHk9IjE2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjMzc0MTUxIiBmb250LXNpemU9IjgiIGZvbnQtZmFtaWx5PSJBcmlhbCI+UERGPC90ZXh0Pjwvc3ZnPg==';
  }

  // Generate document preview (generic icons)
  private async generateDocumentPreview(format: SupportedFormat): Promise<string> {
    const iconColor = format === 'docx' ? '#2B579A' : '#D24726';
    const label = format === 'docx' ? 'DOC' : 'PPT';
    
    const svg = `
      <svg width="150" height="150" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" fill="#F3F4F6" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="m14 2 6 6-14 0 0.006-6z" fill="${iconColor}"/>
        <text x="12" y="16" text-anchor="middle" fill="${iconColor}" font-size="6" font-family="Arial">${label}</text>
      </svg>
    `;
    
    return `data:image/svg+xml;base64,${  btoa(svg)}`;
  }

  // Extract metadata from file
  private async extractMetadata(file: File, format: SupportedFormat): Promise<FileMetadata> {
    const metadata: FileMetadata = {};

    // Basic file info
    if (file.lastModified) {
      metadata.modifiedAt = new Date(file.lastModified);
    }

    // Format-specific metadata extraction
    try {
      if (format === 'pdf') {
        // In real implementation, use pdf-lib or pdf.js
        metadata.pageCount = 1; // Placeholder
      } else if (format === 'pptx') {
        // In real implementation, parse PPTX structure
        metadata.slideCount = 1; // Placeholder
      } else if (format.includes('image') || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(format)) {
        const dimensions = await this.getImageDimensions(file);
        metadata.dimensions = dimensions;
      }
    } catch (error) {
      console.warn('Failed to extract metadata:', error);
    }

    return metadata;
  }

  // Get image dimensions
  private async getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  // Add files to upload queue
  async addFiles(files: FileList | File[]): Promise<UploadFile[]> {
    const fileArray = Array.from(files);
    const uploadFiles: UploadFile[] = [];

    for (const file of fileArray) {
      const validation = this.validateFile(file);
      
      if (!validation.valid) {
        const errorFile: UploadFile = {
          id: `file_${Date.now()}_${Math.random()}`,
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          format: 'pdf', // fallback
          status: 'error',
          progress: 0,
          error: validation.error,
        };
        uploadFiles.push(errorFile);
        this.files.set(errorFile.id, errorFile);
        continue;
      }

      const uploadFile: UploadFile = {
        id: `file_${Date.now()}_${Math.random()}`,
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        format: validation.format!,
        status: 'pending',
        progress: 0,
      };

      // Generate preview and metadata in background
      this.generatePreviewAndMetadata(uploadFile);
      
      uploadFiles.push(uploadFile);
      this.files.set(uploadFile.id, uploadFile);
    }

    this.updateBatchProgress();
    return uploadFiles;
  }

  // Generate preview and metadata in background
  private async generatePreviewAndMetadata(uploadFile: UploadFile): Promise<void> {
    try {
      const [preview, metadata] = await Promise.all([
        this.generatePreview(uploadFile.file, uploadFile.format),
        this.extractMetadata(uploadFile.file, uploadFile.format),
      ]);

      uploadFile.preview = preview;
      uploadFile.metadata = metadata;
      
      this.notifyFileUpdate(uploadFile);
    } catch (error) {
      console.warn('Failed to generate preview/metadata:', error);
    }
  }

  // Process single file
  async processFile(fileId: string): Promise<string> {
    const uploadFile = this.files.get(fileId);
    if (!uploadFile) {
      throw new Error('File not found');
    }

    uploadFile.status = 'processing';
    uploadFile.progress = 0;
    this.notifyFileUpdate(uploadFile);

    try {
      const startTime = Date.now();
      let extractedText = '';

      // Process based on format
      switch (uploadFile.format) {
        case 'pdf':
          extractedText = await this.processPDF(uploadFile);
          break;
        case 'docx':
          extractedText = await this.processWord(uploadFile);
          break;
        case 'pptx':
          extractedText = await this.processPowerPoint(uploadFile);
          break;
        case 'jpg':
        case 'jpeg':
        case 'png':
        case 'gif':
        case 'webp':
          extractedText = await this.processImage(uploadFile);
          break;
        case 'txt':
          extractedText = await this.processText(uploadFile);
          break;
        default:
          throw new Error(`Unsupported format: ${uploadFile.format}`);
      }

      uploadFile.extractedText = extractedText;
      uploadFile.status = 'completed';
      uploadFile.progress = 100;
      
      const processingTime = Date.now() - startTime;
      console.log(`Processed ${uploadFile.name} in ${processingTime}ms`);

      this.notifyFileUpdate(uploadFile);
      this.updateBatchProgress();
      
      return extractedText;
    } catch (error) {
      uploadFile.status = 'error';
      uploadFile.error = error instanceof Error ? error.message : 'Processing failed';
      uploadFile.progress = 0;
      
      this.notifyFileUpdate(uploadFile);
      this.updateBatchProgress();
      
      throw error;
    }
  }

  // Process PDF file
  private async processPDF(uploadFile: UploadFile): Promise<string> {
    // In real implementation, use pdf.js or pdf-parse
    // For now, simulate processing
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        // Simulate PDF text extraction
        setTimeout(() => {
          uploadFile.progress = 50;
          this.notifyFileUpdate(uploadFile);
          
          setTimeout(() => {
            uploadFile.progress = 100;
            resolve(`[PDF Content from ${uploadFile.name}]\n\nThis is simulated PDF text extraction. In a real implementation, this would use a PDF parsing library to extract actual text content from the PDF file.`);
          }, 1000);
        }, 1000);
      };
      reader.onerror = () => reject(new Error('Failed to read PDF file'));
      reader.readAsArrayBuffer(uploadFile.file);
    });
  }

  // Process Word document
  private async processWord(uploadFile: UploadFile): Promise<string> {
    // In real implementation, use mammoth.js or docx library
    return new Promise((resolve) => {
      setTimeout(() => {
        uploadFile.progress = 50;
        this.notifyFileUpdate(uploadFile);
        
        setTimeout(() => {
          resolve(`[Word Document Content from ${uploadFile.name}]\n\nThis is simulated Word document text extraction. In a real implementation, this would use a library like mammoth.js to extract actual text content from the Word document.`);
        }, 800);
      }, 500);
    });
  }

  // Process PowerPoint presentation
  private async processPowerPoint(uploadFile: UploadFile): Promise<string> {
    // In real implementation, use a PPTX parsing library
    return new Promise((resolve) => {
      setTimeout(() => {
        uploadFile.progress = 30;
        this.notifyFileUpdate(uploadFile);
        
        setTimeout(() => {
          uploadFile.progress = 70;
          this.notifyFileUpdate(uploadFile);
          
          setTimeout(() => {
            resolve(`[PowerPoint Content from ${uploadFile.name}]\n\nSlide 1: Title Slide\nSlide 2: Content Overview\nSlide 3: Detailed Analysis\n\nThis is simulated PowerPoint text extraction. In a real implementation, this would parse the PPTX structure to extract actual slide content.`);
          }, 600);
        }, 700);
      }, 400);
    });
  }

  // Process image with OCR
  private async processImage(uploadFile: UploadFile): Promise<string> {
    if (!this.options.enableOCR) {
      return `[Image file: ${uploadFile.name}]\n\nOCR is disabled. Enable OCR in settings to extract text from images.`;
    }

    // In real implementation, use Tesseract.js or cloud OCR service
    return new Promise((resolve) => {
      uploadFile.progress = 20;
      this.notifyFileUpdate(uploadFile);

      setTimeout(() => {
        uploadFile.progress = 60;
        this.notifyFileUpdate(uploadFile);
        
        setTimeout(() => {
          uploadFile.progress = 90;
          this.notifyFileUpdate(uploadFile);
          
          setTimeout(() => {
            resolve(`[OCR Text from ${uploadFile.name}]\n\nThis is simulated OCR text extraction. In a real implementation, this would use Tesseract.js or a cloud OCR service to extract actual text from the image.`);
          }, 500);
        }, 800);
      }, 1000);
    });
  }

  // Process text file
  private async processText(uploadFile: UploadFile): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        uploadFile.progress = 100;
        resolve(text);
      };
      reader.onerror = () => reject(new Error('Failed to read text file'));
      reader.readAsText(uploadFile.file);
    });
  }

  // Process all files in batch
  async processBatch(options?: { combineResults?: boolean; continueOnError?: boolean }): Promise<string[]> {
    const { combineResults = false, continueOnError = true } = options || {};
    const pendingFiles = Array.from(this.files.values()).filter(f => f.status === 'pending');
    
    if (pendingFiles.length === 0) {
      throw new Error('No files to process');
    }

    this.batchProgress = {
      totalFiles: pendingFiles.length,
      completedFiles: 0,
      failedFiles: 0,
      overallProgress: 0,
    };

    const results: string[] = [];
    const startTime = Date.now();

    for (let i = 0; i < pendingFiles.length; i++) {
      const file = pendingFiles[i];
      this.batchProgress.currentFile = file.name;
      
      // Estimate remaining time
      if (i > 0) {
        const elapsed = Date.now() - startTime;
        const avgTimePerFile = elapsed / i;
        this.batchProgress.estimatedTimeRemaining = Math.round((avgTimePerFile * (pendingFiles.length - i)) / 1000);
      }

      try {
        const result = await this.processFile(file.id);
        results.push(result);
        this.batchProgress.completedFiles++;
      } catch (error) {
        this.batchProgress.failedFiles++;
        
        if (!continueOnError) {
          throw error;
        }
        
        console.error(`Failed to process ${file.name}:`, error);
        results.push(`[Error processing ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}]`);
      }

      this.batchProgress.overallProgress = Math.round(((i + 1) / pendingFiles.length) * 100);
      this.notifyProgressUpdate();
    }

    this.batchProgress.currentFile = undefined;
    this.batchProgress.estimatedTimeRemaining = undefined;
    this.notifyProgressUpdate();

    if (combineResults) {
      return [results.join('\n\n---\n\n')];
    }

    return results;
  }

  // Get file by ID
  getFile(fileId: string): UploadFile | null {
    return this.files.get(fileId) || null;
  }

  // Get all files
  getAllFiles(): UploadFile[] {
    return Array.from(this.files.values());
  }

  // Get files by status
  getFilesByStatus(status: UploadFile['status']): UploadFile[] {
    return Array.from(this.files.values()).filter(f => f.status === status);
  }

  // Remove file
  removeFile(fileId: string): boolean {
    const removed = this.files.delete(fileId);
    if (removed) {
      this.updateBatchProgress();
    }
    return removed;
  }

  // Clear all files
  clearFiles(): void {
    this.files.clear();
    this.batchProgress = {
      totalFiles: 0,
      completedFiles: 0,
      failedFiles: 0,
      overallProgress: 0,
    };
    this.notifyProgressUpdate();
  }

  // Get batch progress
  getBatchProgress(): BatchUploadProgress {
    return { ...this.batchProgress };
  }

  // Update batch progress
  private updateBatchProgress(): void {
    const allFiles = Array.from(this.files.values());
    const completed = allFiles.filter(f => f.status === 'completed');
    const failed = allFiles.filter(f => f.status === 'error');
    
    this.batchProgress = {
      totalFiles: allFiles.length,
      completedFiles: completed.length,
      failedFiles: failed.length,
      overallProgress: allFiles.length > 0 ? Math.round(((completed.length + failed.length) / allFiles.length) * 100) : 0,
    };
    
    this.notifyProgressUpdate();
  }

  // Subscribe to progress updates
  onProgressUpdate(callback: (progress: BatchUploadProgress) => void): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  // Subscribe to file updates
  onFileUpdate(callback: (file: UploadFile) => void): () => void {
    this.fileCallbacks.add(callback);
    return () => this.fileCallbacks.delete(callback);
  }

  // Notify progress update
  private notifyProgressUpdate(): void {
    this.callbacks.forEach(callback => callback(this.batchProgress));
  }

  // Notify file update
  private notifyFileUpdate(file: UploadFile): void {
    this.fileCallbacks.forEach(callback => callback(file));
  }

  // Get supported formats
  getSupportedFormats(): SupportedFormat[] {
    return Object.values(FILE_TYPE_MAP);
  }

  // Get size limit for format
  getSizeLimit(format: SupportedFormat): number {
    return SIZE_LIMITS[format];
  }

  // Export upload session
  exportSession(): {
    files: UploadFile[];
    progress: BatchUploadProgress;
    options: ProcessingOptions;
  } {
    return {
      files: Array.from(this.files.values()),
      progress: this.batchProgress,
      options: this.options,
    };
  }

  // Import upload session
  importSession(data: {
    files?: UploadFile[];
    progress?: BatchUploadProgress;
    options?: Partial<ProcessingOptions>;
  }): void {
    if (data.files) {
      this.files.clear();
      data.files.forEach(file => this.files.set(file.id, file));
    }
    
    if (data.progress) {
      this.batchProgress = data.progress;
    }
    
    if (data.options) {
      this.options = { ...this.options, ...data.options };
    }

    this.notifyProgressUpdate();
  }
}

// Export singleton instance
export const multiFormatUploadService = new MultiFormatUploadService();