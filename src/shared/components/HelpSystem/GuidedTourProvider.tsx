/**
 * Contextual Help System with Guided Tours
 * Interactive help system with step-by-step guided tours for new users
 */
import {
  Close as CloseIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  Help as HelpIcon,
  Lightbulb as LightbulbIcon,
  School as SchoolIcon,
} from '@mui/icons-material';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Popper,
  Backdrop,
  LinearProgress,
  Chip,
  Avatar,
  Card,
  CardContent,
  CardActions,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { motion, AnimatePresence } from 'framer-motion';
import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';

// Tour step configuration
interface TourStep {
  id: string;
  title: string;
  content: string;
  target: string; // CSS selector
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: 'click' | 'hover' | 'focus';
  optional?: boolean;
  validation?: () => boolean;
  onEnter?: () => void;
  onExit?: () => void;
  highlight?: boolean;
  delay?: number;
}

interface TourDefinition {
  id: string;
  title: string;
  description: string;
  category: 'getting-started' | 'analysis' | 'advanced' | 'features';
  estimatedTime: number; // minutes
  icon: React.ElementType;
  steps: TourStep[];
  prerequisites?: string[];
  onComplete?: () => void;
}

interface TourState {
  activeTour: TourDefinition | null;
  currentStepIndex: number;
  isPlaying: boolean;
  completedTours: string[];
  showHelp: boolean;
  tourProgress: Record<string, number>;
}

interface GuidedTourContextValue {
  tourState: TourState;
  startTour: (tourId: string) => void;
  stopTour: () => void;
  nextStep: () => void;
  previousStep: () => void;
  pauseTour: () => void;
  resumeTour: () => void;
  skipStep: () => void;
  toggleHelp: () => void;
  markTourCompleted: (tourId: string) => void;
  getAvailableTours: () => TourDefinition[];
}

// Tour definitions
const TOUR_DEFINITIONS: TourDefinition[] = [
  {
    id: 'getting-started',
    title: 'Getting Started with ThreatFlow',
    description: 'Learn the basics of threat intelligence analysis',
    category: 'getting-started',
    estimatedTime: 5,
    icon: SchoolIcon,
    steps: [
      {
        id: 'welcome',
        title: 'Welcome to ThreatFlow',
        content: 'Welcome to ThreatFlow! This guided tour will help you understand how to analyze threats and create attack flow visualizations.',
        target: '[data-tour="main-header"]',
        position: 'bottom',
        highlight: true,
      },
      {
        id: 'search-form',
        title: 'Start Your Analysis',
        content: 'Use this search form to input threat intelligence articles, URLs, or paste text content for analysis.',
        target: '[data-tour="search-form"]',
        position: 'bottom',
        action: 'click',
      },
      {
        id: 'ai-provider',
        title: 'Choose AI Provider',
        content: 'Select your preferred AI provider. Claude provides the best results, but you can also use local Ollama or OpenAI.',
        target: '[data-tour="ai-provider"]',
        position: 'left',
      },
      {
        id: 'analysis-button',
        title: 'Run Analysis',
        content: 'Click this button to start the AI-powered threat analysis. You\'ll see real-time progress as the analysis runs.',
        target: '[data-tour="analyze-button"]',
        position: 'top',
        action: 'hover',
      },
      {
        id: 'visualization',
        title: 'Interactive Visualization',
        content: 'Your analysis results will appear here as an interactive attack flow diagram. You can zoom, pan, and click on nodes for details.',
        target: '[data-tour="flow-visualization"]',
        position: 'center',
      },
    ],
  },
  {
    id: 'advanced-features',
    title: 'Advanced Analysis Features',
    description: 'Discover powerful features for expert threat analysts',
    category: 'advanced',
    estimatedTime: 8,
    icon: LightbulbIcon,
    prerequisites: ['getting-started'],
    steps: [
      {
        id: 'command-palette',
        title: 'Command Palette',
        content: 'Press Cmd+K (or Ctrl+K) to open the command palette for quick access to any feature or to search across all your data.',
        target: 'body',
        position: 'center',
      },
      {
        id: 'dashboard',
        title: 'SOC Dashboard',
        content: 'Access real-time threat intelligence feeds, system health, and security metrics from the dashboard.',
        target: '[data-tour="dashboard-link"]',
        position: 'bottom',
      },
      {
        id: 'export-options',
        title: 'Export & Share',
        content: 'Export your analysis in multiple formats: PNG images, STIX 2.1 bundles, or Attack Flow Builder files.',
        target: '[data-tour="export-menu"]',
        position: 'left',
      },
    ],
  },
  {
    id: 'collaboration-workflow',
    title: 'Team Collaboration',
    description: 'Learn how to work with your security team',
    category: 'features',
    estimatedTime: 6,
    icon: HelpIcon,
    steps: [
      {
        id: 'save-analysis',
        title: 'Save Your Work',
        content: 'Save your analysis with metadata and tags so your team can easily find and build upon your work.',
        target: '[data-tour="save-button"]',
        position: 'bottom',
      },
      {
        id: 'load-analysis',
        title: 'Browse Team Analyses',
        content: 'Access all saved analyses from your team, search by content, and filter by date or analyst.',
        target: '[data-tour="load-button"]',
        position: 'bottom',
      },
      {
        id: 'investigation-mode',
        title: 'Investigation Workspace',
        content: 'Use the investigation workspace to correlate multiple analyses and build comprehensive threat intelligence.',
        target: '[data-tour="investigation-workspace"]',
        position: 'right',
      },
    ],
  },
];

