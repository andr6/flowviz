# ThreatFlow Refactoring Plan

**Date**: October 12, 2025
**Status**: 📋 Planning Phase
**Estimated Effort**: 220 hours (5.5 weeks)

---

## Executive Summary

The code quality assessment reveals **excellent security practices** but **significant technical debt** in code organization. The codebase suffers from:

- **God Component/Hook Anti-Patterns** (App.tsx: 1,288 lines, useAppState: 308 lines)
- **Single Responsibility Violations** (streamingDirectFlowClient.ts: 580 lines)
- **Magic Numbers** (24 instances requiring centralization)
- **Type Safety Issues** (15 instances of `any` type)
- **Zero Test Coverage** (critical for enterprise application)

---

## Phase 1: Critical Fixes (2 Weeks)

### Priority: 🔴 CRITICAL | Effort: 80 hours

---

### 1.1 Centralize Magic Numbers ✅ STARTED

**Issue**: Constants scattered across multiple files causing maintenance issues

**Files to Update**:
- `streamingDirectFlowClient.ts` - Lines 161, 223, 267
- `App.tsx` - Line 117 (debounce delay)
- Various validation files

**Solution**: Extend `AppConstants.ts`

```typescript
// Add to src/shared/constants/AppConstants.ts

export const TIMEOUTS = {
  AI_STREAMING: {
    DEFAULT: 60_000,      // 1 minute - standard AI response
    EXTENDED: 120_000,    // 2 minutes - large documents/PDFs
    MAX: 300_000,         // 5 minutes - absolute maximum
  },
  VALIDATION: {
    PDF_PROCESSING: 10_000,  // 10 seconds for PDF validation
    URL_FETCH: 30_000,       // 30 seconds for URL fetching
  }
} as const;

export const FILE_LIMITS = {
  PDF: {
    MAX_SIZE: 10 * 1024 * 1024,        // 10MB
    MAX_PAGES: 100,
    VALIDATION_TIMEOUT: 10_000,
  },
  IMAGE: {
    MAX_SIZE: 3 * 1024 * 1024,         // 3MB
  },
  TEXT: {
    MAX_LENGTH: 50_000,  // 50k characters
  }
} as const;

export const UI_TIMING = {
  DEBOUNCE: {
    NAVIGATION: 150,     // Navigation debounce
    INPUT: 300,          // Input field debounce
    SEARCH: 300,         // Search debounce
    RESIZE: 100,         // Window resize debounce
  },
  ANIMATION: {
    DURATION_SHORT: 200,
    DURATION_NORMAL: 300,
    DURATION_LONG: 800,
  }
} as const;
```

**Migration Steps**:
1. ✅ Add new constants to AppConstants.ts
2. Update imports in affected files
3. Replace hardcoded values with constants
4. Test all affected functionality

**Estimated Time**: 8 hours

---

### 1.2 Refactor StreamingDirectFlowClient (Single Responsibility)

**Issue**: 580-line class with 7 distinct responsibilities violates SRP

**Current Structure**:
```
StreamingDirectFlowClient (580 lines)
├── Provider validation (lines 54-98)
├── SSRF protection (lines 104-147)
├── PDF validation (lines 154-197)
├── API communication (lines 211-403)
├── JSON parsing (lines 405-530)
├── State management (lines 44-48)
└── Error handling (throughout)
```

**Refactored Structure**:
```
src/features/flow-analysis/services/
├── validation/
│   ├── InputValidator.ts          (URL, text, PDF validation)
│   ├── ProviderValidator.ts       (API key validation)
│   └── validationStrategies.ts    (Strategy pattern implementations)
├── streaming/
│   ├── StreamingJsonParser.ts     (JSON parsing logic)
│   ├── StreamStateManager.ts      (Node/edge tracking)
│   └── StreamingAPIClient.ts      (HTTP communication)
└── StreamingDirectFlowClient.ts   (Coordinator - 100 lines)
```

**Refactored Code**:

#### Step 1: Create InputValidator

