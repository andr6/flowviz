export interface ScreenshotModeConfig {
  hideControls: boolean;
  hideAttribution: boolean;
  hideUI: boolean;
  hideBackground: boolean;
  customBackground?: string;
  highResolution: boolean;
  cleanView: boolean;
  removeWatermarks: boolean;
}

export const DEFAULT_SCREENSHOT_CONFIG: ScreenshotModeConfig = {
  hideControls: true,
  hideAttribution: true,
  hideUI: true,
  hideBackground: false,
  customBackground: '#0d1117',
  highResolution: true,
  cleanView: true,
  removeWatermarks: true,
};

class ScreenshotModeService {
  private isScreenshotMode = false;
  private originalStyles: Map<string, string> = new Map();
  private config: ScreenshotModeConfig = DEFAULT_SCREENSHOT_CONFIG;

  // CSS selectors for elements to hide in screenshot mode
  private readonly hiddenSelectors = [
    '.react-flow__controls',
    '.react-flow__attribution',
    '.flow-app-bar',
    '.flow-toolbar',
    '.confidence-overlay',
    '.search-filter-controls',
    '.zoom-controls',
    '.cluster-controls',
    '.node-bookmark-panel',
    '.settings-dialog',
    '.command-palette',
    '.breadcrumb',
    '.loading-indicator',
    '.toast-notification',
    '.streaming-progress',
    '.error-boundary',
    '.dialog-overlay',
    '.tooltip',
    '.context-menu',
  ];

  // CSS selectors for UI elements that can be optionally hidden
  private readonly optionalHiddenSelectors = [
    '.flow-background',
    '.react-flow__background',
    '.watermark',
    '.logo',
    '.branding',
  ];

  // Enable screenshot mode
  enableScreenshotMode(customConfig?: Partial<ScreenshotModeConfig>): void {
    if (this.isScreenshotMode) {return;}

    this.config = { ...DEFAULT_SCREENSHOT_CONFIG, ...customConfig };
    this.isScreenshotMode = true;

    // Store original styles before modification
    this.storeOriginalStyles();

    // Apply screenshot mode styles
    this.applyScreenshotStyles();

    // Trigger a small delay to ensure styles are applied
    setTimeout(() => {
      this.optimizeForScreenshot();
    }, 100);
  }

  // Disable screenshot mode
  disableScreenshotMode(): void {
    if (!this.isScreenshotMode) {return;}

    this.isScreenshotMode = false;

    // Restore original styles
    this.restoreOriginalStyles();

    // Clean up any added elements
    this.cleanupScreenshotElements();
  }

  // Check if screenshot mode is active
  isActive(): boolean {
    return this.isScreenshotMode;
  }

  // Get current configuration
  getConfig(): ScreenshotModeConfig {
    return { ...this.config };
  }

  // Update configuration
  updateConfig(updates: Partial<ScreenshotModeConfig>): void {
    this.config = { ...this.config, ...updates };
    
    // If screenshot mode is active, reapply with new config
    if (this.isScreenshotMode) {
      this.disableScreenshotMode();
      this.enableScreenshotMode();
    }
  }

