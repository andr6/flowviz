/**
 * Storage Services Module
 *
 * Exports storage adapters and type-safe storage services.
 */

export type { StorageAdapter } from './StorageService';

export {
  LocalStorageAdapter,
  SessionStorageAdapter,
  InMemoryStorageAdapter,
  TypedStorageService,
  createTypedStorage,
  getDefaultStorageAdapter
} from './StorageService';
