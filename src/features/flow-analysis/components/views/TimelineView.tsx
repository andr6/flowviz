import {
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  SkipNext as SkipNextIcon,
  SkipPrevious as SkipPreviousIcon,
  Timeline as TimelineIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon
} from '@mui/icons-material';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  IconButton,
  Button,
  ButtonGroup,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Paper
} from '@mui/material';
import React, { useState, useMemo } from 'react';
import { Node, Edge } from 'reactflow';

import { THEME, TACTIC_NAMES } from '../constants';

interface TimelineViewProps {
  nodes: Node[];
  edges: Edge[];
  onNodeSelect?: (node: Node) => void;
  selectedNodeId?: string;
}

interface TimelineStep {
  node: Node;
  stepIndex: number;
  tactic: string;
  tacticName: string;
  timestamp?: Date;
  connections: {
    from: Node[];
    to: Node[];
  };
}

const TACTIC_ORDER = [
  'TA0001', // Initial Access
  'TA0002', // Execution
  'TA0003', // Persistence
  'TA0004', // Privilege Escalation
  'TA0005', // Defense Evasion
  'TA0006', // Credential Access
  'TA0007', // Discovery
  'TA0008', // Lateral Movement
  'TA0009', // Collection
  'TA0010', // Exfiltration
  'TA0011', // Command and Control
  'TA0040', // Impact
];

const TACTIC_COLORS: Record<string, string> = {
  'TA0001': '#FF6B6B',
  'TA0002': '#4ECDC4',
  'TA0003': '#45B7D1',
  'TA0004': '#96CEB4',
  'TA0005': '#FFEAA7',
  'TA0006': '#DDA0DD',
  'TA0007': '#F0A0A0',
  'TA0008': '#FFB347',
  'TA0009': '#87CEEB',
  'TA0010': '#98FB98',
  'TA0011': '#F0E68C',
  'TA0040': '#FF69B4',
};