```typescript
// src/features/flow-analysis/services/validation/InputValidator.ts

import { fileTypeFromBuffer } from 'file-type';
import { ValidationError } from '../errors';
import { FILE_LIMITS } from '@/shared/constants/AppConstants';

export class InputValidator {
  /**
   * Validates a URL to prevent SSRF attacks.
   * Blocks localhost, private IPs, and dangerous protocols.
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
   */
  async validatePdf(file: File): Promise<void> {
    // Validate file has content
    if (file.size === 0) {
      throw new ValidationError('PDF file is empty.');
    }

    // Validate file size
    if (file.size > FILE_LIMITS.PDF.MAX_SIZE) {
      throw new ValidationError(
        `PDF file too large. Maximum size is ${FILE_LIMITS.PDF.MAX_SIZE / 1024 / 1024}MB. ` +
        `Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB.`
      );
    }

    // SECURITY: Check actual file magic bytes
    try {
      const arrayBuffer = await file.arrayBuffer();
      const fileType = await fileTypeFromBuffer(new Uint8Array(arrayBuffer));

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
   */
  validateText(text: string): void {
    if (!text || !text.trim()) {
      throw new ValidationError('Input cannot be empty');
    }

    if (text.length > FILE_LIMITS.TEXT.MAX_LENGTH) {
      throw new ValidationError(
        `Text input too long. Maximum length is ${FILE_LIMITS.TEXT.MAX_LENGTH} characters. ` +
        `Your input is ${text.length} characters.`
      );
    }
  }

  // Private helper methods
  private isPrivateIP(hostname: string): boolean {
    return (
      hostname.match(/^192\.168\./) !== null ||
      hostname.match(/^10\./) !== null ||
      hostname.match(/^172\.(1[6-9]|2\d|3[01])\./) !== null
    );
  }

  private isLinkLocalOrMulticast(hostname: string): boolean {
    return hostname.match(/^(0\.|169\.254\.|224\.|240\.)/) !== null;
  }

  private isPrivateIPv6(hostname: string): boolean {
    return (
      hostname === '::1' ||
      hostname.match(/^fe80:/i) !== null ||
      hostname.match(/^fc00:/i) !== null ||
      hostname.match(/^fd00:/i) !== null
    );
  }
}
```

#### Step 2: Create ProviderValidator with Strategy Pattern

```typescript
// src/features/flow-analysis/services/validation/validationStrategies.ts

import { ValidationError } from '../errors';

export interface ProviderValidationStrategy {
  validate(config: any): void;
}

export class APIKeyValidationStrategy implements ProviderValidationStrategy {
  constructor(private providerName: string) {}

  validate(config: { apiKey?: string; model?: string }): void {
    if (!config.apiKey?.trim()) {
      throw new ValidationError(
        `${this.providerName} API key is required. Please configure it in Settings.`
      );
    }

    if (!config.model) {
      throw new ValidationError(`${this.providerName} model is required`);
    }
  }
}

export class URLBasedValidationStrategy implements ProviderValidationStrategy {
  constructor(private providerName: string) {}

  validate(config: { baseUrl?: string; model?: string }): void {
    if (!config.baseUrl?.trim()) {
      throw new ValidationError(
        `${this.providerName} base URL is required. Please configure it in Settings.`
      );
    }

    if (!config.model) {
      throw new ValidationError(`${this.providerName} model is required`);
    }
  }
}

// src/features/flow-analysis/services/validation/ProviderValidator.ts

import { ValidationError } from '../errors';
import { ProviderSettings } from '../types';
import {
  ProviderValidationStrategy,
  APIKeyValidationStrategy,
  URLBasedValidationStrategy
} from './validationStrategies';

export class ProviderValidator {
  private strategies: Record<string, ProviderValidationStrategy> = {
    claude: new APIKeyValidationStrategy('Claude'),
    openai: new APIKeyValidationStrategy('OpenAI'),
    openrouter: new APIKeyValidationStrategy('OpenRouter'),
    ollama: new URLBasedValidationStrategy('Ollama'),
  };

  validate(settings: ProviderSettings): void {
    const provider = settings.currentProvider;
    const config = settings[provider];

    if (!config) {
      throw new ValidationError(
        `Provider configuration for "${provider}" is missing`
      );
    }

    const strategy = this.strategies[provider];
    if (!strategy) {
      throw new ValidationError(`Unknown provider: ${provider}`);
    }

    strategy.validate(config);
  }
}
```

