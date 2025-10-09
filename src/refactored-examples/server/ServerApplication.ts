// REFACTORED: Modular server application with proper separation
import express from 'express';
import { SecurityMiddleware } from './middleware/SecurityMiddleware';
import { DatabaseService } from './services/DatabaseService';
import { RouterManager } from './routes/RouterManager';
import { ServiceManager } from './services/ServiceManager';
import { ConfigurationManager } from './config/ConfigurationManager';
import { logger } from '../shared/utils/logger';

export class ServerApplication {
  private app: express.Application;
  private config: ConfigurationManager;
  private databaseService: DatabaseService;
  private serviceManager: ServiceManager;
  private routerManager: RouterManager;

  constructor() {
    this.app = express();
    this.config = new ConfigurationManager();
    this.databaseService = new DatabaseService();
    this.serviceManager = new ServiceManager();
    this.routerManager = new RouterManager();
  }

  async initialize(): Promise<void> {
    try {
      // Load configuration
      await this.config.load();
      
      // Initialize security middleware first
      this.setupSecurityMiddleware();
      
      // Initialize database
      await this.databaseService.initialize(this.config.getDatabaseConfig());
      
      // Initialize enterprise services
      await this.serviceManager.initialize(this.config, this.databaseService);
      
      // Setup routes
      this.setupRoutes();
      
      // Setup error handling
      this.setupErrorHandling();
      
      logger.info('Server application initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize server application', { error });
      throw error;
    }
  }

  private setupSecurityMiddleware(): void {
    const securityMiddleware = new SecurityMiddleware(this.config);
    securityMiddleware.configure(this.app);
  }

  private setupRoutes(): void {
    this.routerManager.configure(this.app, this.serviceManager);
  }

  private setupErrorHandling(): void {
    this.app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.error('Unhandled route error', { 
        error: error.message, 
        path: req.path, 
        method: req.method 
      });
      
      res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    });
  }

  async start(port: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const server = this.app.listen(port, () => {
        logger.info(`ThreatFlow server running on port ${port}`);
        resolve();
      });

      server.on('error', reject);
    });
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down server application...');
    
    try {
      await this.serviceManager.shutdown();
      await this.databaseService.shutdown();
      logger.info('Server application shutdown complete');
    } catch (error) {
      logger.error('Error during shutdown', { error });
      throw error;
    }
  }

  getApp(): express.Application {
    return this.app;
  }
}