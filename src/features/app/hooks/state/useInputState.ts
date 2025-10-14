/**
 * useInputState - Manages user input state (URL, text, PDF)
 *
 * Extracted from useAppState to follow Single Responsibility Principle.
 * Handles all input-related state and validation.
 */

import { useState, useCallback } from 'react';

/**
 * Input mode type
 */
export type InputMode = 'url' | 'text' | 'pdf';

/**
 * Input state interface
 */
export interface InputState {
  // Current input values
  url: string;
  textContent: string;
  pdfFile: File | null;

  // Submitted values (after user clicks "Analyze")
  submittedUrl: string;
  submittedText: string;
  submittedPdf: File | null;

  // Current input mode
  inputMode: InputMode;

  // URL validation state
  urlError: boolean;
  urlHelperText: string;

  // Setters
  setUrl: (url: string) => void;
  setTextContent: (text: string) => void;
  setPdfFile: (file: File | null) => void;
  setSubmittedUrl: (url: string) => void;
  setSubmittedText: (text: string) => void;
  setSubmittedPdf: (file: File | null) => void;
  setInputMode: (mode: InputMode) => void;

  // Helpers
  handleUrlChange: (newUrl: string) => void;
  clearInput: () => void;
  submitInput: () => void;
  hasInput: boolean;
  hasSubmittedInput: boolean;
}

/**
 * Simple URL validation
 */
function isValidUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Hook for managing input state
 */
export function useInputState(): InputState {
  // Current input state
  const [url, setUrl] = useState('');
  const [textContent, setTextContent] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  // Submitted input state
  const [submittedUrl, setSubmittedUrl] = useState('');
  const [submittedText, setSubmittedText] = useState('');
  const [submittedPdf, setSubmittedPdf] = useState<File | null>(null);

  // Input mode
  const [inputMode, setInputMode] = useState<InputMode>('url');

  // URL validation state
  const [urlError, setUrlError] = useState(false);
  const [urlHelperText, setUrlHelperText] = useState('');

  /**
   * Handle URL change with validation
   */
  const handleUrlChange = useCallback((newUrl: string) => {
    setUrl(newUrl);

    // Clear error when user starts typing
    if (urlError) {
      setUrlError(false);
      setUrlHelperText('');
    }

    // Validate URL when there's content
    if (newUrl.trim()) {
      if (!isValidUrl(newUrl)) {
        setUrlError(true);
        setUrlHelperText('Please enter a valid URL (e.g., https://example.com/article)');
      }
    }
  }, [urlError]);

  /**
   * Clear all input
   */
  const clearInput = useCallback(() => {
    setUrl('');
    setTextContent('');
    setPdfFile(null);
    setSubmittedUrl('');
    setSubmittedText('');
    setSubmittedPdf(null);
    setUrlError(false);
    setUrlHelperText('');
  }, []);

  /**
   * Submit current input (move from current to submitted)
   */
  const submitInput = useCallback(() => {
    if (inputMode === 'url' && url.trim()) {
      setSubmittedUrl(url);
      setSubmittedText('');
      setSubmittedPdf(null);
    } else if (inputMode === 'text' && textContent.trim()) {
      setSubmittedText(textContent);
      setSubmittedUrl('');
      setSubmittedPdf(null);
    } else if (inputMode === 'pdf' && pdfFile) {
      setSubmittedPdf(pdfFile);
      setSubmittedUrl('');
      setSubmittedText('');
    }
  }, [inputMode, url, textContent, pdfFile]);

  /**
   * Check if there's any current input
   */
  const hasInput = Boolean(
    url.trim() || textContent.trim() || pdfFile
  );

  /**
   * Check if there's any submitted input
   */
  const hasSubmittedInput = Boolean(
    submittedUrl || submittedText || submittedPdf
  );

  return {
    // Current input
    url,
    textContent,
    pdfFile,

    // Submitted input
    submittedUrl,
    submittedText,
    submittedPdf,

    // Input mode
    inputMode,

    // Validation
    urlError,
    urlHelperText,

    // Setters
    setUrl,
    setTextContent,
    setPdfFile,
    setSubmittedUrl,
    setSubmittedText,
    setSubmittedPdf,
    setInputMode,

    // Helpers
    handleUrlChange,
    clearInput,
    submitInput,
    hasInput,
    hasSubmittedInput
  };
}
