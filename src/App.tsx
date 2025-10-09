import { Box, Snackbar, Alert, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import React, { Suspense, useState } from 'react';

import { AppBar, SearchForm, NewSearchDialog, SettingsDialog } from './features/app/components';
import { CompactAppBar } from './features/app/components/CompactAppBar';
import { useAppState } from './features/app/hooks';
import { AuthGuard } from './features/auth/components/AuthGuard';
import { AuthProvider } from './features/auth/context/AuthContext';
import { ClaudeServiceError, NetworkError, APIError, ValidationError } from './features/flow-analysis/services';
import { SavedFlow } from './features/flow-storage/types/SavedFlow';
import { FlowAlert } from './shared/components/Alert';
import { GlassIconButton } from './shared/components/Button';
import { ContentArea } from './shared/components/ContentArea';
import { NavigationSidebar } from './shared/components/NavigationSidebar';
import { LIMITS } from './shared/constants/AppConstants';
import { useThemeContext } from './shared/context/ThemeProvider';
import { useProviderSettings } from './shared/hooks/useProviderSettings';
// Lazy load the heavy flow visualization component
const StreamingFlowVisualization = React.lazy(() => import('./features/flow-analysis/components/StreamingFlowVisualization'));
import StreamingProgressBar from './shared/components/StreamingProgressBar';

import WarningIcon from '@mui/icons-material/Warning';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import {
  Add as AddIcon,
  Save as SaveIcon,
  FolderOpen as LoadIcon,
  Settings as SettingsIcon,
  GetApp as ExportIcon,
  Refresh as RefreshIcon,
  Home as HomeIcon,
  Palette as ThemeIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
  CameraAlt as CameraIcon,
} from '@mui/icons-material';

import { ResponsiveLayout } from './shared/components/ResponsiveLayout';
import { Breadcrumb, type BreadcrumbItem } from './shared/components/Breadcrumb';
import { CommandPalette, type CommandAction } from './shared/components/CommandPalette';
import { useCommandPalette } from './shared/hooks/useCommandPalette';
import { useRecentFlows } from './shared/hooks/useRecentFlows';

import { History as HistoryIcon } from '@mui/icons-material';

import { GraphSkeleton, FormSkeleton } from './shared/components/Skeleton';

// Lazy load heavy dialogs to reduce initial bundle size
const SaveFlowDialog = React.lazy(() => import('./features/flow-storage/components/SaveFlowDialog'));
const LoadFlowDialog = React.lazy(() => import('./features/flow-storage/components/LoadFlowDialog'));

const getTextStats = (text: string) => {
  const chars = text.length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const isNearLimit = chars > LIMITS.TEXT.WARNING_CHARS;
  const isOverLimit = chars > LIMITS.TEXT.MAX_CHARS;
  return { chars, words, isNearLimit, isOverLimit };
};

function ThreatFlowApp() {
  const { theme, actualTheme, toggleTheme } = useThemeContext();
  const recentFlows = useRecentFlows();
  const {
    providerSettings,
    setProviderSettings,
    isLoaded: providerSettingsLoaded,
    error: providerSettingsError,
    availableProviders,
    validation: providerValidation
  } = useProviderSettings();

  // Event handlers
  const handleNewSearch = () => {
    setNewSearchDialogOpen(true);
  };

  // Provider settings are now managed by the useProviderSettings custom hook

  // UI Control States
  const [showConfidenceOverlay, setShowConfidenceOverlay] = useState(false);
  const [showScreenshotControls, setShowScreenshotControls] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Advanced Visualization States
  const [enableAdvancedVisualization, setEnableAdvancedVisualization] = useState(true);
  const [showVisualizationFilters, setShowVisualizationFilters] = useState(false);

  const {
    // Core state
    url,
    submittedUrl,
    textContent,
    submittedText,
    pdfFile,
    submittedPdf,
    inputMode,
    showError,
    urlError,
    urlHelperText,
    articleContent,
    exportFunction,
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
    
    // Flow management
    hasUnsavedChanges,
    isLoadedFlow,
    isStreaming,
    
    // Toast
    toastOpen,
    toastMessage,
    toastSeverity,
    
    // Setters
    setSubmittedUrl,
    setSubmittedText,
    setTextContent,
    setPdfFile,
    setSubmittedPdf,
    setInputMode,
    setShowError,
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
    setHasUnsavedChanges,
    setIsLoadedFlow,
    setIsStreaming,
    setToastOpen,
    
    // Handlers
    handleUrlChange,
    showToast,
    handleSaveSettings,
    clearAllState,
    clearErrorState,
  } = useAppState();

  // Generate breadcrumb items based on app state
  const getBreadcrumbItems = (): BreadcrumbItem[] => {
    const items: BreadcrumbItem[] = [];
    
    if (submittedUrl || submittedText || submittedPdf) {
      // Analysis status item
      const analysisStatus = articleContent ? (isStreaming ? 'Processing' : 'Completed') : 'Initializing';
      const analysisColor = articleContent ? (isStreaming ? 'warning' : 'success') : 'info';
      
      items.push({
        label: 'Threat Analysis',
        badge: analysisStatus,
        onClick: () => {
          // Stay on current analysis
        },
      });
      
      // Source item with detailed information
      if (submittedUrl) {
        try {
          const urlObj = new URL(submittedUrl);
          items.push({
            label: `URL: ${urlObj.hostname}`,
            copyable: true,
            badge: 'Live',
          });
          // Add full URL as a separate breadcrumb for complete visibility
          items.push({
            label: submittedUrl.length > 60 ? `${submittedUrl.substring(0, 60)}...` : submittedUrl,
            copyable: true,
          });
        } catch (error) {
          items.push({
            label: `URL: ${submittedUrl.length > 40 ? `${submittedUrl.substring(0, 40)}...` : submittedUrl}`,
            copyable: true,
            badge: 'Live',
          });
        }
      } else if (submittedPdf) {
        items.push({
          label: `PDF: ${submittedPdf.name}`,
          copyable: true,
          badge: `${(submittedPdf.size / 1024 / 1024).toFixed(1)}MB`,
        });
      } else if (submittedText) {
        const wordCount = submittedText.trim().split(/\s+/).length;
        const charCount = submittedText.length;
        const preview = submittedText.substring(0, 50) + (submittedText.length > 50 ? '...' : '');
        items.push({
          label: `Text: ${preview}`,
          copyable: true,
          badge: `${wordCount}w/${charCount}c`,
        });
      }
      
      // Analysis completion status
      if (articleContent) {
        items.push({
          label: isStreaming ? 'Analysis in Progress' : 'Analysis Complete',
          badge: isStreaming ? '🔄' : '✅',
        });
      }
      
      if (isLoadedFlow && loadedFlow) {
        items.push({
          label: 'Loaded Flow',
          badge: 'Saved',
        });
      }
    }
    
    return items;
  };

  // Helper function to handle download actions
  const handleDownloadClick = (format: 'png' | 'json' | 'afb') => {
    if (exportFunction) {
      exportFunction(format);
      showToast(`Exported as ${format.toUpperCase()}`, 'success');
    }
  };

  // Helper function to format timestamps for display
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 5) {
      return 'Now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h`;
    } else if (diffInDays < 7) {
      return `${diffInDays}d`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // Query for article processing
  const { isLoading, error, refetch } = useQuery({
    queryKey: ['article', submittedUrl, submittedText, submittedPdf?.name],
    queryFn: async () => {
      // Just set the article content flag to trigger streaming visualization
      if (submittedUrl) {
        setArticleContent({ text: 'URL_PROVIDED', url: submittedUrl });
      } else if (submittedText) {
        setArticleContent({ text: submittedText });
      } else if (submittedPdf) {
        setArticleContent({ text: 'PDF_PROVIDED', pdf: submittedPdf });
      } else {
        throw new Error('No URL, text, or PDF provided');
      }
      return null;
    },
    enabled: !!(submittedUrl || submittedText || submittedPdf) && !articleContent,
    staleTime: 0,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: (failureCount, error) => {
      if (error instanceof ValidationError) {
        return false;
      }
      return failureCount < 2;
    },
  });

  // Define command palette actions
  const getCommandActions = (): CommandAction[] => {
    const commands: CommandAction[] = [
      // Navigation commands
      {
        id: 'new-search',
        label: 'New Search',
        description: 'Start a new threat analysis',
        icon: <AddIcon />,
        category: 'navigation',
        keywords: ['new', 'start', 'analysis', 'fresh'],
        action: handleNewSearch,
        disabled: false,
      },
      {
        id: 'go-home',
        label: 'Go Home',
        description: 'Return to the main search page',
        icon: <HomeIcon />,
        category: 'navigation',
        keywords: ['home', 'main', 'start'],
        action: () => {
          clearAllState();
        },
        disabled: !(submittedUrl || submittedText || submittedPdf),
      },
      // Analysis commands
      {
        id: 'save-analysis',
        label: 'Save Analysis',
        description: 'Save current analysis to library',
        icon: <SaveIcon />,
        category: 'analysis',
        keywords: ['save', 'store', 'library'],
        action: () => setSaveFlowDialogOpen(true),
        disabled: !getSaveData || !articleContent,
      },
      {
        id: 'load-analysis',
        label: 'Load Analysis',
        description: 'Load a previously saved analysis',
        icon: <LoadIcon />,
        category: 'analysis',
        keywords: ['load', 'open', 'library', 'saved'],
        action: () => setLoadFlowDialogOpen(true),
        disabled: false,
      },
      // Export commands
      {
        id: 'export-png',
        label: 'Export as PNG',
        description: 'Download visualization as PNG image',
        icon: <ExportIcon />,
        category: 'export',
        keywords: ['export', 'download', 'png', 'image'],
        action: () => handleDownloadClick('png'),
        disabled: !exportFunction,
      },
      {
        id: 'export-json',
        label: 'Export as JSON',
        description: 'Download flow data as JSON',
        icon: <ExportIcon />,
        category: 'export',
        keywords: ['export', 'download', 'json', 'data'],
        action: () => handleDownloadClick('json'),
        disabled: !exportFunction,
      },
      {
        id: 'export-afb',
        label: 'Export as Attack Flow',
        description: 'Download as Attack Flow Bundle',
        icon: <ExportIcon />,
        category: 'export',
        keywords: ['export', 'download', 'afb', 'attack', 'flow'],
        action: () => handleDownloadClick('afb'),
        disabled: !exportFunction,
        badge: 'AFB',
      },
      // Settings commands
      {
        id: 'open-settings',
        label: 'Settings',
        description: 'Configure application preferences',
        icon: <SettingsIcon />,
        category: 'settings',
        keywords: ['settings', 'preferences', 'config', 'configure'],
        action: () => setSettingsDialogOpen(true),
        disabled: false,
      },
      {
        id: 'toggle-cinematic',
        label: `${cinematicMode ? 'Disable' : 'Enable'} Cinematic Mode`,
        description: 'Toggle cinematic visualization effects',
        icon: <SpeedIcon />,
        category: 'settings',
        keywords: ['cinematic', 'effects', 'animation', 'visual'],
        action: () => setCinematicMode(!cinematicMode),
        disabled: false,
        badge: cinematicMode ? 'ON' : 'OFF',
      },
      {
        id: 'toggle-confidence',
        label: `${showConfidenceOverlay ? 'Hide' : 'Show'} Confidence Overlay`,
        description: 'Toggle confidence indicators display',
        icon: <SecurityIcon />,
        category: 'settings',
        keywords: ['confidence', 'indicators', 'overlay', 'security'],
        action: () => setShowConfidenceOverlay(!showConfidenceOverlay),
        disabled: !(submittedUrl || submittedText || submittedPdf),
        badge: showConfidenceOverlay ? 'ON' : 'OFF',
      },
      {
        id: 'toggle-screenshot',
        label: `${showScreenshotControls ? 'Hide' : 'Show'} Screenshot Controls`,
        description: 'Toggle screenshot mode controls',
        icon: <CameraIcon />,
        category: 'settings',
        keywords: ['screenshot', 'capture', 'export', 'image'],
        action: () => setShowScreenshotControls(!showScreenshotControls),
        disabled: !(submittedUrl || submittedText || submittedPdf),
        badge: showScreenshotControls ? 'ON' : 'OFF',
      },
      // Theme commands
      {
        id: 'cycle-theme',
        label: 'Switch Theme',
        description: 'Cycle between light, dark, and system themes',
        icon: <ThemeIcon />,
        category: 'theme',
        keywords: ['theme', 'dark', 'light', 'appearance'],
        action: () => {
          toggleTheme();
        },
        disabled: false,
      },
    ];

    // Add recent flows to command palette
    if (recentFlows.recentFlows.length > 0) {
      const recentFlowCommands = recentFlows.recentFlows.slice(0, 5).map(flow => ({
        id: `recent-${flow.id}`,
        label: flow.title,
        description: `${flow.sourceType.toUpperCase()}: ${flow.sourceContent.length > 30 ? `${flow.sourceContent.substring(0, 30)  }...` : flow.sourceContent}`,
        icon: <HistoryIcon />,
        category: 'navigation' as const,
        keywords: ['recent', 'history', flow.title.toLowerCase(), flow.sourceType],
        action: () => {
          // Load the recent flow
          setInputMode(flow.sourceType);
          if (flow.sourceType === 'url') {
            handleUrlChange(flow.sourceContent);
            setSubmittedUrl(flow.sourceContent);
          } else if (flow.sourceType === 'text') {
            setTextContent(flow.sourceContent);
            setSubmittedText(flow.sourceContent);
          }
          // For PDF, we would need to reconstruct the file object, which is complex
          // For now, just show a message that PDF needs to be re-uploaded
          if (flow.sourceType === 'pdf') {
            showToast('PDF files need to be re-uploaded. Use the PDF upload option.', 'info');
            return;
          }
          
          setArticleContent(null);
          setLoadedFlow(undefined);
          setIsLoadedFlow(false);
        },
        disabled: false,
        badge: formatTimestamp(flow.timestamp),
      }));
      
      commands.push(...recentFlowCommands);
    }

    // Add refresh command only if there's content to refresh
    if (submittedUrl || submittedText || submittedPdf) {
      commands.push({
        id: 'refresh-analysis',
        label: 'Refresh Analysis',
        description: 'Re-run the current analysis',
        icon: <RefreshIcon />,
        category: 'analysis',
        keywords: ['refresh', 'reload', 'rerun', 'update'],
        action: () => {
          setArticleContent(null);
          refetch();
        },
        disabled: isLoading || isStreaming,
      });
    }

    return commands.filter(cmd => cmd !== undefined);
  };

  // Initialize command palette
  const commandPalette = useCommandPalette({
    commands: getCommandActions(),
    enabled: true,
  });

  // Function to get error details and recovery suggestions
  const getErrorDetails = (error: Error) => {
    if (error instanceof NetworkError) {
      return {
        severity: 'error' as const,
        title: 'Network Connection Failed',
        message: error.message,
        suggestion: 'Please check your internet connection and try again.',
        action: 'Retry',
        icon: <ErrorOutlineIcon />,
      };
    }
    
    if (error instanceof APIError) {
      if (error.statusCode === 401) {
        return {
          severity: 'error' as const,
          title: 'Authentication Error',
          message: error.message,
          suggestion: 'Please check your Anthropic API key in the environment variables.',
          action: 'Check Configuration',
          icon: <WarningIcon />,
        };
      }
      
      if (error.statusCode === 429) {
        return {
          severity: 'warning' as const,
          title: 'Rate Limit Exceeded',
          message: error.message,
          suggestion: 'Please wait a moment and try again, or check your API usage limits.',
          action: 'Retry',
          icon: <WarningIcon />,
        };
      }
      
      if (error.statusCode === 402) {
        return {
          severity: 'error' as const,
          title: 'API Quota Exceeded',
          message: error.message,
          suggestion: 'Please check your Anthropic account billing status and add credits if needed.',
          action: 'Check Billing',
          icon: <ErrorOutlineIcon />,
        };
      }
      
      return {
        severity: 'error' as const,
        title: 'API Error',
        message: error.message,
        suggestion: 'Please try again. If the problem persists, contact support.',
        action: 'Retry',
        icon: <ErrorOutlineIcon />,
      };
    }
    
    if (error instanceof ValidationError) {
      return {
        severity: 'warning' as const,
        title: 'Invalid Input',
        message: error.message,
        suggestion: 'Please check the URL and ensure it points to a valid article.',
        action: 'Try Different URL',
        icon: <WarningIcon />,
      };
    }
    
    if (error instanceof ClaudeServiceError) {
      return {
        severity: 'error' as const,
        title: 'Service Error',
        message: error.message,
        suggestion: 'Please try again. If the problem persists, contact support.',
        action: 'Retry',
        icon: <ErrorOutlineIcon />,
      };
    }
    
    // Generic error
    return {
      severity: 'error' as const,
      title: 'Unexpected Error',
      message: error.message || 'An unexpected error occurred',
      suggestion: 'Please try again or contact support if the problem persists.',
      action: 'Retry',
      icon: <ErrorOutlineIcon />,
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (inputMode === 'url') {
      if (!url) {
        setShowError(true);
        return;
      }
      
      // Add to recent flows
      try {
        const hostname = new URL(url).hostname;
        recentFlows.addRecentFlow({
          title: hostname,
          description: `Threat analysis of ${hostname}`,
          sourceType: 'url',
          sourceContent: url,
          tags: ['web', 'url'],
        });
      } catch (error) {
        // If URL parsing fails, use the URL as title
        recentFlows.addRecentFlow({
          title: url.length > 50 ? `${url.substring(0, 50)  }...` : url,
          description: 'Threat analysis of URL',
          sourceType: 'url',
          sourceContent: url,
          tags: ['web', 'url'],
        });
      }
      
      setArticleContent(null);
      setSubmittedUrl(url);
      setSubmittedText('');
      setSubmittedPdf(null);
      setLoadedFlow(undefined);
      setIsLoadedFlow(false);
    } else if (inputMode === 'pdf') {
      if (!pdfFile) {
        setShowError(true);
        return;
      }
      
      // Add to recent flows
      recentFlows.addRecentFlow({
        title: pdfFile.name,
        description: `Threat analysis of PDF document: ${pdfFile.name}`,
        sourceType: 'pdf',
        sourceContent: pdfFile.name,
        tags: ['pdf', 'document'],
      });
      
      setArticleContent(null);
      setSubmittedPdf(pdfFile);
      setSubmittedUrl('');
      setSubmittedText('');
      setLoadedFlow(undefined);
      setIsLoadedFlow(false);
    } else {
      if (!textContent.trim()) {
        setShowError(true);
        return;
      }
      if (getTextStats(textContent).isOverLimit) {
        setShowError(true);
        return;
      }
      
      // Add to recent flows
      const preview = textContent.length > 100 ? `${textContent.substring(0, 100)  }...` : textContent;
      recentFlows.addRecentFlow({
        title: `Text Analysis (${textContent.length} chars)`,
        description: `Threat analysis of text content: ${preview}`,
        sourceType: 'text',
        sourceContent: textContent,
        tags: ['text', 'manual'],
      });
      
      setArticleContent(null);
      setSubmittedText(textContent);
      setSubmittedUrl('');
      setSubmittedPdf(null);
      setLoadedFlow(undefined);
      setIsLoadedFlow(false);
    }
  };

  const handleConfirmNewSearch = () => {
    setNewSearchDialogOpen(false);
    clearAllState();
  };
  
  const handleCancelNewSearch = () => {
    setNewSearchDialogOpen(false);
  };

  const handleSaveFirstNewSearch = () => {
    setNewSearchDialogOpen(false);
    setSaveFlowDialogOpen(true);
  };

  const handleRetry = () => {
    if (submittedUrl || submittedText || submittedPdf) {
      refetch();
    }
  };

  const handleExportAvailable = (exportFn: (format: 'png' | 'json' | 'afb') => void) => {
    setExportFunction(() => exportFn);
  };

  const handleClearAvailable = (clearFn: () => void) => {
    setClearVisualization(() => clearFn);
  };

  const handleStoryModeAvailable = (storyData: any) => {
    setStoryModeData(storyData);
  };

  const handleSaveAvailable = (saveFn: () => { nodes: any[], edges: any[], viewport: any }) => {
    setGetSaveData(() => saveFn);
    if (!isLoadedFlow) {
      setHasUnsavedChanges(true);
    }
    
    // Update recent flow with node and edge counts
    if (submittedUrl || submittedText || submittedPdf) {
      try {
        const saveData = saveFn();
        const sourceContent = submittedUrl || submittedText || submittedPdf?.name || '';
        
        // Find and update the corresponding recent flow
        const recentFlow = recentFlows.recentFlows.find(flow => 
          flow.sourceContent === sourceContent
        );
        
        if (recentFlow) {
          recentFlows.updateRecentFlow(recentFlow.id, {
            nodeCount: saveData.nodes.length,
            edgeCount: saveData.edges.length,
          });
        }
      } catch (error) {
        console.warn('Failed to update recent flow with analysis data:', error);
      }
    }
  };

  const handleSaveFlow = (flow: SavedFlow) => {
    setHasUnsavedChanges(false);
    setIsLoadedFlow(true);
    showToast(`Analysis "${flow.title}" saved successfully`, 'success');
  };

  const handleLoadFlow = (flow: SavedFlow) => {
    setLoadedFlow({
      nodes: flow.nodes,
      edges: flow.edges,
      viewport: flow.visualization?.viewport
    });
    
    setArticleContent({
      text: flow.sourceText || flow.sourceUrl || 'Loaded from saved flow',
      images: undefined
    });
    
    if (flow.sourceUrl) {
      setSubmittedUrl(flow.sourceUrl);
      setInputMode('url');
    } else if (flow.sourceText) {
      setSubmittedText(flow.sourceText);
      setInputMode('text');
    }
    
    setHasUnsavedChanges(false);
    setIsLoadedFlow(true);
    setLoadFlowDialogOpen(false);
    showToast(`Loaded analysis: "${flow.title}"`, 'success');
  };

  const handleCloseError = () => {
    setShowError(false);
  };

  const handleToastClose = (_event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setToastOpen(false);
  };

  const breadcrumbItems = getBreadcrumbItems();

  // Helper function to determine current analysis status
  const getAnalysisStatus = () => {
    if (isStreaming) return 'processing';
    if (articleContent && (submittedUrl || submittedText || submittedPdf)) return 'completed';
    if (error) return 'error';
    return 'idle';
  };

  return (
    <Box sx={{ 
      display: 'flex',
      minHeight: '100vh',
      background: theme.colors.background.primary,
      position: 'relative',
      overflow: 'hidden',
      // Enhanced professional animated background effects
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: theme.actualTheme === 'light' ? `
          radial-gradient(ellipse 1000px 600px at 30% 120px, rgba(0, 102, 255, 0.03), transparent),
          radial-gradient(ellipse 800px 400px at 90% 250px, rgba(255, 107, 53, 0.02), transparent),
          radial-gradient(ellipse 600px 300px at 10% 350px, rgba(156, 39, 176, 0.02), transparent),
          radial-gradient(ellipse 400px 200px at 70% 450px, rgba(37, 99, 235, 0.02), transparent)
        ` : `
          radial-gradient(ellipse 1000px 600px at 30% 120px, rgba(0, 225, 255, 0.08), transparent),
          radial-gradient(ellipse 800px 400px at 90% 250px, rgba(255, 112, 67, 0.04), transparent),
          radial-gradient(ellipse 600px 300px at 10% 350px, rgba(156, 39, 176, 0.06), transparent),
          radial-gradient(ellipse 400px 200px at 70% 450px, rgba(0, 188, 212, 0.05), transparent)
        `,
        filter: 'blur(80px)',
        opacity: 0.8,
        pointerEvents: 'none',
        zIndex: -2,
        animation: 'breathe 8s ease-in-out infinite',
      },
      // Enhanced professional grid pattern overlay
      '&::after': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: actualTheme === 'light' ? `
          linear-gradient(rgba(0, 102, 255, 0.02) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0, 102, 255, 0.02) 1px, transparent 1px),
          radial-gradient(circle at 50px 50px, rgba(0, 102, 255, 0.015) 1px, transparent 1px)
        ` : `
          linear-gradient(rgba(0, 225, 255, 0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0, 225, 255, 0.04) 1px, transparent 1px),
          radial-gradient(circle at 50px 50px, rgba(0, 225, 255, 0.03) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px, 60px 60px, 120px 120px',
        opacity: 0.4,
        pointerEvents: 'none',
        zIndex: -1,
      },
      // Professional breathing animation
      '@keyframes breathe': {
        '0%, 100%': {
          transform: 'scale(1) rotate(0deg)',
          opacity: 0.8,
        },
        '50%': {
          transform: 'scale(1.02) rotate(0.5deg)',
          opacity: 0.9,
        },
      },
    }}>
      {/* Navigation Sidebar */}
      <ResponsiveLayout
        sidebar={
          <NavigationSidebar
            collapsed={sidebarCollapsed}
            currentPath="/"
            hasActiveAnalysis={Boolean(articleContent)}
            recentFlowsCount={recentFlows.recentFlows.length}
            savedFlowsCount={0} // TODO: Implement saved flows count
            onNewAnalysis={handleNewSearch}
            onSaveAnalysis={() => setSaveFlowDialogOpen(true)}
            onLoadAnalysis={() => setLoadFlowDialogOpen(true)}
            onExportAnalysis={() => exportFunction && exportFunction('json')}
            onSettings={() => setSettingsDialogOpen(true)}
          />
        }
        header={
          <>
            <CompactAppBar
              onMenuToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
              isStreaming={isStreaming}
              title={submittedUrl || submittedText || submittedPdf ? 'Analysis Results' : 'ThreatFlow'}
              subtitle={submittedUrl ? new URL(submittedUrl).hostname : undefined}
              analysisStatus={getAnalysisStatus()}
              progressMessage={isStreaming ? 'Analyzing threat intelligence...' : undefined}
              showMenuButton={true}
            />
            <StreamingProgressBar isVisible={isStreaming} />
            {breadcrumbItems.length > 0 && (
              <Breadcrumb 
                items={breadcrumbItems}
                onHomeClick={handleNewSearch}
                showCopyPath={true}
              />
            )}
          </>
        }
        sidebarWidth={280}
        collapsedSidebarWidth={72}
      >


      {/* Show main form when no content is submitted */}
      {!submittedUrl && !submittedText && !submittedPdf && (
        <ContentArea
          title="Threat Intelligence Analysis"
          subtitle="Transform cybersecurity articles and reports into interactive attack flow visualizations"
          maxWidth="lg"
          showScrollToTop={false}
        >
          <SearchForm
            isLoading={isLoading}
            isStreaming={isStreaming}
            inputMode={inputMode}
            url={url}
            textContent={textContent}
            pdfFile={pdfFile}
            urlError={urlError}
            urlHelperText={urlHelperText}
            onInputModeChange={setInputMode}
            onUrlChange={handleUrlChange}
            onTextChange={setTextContent}
            onPdfChange={setPdfFile}
            onSubmit={handleSubmit}
          />
        </ContentArea>
      )}

      {/* Show streaming visualization when we have content and settings are loaded */}
      {articleContent && settingsLoaded && (
        <ContentArea
          title="Analysis Results"
          subtitle={submittedUrl ? `Analysis of ${submittedUrl}` : 
                    submittedPdf ? `Analysis of ${submittedPdf.name}` :
                    'Text analysis results'}
          status={getAnalysisStatus()}
          statusMessage={isStreaming ? 'Processing threat intelligence...' : 
                        error ? 'Analysis error occurred' :
                        'Analysis complete'}
          showRefresh={!isStreaming}
          onRefresh={() => refetch()}
          error={error?.message}
          headerActions={
            <Box sx={{ display: 'flex', gap: 1 }}>
              {exportFunction && (
                <>
                  <GlassIconButton
                    onClick={() => handleDownloadClick('png')}
                    size="small"
                    title="Export as PNG"
                  >
                    <ExportIcon />
                  </GlassIconButton>
                  <GlassIconButton
                    onClick={() => setSaveFlowDialogOpen(true)}
                    size="small"
                    title="Save Analysis"
                    disabled={!getSaveData}
                  >
                    <SaveIcon />
                  </GlassIconButton>
                </>
              )}
            </Box>
          }
        >
          <Suspense fallback={
            <Box sx={{ py: 4 }}>
              <GraphSkeleton height="60vh" />
              <Box sx={{ 
                textAlign: 'center',
                mt: 3,
                maxWidth: '400px',
                mx: 'auto',
              }}>
                <Typography sx={{ 
                  color: theme.colors.text.primary, 
                  fontSize: theme.typography.fontSize.lg,
                  fontFamily: theme.typography.fontFamily.primary,
                  fontWeight: theme.typography.fontWeight.semibold,
                  mb: 1,
                  letterSpacing: theme.typography.letterSpacing.wide,
                }}>
                  Initializing ThreatFlow Engine
                </Typography>
                <Typography sx={{ 
                  color: theme.colors.text.tertiary, 
                  fontSize: theme.typography.fontSize.sm,
                  fontFamily: theme.typography.fontFamily.mono,
                  fontWeight: theme.typography.fontWeight.normal,
                  letterSpacing: theme.typography.letterSpacing.wide,
                  textTransform: 'uppercase',
                }}>
                  🔄 Loading threat analysis modules
                </Typography>
              </Box>
            </Box>
          }>
            <StreamingFlowVisualization 
              url={submittedUrl || submittedText || submittedPdf?.name || ''} 
              pdfFile={submittedPdf || undefined}
              loadedFlow={loadedFlow}
              onExportAvailable={handleExportAvailable}
              onClearAvailable={handleClearAvailable}
              onStoryModeAvailable={handleStoryModeAvailable}
              onError={(error) => {
                showToast(error.message || 'An error occurred during analysis', 'error');
                // Return to analysis screen and clear inputs
                setArticleContent(null);
                setSubmittedUrl('');
                setSubmittedText('');
                setSubmittedPdf(null);
                handleUrlChange(''); // Clear URL input
                setTextContent(''); // Clear text input
                setPdfFile(null); // Clear PDF input
              }}
              onSaveAvailable={handleSaveAvailable}
              onStreamingStart={() => setIsStreaming(true)}
              onStreamingEnd={() => setIsStreaming(false)}
              cinematicMode={cinematicMode}
              edgeColor={edgeColor}
              edgeStyle={edgeStyle}
              providerSettings={providerSettings}
              edgeCurve={edgeCurve}
              storyModeSpeed={storyModeSpeed}
              showConfidenceOverlay={showConfidenceOverlay}
              showScreenshotControls={showScreenshotControls}
              enableAdvancedVisualization={enableAdvancedVisualization}
              collaborativeMode={false} // TODO: Enable based on feature flag
              currentUser={{
                id: 'user-1',
                name: 'Analyst',
                color: '#60a5fa'
              }}
              savedFlows={recentFlows.recentFlows.map(flow => ({
                id: flow.id,
                name: flow.title,
                nodes: [], // Would be populated from actual saved flow data
                edges: [], // Would be populated from actual saved flow data  
                createdAt: new Date(flow.timestamp).toISOString()
              }))}
            />
          </Suspense>
        </ContentArea>
      )}

      <Snackbar
        open={showError}
        autoHideDuration={4000}
        onClose={handleCloseError}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseError}
          severity="warning"
          sx={{
            backgroundColor: theme.colors.status.warning.bg,
            color: theme.colors.status.warning.text,
            border: `1px solid ${theme.colors.status.warning.border}`,
            borderRadius: theme.borderRadius.md,
            backdropFilter: theme.effects.blur.sm,
            boxShadow: theme.effects.shadows.md,
            fontFamily: theme.typography.fontFamily.primary,
            '& .MuiAlert-icon': {
              color: theme.colors.status.warning.accent,
            },
          }}
        >
          {inputMode === 'url' 
            ? 'Please enter a URL to analyze' 
            : inputMode === 'pdf'
              ? 'Please upload a PDF file to analyze'
              : getTextStats(textContent).isOverLimit 
                ? `Text is too long (${getTextStats(textContent).chars.toLocaleString()} chars). Please reduce to under ${LIMITS.TEXT.MAX_CHARS.toLocaleString()} characters.`
                : 'Please paste some text to analyze'
          }
        </Alert>
      </Snackbar>

      {/* Toast Notifications */}
      <Snackbar
        open={toastOpen}
        autoHideDuration={3000}
        onClose={handleToastClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleToastClose}
          severity={toastSeverity}
          sx={{
            backgroundColor: theme.colors.status[toastSeverity as 'success' | 'error' | 'warning' | 'info'].bg,
            color: theme.colors.status[toastSeverity as 'success' | 'error' | 'warning' | 'info'].text,
            border: `1px solid ${theme.colors.status[toastSeverity as 'success' | 'error' | 'warning' | 'info'].border}`,
            borderRadius: theme.borderRadius.md,
            backdropFilter: theme.effects.blur.md,
            boxShadow: `
              ${theme.effects.shadows.lg},
              ${theme.colors.status[toastSeverity as 'success' | 'error' | 'warning' | 'info'].glow}
            `,
            fontFamily: theme.typography.fontFamily.primary,
            '& .MuiAlert-icon': {
              color: theme.colors.status[toastSeverity as 'success' | 'error' | 'warning' | 'info'].accent,
            },
          }}
        >
          {toastMessage}
        </Alert>
      </Snackbar>


        </ResponsiveLayout>

        {/* New Search Confirmation Dialog */}
        <NewSearchDialog
          open={newSearchDialogOpen}
          hasUnsavedChanges={hasUnsavedChanges}
          onClose={handleCancelNewSearch}
          onConfirm={handleConfirmNewSearch}
          onSaveFirst={handleSaveFirstNewSearch}
        />

        {/* Save Flow Dialog */}
        {getSaveData && (
          <Suspense fallback={
            <Box sx={{ p: 3 }}>
              <FormSkeleton fields={3} showTitle={true} showButtons={true} />
            </Box>
          }>
            <SaveFlowDialog
              open={saveFlowDialogOpen}
              onClose={() => setSaveFlowDialogOpen(false)}
              nodes={getSaveData().nodes}
              edges={getSaveData().edges}
              sourceUrl={submittedUrl}
              sourceText={submittedText}
              inputMode={inputMode}
              viewport={getSaveData().viewport}
              onSave={handleSaveFlow}
            />
          </Suspense>
        )}

        {/* Load Flow Dialog */}
        <Suspense fallback={
          <Box sx={{ p: 3 }}>
            <FormSkeleton fields={1} showTitle={true} showButtons={true} />
          </Box>
        }>
          <LoadFlowDialog
            open={loadFlowDialogOpen}
            onClose={() => setLoadFlowDialogOpen(false)}
            onLoad={handleLoadFlow}
          />
        </Suspense>

        {/* Settings Dialog */}
        <SettingsDialog
          open={settingsDialogOpen && settingsLoaded}
          cinematicMode={cinematicMode}
          edgeColor={edgeColor}
          edgeStyle={edgeStyle}
          edgeCurve={edgeCurve}
          storyModeSpeed={storyModeSpeed}
          providerSettings={providerSettings}
          onClose={() => setSettingsDialogOpen(false)}
          onCinematicModeChange={setCinematicMode}
          onEdgeColorChange={setEdgeColor}
          onEdgeStyleChange={setEdgeStyle}
          onEdgeCurveChange={setEdgeCurve}
          onStoryModeSpeedChange={setStoryModeSpeed}
          onProviderSettingsChange={setProviderSettings}
          onSave={handleSaveSettings}
        />

        {/* Command Palette */}
        <CommandPalette
          open={commandPalette.isOpen}
          onClose={commandPalette.close}
          commands={commandPalette.commands}
        />
      </Box>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGuard>
        <ThreatFlowApp />
      </AuthGuard>
    </AuthProvider>
  );
}