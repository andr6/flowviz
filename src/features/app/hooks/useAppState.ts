import { useState, useEffect } from 'react';

// URL validation helper
const isValidUrl = (urlString: string): boolean => {
  if (!urlString || !urlString.trim()) {return false;}
  
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

export const useAppState = () => {
  // Core form state
  const [url, setUrl] = useState('');
  const [submittedUrl, setSubmittedUrl] = useState('');
  const [textContent, setTextContent] = useState('');
  const [submittedText, setSubmittedText] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [submittedPdf, setSubmittedPdf] = useState<File | null>(null);
  const [inputMode, setInputMode] = useState<'url' | 'text' | 'pdf'>('url');
  
  // UI state
  const [showError, setShowError] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [urlError, setUrlError] = useState(false);
  const [urlHelperText, setUrlHelperText] = useState('');
  
  // Content and visualization state
  const [articleContent, setArticleContent] = useState<any>(null);
  const [exportFunction, setExportFunction] = useState<((format: 'png' | 'json' | 'afb') => void) | null>(null);
  const [clearVisualization, setClearVisualization] = useState<(() => void) | null>(null);
  const [storyModeData, setStoryModeData] = useState<any>(null);
  const [getSaveData, setGetSaveData] = useState<(() => { nodes: any[], edges: any[], viewport: any }) | null>(null);
  const [loadedFlow, setLoadedFlow] = useState<{ nodes: any[], edges: any[], viewport?: any } | undefined>(undefined);
  
  // Dialog states
  const [newSearchDialogOpen, setNewSearchDialogOpen] = useState(false);
  const [saveFlowDialogOpen, setSaveFlowDialogOpen] = useState(false);
  const [loadFlowDialogOpen, setLoadFlowDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  
  // Settings state with loading state to prevent flash of default values
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [cinematicMode, setCinematicMode] = useState(true);
  const [edgeColor, setEdgeColor] = useState('default');
  const [edgeStyle, setEdgeStyle] = useState('solid');
  const [edgeCurve, setEdgeCurve] = useState('smooth');
  const [storyModeSpeed, setStoryModeSpeed] = useState(3); // seconds, range 1-10
  const [showConfidenceOverlay, setShowConfidenceOverlay] = useState(false);
  const [showScreenshotControls, setShowScreenshotControls] = useState(false);
  
  // Initialize settings from localStorage after mount
  useEffect(() => {
    const storedCinematic = localStorage.getItem('cinematic_mode');
    if (storedCinematic !== null) {
      setCinematicMode(storedCinematic === 'true');
    }
    
    const storedEdgeColor = localStorage.getItem('edge_color');
    if (storedEdgeColor) {
      setEdgeColor(storedEdgeColor);
    }
    
    const storedEdgeStyle = localStorage.getItem('edge_style');
    if (storedEdgeStyle) {
      setEdgeStyle(storedEdgeStyle);
    }
    
    const storedEdgeCurve = localStorage.getItem('edge_curve');
    if (storedEdgeCurve) {
      setEdgeCurve(storedEdgeCurve);
    }
    
    const storedStorySpeed = localStorage.getItem('story_mode_speed');
    if (storedStorySpeed) {
      setStoryModeSpeed(parseInt(storedStorySpeed, 10));
    }
    
    const storedConfidenceOverlay = localStorage.getItem('show_confidence_overlay');
    if (storedConfidenceOverlay !== null) {
      setShowConfidenceOverlay(storedConfidenceOverlay === 'true');
    }
    
    const storedScreenshotControls = localStorage.getItem('show_screenshot_controls');
    if (storedScreenshotControls !== null) {
      setShowScreenshotControls(storedScreenshotControls === 'true');
    }
    
    setSettingsLoaded(true);
  }, []);
  
  // Flow management state
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isLoadedFlow, setIsLoadedFlow] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  
  // Toast notification state
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastSeverity, setToastSeverity] = useState<'success' | 'info' | 'warning' | 'error'>('info');

  // Add browser refresh protection for unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && !isLoadedFlow) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, isLoadedFlow]);

  // URL change handler with validation
  const handleUrlChange = (newUrl: string) => {
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
  };


  // Toast notification helper
  const showToast = (message: string, severity: 'success' | 'info' | 'warning' | 'error' = 'info') => {
    setToastMessage(message);
    setToastSeverity(severity);
    setToastOpen(true);
  };

  // Settings save handler
  const handleSaveSettings = (newSettings?: {
    cinematicMode: boolean;
    edgeColor: string;
    edgeStyle: string;
    edgeCurve: string;
    storyModeSpeed: number;
    providerSettings?: any;
  }) => {
    // Use provided settings or current state values, with fallbacks for undefined fields
    const settingsToSave = {
      cinematicMode: newSettings?.cinematicMode ?? cinematicMode,
      edgeColor: newSettings?.edgeColor ?? edgeColor,
      edgeStyle: newSettings?.edgeStyle ?? edgeStyle,
      edgeCurve: newSettings?.edgeCurve ?? edgeCurve,
      storyModeSpeed: newSettings?.storyModeSpeed ?? storyModeSpeed,
      showConfidenceOverlay: showConfidenceOverlay ?? false,
      showScreenshotControls: showScreenshotControls ?? false
    };
    
    // Save to localStorage
    localStorage.setItem('cinematic_mode', settingsToSave.cinematicMode.toString());
    localStorage.setItem('edge_color', settingsToSave.edgeColor);
    localStorage.setItem('edge_style', settingsToSave.edgeStyle);
    localStorage.setItem('edge_curve', settingsToSave.edgeCurve);
    localStorage.setItem('story_mode_speed', settingsToSave.storyModeSpeed.toString());
    localStorage.setItem('show_confidence_overlay', settingsToSave.showConfidenceOverlay.toString());
    localStorage.setItem('show_screenshot_controls', settingsToSave.showScreenshotControls.toString());
    
    showToast('Settings saved successfully', 'success');
    setSettingsDialogOpen(false);
  };

  // Clear error state for recovery without losing user inputs
  const clearErrorState = () => {
    setShowError(false);
    setArticleContent(null);
    setExportFunction(null);
    setStoryModeData(null);
    // Keep user inputs (url, textContent) intact for retry
    // Only clear submitted state to allow re-submission
    setSubmittedUrl('');
    setSubmittedText('');
    setIsStreaming(false);
    
    if (clearVisualization) {
      clearVisualization();
    }
  };

  // Clear all form and content state
  const clearAllState = () => {
    setUrl('');
    setTextContent('');
    setPdfFile(null);
    setSubmittedUrl('');
    setSubmittedText('');
    setSubmittedPdf(null);
    setIsSearchExpanded(false);
    setArticleContent(null);
    setExportFunction(null);
    setStoryModeData(null);
    setUrlError(false);
    setUrlHelperText('');
    setLoadedFlow(undefined);
    setHasUnsavedChanges(false);
    setIsLoadedFlow(false);
    
    if (clearVisualization) {
      clearVisualization();
    }
  };

  return {
    // Core state
    url,
    submittedUrl,
    textContent,
    submittedText,
    pdfFile,
    submittedPdf,
    inputMode,
    showError,
    isSearchExpanded,
    urlError,
    urlHelperText,
    articleContent,
    exportFunction,
    clearVisualization,
    storyModeData,
    getSaveData,
    loadedFlow,
    
    // Dialog states
    newSearchDialogOpen,
    saveFlowDialogOpen,
    loadFlowDialogOpen,
    settingsDialogOpen,
    
    // Settings
    settingsLoaded,
    cinematicMode,
    edgeColor,
    edgeStyle,
    edgeCurve,
    storyModeSpeed,
    showConfidenceOverlay,
    showScreenshotControls,
    
    // Flow management
    hasUnsavedChanges,
    isLoadedFlow,
    isStreaming,
    
    // Toast
    toastOpen,
    toastMessage,
    toastSeverity,
    
    // Setters
    setUrl,
    setSubmittedUrl,
    setTextContent,
    setSubmittedText,
    setPdfFile,
    setSubmittedPdf,
    setInputMode,
    setShowError,
    setIsSearchExpanded,
    setUrlError,
    setUrlHelperText,
    setArticleContent,
    setExportFunction,
    setClearVisualization,
    setStoryModeData,
    setGetSaveData,
    setLoadedFlow,
    setNewSearchDialogOpen,
    setSaveFlowDialogOpen,
    setLoadFlowDialogOpen,
    setSettingsDialogOpen,
    setCinematicMode,
    setEdgeColor,
    setEdgeStyle,
    setEdgeCurve,
    setStoryModeSpeed,
    setShowConfidenceOverlay,
    setShowScreenshotControls,
    setHasUnsavedChanges,
    setIsLoadedFlow,
    setIsStreaming,
    setToastOpen,
    setToastMessage,
    setToastSeverity,
    
    // Handlers
    handleUrlChange,
    showToast,
    handleSaveSettings,
    clearAllState,
    clearErrorState,
  };
};