  // Store original styles of elements we'll modify
  private storeOriginalStyles(): void {
    this.originalStyles.clear();

    // Store styles for elements we'll hide
    [...this.hiddenSelectors, ...this.optionalHiddenSelectors].forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach((element, index) => {
        const htmlElement = element as HTMLElement;
        const key = `${selector}_${index}`;
        this.originalStyles.set(key, htmlElement.style.display || '');
      });
    });

    // Store body and main container styles
    const body = document.body;
    const mainContainer = document.querySelector('.flow-visualization-container') as HTMLElement;
    
    if (body) {
      this.originalStyles.set('body_background', body.style.background || '');
      this.originalStyles.set('body_overflow', body.style.overflow || '');
    }

    if (mainContainer) {
      this.originalStyles.set('main_background', mainContainer.style.background || '');
      this.originalStyles.set('main_padding', mainContainer.style.padding || '');
      this.originalStyles.set('main_margin', mainContainer.style.margin || '');
    }
  }

  // Apply screenshot mode styles
  private applyScreenshotStyles(): void {
    // Hide standard UI elements
    if (this.config.hideControls || this.config.hideUI) {
      this.hiddenSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          (element as HTMLElement).style.display = 'none';
        });
      });
    }

    // Hide optional elements based on config
    if (this.config.hideBackground) {
      const backgroundElements = document.querySelectorAll('.react-flow__background, .flow-background');
      backgroundElements.forEach(element => {
        (element as HTMLElement).style.display = 'none';
      });
    }

    if (this.config.removeWatermarks) {
      const watermarkElements = document.querySelectorAll('.watermark, .logo, .branding, .react-flow__attribution');
      watermarkElements.forEach(element => {
        (element as HTMLElement).style.display = 'none';
      });
    }

    // Apply clean background
    if (this.config.customBackground) {
      const body = document.body;
      const mainContainer = document.querySelector('.flow-visualization-container') as HTMLElement;
      
      if (body) {
        body.style.background = this.config.customBackground;
        body.style.overflow = 'hidden';
      }

      if (mainContainer) {
        mainContainer.style.background = this.config.customBackground;
        mainContainer.style.padding = '0';
        mainContainer.style.margin = '0';
      }
    }

    // Add screenshot mode class to body for additional styling
    document.body.classList.add('screenshot-mode');

    // Apply high-resolution styles if enabled
    if (this.config.highResolution) {
      this.applyHighResolutionStyles();
    }
  }

  // Apply high-resolution optimizations
  private applyHighResolutionStyles(): void {
    const style = document.createElement('style');
    style.id = 'screenshot-mode-styles';
    style.textContent = `
      .screenshot-mode .react-flow {
        image-rendering: -webkit-optimize-contrast;
        image-rendering: -moz-crisp-edges;
        image-rendering: crisp-edges;
      }
      
      .screenshot-mode .react-flow__node {
        image-rendering: auto;
        text-rendering: optimizeQuality;
        shape-rendering: geometricPrecision;
      }
      
      .screenshot-mode .react-flow__edge {
        shape-rendering: geometricPrecision;
      }
      
      .screenshot-mode text {
        text-rendering: geometricPrecision;
        font-smooth: always;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }
      
      .screenshot-mode svg {
        shape-rendering: geometricPrecision;
      }
    `;
    
    document.head.appendChild(style);
  }

  // Optimize view for screenshot
  private optimizeForScreenshot(): void {
    // Ensure all animations are paused
    const animatedElements = document.querySelectorAll('[style*="animation"], [style*="transition"]');
    animatedElements.forEach(element => {
      const htmlElement = element as HTMLElement;
      htmlElement.style.animationPlayState = 'paused';
      htmlElement.style.transition = 'none';
    });

    // Force a repaint to ensure all styles are applied
    document.body.offsetHeight; // Trigger reflow
  }

  // Restore original styles
  private restoreOriginalStyles(): void {
    // Restore element display styles
    [...this.hiddenSelectors, ...this.optionalHiddenSelectors].forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach((element, index) => {
        const htmlElement = element as HTMLElement;
        const key = `${selector}_${index}`;
        const originalStyle = this.originalStyles.get(key);
        if (originalStyle !== undefined) {
          htmlElement.style.display = originalStyle;
        }
      });
    });

    // Restore body and container styles
    const body = document.body;
    const mainContainer = document.querySelector('.flow-visualization-container') as HTMLElement;

    if (body) {
      const originalBackground = this.originalStyles.get('body_background');
      const originalOverflow = this.originalStyles.get('body_overflow');
      if (originalBackground !== undefined) {body.style.background = originalBackground;}
      if (originalOverflow !== undefined) {body.style.overflow = originalOverflow;}
    }

    if (mainContainer) {
      const originalBackground = this.originalStyles.get('main_background');
      const originalPadding = this.originalStyles.get('main_padding');
      const originalMargin = this.originalStyles.get('main_margin');
      if (originalBackground !== undefined) {mainContainer.style.background = originalBackground;}
      if (originalPadding !== undefined) {mainContainer.style.padding = originalPadding;}
      if (originalMargin !== undefined) {mainContainer.style.margin = originalMargin;}
    }

    // Remove screenshot mode class
    document.body.classList.remove('screenshot-mode');

    // Re-enable animations and transitions
    const animatedElements = document.querySelectorAll('[style*="animation-play-state"], [style*="transition"]');
    animatedElements.forEach(element => {
      const htmlElement = element as HTMLElement;
      htmlElement.style.animationPlayState = 'running';
      htmlElement.style.removeProperty('transition');
    });

    this.originalStyles.clear();
  }

  // Clean up elements added for screenshot mode
  private cleanupScreenshotElements(): void {
    const screenshotStyles = document.getElementById('screenshot-mode-styles');
    if (screenshotStyles) {
      screenshotStyles.remove();
    }
  }

  // Take a high-quality screenshot
  async takeScreenshot(options?: {
    filename?: string;
    format?: 'png' | 'jpeg' | 'webp';
    quality?: number;
    scale?: number;
    crop?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }): Promise<string> {
    const {
      filename = 'threatflow-analysis',
      format = 'png',
      quality = 1.0,
      scale = 2,
      crop
    } = options || {};

    // Enable screenshot mode temporarily if not already active
    const wasActive = this.isScreenshotMode;
    if (!wasActive) {
      this.enableScreenshotMode();
      // Wait for styles to be applied
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    try {
      const element = document.querySelector('.flow-visualization-container') as HTMLElement;
      if (!element) {
        throw new Error('Flow visualization container not found');
      }

      // Dynamic import of html-to-image to reduce bundle size
      const { toPng, toJpeg, toCanvas } = await import('html-to-image');
      
      const captureOptions = {
        backgroundColor: this.config.customBackground || '#0d1117',
        width: element.offsetWidth * scale,
        height: element.offsetHeight * scale,
        style: {
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          width: `${element.offsetWidth}px`,
          height: `${element.offsetHeight}px`,
        },
        pixelRatio: scale,
        quality,
      };

      let dataUrl: string;

      if (format === 'png') {
        dataUrl = await toPng(element, captureOptions);
      } else if (format === 'jpeg') {
        dataUrl = await toJpeg(element, { ...captureOptions, quality });
      } else {
        // For WebP, we need to use canvas approach
        const canvas = await toCanvas(element, captureOptions);
        dataUrl = canvas.toDataURL(`image/${format}`, quality);
      }

      // Apply cropping if specified
      if (crop) {
        dataUrl = await this.cropImage(dataUrl, crop, scale);
      }

      // Trigger download
      const link = document.createElement('a');
      link.download = `${filename}.${format}`;
      link.href = dataUrl;
      link.click();

      return dataUrl;

    } catch (error) {
      console.error('Screenshot capture failed:', error);
      throw error;
    } finally {
      // Disable screenshot mode if we enabled it temporarily
      if (!wasActive) {
        this.disableScreenshotMode();
      }
    }
  }

  // Crop an image from data URL
  private async cropImage(
    dataUrl: string, 
    crop: { x: number; y: number; width: number; height: number },
    scale: number = 1
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Adjust crop coordinates for scale
        const scaledCrop = {
          x: crop.x * scale,
          y: crop.y * scale,
          width: crop.width * scale,
          height: crop.height * scale,
        };

        canvas.width = scaledCrop.width;
        canvas.height = scaledCrop.height;

        ctx.drawImage(
          img,
          scaledCrop.x, scaledCrop.y, scaledCrop.width, scaledCrop.height,
          0, 0, scaledCrop.width, scaledCrop.height
        );

        resolve(canvas.toDataURL('image/png'));
      };

      img.onerror = () => reject(new Error('Failed to load image for cropping'));
      img.src = dataUrl;
    });
  }

  // Get optimal screenshot dimensions
  getOptimalDimensions(): { width: number; height: number } {
    const container = document.querySelector('.flow-visualization-container') as HTMLElement;
    if (!container) {
      return { width: 1920, height: 1080 };
    }

    return {
      width: container.offsetWidth,
      height: container.offsetHeight,
    };
  }

  // Prepare view for optimal screenshot
  prepareOptimalView(): void {
    // Fit view to show all content
    const reactFlowInstance = (window as any).__reactFlowInstance__;
    if (reactFlowInstance && reactFlowInstance.fitView) {
      reactFlowInstance.fitView({
        padding: 0.1,
        includeHiddenNodes: false,
        duration: 0, // No animation
      });
    }
  }

  // Export screenshot configuration
  exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  // Import screenshot configuration
  importConfig(configJson: string): void {
    try {
      const config = JSON.parse(configJson);
      this.config = { ...DEFAULT_SCREENSHOT_CONFIG, ...config };
    } catch (error) {
      console.error('Failed to import screenshot config:', error);
      throw new Error('Invalid configuration format');
    }
  }
}

// Export singleton instance
export const screenshotModeService = new ScreenshotModeService();