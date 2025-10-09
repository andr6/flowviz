import axios from 'axios';

import { IMAGE_DOWNLOAD_CONFIG } from '../config';
import { IImageDownloader } from '../interfaces';
import { ImageInfo } from '../types';

export class ImageDownloader implements IImageDownloader {
  async downloadAsBase64(imageInfo: ImageInfo): Promise<string> {
    const downloadResult = await this.downloadWithMetadata(imageInfo);
    return downloadResult.base64Data;
  }

  async downloadWithMetadata(imageInfo: ImageInfo): Promise<{ base64Data: string; mediaType: string; }> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= IMAGE_DOWNLOAD_CONFIG.maxRetries; attempt++) {
      try {
        console.log(`Downloading image (attempt ${attempt}): ${imageInfo.src}`);
        
        // Use the proxy server to fetch images to avoid CORS issues
        const response = await axios.get(IMAGE_DOWNLOAD_CONFIG.apiEndpoint, {
          params: { url: imageInfo.src },
          responseType: 'json', // Get JSON response with base64 and mediaType
          timeout: IMAGE_DOWNLOAD_CONFIG.timeout,
        });
        
        const { base64, mediaType } = response.data;
        
        if (!base64) {
          throw new Error('Server returned empty base64 data');
        }
        
        console.log(`Successfully downloaded image (${base64.length} base64 chars, type: ${mediaType})`);
        
        return { base64Data: base64, mediaType };
        
      } catch (error) {
        lastError = error as Error;
        console.warn(`Download attempt ${attempt} failed for ${imageInfo.src}:`, error);
        
        if (attempt < IMAGE_DOWNLOAD_CONFIG.maxRetries) {
          // Wait before retry with exponential backoff
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          await this.wait(delay);
        }
      }
    }
    
    throw new Error(`Failed to download image after ${IMAGE_DOWNLOAD_CONFIG.maxRetries} attempts: ${imageInfo.src}. Last error: ${lastError?.message}`);
  }

  async downloadMultiple(images: ImageInfo[]): Promise<ImageInfo[]> {
    const imagesWithBase64: ImageInfo[] = [];
    
    for (const image of images) {
      try {
        const { base64Data, mediaType } = await this.downloadWithMetadata(image);
        imagesWithBase64.push({
          ...image,
          base64Data,
          mediaType // Update with the detected media type
        });
        console.log(`✅ Downloaded image: ${image.src} (${base64Data.length} chars, ${mediaType})`);
      } catch (error) {
        console.warn(`❌ Failed to download image ${image.src}:`, error);
        // Continue with the URL if download fails
        // Vision analysis won't be able to use it, but track it anyway
        imagesWithBase64.push(image);
      }
    }
    
    return imagesWithBase64;
  }

  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}