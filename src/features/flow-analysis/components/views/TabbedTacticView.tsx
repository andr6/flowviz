import {
  ExpandMore as ExpandMoreIcon,
  Security as SecurityIcon,
  AccountTree as AccountTreeIcon,
  Shield as ShieldIcon,
  BugReport as BugReportIcon,
  Storage as StorageIcon,
  Computer as ComputerIcon,
  Language as LanguageIcon,
  Terminal as TerminalIcon
} from '@mui/icons-material';
import {
  Box,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Chip,
  Card,
  CardContent,
  Badge
} from '@mui/material';
import React, { useState, useMemo } from 'react';
import { Node, Edge } from 'reactflow';

import { IOCIOAAnalysisResult } from '../../../ioc-analysis/types/IOC';
import { THEME, TACTIC_NAMES } from '../constants';

interface TabbedTacticViewProps {
  nodes: Node[];
  edges: Edge[];
  onNodeSelect?: (node: Node) => void;
  selectedNodeId?: string;
  iocAnalysisResult?: IOCIOAAnalysisResult | null;
}

interface GroupedNodes {
  [tactic: string]: {
    name: string;
    nodes: Node[];
    count: number;
  };
}

const TACTIC_COLORS: Record<string, string> = {
  'TA0001': '#FF6B6B', // Initial Access - Red
  'TA0002': '#4ECDC4', // Execution - Teal
  'TA0003': '#45B7D1', // Persistence - Blue
  'TA0004': '#96CEB4', // Privilege Escalation - Green
  'TA0005': '#FFEAA7', // Defense Evasion - Yellow
  'TA0006': '#DDA0DD', // Credential Access - Purple
  'TA0007': '#F0A0A0', // Discovery - Light Red
  'TA0008': '#FFB347', // Lateral Movement - Orange
  'TA0009': '#87CEEB', // Collection - Sky Blue
  'TA0010': '#98FB98', // Exfiltration - Light Green
  'TA0011': '#F0E68C', // Command and Control - Khaki
  'TA0040': '#FF69B4', // Impact - Hot Pink
};

