/**
 * InputValidator - Validates user input for security and correctness
 *
 * Responsibilities:
 * - URL validation (SSRF protection)
 * - PDF file validation (magic bytes, size, type)
 * - Text input validation (length, emptiness)
 *
 * Security Features:
 * - Blocks localhost and private IP ranges (RFC 1918)
 * - Validates actual file content via magic bytes
 * - Prevents oversized inputs (DOS protection)
 */

import { fileTypeFromBuffer } from 'file-type';
import { ValidationError } from '../errors';
import { LIMITS, TIMEOUTS } from '../../../../shared/constants/AppConstants';

export class InputValidator {
  /**
   * Validates a URL to prevent SSRF attacks.
   * Blocks localhost, private IPs, and dangerous protocols.
   *
   * @param urlString - The URL to validate
   * @throws {ValidationError} If URL is invalid or points to restricted resources
   */
  validateUrl(urlString: string): void {
    try {
      const url = new URL(urlString);

      // Only allow HTTP/HTTPS protocols
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new ValidationError('Only HTTP and HTTPS protocols are allowed');
      }

      const hostname = url.hostname.toLowerCase();

      // Block localhost variations
      if (['localhost', '127.0.0.1', '::1', '0.0.0.0'].includes(hostname)) {
        throw new ValidationError('Localhost access is not allowed');
      }

      // Block private IP ranges (RFC 1918)
      if (this.isPrivateIP(hostname)) {
        throw new ValidationError('Access to private IP ranges is not allowed');
      }

      // Block link-local and multicast addresses
      if (this.isLinkLocalOrMulticast(hostname)) {
        throw new ValidationError('Link-local and multicast addresses are not allowed');
      }

      // Block IPv6 private ranges
      if (this.isPrivateIPv6(hostname)) {
        throw new ValidationError('IPv6 private addresses are not allowed');
      }
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(
        `Invalid URL format: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Validates a PDF file before processing.
   * Checks actual file magic bytes, MIME type, and size limits.
   *
   * SECURITY: Uses file-type package to verify actual file content, not just MIME type.
   * This prevents attackers from disguising malicious files as PDFs.
   *
   * @param file - The PDF file to validate
   * @throws {ValidationError} If file is invalid, too large, or wrong type
   */
  async validatePdf(file: File): Promise<void> {
    // Validate file has content
    if (file.size === 0) {
      throw new ValidationError('PDF file is empty.');
    }

    // Validate file size
    if (file.size > LIMITS.FILES.PDF.MAX_SIZE) {
      const maxSizeMB = LIMITS.FILES.PDF.MAX_SIZE / 1024 / 1024;
      const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
      throw new ValidationError(
        `PDF file too large. Maximum size is ${maxSizeMB}MB. Your file is ${fileSizeMB}MB.`
      );
    }

    // SECURITY: Check actual file magic bytes, not just MIME type (which can be spoofed)
    try {
      const arrayBuffer = await file.arrayBuffer();
      const fileType = await fileTypeFromBuffer(new Uint8Array(arrayBuffer));

      // Verify the file is actually a PDF by checking magic bytes
      if (!fileType || fileType.mime !== 'application/pdf') {
        throw new ValidationError(
          'Invalid file type. Only PDF files are allowed. ' +
          (fileType ? `Detected type: ${fileType.mime}` : 'File type could not be determined.')
        );
      }
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(
        `Failed to validate PDF file: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    // Secondary MIME type check
    if (file.type !== 'application/pdf') {
      throw new ValidationError(
        'File extension or MIME type does not match PDF format. ' +
        `Detected MIME type: ${file.type}`
      );
    }
  }

  /**
   * Validates text input length.
   *
   * @param text - The text input to validate
   * @throws {ValidationError} If text is empty or exceeds length limit
   */
  validateText(text: string): void {
    if (!text || !text.trim()) {
      throw new ValidationError('Input cannot be empty');
    }

    if (text.length > LIMITS.TEXT.MAX_INPUT_LENGTH) {
      throw new ValidationError(
        `Text input too long. Maximum length is ${LIMITS.TEXT.MAX_INPUT_LENGTH} characters. ` +
        `Your input is ${text.length} characters.`
      );
    }
  }

  /**
   * Validates generic input (determines type and applies appropriate validation).
   * Returns validation result instead of throwing.
   *
   * @param input - The input to validate (string or File)
   * @param type - The type of input ('url' | 'text' | 'pdf')
   * @returns Validation result object
   */
  validateInput(
    input: string,
    type: 'url' | 'text' | 'pdf'
  ): { valid: boolean; error?: string } {
    try {
      if (type === 'url') {
        this.validateUrl(input);
      } else if (type === 'text') {
        this.validateText(input);
      } else {
        return { valid: false, error: 'Unsupported input type' };
      }
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Validation failed',
      };
    }
  }

  // ==================== Private Helper Methods ====================

  /**
   * Checks if hostname is a private IP address (RFC 1918).
   * Blocks: 192.168.x.x, 10.x.x.x, 172.16-31.x.x
   */
  private isPrivateIP(hostname: string): boolean {
    return (
      hostname.match(/^192\.168\./) !== null ||
      hostname.match(/^10\./) !== null ||
      hostname.match(/^172\.(1[6-9]|2\d|3[01])\./) !== null
    );
  }

  /**
   * Checks if hostname is a link-local or multicast address.
   * Blocks: 0.x.x.x, 169.254.x.x, 224.x.x.x, 240.x.x.x
   */
  private isLinkLocalOrMulticast(hostname: string): boolean {
    return hostname.match(/^(0\.|169\.254\.|224\.|240\.)/) !== null;
  }

  /**
   * Checks if hostname is a private IPv6 address.
   * Blocks: ::1 (loopback), fe80::/10 (link-local), fc00::/7 (unique local)
   */
  private isPrivateIPv6(hostname: string): boolean {
    return (
      hostname === '::1' ||
      hostname.match(/^fe80:/i) !== null ||
      hostname.match(/^fc00:/i) !== null ||
      hostname.match(/^fd00:/i) !== null
    );
  }
}
