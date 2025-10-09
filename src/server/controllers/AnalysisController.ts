import { Request, Response } from 'express';

import { logger } from '../../shared/utils/logger.js';
import { AnalysisService } from '../services/AnalysisService';
import { FileProcessorService } from '../services/FileProcessorService';
import { StreamingService } from '../services/StreamingService';

export class AnalysisController {
  constructor(
    private analysisService: AnalysisService,
    private fileProcessor: FileProcessorService,
    private streamingService: StreamingService
  ) {}

  /**
   * Handles streaming analysis requests
   * Single responsibility: Route handling and response management
   */
  async streamAnalysis(req: Request, res: Response): Promise<void> {
    const { provider, analysisType, content } = req.body;
    
    try {
      // Validate request
      const validationResult = this.analysisService.validateRequest(req.body);
      if (!validationResult.isValid) {
        res.status(400).json({ error: validationResult.error });
        return;
      }

      // Set up streaming response
      this.streamingService.setupStreamingResponse(res);

      // Process analysis with streaming
      await this.analysisService.processStreamingAnalysis({
        provider,
        analysisType,
        content,
        onChunk: (chunk: string) => {
          this.streamingService.sendChunk(res, chunk);
        },
        onComplete: () => {
          this.streamingService.endStream(res);
        },
        onError: (error: Error) => {
          this.streamingService.sendError(res, error);
        }
      });

    } catch (error) {
      logger.error('Stream analysis failed', { error, analysisType });
      this.streamingService.sendError(res, error as Error);
    }
  }

  /**
   * Handles file upload and processing
   */
  async processFile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      const processedContent = await this.fileProcessor.processFile(req.file);
      res.json({ content: processedContent });

    } catch (error) {
      logger.error('File processing failed', { error, filename: req.file?.originalname });
      res.status(500).json({ error: 'File processing failed' });
    }
  }

  /**
   * Validates provider API keys
   */
  async validateProvider(req: Request, res: Response): Promise<void> {
    const { provider, apiKey } = req.body;

    try {
      const isValid = await this.analysisService.validateProviderCredentials(provider, apiKey);
      res.json({ valid: isValid });

    } catch (error) {
      logger.error('Provider validation failed', { error, provider });
      res.status(500).json({ error: 'Provider validation failed' });
    }
  }
}