// Context
const GuidedTourContext = createContext<GuidedTourContextValue | null>(null);

export const useGuidedTour = () => {
  const context = useContext(GuidedTourContext);
  if (!context) {
    throw new Error('useGuidedTour must be used within a GuidedTourProvider');
  }
  return context;
};

// Main provider component
export const GuidedTourProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const theme = useTheme();
  const [tourState, setTourState] = useState<TourState>({
    activeTour: null,
    currentStepIndex: 0,
    isPlaying: false,
    completedTours: JSON.parse(localStorage.getItem('threatflow-completed-tours') || '[]'),
    showHelp: false,
    tourProgress: JSON.parse(localStorage.getItem('threatflow-tour-progress') || '{}'),
  });

  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [popperAnchor, setPopperAnchor] = useState<HTMLElement | null>(null);

  // Find target element for current step
  const findTargetElement = useCallback((selector: string) => {
    if (selector === 'body') {return document.body;}
    return document.querySelector(selector) as HTMLElement;
  }, []);

  // Update target element when step changes
  useEffect(() => {
    if (!tourState.activeTour || !tourState.isPlaying) {
      setTargetElement(null);
      setPopperAnchor(null);
      return;
    }

    const currentStep = tourState.activeTour.steps[tourState.currentStepIndex];
    if (!currentStep) {return;}

    const element = findTargetElement(currentStep.target);
    setTargetElement(element);
    setPopperAnchor(element);

    // Execute step enter callback
    if (currentStep.onEnter) {
      currentStep.onEnter();
    }

    // Scroll element into view
    if (element && element !== document.body) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    return () => {
      // Execute step exit callback
      if (currentStep.onExit) {
        currentStep.onExit();
      }
    };
  }, [tourState.activeTour, tourState.currentStepIndex, tourState.isPlaying, findTargetElement]);

  // Tour control functions
  const startTour = useCallback((tourId: string) => {
    const tour = TOUR_DEFINITIONS.find(t => t.id === tourId);
    if (!tour) {return;}

    setTourState(prev => ({
      ...prev,
      activeTour: tour,
      currentStepIndex: 0,
      isPlaying: true,
    }));
  }, []);

  const stopTour = useCallback(() => {
    setTourState(prev => ({
      ...prev,
      activeTour: null,
      currentStepIndex: 0,
      isPlaying: false,
    }));
    setTargetElement(null);
    setPopperAnchor(null);
  }, []);

  const nextStep = useCallback(() => {
    if (!tourState.activeTour) {return;}

    const nextIndex = tourState.currentStepIndex + 1;
    if (nextIndex >= tourState.activeTour.steps.length) {
      // Tour completed
      markTourCompleted(tourState.activeTour.id);
      if (tourState.activeTour.onComplete) {
        tourState.activeTour.onComplete();
      }
      stopTour();
      return;
    }

    setTourState(prev => ({
      ...prev,
      currentStepIndex: nextIndex,
    }));
  }, [tourState.activeTour, tourState.currentStepIndex]);

  const previousStep = useCallback(() => {
    if (tourState.currentStepIndex > 0) {
      setTourState(prev => ({
        ...prev,
        currentStepIndex: prev.currentStepIndex - 1,
      }));
    }
  }, [tourState.currentStepIndex]);

  const pauseTour = useCallback(() => {
    setTourState(prev => ({ ...prev, isPlaying: false }));
  }, []);

  const resumeTour = useCallback(() => {
    setTourState(prev => ({ ...prev, isPlaying: true }));
  }, []);

  const skipStep = useCallback(() => {
    nextStep();
  }, [nextStep]);

  const toggleHelp = useCallback(() => {
    setTourState(prev => ({ ...prev, showHelp: !prev.showHelp }));
  }, []);

  const markTourCompleted = useCallback((tourId: string) => {
    const updatedCompleted = [...tourState.completedTours, tourId];
    setTourState(prev => ({
      ...prev,
      completedTours: updatedCompleted,
    }));
    localStorage.setItem('threatflow-completed-tours', JSON.stringify(updatedCompleted));
  }, [tourState.completedTours]);

  const getAvailableTours = useCallback(() => {
    return TOUR_DEFINITIONS.filter(tour => {
      // Check prerequisites
      if (tour.prerequisites) {
        return tour.prerequisites.every(prereq => 
          tourState.completedTours.includes(prereq)
        );
      }
      return true;
    });
  }, [tourState.completedTours]);

  // Current step data
  const currentStep = tourState.activeTour?.steps[tourState.currentStepIndex];
  const progress = tourState.activeTour 
    ? ((tourState.currentStepIndex + 1) / tourState.activeTour.steps.length) * 100
    : 0;

  // Render tour overlay
  const renderTourOverlay = () => {
    if (!tourState.isPlaying || !currentStep || !popperAnchor) {return null;}

    const placement = currentStep.position === 'center' ? 'top' : currentStep.position;

    return (
      <>
        {/* Backdrop with highlight */}
        <Backdrop
          open={true}
          sx={{
            zIndex: theme.zIndex.tooltip - 1,
            bgcolor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(2px)',
          }}
        />

        {/* Highlight overlay */}
        {currentStep.highlight && targetElement && targetElement !== document.body && (
          <Box
            sx={{
              position: 'fixed',
              zIndex: theme.zIndex.tooltip,
              pointerEvents: 'none',
              border: `3px solid ${theme.palette.primary.main}`,
              borderRadius: 1,
              animation: 'pulse 2s infinite',
              '@keyframes pulse': {
                '0%': { boxShadow: `0 0 0 0 ${theme.palette.primary.main}40` },
                '70%': { boxShadow: `0 0 0 10px ${theme.palette.primary.main}00` },
                '100%': { boxShadow: `0 0 0 0 ${theme.palette.primary.main}00` },
              },
              ...getElementPosition(targetElement),
            }}
          />
        )}

        {/* Tour step popper */}
        <Popper
          open={true}
          anchorEl={currentStep.position === 'center' ? document.body : popperAnchor}
          placement={placement as any}
          modifiers={[
            {
              name: 'offset',
              options: {
                offset: [0, 12],
              },
            },
            {
              name: 'preventOverflow',
              options: {
                boundary: 'viewport',
                padding: 16,
              },
            },
          ]}
          sx={{ zIndex: theme.zIndex.tooltip + 1 }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
          >
            <Card
              sx={{
                maxWidth: 400,
                minWidth: 300,
                ...(currentStep.position === 'center' && {
                  position: 'fixed',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                }),
              }}
            >
              {/* Progress bar */}
              <LinearProgress
                variant="determinate"
                value={progress}
                sx={{ height: 3 }}
              />

              <CardContent>
                {/* Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar sx={{ width: 24, height: 24, bgcolor: 'primary.main' }}>
                      <Typography variant="caption" color="primary.contrastText">
                        {tourState.currentStepIndex + 1}
                      </Typography>
                    </Avatar>
                    <Typography variant="h6">{currentStep.title}</Typography>
                  </Box>
                  <IconButton size="small" onClick={stopTour}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>

                {/* Content */}
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {currentStep.content}
                </Typography>

                {/* Tour info */}
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <Chip
                    label={`${tourState.currentStepIndex + 1} of ${tourState.activeTour?.steps.length}`}
                    size="small"
                    variant="outlined"
                  />
                  <Chip
                    label={tourState.activeTour?.category.replace('-', ' ')}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                  {currentStep.optional && (
                    <Chip
                      label="Optional"
                      size="small"
                      variant="outlined"
                    />
                  )}
                </Box>
              </CardContent>

              <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    startIcon={<ArrowBackIcon />}
                    onClick={previousStep}
                    disabled={tourState.currentStepIndex === 0}
                    size="small"
                  >
                    Back
                  </Button>
                  {currentStep.optional && (
                    <Button onClick={skipStep} size="small" color="secondary">
                      Skip
                    </Button>
                  )}
                </Box>

                <Button
                  endIcon={<ArrowForwardIcon />}
                  onClick={nextStep}
                  variant="contained"
                  size="small"
                >
                  {tourState.currentStepIndex === (tourState.activeTour?.steps.length || 1) - 1 ? 'Finish' : 'Next'}
                </Button>
              </CardActions>
            </Card>
          </motion.div>
        </Popper>
      </>
    );
  };

  // Helper function to get element position
  const getElementPosition = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    return {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    };
  };

  const contextValue: GuidedTourContextValue = {
    tourState,
    startTour,
    stopTour,
    nextStep,
    previousStep,
    pauseTour,
    resumeTour,
    skipStep,
    toggleHelp,
    markTourCompleted,
    getAvailableTours,
  };

  return (
    <GuidedTourContext.Provider value={contextValue}>
      {children}
      <AnimatePresence>
        {renderTourOverlay()}
      </AnimatePresence>
    </GuidedTourContext.Provider>
  );
};

export default GuidedTourProvider;