#### Step 3: Create StreamStateManager

```typescript
// src/features/flow-analysis/services/streaming/StreamStateManager.ts

import { Node, Edge } from 'reactflow';

interface PendingEdge {
  edge: Edge;
  source: string;
  target: string;
}

export class StreamStateManager {
  private static readonly MAX_PENDING_EDGES = 1000;
  private static readonly MAX_CACHE_SIZE = 500;

  private nodeIdMap = new Map<string, string>();
  private processedNodeIds = new Set<string>();
  private processedEdgeIds = new Set<string>();
  private pendingEdges: PendingEdge[] = [];
  private emittedNodeIds = new Set<string>();

  /**
   * Register a new node and get its display ID
   */
  registerNode(originalId: string, displayId: string): void {
    this.nodeIdMap.set(originalId, displayId);
    this.processedNodeIds.add(originalId);
    this.emittedNodeIds.add(displayId);

    // Prevent unbounded growth
    if (this.nodeIdMap.size > StreamStateManager.MAX_CACHE_SIZE) {
      this.cleanup();
    }
  }

  /**
   * Check if a node has been processed
   */
  hasProcessedNode(nodeId: string): boolean {
    return this.processedNodeIds.has(nodeId);
  }

  /**
   * Check if a node has been emitted
   */
  hasEmittedNode(displayId: string): boolean {
    return this.emittedNodeIds.has(displayId);
  }

  /**
   * Get the display ID for a node
   */
  getDisplayId(originalId: string): string | undefined {
    return this.nodeIdMap.get(originalId);
  }

  /**
   * Add a pending edge
   */
  addPendingEdge(pendingEdge: PendingEdge): void {
    if (this.pendingEdges.length >= StreamStateManager.MAX_PENDING_EDGES) {
      console.warn('Pending edges limit reached, oldest edges may be dropped');
      this.pendingEdges.shift();
    }
    this.pendingEdges.push(pendingEdge);
  }

  /**
   * Get all pending edges
   */
  getPendingEdges(): PendingEdge[] {
    return [...this.pendingEdges];
  }

  /**
   * Mark an edge as processed
   */
  markEdgeProcessed(edgeId: string): void {
    this.processedEdgeIds.add(edgeId);
  }

  /**
   * Check if an edge has been processed
   */
  hasProcessedEdge(edgeId: string): boolean {
    return this.processedEdgeIds.has(edgeId);
  }

  /**
   * Clear pending edges
   */
  clearPendingEdges(): void {
    this.pendingEdges = [];
  }

  /**
   * Reset all state
   */
  reset(): void {
    this.nodeIdMap.clear();
    this.processedNodeIds.clear();
    this.processedEdgeIds.clear();
    this.pendingEdges = [];
    this.emittedNodeIds.clear();
  }

  /**
   * Cleanup old entries to prevent memory leaks
   */
  private cleanup(): void {
    const threshold = StreamStateManager.MAX_CACHE_SIZE * 0.75;

    // Keep only the most recent entries
    if (this.nodeIdMap.size > threshold) {
      const entries = Array.from(this.nodeIdMap.entries());
      this.nodeIdMap.clear();
      entries.slice(-threshold).forEach(([key, value]) => {
        this.nodeIdMap.set(key, value);
      });
    }
  }
}
```

#### Step 4: Simplified Client (Coordinator)

