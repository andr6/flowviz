/**
 * StorageService - Abstract storage interface and implementations
 *
 * Provides a testable abstraction over browser storage (localStorage, sessionStorage).
 * Allows easy mocking in tests and supports different storage backends.
 *
 * Benefits:
 * - Testable: Can inject mock storage in tests
 * - Type-safe: Generic type parameter ensures type safety
 * - Error handling: Graceful handling of quota exceeded errors
 * - Validation: Built-in data validation using type guards
 */

/**
 * Abstract storage adapter interface
 */
export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
  hasItem(key: string): boolean;
}

/**
 * localStorage implementation of StorageAdapter
 */
export class LocalStorageAdapter implements StorageAdapter {
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error(`localStorage.getItem failed for key "${key}":`, error);
      return null;
    }
  }

  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.error(`localStorage.setItem failed for key "${key}":`, error);
      throw new Error('Storage quota exceeded or unavailable');
    }
  }

  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`localStorage.removeItem failed for key "${key}":`, error);
    }
  }

  clear(): void {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('localStorage.clear failed:', error);
    }
  }

  hasItem(key: string): boolean {
    try {
      return localStorage.getItem(key) !== null;
    } catch (error) {
      return false;
    }
  }
}

/**
 * sessionStorage implementation of StorageAdapter
 */
export class SessionStorageAdapter implements StorageAdapter {
  getItem(key: string): string | null {
    try {
      return sessionStorage.getItem(key);
    } catch (error) {
      console.error(`sessionStorage.getItem failed for key "${key}":`, error);
      return null;
    }
  }

  setItem(key: string, value: string): void {
    try {
      sessionStorage.setItem(key, value);
    } catch (error) {
      console.error(`sessionStorage.setItem failed for key "${key}":`, error);
      throw new Error('Storage quota exceeded or unavailable');
    }
  }

  removeItem(key: string): void {
    try {
      sessionStorage.removeItem(key);
    } catch (error) {
      console.error(`sessionStorage.removeItem failed for key "${key}":`, error);
    }
  }

  clear(): void {
    try {
      sessionStorage.clear();
    } catch (error) {
      console.error('sessionStorage.clear failed:', error);
    }
  }

  hasItem(key: string): boolean {
    try {
      return sessionStorage.getItem(key) !== null;
    } catch (error) {
      return false;
    }
  }
}

/**
 * In-memory storage implementation (useful for testing and SSR)
 */
export class InMemoryStorageAdapter implements StorageAdapter {
  private storage = new Map<string, string>();

  getItem(key: string): string | null {
    return this.storage.get(key) || null;
  }

  setItem(key: string, value: string): void {
    this.storage.set(key, value);
  }

  removeItem(key: string): void {
    this.storage.delete(key);
  }

  clear(): void {
    this.storage.clear();
  }

  hasItem(key: string): boolean {
    return this.storage.has(key);
  }
}

/**
 * Type-safe storage service with validation
 *
 * Generic type T ensures type safety for stored data.
 * Validator function ensures data integrity when loading from storage.
 *
 * @example
 * ```typescript
 * interface UserPrefs {
 *   theme: string;
 *   language: string;
 * }
 *
 * const isUserPrefs = (data: unknown): data is UserPrefs => {
 *   return typeof data === 'object' && data !== null &&
 *          'theme' in data && 'language' in data;
 * };
 *
 * const prefsStorage = new TypedStorageService<UserPrefs>(
 *   'user_preferences',
 *   new LocalStorageAdapter(),
 *   isUserPrefs
 * );
 *
 * const prefs = prefsStorage.load();
 * prefsStorage.save({ theme: 'dark', language: 'en' });
 * ```
 */
export class TypedStorageService<T> {
  constructor(
    private key: string,
    private adapter: StorageAdapter,
    private validator?: (data: unknown) => data is T
  ) {}

  /**
   * Load data from storage with validation
   *
   * @returns The stored data if valid, null otherwise
   */
  load(): T | null {
    const stored = this.adapter.getItem(this.key);
    if (!stored) {
      return null;
    }

    try {
      const parsed = JSON.parse(stored);

      // Validate if validator provided
      if (this.validator && !this.validator(parsed)) {
        console.warn(`Invalid data format for key: ${this.key}`);
        return null;
      }

      return parsed as T;
    } catch (error) {
      console.error(`Failed to parse stored data for key: ${this.key}`, error);
      return null;
    }
  }

  /**
   * Save data to storage
   *
   * @param data - The data to save
   * @throws Error if storage quota is exceeded
   */
  save(data: T): void {
    try {
      const serialized = JSON.stringify(data);
      this.adapter.setItem(this.key, serialized);
    } catch (error) {
      console.error(`Failed to save data for key: ${this.key}`, error);
      throw error;
    }
  }

  /**
   * Update partial data (merge with existing)
   *
   * @param partialData - Partial data to merge with existing
   */
  update(partialData: Partial<T>): void {
    const existing = this.load();
    if (existing) {
      this.save({ ...existing, ...partialData });
    } else {
      this.save(partialData as T);
    }
  }

  /**
   * Remove data from storage
   */
  remove(): void {
    this.adapter.removeItem(this.key);
  }

  /**
   * Check if data exists in storage
   *
   * @returns true if data exists, false otherwise
   */
  exists(): boolean {
    return this.adapter.hasItem(this.key);
  }

  /**
   * Clear all data from storage adapter
   * WARNING: This clears ALL storage, not just this key
   */
  clearAll(): void {
    this.adapter.clear();
  }
}

/**
 * Factory function to create a typed storage service
 *
 * @param key - Storage key
 * @param validator - Optional type guard function
 * @param adapter - Optional storage adapter (defaults to localStorage)
 * @returns A new TypedStorageService instance
 */
export function createTypedStorage<T>(
  key: string,
  validator?: (data: unknown) => data is T,
  adapter: StorageAdapter = new LocalStorageAdapter()
): TypedStorageService<T> {
  return new TypedStorageService(key, adapter, validator);
}

/**
 * Get the appropriate storage adapter based on environment
 *
 * @param preferSessionStorage - Use sessionStorage instead of localStorage
 * @returns A storage adapter
 */
export function getDefaultStorageAdapter(preferSessionStorage = false): StorageAdapter {
  if (typeof window === 'undefined') {
    // SSR environment - use in-memory storage
    return new InMemoryStorageAdapter();
  }

  return preferSessionStorage
    ? new SessionStorageAdapter()
    : new LocalStorageAdapter();
}
