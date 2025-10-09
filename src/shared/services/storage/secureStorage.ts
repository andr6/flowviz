/**
 * Secure Storage Service for sensitive data like API keys
 * Uses localStorage with basic encryption for browser persistence
 */

import CryptoJS from 'crypto-js';

const STORAGE_KEY = 'threatflow_secure_data';
const ENCRYPTION_KEY = 'threatflow_key_2024'; // In production, this should be generated per session

export interface SecureStorageData {
  providerSettings?: {
    currentProvider: 'claude' | 'ollama' | 'openai' | 'openrouter';
    claude: { apiKey: string; model: string };
    ollama: { baseUrl: string; model: string };
    openai: { apiKey: string; model: string };
    openrouter: { apiKey: string; model: string };
  };
  lastUpdated: string;
}

export class SecureStorageService {
  private static instance: SecureStorageService;
  
  private constructor() {}
  
  public static getInstance(): SecureStorageService {
    if (!SecureStorageService.instance) {
      SecureStorageService.instance = new SecureStorageService();
    }
    return SecureStorageService.instance;
  }
  
  /**
   * Encrypt and store data securely
   */
  public store(data: SecureStorageData): void {
    try {
      const dataWithTimestamp = {
        ...data,
        lastUpdated: new Date().toISOString()
      };
      
      const encrypted = CryptoJS.AES.encrypt(
        JSON.stringify(dataWithTimestamp), 
        ENCRYPTION_KEY
      ).toString();
      
      localStorage.setItem(STORAGE_KEY, encrypted);
      console.log('🔒 Secure data stored successfully');
    } catch (error) {
      console.error('❌ Failed to store secure data:', error);
    }
  }
  
  /**
   * Retrieve and decrypt stored data
   */
  public retrieve(): SecureStorageData | null {
    try {
      const encrypted = localStorage.getItem(STORAGE_KEY);
      if (!encrypted) {
        return null;
      }
      
      const decrypted = CryptoJS.AES.decrypt(encrypted, ENCRYPTION_KEY);
      const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);
      
      if (!decryptedString) {
        console.warn('⚠️ Failed to decrypt stored data');
        return null;
      }
      
      const data = JSON.parse(decryptedString);
      console.log('🔓 Secure data retrieved successfully');
      return data;
    } catch (error) {
      console.error('❌ Failed to retrieve secure data:', error);
      return null;
    }
  }
  
  /**
   * Store provider settings securely
   */
  public storeProviderSettings(settings: SecureStorageData['providerSettings']): void {
    const currentData = this.retrieve() || {};
    this.store({
      ...currentData,
      providerSettings: settings
    });
  }
  
  /**
   * Retrieve provider settings
   */
  public getProviderSettings(): SecureStorageData['providerSettings'] | null {
    const data = this.retrieve();
    return data?.providerSettings || null;
  }
  
  /**
   * Clear all stored data
   */
  public clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
      console.log('🗑️ Secure data cleared');
    } catch (error) {
      console.error('❌ Failed to clear secure data:', error);
    }
  }
  
  /**
   * Check if data exists
   */
  public hasStoredData(): boolean {
    return localStorage.getItem(STORAGE_KEY) !== null;
  }
  
  /**
   * Get last update timestamp
   */
  public getLastUpdated(): Date | null {
    const data = this.retrieve();
    return data?.lastUpdated ? new Date(data.lastUpdated) : null;
  }
}

// Export singleton instance
export const secureStorage = SecureStorageService.getInstance();