```typescript
// src/features/flow-analysis/services/StreamingDirectFlowClient.ts (REFACTORED)

import { Node, Edge } from 'reactflow';
import { TIMEOUTS } from '@/shared/constants/AppConstants';
import { APIError, ValidationError } from './errors';
import { InputValidator } from './validation/InputValidator';
import { ProviderValidator } from './validation/ProviderValidator';
import { StreamStateManager } from './streaming/StreamStateManager';
import { StreamingJsonParser } from './streaming/StreamingJsonParser';

export interface StreamingDirectFlowCallbacks {
  onNode: (node: Node) => void;
  onEdge: (edge: Edge) => void;
  onProgress?: (stage: string, message: string) => void;
  onIOCAnalysis?: (iocAnalysis: any) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
}

export interface StreamingOptions {
  providerSettings?: ProviderSettings;
  signal?: AbortSignal;
  timeout?: number;
}

/**
 * Simplified coordinator class for streaming threat intelligence extraction.
 * Delegates responsibilities to specialized services.
 */
export class StreamingDirectFlowClient {
  private inputValidator: InputValidator;
  private providerValidator: ProviderValidator;
  private stateManager: StreamStateManager;
  private parser: StreamingJsonParser;

  constructor() {
    this.inputValidator = new InputValidator();
    this.providerValidator = new ProviderValidator();
    this.stateManager = new StreamStateManager();
    this.parser = new StreamingJsonParser(this.stateManager);
  }

  /**
   * Extracts and streams attack flow data from various input sources.
   */
  async extractDirectFlowStreaming(
    input: string | File,
    callbacks: StreamingDirectFlowCallbacks,
    providerSettings?: ProviderSettings,
    options?: StreamingOptions
  ): Promise<void> {
    // Reset state for new extraction
    this.stateManager.reset();

    const finalOptions: StreamingOptions = {
      providerSettings,
      ...options
    };

    try {
      // Validate input
      await this.validateInput(input);

      // Validate provider settings
      if (finalOptions.providerSettings) {
        this.providerValidator.validate(finalOptions.providerSettings);
      }

      // Prepare request
      const requestBody = await this.prepareRequest(input, finalOptions);

      // Execute streaming request
      await this.executeStreamingRequest(requestBody, callbacks, finalOptions);

    } catch (error) {
      this.handleError(error, callbacks);
    }
  }

  private async validateInput(input: string | File): Promise<void> {
    if (!input) {
      throw new ValidationError('Input cannot be empty');
    }

    if (input instanceof File) {
      await this.inputValidator.validatePdf(input);
    } else if (typeof input === 'string') {
      const isUrl = input.startsWith('http://') || input.startsWith('https://');

      if (isUrl) {
        this.inputValidator.validateUrl(input);
      } else {
        this.inputValidator.validateText(input);
      }
    }
  }

  private async prepareRequest(
    input: string | File,
    options: StreamingOptions
  ): Promise<any> {
    const requestBody: any = {
      system: "You are an expert cybersecurity threat analyst...",
      provider: options.providerSettings || this.getDefaultProvider()
    };

    if (input instanceof File) {
      const arrayBuffer = await input.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ''
        )
      );
      requestBody.pdf = base64;
    } else {
      const isUrl = input.startsWith('http://') || input.startsWith('https://');
      requestBody[isUrl ? 'url' : 'text'] = input;
    }

    return requestBody;
  }

  private async executeStreamingRequest(
    requestBody: any,
    callbacks: StreamingDirectFlowCallbacks,
    options: StreamingOptions
  ): Promise<void> {
    const abortController = new AbortController();
    const effectiveSignal = options.signal || abortController.signal;

    // Setup timeout
    const timeoutId = setTimeout(
      () => abortController.abort(),
      options.timeout || TIMEOUTS.AI_STREAMING.DEFAULT
    );

    try {
      const response = await fetch('/api/ai-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: effectiveSignal,
      });

      if (!response.ok) {
        throw new APIError(
          `API request failed: ${response.statusText}`,
          'API_REQUEST_FAILED',
          response.status
        );
      }

      await this.parser.parseStream(response.body!, callbacks);

      callbacks.onComplete();

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request was cancelled');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private handleError(error: unknown, callbacks: StreamingDirectFlowCallbacks): void {
    if (error instanceof Error) {
      callbacks.onError(error);
    } else {
      callbacks.onError(new Error('An unknown error occurred'));
    }
  }

  private getDefaultProvider(): any {
    // Return default provider configuration
    return {
      currentProvider: 'claude',
      // ... default config
    };
  }
}
```

**Estimated Time**: 40 hours

---

### 1.3 Break Down App.tsx (God Component)

**Issue**: 1,288-line component with too many responsibilities