const TimelineView: React.FC<TimelineViewProps> = ({
  nodes,
  edges,
  onNodeSelect,
  selectedNodeId
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(2000); // ms between steps

  // Create timeline from nodes and edges
  const timelineSteps = useMemo(() => {
    // Filter and sort action nodes by tactic order
    const actionNodes = nodes.filter(node => node.type === 'action' && (node.data?.tactic || node.data?.tactic_id));
    
    // Sort by tactic order, then by creation order
    const sortedNodes = actionNodes.sort((a, b) => {
      const aTacticIndex = TACTIC_ORDER.indexOf(a.data?.tactic || a.data?.tactic_id || '');
      const bTacticIndex = TACTIC_ORDER.indexOf(b.data?.tactic || b.data?.tactic_id || '');
      
      if (aTacticIndex !== bTacticIndex) {
        return aTacticIndex - bTacticIndex;
      }
      
      // If same tactic, maintain original order (assuming nodes are added chronologically)
      return 0;
    });

    // Create timeline steps
    const steps: TimelineStep[] = sortedNodes.map((node, index) => {
      const tactic = node.data?.tactic || node.data?.tactic_id || '';
      
      // Find connected nodes
      const fromNodes = edges
        .filter(edge => edge.target === node.id)
        .map(edge => nodes.find(n => n.id === edge.source))
        .filter(Boolean) as Node[];
        
      const toNodes = edges
        .filter(edge => edge.source === node.id)
        .map(edge => nodes.find(n => n.id === edge.target))
        .filter(Boolean) as Node[];

      return {
        node,
        stepIndex: index,
        tactic,
        tacticName: TACTIC_NAMES[tactic] || 'Unknown Tactic',
        connections: {
          from: fromNodes,
          to: toNodes
        }
      };
    });

    return steps;
  }, [nodes, edges]);

  // Playback functionality
  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isPlaying && currentStep < timelineSteps.length - 1) {
      interval = setInterval(() => {
        setCurrentStep(prev => {
          const next = prev + 1;
          if (next >= timelineSteps.length - 1) {
            setIsPlaying(false);
          }
          return next;
        });
      }, playbackSpeed);
    }

    return () => clearInterval(interval);
  }, [isPlaying, currentStep, timelineSteps.length, playbackSpeed]);

  const handleStepChange = (step: number) => {
    setCurrentStep(step);
    setIsPlaying(false);
    
    // Select the node for this step
    if (timelineSteps[step]) {
      onNodeSelect?.(timelineSteps[step].node);
    }
  };

  const togglePlayback = () => {
    if (currentStep >= timelineSteps.length - 1) {
      setCurrentStep(0);
    }
    setIsPlaying(!isPlaying);
  };


  const renderConnectionsCard = (title: string, nodes: Node[], color: string) => {
    if (nodes.length === 0) {return null;}

    return (
      <Card sx={{ 
        mt: 1, 
        backgroundColor: THEME.background.tertiary,
        border: `1px solid ${color}30`
      }}>
        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Typography variant="caption" sx={{ color, fontWeight: 600, mb: 1, display: 'block' }}>
            {title}
          </Typography>
          {nodes.map(node => (
            <Chip
              key={node.id}
              label={node.data?.name || node.data?.label || 'Unnamed'}
              size="small"
              onClick={() => onNodeSelect?.(node)}
              sx={{
                backgroundColor: `${color}20`,
                color,
                mr: 0.5,
                mb: 0.5,
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: `${color}40`
                }
              }}
            />
          ))}
        </CardContent>
      </Card>
    );
  };

  if (timelineSteps.length === 0) {
    return (
      <Box sx={{ 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 2
      }}>
        <TimelineIcon sx={{ fontSize: 64, color: THEME.text.muted }} />
        <Typography variant="h6" sx={{ color: THEME.text.secondary }}>
          No timeline data available
        </Typography>
        <Typography variant="body2" sx={{ color: THEME.text.muted, textAlign: 'center' }}>
          Timeline view requires action nodes with MITRE ATT&CK tactic information
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Playback Controls */}
      <Paper sx={{ 
        p: 2, 
        mb: 2, 
        backgroundColor: THEME.background.secondary,
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" sx={{ color: THEME.text.primary }}>
            Attack Timeline Playback
          </Typography>
          <Chip 
            label={`Step ${currentStep + 1} of ${timelineSteps.length}`}
            sx={{ backgroundColor: THEME.background.tertiary }}
          />
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <ButtonGroup variant="contained" size="small">
            <IconButton 
              onClick={() => handleStepChange(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
              sx={{ color: THEME.text.primary }}
            >
              <SkipPreviousIcon />
            </IconButton>
            <IconButton 
              onClick={togglePlayback}
              sx={{ color: THEME.text.primary }}
            >
              {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </IconButton>
            <IconButton 
              onClick={() => handleStepChange(Math.min(timelineSteps.length - 1, currentStep + 1))}
              disabled={currentStep >= timelineSteps.length - 1}
              sx={{ color: THEME.text.primary }}
            >
              <SkipNextIcon />
            </IconButton>
          </ButtonGroup>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SpeedIcon sx={{ color: THEME.text.secondary, fontSize: 18 }} />
            <ButtonGroup size="small" variant="outlined">
              <Button 
                onClick={() => setPlaybackSpeed(1000)}
                variant={playbackSpeed === 1000 ? 'contained' : 'outlined'}
              >
                1x
              </Button>
              <Button 
                onClick={() => setPlaybackSpeed(2000)}
                variant={playbackSpeed === 2000 ? 'contained' : 'outlined'}
              >
                0.5x
              </Button>
              <Button 
                onClick={() => setPlaybackSpeed(3000)}
                variant={playbackSpeed === 3000 ? 'contained' : 'outlined'}
              >
                0.3x
              </Button>
            </ButtonGroup>
          </Box>
        </Box>
      </Paper>

      {/* Timeline Stepper */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <Stepper 
          activeStep={currentStep} 
          orientation="vertical"
          sx={{
            '& .MuiStepLabel-root': {
              cursor: 'pointer'
            }
          }}
        >
          {timelineSteps.map((step, index) => {
            const tacticColor = TACTIC_COLORS[step.tactic] || '#666';
            const isSelected = selectedNodeId === step.node.id;
            
            return (
              <Step key={step.node.id}>
                <StepLabel
                  onClick={() => handleStepChange(index)}
                  sx={{
                    '& .MuiStepLabel-label': {
                      color: index === currentStep ? tacticColor : THEME.text.secondary,
                      fontWeight: index === currentStep ? 600 : 400
                    },
                    '& .MuiStepIcon-root': {
                      color: index <= currentStep ? tacticColor : THEME.text.muted
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body1" sx={{ fontWeight: 'inherit' }}>
                      {step.tacticName}
                    </Typography>
                    <Chip
                      label={step.node.data?.technique_id || step.node.type}
                      size="small"
                      sx={{
                        backgroundColor: `${tacticColor}30`,
                        color: tacticColor,
                        fontSize: '0.7rem'
                      }}
                    />
                  </Box>
                </StepLabel>
                <StepContent>
                  <Card sx={{ 
                    backgroundColor: isSelected 
                      ? `${tacticColor}20` 
                      : THEME.background.secondary,
                    border: isSelected 
                      ? `2px solid ${tacticColor}` 
                      : '1px solid rgba(255, 255, 255, 0.1)',
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: `${tacticColor}10`,
                      borderColor: tacticColor
                    }
                  }}>
                    <CardContent sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <SecurityIcon sx={{ color: tacticColor, mr: 1 }} />
                        <Typography variant="h6" sx={{ color: THEME.text.primary }}>
                          {step.node.data?.name || 'Unnamed Action'}
                        </Typography>
                      </Box>
                      
                      {step.node.data?.description && (
                        <Typography variant="body2" sx={{ color: THEME.text.secondary, mb: 2 }}>
                          {step.node.data.description}
                        </Typography>
                      )}
                      
                      {step.connections.from.length > 0 && 
                        renderConnectionsCard('Prerequisites', step.connections.from, '#4ECDC4')
                      }
                      
                      {step.connections.to.length > 0 && 
                        renderConnectionsCard('Leads to', step.connections.to, '#FFB347')
                      }
                    </CardContent>
                  </Card>
                </StepContent>
              </Step>
            );
          })}
        </Stepper>
      </Box>
    </Box>
  );
};

export default TimelineView;