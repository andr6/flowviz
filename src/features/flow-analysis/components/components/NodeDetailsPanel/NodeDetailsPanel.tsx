import { 
  Close as CloseIcon, 
  OpenInNew as OpenInNewIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Security as SecurityIcon,
  Timeline as TimelineIcon,
  Link as LinkIcon,
  Analytics as AnalyticsIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import {
  Box,
  Typography,
  IconButton,
  Divider,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  LinearProgress,
  Tab,
  Tabs
} from '@mui/material';
import React from 'react';

import { ConfidenceChip } from '../../../../../shared/components/Alert';
import { THEME } from '../../constants';
import { NodeDetailsProps } from '../../types';
import {
  isAttackAsset,
  isAttackCondition,
  getMitreLink,
  getTacticName,
  getNodeDisplayName,
  getNodeTypeLabel
} from '../../utils/nodeUtils';

const NodeDetailsPanel: React.FC<NodeDetailsProps> = ({ node, onClose }) => {
  const [activeTab, setActiveTab] = React.useState(0);
  const [expandedSections, setExpandedSections] = React.useState<Record<string, boolean>>({
    overview: true,
    iocs: false,
    relationships: false,
    timeline: false,
    technical: false
  });

  const isActionType = node.type === 'action' || node.type === 'attack-action';
  const displayName = getNodeDisplayName(node);
  const typeLabel = getNodeTypeLabel(node.type);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const sectionHeaderStyle = {
    color: THEME.text.secondary,
    mb: 1,
    textTransform: 'uppercase' as const,
    fontSize: '0.75rem',
    fontWeight: 600,
    letterSpacing: '0.05em'
  };


  const renderAssetDetails = () => {
    if (!isAttackAsset(node)) {return null;}

    return (
      <>
        {/* Asset Details */}
        {node.indicator_type && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={sectionHeaderStyle}>
              ASSET DETAILS
            </Typography>
            
            {node.indicator_type && (
              <Box sx={{ mb: 1 }}>
                <Typography variant="caption" sx={{ color: THEME.text.secondary }}>
                  Indicator Type:
                </Typography>
                <Typography variant="body2" sx={{ color: THEME.text.primary, ml: 1 }}>
                  {node.indicator_type.replace('-', ' ').toUpperCase()}
                </Typography>
              </Box>
            )}

            {node.indicator_value && (
              <Box sx={{ mb: 1 }}>
                <Typography variant="caption" sx={{ color: THEME.text.secondary }}>
                  Value:
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: THEME.text.primary, 
                    ml: 1,
                    fontFamily: 'monospace',
                    fontSize: '0.8rem'
                  }}
                >
                  {node.indicator_value}
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </>
    );
  };

  const renderConditionDetails = () => {
    if (!isAttackCondition(node)) {return null;}
    // Conditions don't need special details - description and context are shown in the main section
    return null;
  };

  return (
    <Box
      sx={{
        position: 'absolute',
        top: THEME.spacing.panel,
        right: THEME.spacing.panel,
        width: 320,
        maxHeight: 'calc(100vh - 100px)',
        overflowY: 'auto',
        overflowX: 'hidden',
        zIndex: 10,
        background: THEME.background.secondary,
        border: THEME.border.default,
        borderRadius: '12px',
        backdropFilter: 'blur(10px)',
        boxShadow: THEME.shadow.panel
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          p: 2,
          borderBottom: THEME.border.default
        }}
      >
        <Box sx={{ flex: 1, pr: 2, minWidth: 0 }}>
          <Typography
            variant="h6"
            sx={{
              background: 'linear-gradient(135deg, #fff 0%, rgba(255, 255, 255, 0.7) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
              mb: 1.5,
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
              hyphens: 'auto',
            }}
          >
            {displayName}
          </Typography>
          
          {/* MITRE ATT&CK Chips - only for action nodes */}
          {isActionType && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {/* Tactic */}
              {(node.tactic_id || node.tactic_name) && (
                <Box
                  component="a"
                  href={node.tactic_id ? `https://attack.mitre.org/tactics/${node.tactic_id}/` : undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px 12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    color: 'rgba(255, 255, 255, 0.8)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    transition: 'all 0.2s ease-in-out',
                    cursor: 'pointer',
                    width: 'fit-content',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: 'rgba(255, 255, 255, 0.95)'
                    }
                  }}
                >
                  <Typography sx={{ color: 'inherit', fontSize: 'inherit', fontWeight: 'inherit' }}>
                    {node.tactic_id}: {node.tactic_name || getTacticName(node.tactic_id || '')}
                  </Typography>
                  <OpenInNewIcon sx={{ fontSize: '12px', ml: 1, opacity: 0.7 }} />
                </Box>
              )}

              {/* Technique */}
              {node.technique_id && (
                <Box
                  component="a"
                  href={getMitreLink(node.technique_id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px 12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    color: 'rgba(255, 255, 255, 0.8)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    transition: 'all 0.2s ease-in-out',
                    cursor: 'pointer',
                    width: 'fit-content',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: 'rgba(255, 255, 255, 0.95)'
                    }
                  }}
                >
                  <Typography sx={{ color: 'inherit', fontSize: 'inherit', fontWeight: 'inherit' }}>
                    {node.technique_id}: {node.name}
                  </Typography>
                  <OpenInNewIcon sx={{ fontSize: '12px', ml: 1, opacity: 0.7 }} />
                </Box>
              )}
            </Box>
          )}
        </Box>
        <IconButton
          className="node-details-close-button"
          onClick={onClose}
          sx={{
            color: 'rgba(255, 255, 255, 0.7)',
            minWidth: 'auto',
            minHeight: 'auto',
            padding: '4px',
            '&:hover': {
              color: '#fff',
              backgroundColor: 'transparent'
            }
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Enhanced Content with Tabs */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Tabs */}
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{
            borderBottom: 1,
            borderColor: 'rgba(255, 255, 255, 0.1)',
            minHeight: 36,
            '& .MuiTab-root': {
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: '0.75rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              minHeight: 36,
              padding: '6px 12px',
              '&.Mui-selected': {
                color: '#fff'
              }
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#fff',
              height: 1
            }
          }}
        >
          <Tab icon={<InfoIcon sx={{ fontSize: 14 }} />} label="Overview" />
          <Tab icon={<SecurityIcon sx={{ fontSize: 14 }} />} label="IOCs" />
          <Tab icon={<AnalyticsIcon sx={{ fontSize: 14 }} />} label="Analysis" />
        </Tabs>

        {/* Tab Content */}
        <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
          {/* Overview Tab */}
          {activeTab === 0 && (
            <Box>
              {/* Description */}
              {'description' in node && node.description && (
                <Accordion 
                  expanded={expandedSections.overview} 
                  onChange={() => toggleSection('overview')}
                  sx={{
                    backgroundColor: 'transparent',
                    boxShadow: 'none',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    mb: 2,
                    '&:before': { display: 'none' }
                  }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon sx={{ color: 'rgba(255, 255, 255, 0.7)' }} />}
                    sx={{
                      color: THEME.text.secondary,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      minHeight: 40,
                      '& .MuiAccordionSummary-content': {
                        margin: '8px 0'
                      }
                    }}
                  >
                    DESCRIPTION
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography variant="body2" sx={{ color: THEME.text.primary, lineHeight: 1.5 }}>
                      {node.description}
                    </Typography>
                  </AccordionDetails>
                </Accordion>
              )}

              {/* Type-specific details */}
              {renderAssetDetails()}
              {renderConditionDetails()}

              {/* Source Evidence */}
              {'source_excerpt' in node && node.source_excerpt && (
                <Accordion 
                  expanded={expandedSections.technical} 
                  onChange={() => toggleSection('technical')}
                  sx={{
                    backgroundColor: 'transparent',
                    boxShadow: 'none',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    mb: 2,
                    '&:before': { display: 'none' }
                  }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon sx={{ color: 'rgba(255, 255, 255, 0.7)' }} />}
                    sx={{
                      color: THEME.text.secondary,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      minHeight: 40
                    }}
                  >
                    SOURCE EVIDENCE
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography
                      variant="body2"
                      sx={{
                        color: THEME.text.primary,
                        fontSize: '0.85rem',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        padding: 1.5,
                        borderRadius: '6px',
                        border: THEME.border.default,
                        lineHeight: 1.5,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        fontStyle: 'italic'
                      }}
                    >
                      "{node.source_excerpt}"
                    </Typography>
                  </AccordionDetails>
                </Accordion>
              )}

              {/* Confidence Level */}
              {'confidence' in node && node.confidence && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ ...sectionHeaderStyle, mb: 1 }}>
                    CONFIDENCE SCORE
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <ConfidenceChip confidence={node.confidence as 'low' | 'medium' | 'high'} />
                    <LinearProgress
                      variant="determinate"
                      value={node.confidence === 'high' ? 85 : node.confidence === 'medium' ? 60 : 35}
                      sx={{
                        flex: 1,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: node.confidence === 'high' ? '#4ade80' : node.confidence === 'medium' ? '#fbbf24' : '#f87171'
                        }
                      }}
                    />
                  </Box>
                  <Typography variant="caption" sx={{ color: THEME.text.secondary, mt: 0.5, display: 'block' }}>
                    Confidence in extraction accuracy based on source text clarity
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {/* IOCs Tab */}
          {activeTab === 1 && (
            <Box>
              <Typography variant="h6" sx={{ color: THEME.text.primary, mb: 2 }}>
                Related Indicators
              </Typography>
              
              {/* IOC Categories */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
                <Chip 
                  label="Network IOCs" 
                  size="small" 
                  sx={{ 
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    color: '#60a5fa',
                    fontSize: '0.7rem'
                  }} 
                />
                <Chip 
                  label="File Hashes" 
                  size="small" 
                  sx={{ 
                    backgroundColor: 'rgba(34, 197, 94, 0.2)',
                    color: '#4ade80',
                    fontSize: '0.7rem'
                  }} 
                />
                <Chip 
                  label="Registry Keys" 
                  size="small" 
                  sx={{ 
                    backgroundColor: 'rgba(168, 85, 247, 0.2)',
                    color: '#a855f7',
                    fontSize: '0.7rem'
                  }} 
                />
              </Box>

              {/* Placeholder for IOC extraction */}
              <Box sx={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px dashed rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                p: 3,
                textAlign: 'center'
              }}>
                <SecurityIcon sx={{ fontSize: 48, color: 'rgba(255, 255, 255, 0.3)', mb: 1 }} />
                <Typography variant="body2" sx={{ color: THEME.text.secondary }}>
                  IOC extraction and analysis will be displayed here
                </Typography>
              </Box>
            </Box>
          )}

          {/* Analysis Tab */}
          {activeTab === 2 && (
            <Box>
              <Typography variant="h6" sx={{ color: THEME.text.primary, mb: 2 }}>
                Advanced Analysis
              </Typography>
              
              {/* Risk Assessment */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" sx={sectionHeaderStyle}>
                  RISK ASSESSMENT
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                  <Typography variant="body2" sx={{ color: THEME.text.primary, fontSize: '0.8rem' }}>
                    Threat Level:
                  </Typography>
                  <Chip 
                    label="HIGH" 
                    size="small" 
                    sx={{ 
                      backgroundColor: 'rgba(248, 113, 113, 0.2)',
                      color: '#f87171',
                      fontSize: '0.7rem',
                      fontWeight: 600
                    }} 
                  />
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={75}
                  sx={{
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: '#f87171'
                    }
                  }}
                />
              </Box>

              {/* Timeline Context */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" sx={sectionHeaderStyle}>
                  TIMELINE CONTEXT
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <TimelineIcon sx={{ fontSize: 16, color: THEME.text.secondary }} />
                  <Typography variant="body2" sx={{ color: THEME.text.primary, fontSize: '0.8rem' }}>
                    Attack Phase: Initial Access → Execution
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ color: THEME.text.secondary }}>
                  Estimated occurrence in attack timeline
                </Typography>
              </Box>

              {/* Related Techniques */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" sx={sectionHeaderStyle}>
                  RELATED TECHNIQUES
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  <Chip 
                    label="T1566.001" 
                    size="small" 
                    clickable
                    sx={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      color: THEME.text.primary,
                      fontSize: '0.7rem',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.15)'
                      }
                    }} 
                  />
                  <Chip 
                    label="T1059.001" 
                    size="small" 
                    clickable
                    sx={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      color: THEME.text.primary,
                      fontSize: '0.7rem',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.15)'
                      }
                    }} 
                  />
                </Box>
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default NodeDetailsPanel;