const TabbedTacticView: React.FC<TabbedTacticViewProps> = ({
  nodes,
  edges,
  onNodeSelect,
  selectedNodeId,
  iocAnalysisResult
}) => {
  const [selectedTactic, setSelectedTactic] = useState<string>('all');
  const [expandedAccordions, setExpandedAccordions] = useState<Set<string>>(new Set(['actions']));

  // Group nodes by MITRE ATT&CK tactic
  const groupedNodes = useMemo(() => {
    const groups: GroupedNodes = {};
    
    // Initialize with all tactics
    Object.entries(TACTIC_NAMES).forEach(([tacticId, tacticName]) => {
      groups[tacticId] = {
        name: tacticName,
        nodes: [],
        count: 0
      };
    });

    // Add 'Other' category for non-action nodes
    groups['other'] = {
      name: 'Other Components',
      nodes: [],
      count: 0
    };

    // Group nodes
    nodes.forEach(node => {
      if (node.type === 'action' && (node.data?.tactic || node.data?.tactic_id)) {
        const tacticId = node.data.tactic || node.data.tactic_id;
        if (groups[tacticId]) {
          groups[tacticId].nodes.push(node);
          groups[tacticId].count++;
        } else {
          groups['other'].nodes.push(node);
          groups['other'].count++;
        }
      } else {
        groups['other'].nodes.push(node);
        groups['other'].count++;
      }
    });

    return groups;
  }, [nodes]);

  // Get tactics that have nodes
  const tacticsWithNodes = useMemo(() => {
    return Object.entries(groupedNodes).filter(([, group]) => group.count > 0);
  }, [groupedNodes]);

  const handleAccordionChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    const newExpanded = new Set(expandedAccordions);
    if (isExpanded) {
      newExpanded.add(panel);
    } else {
      newExpanded.delete(panel);
    }
    setExpandedAccordions(newExpanded);
  };

  const getIOCIcon = (type: string) => {
    switch (type) {
      case 'filename':
      case 'filepath':
        return <StorageIcon />;
      case 'command-line':
      case 'process-name':
        return <TerminalIcon />;
      case 'domain':
      case 'url':
      case 'ipv4':
      case 'ipv6':
        return <LanguageIcon />;
      default:
        return <ComputerIcon />;
    }
  };

  const renderIOCCard = (ioc: any, index: number) => {
    const typeColor = ioc.type === 'domain' ? '#4ECDC4' : 
                     ioc.type === 'filename' ? '#FFB347' :
                     ioc.type === 'command-line' ? '#FF6B6B' : '#96CEB4';

    return (
      <Card
        key={`${ioc.type}-${ioc.value}-${index}`}
        sx={{
          mb: 1,
          backgroundColor: THEME.background.secondary,
          border: '1px solid rgba(255, 255, 255, 0.1)',
          '&:hover': {
            backgroundColor: `${typeColor}10`,
            borderColor: typeColor
          },
          transition: 'all 0.2s ease'
        }}
      >
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Box sx={{ color: typeColor, mr: 1, fontSize: 18 }}>
              {getIOCIcon(ioc.type)}
            </Box>
            <Typography 
              variant="subtitle2" 
              sx={{ 
                color: THEME.text.primary,
                fontWeight: 600,
                flex: 1,
                wordBreak: 'break-all'
              }}
            >
              {ioc.value}
            </Typography>
            <Chip
              label={ioc.type.toUpperCase()}
              size="small"
              sx={{
                backgroundColor: `${typeColor}30`,
                color: typeColor,
                fontSize: '0.7rem',
                height: 20
              }}
            />
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label={`Confidence: ${ioc.confidence}`}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.6rem', height: 18 }}
            />
            {ioc.malicious && (
              <Chip
                label="Malicious"
                size="small"
                sx={{
                  backgroundColor: '#FF6B6B30',
                  color: '#FF6B6B',
                  fontSize: '0.6rem',
                  height: 18
                }}
              />
            )}
          </Box>

          {ioc.context && (
            <Typography 
              variant="caption" 
              sx={{ 
                color: THEME.text.secondary,
                display: 'block',
                mt: 1,
                fontStyle: 'italic',
                maxWidth: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              Context: {ioc.context}
            </Typography>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderIOACard = (ioa: any, index: number) => {
    const severityColor = ioa.severity === 'critical' ? '#FF6B6B' :
                         ioa.severity === 'high' ? '#FFB347' :
                         ioa.severity === 'medium' ? '#FFEAA7' : '#96CEB4';

    return (
      <Card
        key={`${ioa.name}-${index}`}
        sx={{
          mb: 1,
          backgroundColor: THEME.background.secondary,
          border: '1px solid rgba(255, 255, 255, 0.1)',
          '&:hover': {
            backgroundColor: `${severityColor}10`,
            borderColor: severityColor
          },
          transition: 'all 0.2s ease'
        }}
      >
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <BugReportIcon sx={{ color: severityColor, mr: 1, fontSize: 18 }} />
            <Typography 
              variant="subtitle2" 
              sx={{ 
                color: THEME.text.primary,
                fontWeight: 600,
                flex: 1
              }}
            >
              {ioa.name}
            </Typography>
            <Chip
              label={ioa.severity.toUpperCase()}
              size="small"
              sx={{
                backgroundColor: `${severityColor}30`,
                color: severityColor,
                fontSize: '0.7rem',
                height: 20
              }}
            />
          </Box>
          
          {ioa.mitreTactic && (
            <Typography variant="caption" sx={{ color: THEME.text.secondary, display: 'block', mb: 0.5 }}>
              {ioa.mitreTactic} • {ioa.mitreTechnique}
            </Typography>
          )}
          
          {ioa.description && (
            <Typography 
              variant="body2" 
              sx={{ 
                color: THEME.text.secondary, 
                fontSize: '0.8rem',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}
            >
              {ioa.description}
            </Typography>
          )}

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
            <Chip
              label={`Confidence: ${ioa.confidence}`}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.6rem', height: 18 }}
            />
            <Chip
              label={ioa.category}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.6rem', height: 18 }}
            />
          </Box>
        </CardContent>
      </Card>
    );
  };

  const renderNodeCard = (node: Node) => {
    const isSelected = selectedNodeId === node.id;
    const tacticId = node.data?.tactic || node.data?.tactic_id;
    const tacticColor = tacticId ? TACTIC_COLORS[tacticId] : '#666';

    return (
      <Card
        key={node.id}
        onClick={() => onNodeSelect?.(node)}
        sx={{
          mb: 1,
          cursor: 'pointer',
          border: isSelected ? `2px solid ${tacticColor}` : '1px solid rgba(255, 255, 255, 0.1)',
          backgroundColor: isSelected 
            ? `${tacticColor}20` 
            : THEME.background.secondary,
          '&:hover': {
            backgroundColor: `${tacticColor}10`,
            borderColor: tacticColor
          },
          transition: 'all 0.2s ease'
        }}
      >
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <SecurityIcon sx={{ color: tacticColor, mr: 1, fontSize: 18 }} />
            <Typography 
              variant="subtitle2" 
              sx={{ 
                color: THEME.text.primary,
                fontWeight: 600,
                flex: 1
              }}
            >
              {node.data?.name || node.data?.label || 'Unnamed Node'}
            </Typography>
            <Chip
              label={node.type}
              size="small"
              sx={{
                backgroundColor: `${tacticColor}30`,
                color: tacticColor,
                fontSize: '0.7rem',
                height: 20
              }}
            />
          </Box>
          
          {node.data?.technique_id && (
            <Typography variant="caption" sx={{ color: THEME.text.secondary, display: 'block', mb: 0.5 }}>
              {node.data.technique_id}
            </Typography>
          )}
          
          {node.data?.description && (
            <Typography 
              variant="body2" 
              sx={{ 
                color: THEME.text.secondary, 
                fontSize: '0.8rem',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}
            >
              {node.data.description}
            </Typography>
          )}
        </CardContent>
      </Card>
    );
  };

  const filteredTactics = selectedTactic === 'all' 
    ? tacticsWithNodes 
    : tacticsWithNodes.filter(([tacticId]) => tacticId === selectedTactic);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Tactic Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'rgba(255, 255, 255, 0.1)', mb: 2 }}>
        <Tabs
          value={selectedTactic}
          onChange={(e, newValue) => setSelectedTactic(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTab-root': {
              color: THEME.text.secondary,
              minHeight: 48,
              textTransform: 'none'
            },
            '& .Mui-selected': {
              color: THEME.text.primary
            }
          }}
        >
          <Tab 
            value="all" 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AccountTreeIcon fontSize="small" />
                All Tactics
                <Badge badgeContent={nodes.length} color="primary" />
              </Box>
            } 
          />
          {tacticsWithNodes.map(([tacticId, group]) => (
            <Tab
              key={tacticId}
              value={tacticId}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: TACTIC_COLORS[tacticId] || '#666'
                    }}
                  />
                  {group.name}
                  <Badge badgeContent={group.count} color="primary" />
                </Box>
              }
            />
          ))}
          {iocAnalysisResult && (
            <>
              <Tab
                value="iocs"
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <BugReportIcon fontSize="small" />
                    IOCs
                    <Badge badgeContent={iocAnalysisResult.summary.totalIOCs} color="secondary" />
                  </Box>
                }
              />
              <Tab
                value="ioas"
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SecurityIcon fontSize="small" />
                    IOAs
                    <Badge badgeContent={iocAnalysisResult.summary.totalIOAs} color="secondary" />
                  </Box>
                }
              />
            </>
          )}
        </Tabs>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {selectedTactic === 'iocs' && iocAnalysisResult ? (
          <Box>
            <Typography variant="h6" sx={{ color: THEME.text.primary, mb: 2, p: 2 }}>
              Indicators of Compromise ({iocAnalysisResult.summary.totalIOCs})
            </Typography>
            <Box sx={{ p: 2 }}>
              {iocAnalysisResult.iocs.map((ioc, index) => renderIOCCard(ioc, index))}
            </Box>
          </Box>
        ) : selectedTactic === 'ioas' && iocAnalysisResult ? (
          <Box>
            <Typography variant="h6" sx={{ color: THEME.text.primary, mb: 2, p: 2 }}>
              Indicators of Attack ({iocAnalysisResult.summary.totalIOAs})
            </Typography>
            <Box sx={{ p: 2 }}>
              {iocAnalysisResult.ioas.map((ioa, index) => renderIOACard(ioa, index))}
            </Box>
          </Box>
        ) : (
          filteredTactics.map(([tacticId, group]) => (
            <Accordion
              key={tacticId}
              expanded={expandedAccordions.has(tacticId)}
              onChange={handleAccordionChange(tacticId)}
              sx={{
                backgroundColor: THEME.background.secondary,
                border: '1px solid rgba(255, 255, 255, 0.1)',
                mb: 1,
                '&:before': { display: 'none' }
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon sx={{ color: THEME.text.secondary }} />}
                sx={{
                  backgroundColor: THEME.background.tertiary,
                  borderBottom: expandedAccordions.has(tacticId) ? '1px solid rgba(255, 255, 255, 0.1)' : 'none'
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  <ShieldIcon 
                    sx={{ 
                      color: TACTIC_COLORS[tacticId] || '#666', 
                      mr: 2, 
                      fontSize: 20 
                    }} 
                  />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" sx={{ color: THEME.text.primary, mb: 0.5 }}>
                      {group.name}
                    </Typography>
                    {tacticId !== 'other' && (
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          color: TACTIC_COLORS[tacticId] || '#666',
                          fontWeight: 600,
                          fontSize: '0.75rem'
                        }}
                      >
                        {tacticId.toUpperCase()}
                      </Typography>
                    )}
                  </Box>
                  <Chip
                    label={`${group.count} nodes`}
                    size="small"
                    sx={{
                      backgroundColor: `${TACTIC_COLORS[tacticId] || '#666'}30`,
                      color: TACTIC_COLORS[tacticId] || '#666',
                      mr: 2
                    }}
                  />
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 2 }}>
                {group.nodes.map(renderNodeCard)}
              </AccordionDetails>
            </Accordion>
          ))
        )}
      </Box>
    </Box>
  );
};

export default TabbedTacticView;