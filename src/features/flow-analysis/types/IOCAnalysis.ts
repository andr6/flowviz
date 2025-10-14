/**
 * IOC (Indicator of Compromise) Analysis Type Definitions
 *
 * Defines strongly-typed interfaces for IOC analysis results from AI providers.
 * Replaces: `onIOCAnalysis?: (iocAnalysis: any) => void`
 */

/**
 * Types of IOC indicators that can be extracted
 */
export type IOCIndicatorType =
  | 'ip'
  | 'domain'
  | 'url'
  | 'file_hash'
  | 'email'
  | 'registry_key'
  | 'mutex'
  | 'process'
  | 'service';

/**
 * Individual IOC indicator with confidence score
 */
export interface IOCIndicator {
  /** Type of indicator (IP, domain, hash, etc.) */
  type: IOCIndicatorType;

  /** The actual indicator value */
  value: string;

  /** Confidence score (0-100) */
  confidence: number;

  /** Optional context about where this indicator was found */
  context?: string;

  /** Optional MITRE ATT&CK technique IDs associated with this indicator */
  techniques?: string[];
}

/**
 * Observable entity related to the threat
 */
export interface IOCObservable {
  /** Type of observable */
  type: string;

  /** The observed value */
  value: string;

  /** Optional description of the observable */
  description?: string;

  /** Optional timestamp when observed */
  observed_at?: string;
}

/**
 * Complete IOC analysis result from AI provider
 */
export interface IOCAnalysis {
  /** List of extracted indicators */
  indicators: IOCIndicator[];

  /** List of observables related to the threat */
  observables: IOCObservable[];

  /** Optional summary of the IOC analysis */
  summary?: string;

  /** Optional overall risk score (0-100) */
  risk_score?: number;

  /** Optional confidence level for the entire analysis */
  confidence?: 'low' | 'medium' | 'high';

  /** Optional metadata about the analysis */
  metadata?: {
    /** Number of indicators extracted */
    indicator_count?: number;

    /** Number of unique indicator types */
    unique_types?: number;

    /** Processing time in milliseconds */
    processing_time_ms?: number;
  };
}

/**
 * Type guard to check if an object is a valid IOCIndicator
 */
export function isIOCIndicator(obj: unknown): obj is IOCIndicator {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'type' in obj &&
    'value' in obj &&
    'confidence' in obj &&
    typeof (obj as IOCIndicator).type === 'string' &&
    typeof (obj as IOCIndicator).value === 'string' &&
    typeof (obj as IOCIndicator).confidence === 'number'
  );
}

/**
 * Type guard to check if an object is a valid IOCAnalysis
 */
export function isIOCAnalysis(obj: unknown): obj is IOCAnalysis {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'indicators' in obj &&
    Array.isArray((obj as IOCAnalysis).indicators) &&
    (obj as IOCAnalysis).indicators.every(isIOCIndicator)
  );
}

/**
 * Safely parse IOC analysis from unknown data
 * Returns null if data is invalid
 */
export function parseIOCAnalysis(data: unknown): IOCAnalysis | null {
  if (!isIOCAnalysis(data)) {
    console.warn('Invalid IOC analysis data received:', data);
    return null;
  }
  return data;
}