**Refactored Structure**:
```
src/features/app/
├── components/
│   ├── AppLayout.tsx              (Layout wrapper)
│   ├── AppRouter.tsx              (Route management)
│   ├── DialogManager.tsx          (All dialogs)
│   ├── ToastManager.tsx           (Toast notifications)
│   └── CommandPaletteProvider.tsx (Command palette)
├── hooks/
│   ├── useBreadcrumbs.ts          (Breadcrumb generation)
│   ├── useAppCommands.ts          (Command definitions)
│   ├── useNavigationCommands.ts   (Navigation commands)
│   ├── useAnalysisCommands.ts     (Analysis commands)
│   └── useErrorHandler.ts         (Error handling logic)
├── context/
│   ├── AppStateContext.tsx        (Global state)
│   └── InputContext.tsx           (Input state)
└── App.tsx                        (Main coordinator - ~100 lines)
```

**Estimated Time**: 32 hours

---

## Phase 2: Type Safety Improvements (1 Week)

### Priority: 🟡 HIGH | Effort: 40 hours

---

### 2.1 Eliminate `any` Types

**Current Issues**:
- `onIOCAnalysis?: (iocAnalysis: any) => void`
- `const requestBody: any = { ... }`
- `json = JSON.parse(cleanedText);` (no type assertion)

**Solution**: Define proper TypeScript interfaces

```typescript
// src/features/flow-analysis/types/IOCAnalysis.ts

export interface IOCIndicator {
  type: 'ip' | 'domain' | 'url' | 'file_hash' | 'email' | 'registry_key';
  value: string;
  confidence: number;
  context?: string;
}

export interface IOCObservable {
  type: string;
  value: string;
  description?: string;
}

export interface IOCAnalysis {
  indicators: IOCIndicator[];
  observables: IOCObservable[];
  summary?: string;
  risk_score?: number;
}

// src/features/flow-analysis/types/StreamingRequest.ts

export interface StreamingRequestBody {
  system: string;
  provider: ProviderSettings;
  url?: string;
  pdf?: string;
  text?: string;
}

export interface StreamingResponse {
  nodes: Node[];
  edges: Edge[];
  ioc_analysis?: IOCAnalysis;
  metadata?: ResponseMetadata;
}

export interface ResponseMetadata {
  processing_time_ms: number;
  model_used: string;
  provider: string;
}

// Usage in callbacks
export interface StreamingDirectFlowCallbacks {
  onNode: (node: Node) => void;
  onEdge: (edge: Edge) => void;
  onProgress?: (stage: string, message: string) => void;
  onIOCAnalysis?: (iocAnalysis: IOCAnalysis) => void;  // ✅ Typed
  onComplete: () => void;
  onError: (error: Error) => void;
}

// Type guards for runtime validation
export function isIOCAnalysis(obj: unknown): obj is IOCAnalysis {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'indicators' in obj &&
    Array.isArray((obj as any).indicators)
  );
}

export function isStreamingResponse(obj: unknown): obj is StreamingResponse {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'nodes' in obj &&
    Array.isArray((obj as any).nodes)
  );
}
```

**Estimated Time**: 16 hours

---

### 2.2 Add Type Safety to Error Monitoring

**Current**:
```typescript
if (typeof window !== 'undefined' && (window as any).errorMonitoring) {
  (window as any).errorMonitoring.captureException(error, { /* ... */ });
}
```

**Solution**:
```typescript
// src/types/window.d.ts

interface ErrorContext {
  componentName?: string;
  errorInfo?: string;
  userId?: string;
  sessionId?: string;
  [key: string]: unknown;
}

interface ErrorMonitoring {
  captureException(error: Error, context?: ErrorContext): void;
  captureMessage(message: string, level: 'info' | 'warning' | 'error'): void;
  setUser(user: { id: string; email?: string }): void;
}

declare global {
  interface Window {
    errorMonitoring?: ErrorMonitoring;
  }
}

export {};
```

**Estimated Time**: 4 hours

---

## Phase 3: State Management Refactoring (1 Week)

### Priority: 🟡 HIGH | Effort: 48 hours

---

### 3.1 Split useAppState into Focused Hooks

**Current**: 308-line god hook with 50+ exported values

**Refactored**:

```typescript
// src/features/app/hooks/state/index.ts

export { useInputState } from './useInputState';
export { useUIState } from './useUIState';
export { useDialogState } from './useDialogState';
export { useSettingsState } from './useSettingsState';
export { useFlowState } from './useFlowState';
export { useToastState } from './useToastState';

// Convenience hook that combines all state
export function useAppState() {
  const input = useInputState();
  const ui = useUIState();
  const dialogs = useDialogState();
  const settings = useSettingsState();
  const flow = useFlowState();
  const toast = useToastState();

  return {
    input,
    ui,
    dialogs,
    settings,
    flow,
    toast,
  };
}
```

**Estimated Time**: 24 hours

---

### 3.2 Abstract localStorage Access

**Current**: Direct localStorage calls scattered everywhere

**Solution**: Storage service abstraction

```typescript
// src/shared/services/storage/StorageService.ts

export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
}

export class LocalStorageAdapter implements StorageAdapter {
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error('localStorage.getItem failed:', error);
      return null;
    }
  }

  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.error('localStorage.setItem failed:', error);
      throw new Error('Storage quota exceeded');
    }
  }

  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('localStorage.removeItem failed:', error);
    }
  }

  clear(): void {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('localStorage.clear failed:', error);
    }
  }
}

// Type-safe storage service
export class TypedStorageService<T> {
  constructor(
    private key: string,
    private adapter: StorageAdapter,
    private validator: (data: unknown) => data is T
  ) {}

  load(): T | null {
    const stored = this.adapter.getItem(this.key);
    if (!stored) {return null;}

    try {
      const parsed = JSON.parse(stored);
      if (this.validator(parsed)) {
        return parsed;
      }
      console.warn(`Invalid data format for key: ${this.key}`);
      return null;
    } catch (error) {
      console.error(`Failed to parse stored data for key: ${this.key}`, error);
      return null;
    }
  }

  save(data: T): void {
    try {
      this.adapter.setItem(this.key, JSON.stringify(data));
    } catch (error) {
      console.error(`Failed to save data for key: ${this.key}`, error);
      throw error;
    }
  }

  remove(): void {
    this.adapter.removeItem(this.key);
  }
}

// Usage
const settingsStorage = new TypedStorageService<SettingsData>(
  'threatflow_settings',
  new LocalStorageAdapter(),
  isSettingsData // Type guard function
);

const settings = settingsStorage.load();
settingsStorage.save(newSettings);
```

**Estimated Time**: 12 hours

---

## Phase 4: Testing Infrastructure (1 Week)

### Priority: 🟢 MEDIUM | Effort: 52 hours

---

### 4.1 Unit Tests for Core Services

**Coverage Goals**:
- InputValidator: 100%
- ProviderValidator: 100%
- Error classes: 100%
- StreamStateManager: 90%

