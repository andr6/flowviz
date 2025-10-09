import {
  Fullscreen,
  FullscreenExit,
  PlayArrow,
  Pause,
  SkipNext,
  SkipPrevious,
  Stop,
  Settings,
  Slideshow,
  Close,
} from '@mui/icons-material';
import {
  Box,
  IconButton,
  Typography,
  Paper,
  Fade,
  Button,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Tooltip,
  useTheme,
  alpha,
} from '@mui/material';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Node, Edge } from 'reactflow';

export interface PresentationSlide {
  id: string;
  type: 'title' | 'overview' | 'timeline' | 'tactic' | 'technique' | 'summary' | 'custom';
  title: string;
  subtitle?: string;
  content: PresentationContent;
  duration: number; // seconds for auto-advance
  animation: SlideAnimation;
  notes?: string;
}

export interface PresentationContent {
  text?: string;
  nodes?: Node[];
  edges?: Edge[];
  highlights?: string[]; // node/edge IDs to highlight
  charts?: ChartData[];
  images?: string[];
  bullets?: string[];
  metadata?: { [key: string]: any };
}

export interface ChartData {
  type: 'bar' | 'pie' | 'line' | 'timeline';
  title: string;
  data: any[];
}

export type SlideAnimation = 'none' | 'fade' | 'slide' | 'zoom' | 'flip';

export interface PresentationSettings {
  autoAdvance: boolean;
  defaultDuration: number;
  showProgress: boolean;
  showSlideNumbers: boolean;
  showNotes: boolean;
  enableKeyboard: boolean;
  enableMouse: boolean;
  enableTouch: boolean;
  loopPresentation: boolean;
  narration: boolean;
  voiceSpeed: number;
  theme: 'dark' | 'light' | 'auto';
}

export interface PresentationMode {
  slides: PresentationSlide[];
  settings: PresentationSettings;
  metadata: {
    title: string;
    author?: string;
    description?: string;
    createdAt: number;
    estimatedDuration: number;
  };
}

interface PresentationModeProps {
  nodes: Node[];
  edges: Edge[];
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onExit: () => void;
  className?: string;
}

const DEFAULT_SETTINGS: PresentationSettings = {
  autoAdvance: false,
  defaultDuration: 30,
  showProgress: true,
  showSlideNumbers: true,
  showNotes: false,
  enableKeyboard: true,
  enableMouse: true,
  enableTouch: true,
  loopPresentation: false,
  narration: false,
  voiceSpeed: 1.0,
  theme: 'dark',
};

