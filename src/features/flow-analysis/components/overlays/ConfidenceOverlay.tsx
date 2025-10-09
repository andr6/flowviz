import {
  Security as ConfidenceIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Assessment as StatsIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Remove as TrendingFlatIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Collapse,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Chip,
  Tooltip,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import React, { useState } from 'react';

import { useThemeContext } from '../../../../shared/context/ThemeProvider';
import {
  confidenceIndicatorService,
  ConfidenceLevel,
  CONFIDENCE_LEVELS,
  NodeConfidence,
  EdgeConfidence,
  ConfidenceFactor,
} from '../../services/confidenceIndicators';

interface ConfidenceOverlayProps {
  visible: boolean;
  onToggleVisibility: (visible: boolean) => void;
  nodeConfidences: NodeConfidence[];
  edgeConfidences: EdgeConfidence[];
  onRefreshConfidence: () => void;
}

export const ConfidenceOverlay: React.FC<ConfidenceOverlayProps> = ({
  visible,
  onToggleVisibility,
  nodeConfidences,
  edgeConfidences,
  onRefreshConfidence,
}) => {
  const { theme } = useThemeContext();
  const [expanded, setExpanded] = useState(true);
  const [selectedConfidence, setSelectedConfidence] = useState<NodeConfidence | EdgeConfidence | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const stats = confidenceIndicatorService.getConfidenceStats();

  const getConfidenceColor = (level: ConfidenceLevel) => {
    return CONFIDENCE_LEVELS[level]?.color || theme.colors.text.tertiary;
  };

  const getConfidenceIcon = (score: number) => {
    if (score >= 80) {return <TrendingUpIcon fontSize="small" />;}
    if (score >= 40) {return <TrendingFlatIcon fontSize="small" />;}
    return <TrendingDownIcon fontSize="small" />;
  };

  const renderConfidenceScore = (score: number, level: ConfidenceLevel) => (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
      <Box
        component="span"
        sx={{
          width: 12,
          height: 12,
          borderRadius: '50%',
          backgroundColor: getConfidenceColor(level),
          display: 'inline-block',
        }}
      />
      <Box component="span"
        sx={{
          color: theme.colors.text.primary,
          fontSize: theme.typography.fontSize.sm,
          fontWeight: theme.typography.fontWeight.medium,
          fontFamily: theme.typography.fontFamily.primary,
        }}
      >
        {score}%
      </Box>
      <Box component="span"
        sx={{
          color: theme.colors.text.tertiary,
          fontSize: theme.typography.fontSize.xs,
          fontFamily: theme.typography.fontFamily.primary,
        }}
      >
        ({CONFIDENCE_LEVELS[level]?.label})
      </Box>
    </Box>
  );

  const renderFactorAnalysis = (factors: ConfidenceFactor[]) => (
    <Box sx={{ mt: 2 }}>
      <Typography
        variant="overline"
        sx={{
          color: theme.colors.text.tertiary,
          fontSize: theme.typography.fontSize.xs,
          fontWeight: theme.typography.fontWeight.semibold,
          letterSpacing: theme.typography.letterSpacing.wide,
          textTransform: 'uppercase',
          display: 'block',
          mb: 1,
        }}
      >
        Confidence Factors
      </Typography>
      
      {factors.map((factor) => (
        <Box key={factor.id} sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
            <Typography
              sx={{
                color: theme.colors.text.primary,
                fontSize: theme.typography.fontSize.xs,
                fontWeight: theme.typography.fontWeight.medium,
                fontFamily: theme.typography.fontFamily.primary,
              }}
            >
              {factor.name}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography
                sx={{
                  color: theme.colors.text.tertiary,
                  fontSize: theme.typography.fontSize.xs,
                  fontFamily: theme.typography.fontFamily.primary,
                }}
              >
                {Math.round(factor.value)}%
              </Typography>
              <Chip
                label={`${Math.round(factor.weight * 100)}% weight`}
                size="small"
                sx={{
                  height: 16,
                  fontSize: theme.typography.fontSize.xs,
                  backgroundColor: theme.colors.surface.subtle,
                  color: theme.colors.text.tertiary,
                  '& .MuiChip-label': {
                    px: 1,
                  },
                }}
              />
            </Box>
          </Box>
          
          <LinearProgress
            variant="determinate"
            value={factor.value}
            sx={{
              height: 4,
              borderRadius: theme.borderRadius.sm,
              backgroundColor: theme.colors.surface.subtle,
              '& .MuiLinearProgress-bar': {
                backgroundColor: getConfidenceColor(
                  confidenceIndicatorService.getConfidenceLevel 
                    ? confidenceIndicatorService.getConfidenceLevel(factor.value)
                    : 'medium'
                ),
                borderRadius: theme.borderRadius.sm,
              },
            }}
          />
          
          <Typography
            sx={{
              color: theme.colors.text.tertiary,
              fontSize: theme.typography.fontSize.xs,
              fontFamily: theme.typography.fontFamily.primary,
              mt: 0.5,
              fontStyle: 'italic',
            }}
          >
            {factor.description}
          </Typography>
        </Box>
      ))}
    </Box>
  );

  return (
    <Card
      sx={{
        position: 'absolute',
        top: 80,
        left: 16,
        width: 380,
        maxHeight: 'calc(100vh - 120px)',
        backgroundColor: theme.colors.background.glassHeavy,
        backdropFilter: theme.effects.blur.xl,
        border: `1px solid ${theme.colors.surface.border.default}`,
        borderRadius: theme.borderRadius.lg,
        zIndex: 1000,
        overflowY: 'auto',
        display: visible ? 'block' : 'none',
      }}
    >
      <CardContent sx={{ p: 2 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ConfidenceIcon sx={{ color: theme.colors.brand.primary }} />
            <Typography
              variant="h6"
              sx={{
                color: theme.colors.text.primary,
                fontSize: theme.typography.fontSize.base,
                fontWeight: theme.typography.fontWeight.semibold,
                fontFamily: theme.typography.fontFamily.primary,
              }}
            >
              Confidence Indicators
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title={visible ? 'Hide confidence overlay' : 'Show confidence overlay'}>
              <IconButton
                size="small"
                onClick={() => onToggleVisibility(!visible)}
                sx={{ color: theme.colors.text.tertiary }}
              >
                {visible ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
            <IconButton
              size="small"
              onClick={() => setExpanded(!expanded)}
              sx={{ color: theme.colors.text.tertiary }}
            >
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>
        </Box>

        <Collapse in={expanded}>
          {/* Overall Statistics */}
          <Box sx={{ mb: 3 }}>
            <Typography
              variant="overline"
              sx={{
                color: theme.colors.text.tertiary,
                fontSize: theme.typography.fontSize.xs,
                fontWeight: theme.typography.fontWeight.semibold,
                letterSpacing: theme.typography.letterSpacing.wide,
                textTransform: 'uppercase',
                display: 'block',
                mb: 1,
              }}
            >
              Overall Statistics
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <StatsIcon fontSize="small" sx={{ color: theme.colors.text.tertiary }} />
                <Typography
                  sx={{
                    color: theme.colors.text.primary,
                    fontSize: theme.typography.fontSize.sm,
                    fontFamily: theme.typography.fontFamily.primary,
                  }}
                >
                  Average Confidence:
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {getConfidenceIcon(stats.avgConfidence)}
                <Typography
                  sx={{
                    color: getConfidenceColor(
                      stats.avgConfidence >= 81 ? 'very-high' :
                      stats.avgConfidence >= 61 ? 'high' :
                      stats.avgConfidence >= 41 ? 'medium' :
                      stats.avgConfidence >= 21 ? 'low' : 'very-low'
                    ),
                    fontSize: theme.typography.fontSize.sm,
                    fontWeight: theme.typography.fontWeight.semibold,
                    fontFamily: theme.typography.fontFamily.primary,
                  }}
                >
                  {stats.avgConfidence}%
                </Typography>
              </Box>
            </Box>

            {/* Distribution */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {Object.entries(CONFIDENCE_LEVELS).map(([level, config]) => {
                const nodeCount = stats.nodeStats[level] || 0;
                const edgeCount = stats.edgeStats[level] || 0;
                const total = nodeCount + edgeCount;
                
                return total > 0 ? (
                  <Chip
                    key={level}
                    label={`${config.label}: ${total}`}
                    size="small"
                    sx={{
                      backgroundColor: `${config.color  }20`,
                      color: config.color,
                      fontSize: theme.typography.fontSize.xs,
                      border: `1px solid ${config.color}40`,
                    }}
                  />
                ) : null;
              })}
            </Box>
          </Box>

          <Divider sx={{ borderColor: theme.colors.surface.border.subtle, mb: 2 }} />

          {/* Node Confidences */}
          {nodeConfidences.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography
                variant="overline"
                sx={{
                  color: theme.colors.text.tertiary,
                  fontSize: theme.typography.fontSize.xs,
                  fontWeight: theme.typography.fontWeight.semibold,
                  letterSpacing: theme.typography.letterSpacing.wide,
                  textTransform: 'uppercase',
                  display: 'block',
                  mb: 1,
                }}
              >
                Node Confidences ({nodeConfidences.length})
              </Typography>
              
              <List sx={{ py: 0, maxHeight: 200, overflowY: 'auto' }}>
                {nodeConfidences.slice(0, 10).map((confidence) => (
                  <ListItem
                    key={confidence.nodeId}
                    sx={{
                      borderRadius: theme.borderRadius.md,
                      mb: 0.5,
                      backgroundColor: 'transparent',
                      '&:hover': {
                        backgroundColor: theme.colors.surface.hover,
                      },
                      transition: theme.motion.fast,
                      cursor: 'pointer',
                    }}
                    onClick={() => {
                      setSelectedConfidence(confidence);
                      setShowDetails(true);
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <Box
                        sx={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          backgroundColor: getConfidenceColor(confidence.overallScore.level),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Typography
                          sx={{
                            color: '#fff',
                            fontSize: theme.typography.fontSize.xs,
                            fontWeight: theme.typography.fontWeight.bold,
                          }}
                        >
                          {Math.round(confidence.overallScore.score / 10)}
                        </Typography>
                      </Box>
                    </ListItemIcon>
                    
                    <ListItemText
                      primary={
                        <Box component="span"
                          sx={{
                            color: theme.colors.text.primary,
                            fontSize: theme.typography.fontSize.sm,
                            fontWeight: theme.typography.fontWeight.medium,
                            fontFamily: theme.typography.fontFamily.primary,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Node {confidence.nodeId.substring(0, 8)}...
                        </Box>
                      }
                      secondary={renderConfidenceScore(confidence.overallScore.score, confidence.overallScore.level)}
                    />
                  </ListItem>
                ))}
                {nodeConfidences.length > 10 && (
                  <Typography
                    sx={{
                      color: theme.colors.text.tertiary,
                      fontSize: theme.typography.fontSize.xs,
                      textAlign: 'center',
                      py: 1,
                    }}
                  >
                    +{nodeConfidences.length - 10} more nodes
                  </Typography>
                )}
              </List>
            </Box>
          )}

          {/* Edge Confidences */}
          {edgeConfidences.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography
                variant="overline"
                sx={{
                  color: theme.colors.text.tertiary,
                  fontSize: theme.typography.fontSize.xs,
                  fontWeight: theme.typography.fontWeight.semibold,
                  letterSpacing: theme.typography.letterSpacing.wide,
                  textTransform: 'uppercase',
                  display: 'block',
                  mb: 1,
                }}
              >
                Edge Confidences ({edgeConfidences.length})
              </Typography>
              
              <List sx={{ py: 0, maxHeight: 150, overflowY: 'auto' }}>
                {edgeConfidences.slice(0, 5).map((confidence) => (
                  <ListItem
                    key={confidence.edgeId}
                    sx={{
                      borderRadius: theme.borderRadius.md,
                      mb: 0.5,
                      backgroundColor: 'transparent',
                      '&:hover': {
                        backgroundColor: theme.colors.surface.hover,
                      },
                      transition: theme.motion.fast,
                      cursor: 'pointer',
                    }}
                    onClick={() => {
                      setSelectedConfidence(confidence);
                      setShowDetails(true);
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <Box
                        sx={{
                          width: 20,
                          height: 20,
                          borderRadius: theme.borderRadius.sm,
                          backgroundColor: getConfidenceColor(confidence.overallScore.level),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Typography
                          sx={{
                            color: '#fff',
                            fontSize: theme.typography.fontSize.xs,
                            fontWeight: theme.typography.fontWeight.bold,
                          }}
                        >
                          {Math.round(confidence.overallScore.score / 10)}
                        </Typography>
                      </Box>
                    </ListItemIcon>
                    
                    <ListItemText
                      primary={
                        <Box component="span"
                          sx={{
                            color: theme.colors.text.primary,
                            fontSize: theme.typography.fontSize.sm,
                            fontWeight: theme.typography.fontWeight.medium,
                            fontFamily: theme.typography.fontFamily.primary,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Edge {confidence.edgeId.substring(0, 8)}...
                        </Box>
                      }
                      secondary={renderConfidenceScore(confidence.overallScore.score, confidence.overallScore.level)}
                    />
                  </ListItem>
                ))}
                {edgeConfidences.length > 5 && (
                  <Typography
                    sx={{
                      color: theme.colors.text.tertiary,
                      fontSize: theme.typography.fontSize.xs,
                      textAlign: 'center',
                      py: 1,
                    }}
                  >
                    +{edgeConfidences.length - 5} more edges
                  </Typography>
                )}
              </List>
            </Box>
          )}

          {/* Empty State */}
          {nodeConfidences.length === 0 && edgeConfidences.length === 0 && (
            <Box
              sx={{
                textAlign: 'center',
                py: 4,
                color: theme.colors.text.tertiary,
              }}
            >
              <ConfidenceIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
              <Typography
                sx={{
                  fontSize: theme.typography.fontSize.sm,
                  fontFamily: theme.typography.fontFamily.primary,
                }}
              >
                No confidence data available
              </Typography>
              <Typography
                sx={{
                  fontSize: theme.typography.fontSize.xs,
                  fontFamily: theme.typography.fontFamily.primary,
                  mt: 1,
                  opacity: 0.7,
                }}
              >
                Analyze a flow to see confidence indicators
              </Typography>
            </Box>
          )}
        </Collapse>

        {/* Detailed View Modal */}
        {showDetails && selectedConfidence && (
          <Box
            sx={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(4px)',
              zIndex: 2000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              p: 2,
            }}
            onClick={() => setShowDetails(false)}
          >
            <Card
              sx={{
                width: '100%',
                maxWidth: 600,
                maxHeight: '90vh',
                overflowY: 'auto',
                backgroundColor: theme.colors.background.primary,
                border: `1px solid ${theme.colors.surface.border.default}`,
                borderRadius: theme.borderRadius.lg,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                  <Typography
                    variant="h6"
                    sx={{
                      color: theme.colors.text.primary,
                      fontSize: theme.typography.fontSize.lg,
                      fontWeight: theme.typography.fontWeight.semibold,
                      fontFamily: theme.typography.fontFamily.primary,
                    }}
                  >
                    Confidence Details
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => setShowDetails(false)}
                    sx={{ color: theme.colors.text.tertiary }}
                  >
                    <ExpandLessIcon />
                  </IconButton>
                </Box>

                {/* Overall Score */}
                <Box sx={{ mb: 3 }}>
                  <Typography
                    variant="overline"
                    sx={{
                      color: theme.colors.text.tertiary,
                      fontSize: theme.typography.fontSize.xs,
                      fontWeight: theme.typography.fontWeight.semibold,
                      letterSpacing: theme.typography.letterSpacing.wide,
                      textTransform: 'uppercase',
                      display: 'block',
                      mb: 1,
                    }}
                  >
                    Overall Score
                  </Typography>
                  {renderConfidenceScore(selectedConfidence.overallScore.score, selectedConfidence.overallScore.level)}
                  <Typography
                    sx={{
                      color: theme.colors.text.tertiary,
                      fontSize: theme.typography.fontSize.sm,
                      fontFamily: theme.typography.fontFamily.primary,
                      mt: 1,
                    }}
                  >
                    {CONFIDENCE_LEVELS[selectedConfidence.overallScore.level]?.description}
                  </Typography>
                </Box>

                {/* Specific Scores for Nodes */}
                {'detectionConfidence' in selectedConfidence && (
                  <Box sx={{ mb: 3 }}>
                    <Accordion>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography
                          sx={{
                            color: theme.colors.text.primary,
                            fontSize: theme.typography.fontSize.sm,
                            fontWeight: theme.typography.fontWeight.medium,
                            fontFamily: theme.typography.fontFamily.primary,
                          }}
                        >
                          Detection Confidence
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        {renderConfidenceScore(selectedConfidence.detectionConfidence.score, selectedConfidence.detectionConfidence.level)}
                        {renderFactorAnalysis(selectedConfidence.detectionConfidence.factors)}
                      </AccordionDetails>
                    </Accordion>

                    <Accordion>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography
                          sx={{
                            color: theme.colors.text.primary,
                            fontSize: theme.typography.fontSize.sm,
                            fontWeight: theme.typography.fontWeight.medium,
                            fontFamily: theme.typography.fontFamily.primary,
                          }}
                        >
                          Attribution Confidence
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        {renderConfidenceScore(selectedConfidence.attributionConfidence.score, selectedConfidence.attributionConfidence.level)}
                        {renderFactorAnalysis(selectedConfidence.attributionConfidence.factors)}
                      </AccordionDetails>
                    </Accordion>

                    <Accordion>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography
                          sx={{
                            color: theme.colors.text.primary,
                            fontSize: theme.typography.fontSize.sm,
                            fontWeight: theme.typography.fontWeight.medium,
                            fontFamily: theme.typography.fontFamily.primary,
                          }}
                        >
                          Behavior Confidence
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        {renderConfidenceScore(selectedConfidence.behaviorConfidence.score, selectedConfidence.behaviorConfidence.level)}
                        {renderFactorAnalysis(selectedConfidence.behaviorConfidence.factors)}
                      </AccordionDetails>
                    </Accordion>
                  </Box>
                )}

                {/* Specific Scores for Edges */}
                {'causalityConfidence' in selectedConfidence && (
                  <Box sx={{ mb: 3 }}>
                    <Accordion>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography
                          sx={{
                            color: theme.colors.text.primary,
                            fontSize: theme.typography.fontSize.sm,
                            fontWeight: theme.typography.fontWeight.medium,
                            fontFamily: theme.typography.fontFamily.primary,
                          }}
                        >
                          Causality Confidence
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        {renderConfidenceScore(selectedConfidence.causalityConfidence.score, selectedConfidence.causalityConfidence.level)}
                        {renderFactorAnalysis(selectedConfidence.causalityConfidence.factors)}
                      </AccordionDetails>
                    </Accordion>

                    <Accordion>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography
                          sx={{
                            color: theme.colors.text.primary,
                            fontSize: theme.typography.fontSize.sm,
                            fontWeight: theme.typography.fontWeight.medium,
                            fontFamily: theme.typography.fontFamily.primary,
                          }}
                        >
                          Sequence Confidence
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        {renderConfidenceScore(selectedConfidence.sequenceConfidence.score, selectedConfidence.sequenceConfidence.level)}
                        {renderFactorAnalysis(selectedConfidence.sequenceConfidence.factors)}
                      </AccordionDetails>
                    </Accordion>
                  </Box>
                )}

                {/* Factor Analysis */}
                <Box>
                  <Typography
                    variant="overline"
                    sx={{
                      color: theme.colors.text.tertiary,
                      fontSize: theme.typography.fontSize.xs,
                      fontWeight: theme.typography.fontWeight.semibold,
                      letterSpacing: theme.typography.letterSpacing.wide,
                      textTransform: 'uppercase',
                      display: 'block',
                      mb: 1,
                    }}
                  >
                    All Contributing Factors
                  </Typography>
                  {renderFactorAnalysis(selectedConfidence.overallScore.factors)}
                </Box>
              </CardContent>
            </Card>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};