```typescript
// src/features/flow-analysis/services/validation/__tests__/InputValidator.test.ts

import { describe, it, expect } from 'vitest';
import { InputValidator } from '../InputValidator';
import { ValidationError } from '../../errors';

describe('InputValidator', () => {
  const validator = new InputValidator();

  describe('validateUrl', () => {
    it('should accept valid HTTPS URL', () => {
      expect(() => {
        validator.validateUrl('https://example.com/article');
      }).not.toThrow();
    });

    it('should block localhost URLs', () => {
      expect(() => {
        validator.validateUrl('http://localhost/api');
      }).toThrow(ValidationError);

      expect(() => {
        validator.validateUrl('http://127.0.0.1/api');
      }).toThrow('Localhost access is not allowed');
    });

    it('should block private IP ranges', () => {
      expect(() => {
        validator.validateUrl('http://192.168.1.1');
      }).toThrow('private IP');

      expect(() => {
        validator.validateUrl('http://10.0.0.1');
      }).toThrow('private IP');

      expect(() => {
        validator.validateUrl('http://172.16.0.1');
      }).toThrow('private IP');
    });

    it('should block file:// protocol', () => {
      expect(() => {
        validator.validateUrl('file:///etc/passwd');
      }).toThrow('Only HTTP and HTTPS protocols');
    });

    it('should block IPv6 private addresses', () => {
      expect(() => {
        validator.validateUrl('http://[::1]/api');
      }).toThrow('IPv6 private');

      expect(() => {
        validator.validateUrl('http://[fe80::1]/api');
      }).toThrow('IPv6 private');
    });
  });

  describe('validatePdf', () => {
    it('should reject empty PDF', async () => {
      const emptyFile = new File([], 'empty.pdf', { type: 'application/pdf' });

      await expect(
        validator.validatePdf(emptyFile)
      ).rejects.toThrow('PDF file is empty');
    });

    it('should reject oversized PDF', async () => {
      const largeContent = new Array(11 * 1024 * 1024).fill('a').join('');
      const largeFile = new File([largeContent], 'large.pdf', {
        type: 'application/pdf'
      });

      await expect(
        validator.validatePdf(largeFile)
      ).rejects.toThrow('PDF file too large');
    });

    it('should reject non-PDF files by magic bytes', async () => {
      const textFile = new File(['not a pdf'], 'fake.pdf', {
        type: 'application/pdf'
      });

      await expect(
        validator.validatePdf(textFile)
      ).rejects.toThrow('Invalid file type');
    });

    it('should accept valid PDF file', async () => {
      // Create a minimal valid PDF
      const pdfHeader = '%PDF-1.4\n';
      const validPdf = new File([pdfHeader], 'valid.pdf', {
        type: 'application/pdf'
      });

      await expect(
        validator.validatePdf(validPdf)
      ).resolves.not.toThrow();
    });
  });

  describe('validateText', () => {
    it('should reject empty text', () => {
      expect(() => {
        validator.validateText('');
      }).toThrow('Input cannot be empty');
    });

    it('should reject text over 50k characters', () => {
      const longText = 'a'.repeat(50001);

      expect(() => {
        validator.validateText(longText);
      }).toThrow('Text input too long');
    });

    it('should accept valid text', () => {
      expect(() => {
        validator.validateText('This is a valid threat report.');
      }).not.toThrow();
    });
  });
});
```

**Estimated Time**: 32 hours

---

### 4.2 Integration Tests

```typescript
// src/features/flow-analysis/services/__tests__/StreamingDirectFlowClient.integration.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StreamingDirectFlowClient } from '../StreamingDirectFlowClient';

describe('StreamingDirectFlowClient Integration', () => {
  let client: StreamingDirectFlowClient;
  let callbacks: any;

  beforeEach(() => {
    client = new StreamingDirectFlowClient();
    callbacks = {
      onNode: vi.fn(),
      onEdge: vi.fn(),
      onComplete: vi.fn(),
      onError: vi.fn(),
    };
  });

  it('should handle full URL extraction flow', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: createMockStream([
        '{"nodes": [{"id": "1", "type": "malware", "data": {}}]',
        ', "edges": []}'
      ])
    });

    await client.extractDirectFlowStreaming(
      'https://example.com/threat-report',
      callbacks
    );

    expect(callbacks.onNode).toHaveBeenCalled();
    expect(callbacks.onComplete).toHaveBeenCalled();
    expect(callbacks.onError).not.toHaveBeenCalled();
  });

  it('should handle errors gracefully', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    await client.extractDirectFlowStreaming(
      'https://example.com/threat-report',
      callbacks
    );

    expect(callbacks.onError).toHaveBeenCalled();
    expect(callbacks.onComplete).not.toHaveBeenCalled();
  });

  it('should respect timeout', async () => {
    global.fetch = vi.fn().mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 10000))
    );

    await client.extractDirectFlowStreaming(
      'https://example.com/threat-report',
      callbacks,
      undefined,
      { timeout: 100 }
    );

    expect(callbacks.onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Request was cancelled' })
    );
  });
});
```

**Estimated Time**: 20 hours

---

## Phase 5: Performance Optimizations (3 Days)

### Priority: 🟢 LOW | Effort: 24 hours

---

### 5.1 Memoization Improvements