const PresentationMode: React.FC<PresentationModeProps> = ({
  nodes,
  edges,
  isFullscreen,
  onToggleFullscreen,
  onExit,
  className,
}) => {
  const theme = useTheme();
  const [presentation, setPresentation] = useState<PresentationMode | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSlideList, setShowSlideList] = useState(false);
  const [progress, setProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [settings, setSettings] = useState<PresentationSettings>(DEFAULT_SETTINGS);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize presentation
  useEffect(() => {
    if (nodes.length > 0 && !isInitialized) {
      const generatedPresentation = generatePresentation(nodes, edges);
      setPresentation(generatedPresentation);
      setIsInitialized(true);
    }
  }, [nodes, edges, isInitialized]);

  // Auto-advance timer
  useEffect(() => {
    if (isPlaying && presentation && settings.autoAdvance) {
      const slide = presentation.slides[currentSlide];
      if (slide) {
        const duration = slide.duration * 1000;
        setTimeRemaining(slide.duration);
        
        timerRef.current = setInterval(() => {
          setTimeRemaining(prev => {
            if (prev <= 1) {
              nextSlide();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        return () => {
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
        };
      }
    }
  }, [isPlaying, currentSlide, settings.autoAdvance, presentation]);

  // Progress calculation
  useEffect(() => {
    if (presentation) {
      setProgress((currentSlide / (presentation.slides.length - 1)) * 100);
    }
  }, [currentSlide, presentation]);

  // Keyboard controls
  useEffect(() => {
    if (!settings.enableKeyboard) {return;}

    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.key) {
        case ' ':
        case 'Enter':
          e.preventDefault();
          togglePlayPause();
          break;
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          nextSlide();
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          prevSlide();
          break;
        case 'Home':
          e.preventDefault();
          goToSlide(0);
          break;
        case 'End':
          e.preventDefault();
          if (presentation) {
            goToSlide(presentation.slides.length - 1);
          }
          break;
        case 'Escape':
          e.preventDefault();
          if (isFullscreen) {
            onToggleFullscreen();
          } else {
            onExit();
          }
          break;
        case 's':
        case 'S':
          e.preventDefault();
          setShowSettings(true);
          break;
        case 'l':
        case 'L':
          e.preventDefault();
          setShowSlideList(true);
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          onToggleFullscreen();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [settings.enableKeyboard, isFullscreen, presentation, onToggleFullscreen, onExit]);

  // Generate presentation from flow data
  const generatePresentation = (nodes: Node[], edges: Edge[]): PresentationMode => {
    const slides: PresentationSlide[] = [];
    
    // Title slide
    slides.push({
      id: 'title',
      type: 'title',
      title: 'Threat Flow Analysis',
      subtitle: 'Interactive Attack Flow Presentation',
      content: {
        text: `Analysis of ${nodes.length} techniques across ${getTacticCount(nodes)} tactics`,
        metadata: {
          nodeCount: nodes.length,
          edgeCount: edges.length,
          generatedAt: Date.now(),
        },
      },
      duration: 10,
      animation: 'fade',
      notes: 'Welcome to the threat analysis presentation. Use arrow keys to navigate.',
    });

    // Overview slide
    slides.push({
      id: 'overview',
      type: 'overview',
      title: 'Attack Flow Overview',
      content: {
        nodes,
        edges,
        charts: [
          {
            type: 'pie',
            title: 'Techniques by Tactic',
            data: generateTacticDistribution(nodes),
          },
        ],
      },
      duration: 30,
      animation: 'slide',
      notes: 'This overview shows the complete attack flow with technique distribution.',
    });

    // Timeline slide (if nodes have timestamps)
    const nodeWithTimestamp = nodes.find(n => n.data?.timestamp);
    if (nodeWithTimestamp) {
      slides.push({
        id: 'timeline',
        type: 'timeline',
        title: 'Attack Timeline',
        content: {
          nodes: nodes.filter(n => n.data?.timestamp),
          edges: edges.filter(e => {
            const sourceHasTime = nodes.find(n => n.id === e.source)?.data?.timestamp;
            const targetHasTime = nodes.find(n => n.id === e.target)?.data?.timestamp;
            return sourceHasTime && targetHasTime;
          }),
          charts: [
            {
              type: 'timeline',
              title: 'Technique Timeline',
              data: generateTimelineData(nodes),
            },
          ],
        },
        duration: 45,
        animation: 'slide',
        notes: 'This timeline shows the temporal progression of the attack.',
      });
    }

    // Tactic-specific slides
    const tactics = [...new Set(nodes.map(n => n.data?.tactic).filter(Boolean))];
    tactics.forEach(tactic => {
      const tacticNodes = nodes.filter(n => n.data?.tactic === tactic);
      const tacticEdges = edges.filter(e => {
        const source = nodes.find(n => n.id === e.source);
        const target = nodes.find(n => n.id === e.target);
        return source?.data?.tactic === tactic || target?.data?.tactic === tactic;
      });

      slides.push({
        id: `tactic-${tactic}`,
        type: 'tactic',
        title: `${tactic.charAt(0).toUpperCase() + tactic.slice(1)} Tactic`,
        content: {
          nodes: tacticNodes,
          edges: tacticEdges,
          highlights: tacticNodes.map(n => n.id),
          bullets: [
            `${tacticNodes.length} techniques identified`,
            `Key indicators: ${tacticNodes.map(n => n.data?.technique_id).filter(Boolean).join(', ')}`,
            `Risk level: ${assessTacticRisk(tacticNodes)}`,
          ],
        },
        duration: 40,
        animation: 'zoom',
        notes: `Detailed analysis of the ${tactic} tactic and its associated techniques.`,
      });
    });

    // Summary slide
    slides.push({
      id: 'summary',
      type: 'summary',
      title: 'Analysis Summary',
      content: {
        bullets: [
          `Analyzed ${nodes.length} techniques across ${tactics.length} tactics`,
          `Identified ${edges.length} technique relationships`,
          `Critical techniques: ${nodes.filter(n => n.data?.severity === 'critical').length}`,
          `Recommended actions: Immediate review of critical techniques`,
        ],
        charts: [
          {
            type: 'bar',
            title: 'Risk Distribution',
            data: generateRiskDistribution(nodes),
          },
        ],
      },
      duration: 30,
      animation: 'fade',
      notes: 'Summary of key findings and recommendations.',
    });

    return {
      slides,
      settings: DEFAULT_SETTINGS,
      metadata: {
        title: 'Threat Flow Analysis',
        description: 'Generated from attack flow visualization',
        createdAt: Date.now(),
        estimatedDuration: slides.reduce((total, slide) => total + slide.duration, 0),
      },
    };
  };

  // Helper functions for data generation
  const getTacticCount = (nodes: Node[]): number => {
    return new Set(nodes.map(n => n.data?.tactic).filter(Boolean)).size;
  };

  const generateTacticDistribution = (nodes: Node[]): any[] => {
    const tacticCounts: { [key: string]: number } = {};
    nodes.forEach(node => {
      const tactic = node.data?.tactic || 'Unknown';
      tacticCounts[tactic] = (tacticCounts[tactic] || 0) + 1;
    });
    return Object.entries(tacticCounts).map(([name, value]) => ({ name, value }));
  };

  const generateTimelineData = (nodes: Node[]): any[] => {
    return nodes
      .filter(node => node.data?.timestamp)
      .map(node => ({
        timestamp: new Date(node.data.timestamp),
        technique: node.data?.technique_id || node.id,
        tactic: node.data?.tactic || 'Unknown',
      }))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  };

  const assessTacticRisk = (nodes: Node[]): string => {
    const criticalCount = nodes.filter(n => n.data?.severity === 'critical').length;
    const highCount = nodes.filter(n => n.data?.severity === 'high').length;
    
    if (criticalCount > 0) {return 'Critical';}
    if (highCount > 0) {return 'High';}
    return 'Medium';
  };

  const generateRiskDistribution = (nodes: Node[]): any[] => {
    const riskCounts = { critical: 0, high: 0, medium: 0, low: 0 };
    nodes.forEach(node => {
      const severity = node.data?.severity || 'medium';
      riskCounts[severity as keyof typeof riskCounts] = (riskCounts[severity as keyof typeof riskCounts] || 0) + 1;
    });
    return Object.entries(riskCounts).map(([name, value]) => ({ name, value }));
  };

  // Control functions
  const togglePlayPause = useCallback(() => {
    setIsPlaying(prev => !prev);
    
    if (!isPlaying && settings.narration) {
      speakSlide(presentation?.slides[currentSlide]);
    } else {
      stopNarration();
    }
  }, [isPlaying, settings.narration, presentation, currentSlide]);

  const nextSlide = useCallback(() => {
    if (!presentation) {return;}
    
    if (currentSlide < presentation.slides.length - 1) {
      setCurrentSlide(prev => prev + 1);
    } else if (settings.loopPresentation) {
      setCurrentSlide(0);
    } else {
      setIsPlaying(false);
    }
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  }, [currentSlide, presentation, settings.loopPresentation]);

  const prevSlide = useCallback(() => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  }, [currentSlide]);

  const goToSlide = useCallback((index: number) => {
    if (presentation && index >= 0 && index < presentation.slides.length) {
      setCurrentSlide(index);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  }, [presentation]);

  const stopPresentation = useCallback(() => {
    setIsPlaying(false);
    setCurrentSlide(0);
    stopNarration();
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  }, []);

  // Narration functions
  const speakSlide = useCallback((slide?: PresentationSlide) => {
    if (!slide || !settings.narration) {return;}
    
    stopNarration();
    
    const text = [
      slide.title,
      slide.subtitle,
      slide.content.text,
      slide.notes,
    ].filter(Boolean).join('. ');
    
    if (text && 'speechSynthesis' in window) {
      speechRef.current = new SpeechSynthesisUtterance(text);
      speechRef.current.rate = settings.voiceSpeed;
      speechRef.current.onend = () => {
        if (isPlaying && settings.autoAdvance) {
          nextSlide();
        }
      };
      
      window.speechSynthesis.speak(speechRef.current);
    }
  }, [settings.narration, settings.voiceSpeed, isPlaying, settings.autoAdvance, nextSlide]);

  const stopNarration = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  // Render slide content
  const renderSlideContent = (slide: PresentationSlide) => {
    const { content, animation } = slide;
    
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: 4,
          textAlign: 'center',
        }}
      >
        {/* Title */}
        <Typography
          variant="h2"
          component="h1"
          sx={{
            mb: 2,
            color: 'white',
            fontWeight: 600,
            textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
          }}
        >
          {slide.title}
        </Typography>

        {/* Subtitle */}
        {slide.subtitle && (
          <Typography
            variant="h4"
            component="h2"
            sx={{
              mb: 4,
              color: alpha(theme.palette.common.white, 0.8),
              fontWeight: 300,
            }}
          >
            {slide.subtitle}
          </Typography>
        )}

        {/* Content */}
        {content.text && (
          <Typography
            variant="h6"
            sx={{
              mb: 4,
              color: alpha(theme.palette.common.white, 0.9),
              maxWidth: 800,
              lineHeight: 1.6,
            }}
          >
            {content.text}
          </Typography>
        )}

        {/* Bullet points */}
        {content.bullets && (
          <Box sx={{ textAlign: 'left', maxWidth: 800, mb: 4 }}>
            {content.bullets.map((bullet, index) => (
              <Typography
                key={index}
                variant="h6"
                sx={{
                  mb: 1,
                  color: alpha(theme.palette.common.white, 0.9),
                  '&:before': {
                    content: '"•"',
                    marginRight: 2,
                    color: theme.palette.primary.main,
                  },
                }}
              >
                {bullet}
              </Typography>
            ))}
          </Box>
        )}

        {/* Flow visualization (simplified) */}
        {content.nodes && (
          <Box
            sx={{
              width: '80%',
              height: 300,
              border: '2px solid rgba(255,255,255,0.2)',
              borderRadius: 2,
              mb: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: alpha(theme.palette.common.black, 0.2),
            }}
          >
            <Typography color="white">
              Flow visualization with {content.nodes.length} techniques
            </Typography>
          </Box>
        )}

        {/* Charts placeholder */}
        {content.charts && content.charts.length > 0 && (
          <Box
            sx={{
              width: '60%',
              height: 200,
              border: '2px solid rgba(255,255,255,0.2)',
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: alpha(theme.palette.common.black, 0.2),
            }}
          >
            <Typography color="white">
              Chart: {content.charts[0].title}
            </Typography>
          </Box>
        )}
      </Box>
    );
  };

  if (!presentation) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          backgroundColor: '#000',
        }}
      >
        <Typography color="white">Loading presentation...</Typography>
      </Box>
    );
  }

  const currentSlideData = presentation.slides[currentSlide];

  return (
    <Box
      ref={containerRef}
      className={className}
      sx={{
        height: '100vh',
        backgroundColor: '#000',
        color: 'white',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Main slide content */}
      <Fade in={true} timeout={500} key={currentSlide}>
        <Box sx={{ height: '100%', width: '100%' }}>
          {renderSlideContent(currentSlideData)}
        </Box>
      </Fade>

      {/* Controls overlay */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          backgroundColor: alpha(theme.palette.common.black, 0.7),
          borderRadius: 3,
          p: 1,
        }}
      >
        <Tooltip title="Previous slide">
          <IconButton
            onClick={prevSlide}
            disabled={currentSlide === 0}
            sx={{ color: 'white' }}
          >
            <SkipPrevious />
          </IconButton>
        </Tooltip>

        <Tooltip title={isPlaying ? 'Pause' : 'Play'}>
          <IconButton onClick={togglePlayPause} sx={{ color: 'white' }}>
            {isPlaying ? <Pause /> : <PlayArrow />}
          </IconButton>
        </Tooltip>

        <Tooltip title="Stop">
          <IconButton onClick={stopPresentation} sx={{ color: 'white' }}>
            <Stop />
          </IconButton>
        </Tooltip>

        <Tooltip title="Next slide">
          <IconButton
            onClick={nextSlide}
            disabled={currentSlide === presentation.slides.length - 1 && !settings.loopPresentation}
            sx={{ color: 'white' }}
          >
            <SkipNext />
          </IconButton>
        </Tooltip>

        {settings.showSlideNumbers && (
          <Typography variant="body2" sx={{ mx: 2, color: 'white' }}>
            {currentSlide + 1} / {presentation.slides.length}
          </Typography>
        )}

        <Tooltip title="Slide list">
          <IconButton onClick={() => setShowSlideList(true)} sx={{ color: 'white' }}>
            <Slideshow />
          </IconButton>
        </Tooltip>

        <Tooltip title="Settings">
          <IconButton onClick={() => setShowSettings(true)} sx={{ color: 'white' }}>
            <Settings />
          </IconButton>
        </Tooltip>

        <Tooltip title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
          <IconButton onClick={onToggleFullscreen} sx={{ color: 'white' }}>
            {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
          </IconButton>
        </Tooltip>

        <Tooltip title="Exit presentation">
          <IconButton onClick={onExit} sx={{ color: 'white' }}>
            <Close />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Progress bar */}
      {settings.showProgress && (
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            backgroundColor: alpha(theme.palette.common.white, 0.2),
            '& .MuiLinearProgress-bar': {
              backgroundColor: theme.palette.primary.main,
            },
          }}
        />
      )}

      {/* Timer display */}
      {isPlaying && settings.autoAdvance && timeRemaining > 0 && (
        <Paper
          sx={{
            position: 'absolute',
            top: 20,
            right: 20,
            p: 1,
            backgroundColor: alpha(theme.palette.common.black, 0.7),
            color: 'white',
          }}
        >
          <Typography variant="body2">
            Next: {timeRemaining}s
          </Typography>
        </Paper>
      )}

      {/* Slide list dialog */}
      <Dialog
        open={showSlideList}
        onClose={() => setShowSlideList(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Presentation Slides</DialogTitle>
        <DialogContent>
          <List>
            {presentation.slides.map((slide, index) => (
              <ListItem
                key={slide.id}
                button
                selected={index === currentSlide}
                onClick={() => {
                  goToSlide(index);
                  setShowSlideList(false);
                }}
              >
                <ListItemIcon>
                  <Typography variant="h6">{index + 1}</Typography>
                </ListItemIcon>
                <ListItemText
                  primary={slide.title}
                  secondary={slide.subtitle}
                />
                <Chip
                  label={slide.type}
                  size="small"
                  variant="outlined"
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSlideList(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Settings dialog */}
      <Dialog
        open={showSettings}
        onClose={() => setShowSettings(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Presentation Settings</DialogTitle>
        <DialogContent>
          {/* Settings controls would go here */}
          <Typography variant="body2" color="text.secondary">
            Settings panel (implementation details omitted for brevity)
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSettings(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PresentationMode;