```typescript
// App.tsx optimizations

// Memoize expensive computations
const currentUser = useMemo(
  () => ({ id: 'user-1', name: 'Analyst', color: '#60a5fa' }),
  []
);

const savedFlowsForViz = useMemo(
  () => recentFlows.recentFlows.map(flow => ({
    id: flow.id,
    name: flow.title,
    nodes: [],
    edges: [],
    createdAt: new Date(flow.timestamp).toISOString()
  })),
  [recentFlows.recentFlows]
);

// Memoize command actions
const commandActions = useMemo(
  () => getCommandActions(),
  [hasUnsavedChanges, exportFunction, recentFlows.recentFlows.length]
);

// Memoize breadcrumbs
const breadcrumbItems = useMemo(
  () => getBreadcrumbItems(),
  [submittedUrl, submittedText, submittedPdf, articleContent, isStreaming]
);
```

**Estimated Time**: 8 hours

---

### 5.2 Virtual Scrolling for Long Lists

```typescript
// For command palette and recent flows
import { FixedSizeList as List } from 'react-window';

function CommandPalette({ commands }: { commands: CommandAction[] }) {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      <CommandItem command={commands[index]} />
    </div>
  );

  return (
    <List
      height={400}
      itemCount={commands.length}
      itemSize={48}
      width="100%"
    >
      {Row}
    </List>
  );
}
```

**Estimated Time**: 8 hours

---

## Implementation Strategy

### Approach: **Incremental Refactoring**

1. **Create New Alongside Old** - Don't break existing functionality
2. **Feature Flags** - Control rollout of refactored code
3. **Parallel Testing** - Test new code alongside old
4. **Gradual Migration** - Migrate components one at a time
5. **Rollback Plan** - Keep old code until new is proven

### Example Migration Path:

```typescript
// Phase 1: Create new validator
const inputValidator = new InputValidator(); // NEW

// Phase 2: Use both (A/B testing)
if (FEATURE_FLAGS.USE_NEW_VALIDATOR) {
  inputValidator.validateUrl(url); // NEW
} else {
  validateUrl(url); // OLD
}

// Phase 3: Switch to new by default
inputValidator.validateUrl(url); // Only new

// Phase 4: Remove old code
// Delete old validateUrl function
```

---

## Success Metrics

| Metric | Before | Target | Measurement |
|--------|--------|--------|-------------|
| Average File Length | 450 lines | 200 lines | `cloc` analysis |
| Average Function Length | 35 lines | 20 lines | ESLint metrics |
| Cyclomatic Complexity | 12 | 5 | ESLint complexity |
| `any` Type Usage | 15 instances | 0 instances | TypeScript strict mode |
| Test Coverage | 0% | 80% | Vitest coverage |
| Magic Numbers | 24 instances | 0 instances | Manual review |
| Build Time | 1m 3s | <45s | CI/CD metrics |

---

## Risk Mitigation

### High-Risk Changes

1. **State Management Refactoring**
   - Risk: Breaking existing state flows
   - Mitigation: Comprehensive integration tests, feature flags

2. **API Client Refactoring**
   - Risk: Subtle bugs in streaming logic
   - Mitigation: Parallel testing, canary deployment

3. **Component Splitting**
   - Risk: Props drilling, performance regression
   - Mitigation: Performance profiling, gradual rollout

### Rollback Strategy

1. Keep old code in separate branch
2. Feature flags for new functionality
3. Monitoring and alerting for errors
4. Quick rollback process documented

---

## Timeline

| Phase | Duration | Start | End |
|-------|----------|-------|-----|
| **Phase 1: Critical Fixes** | 2 weeks | Week 1 | Week 2 |
| **Phase 2: Type Safety** | 1 week | Week 3 | Week 3 |
| **Phase 3: State Management** | 1 week | Week 4 | Week 4 |
| **Phase 4: Testing** | 1 week | Week 5 | Week 5 |
| **Phase 5: Performance** | 3 days | Week 6 | Week 6 |
| **Buffer & Documentation** | 2 days | Week 6 | Week 6 |

**Total: 5.5 weeks (220 hours)**

---

## Next Steps

1. ✅ Review and approve refactoring plan
2. ⏳ Set up feature flag system
3. ⏳ Create refactoring branch
4. ⏳ Begin Phase 1: Centralize constants
5. ⏳ Set up testing infrastructure
6. ⏳ Begin systematic refactoring

---

**Status**: 📋 Awaiting Approval
**Estimated Completion**: 6 weeks from approval
**Risk Level**: 🟡 Medium (with proper mitigation)
