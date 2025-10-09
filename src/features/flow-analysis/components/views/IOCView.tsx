import {
  Search as SearchIcon,
  BugReport as BugReportIcon,
  Security as SecurityIcon,
  Storage as StorageIcon,
  Computer as ComputerIcon,
  Language as LanguageIcon,
  Terminal as TerminalIcon,
  ExpandMore as ExpandMoreIcon,
  FilterList as FilterListIcon
} from '@mui/icons-material';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Tabs,
  Tab,
  TextField,
  InputAdornment,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Badge,
  Paper
} from '@mui/material';
import React, { useState, useMemo } from 'react';

import { IOCIOAAnalysisResult } from '../../../ioc-analysis/types/IOC';
import { THEME } from '../constants';

interface IOCViewProps {
  iocAnalysisResult?: IOCIOAAnalysisResult | null;
}

const IOCView: React.FC<IOCViewProps> = ({ iocAnalysisResult }) => {
  const [selectedTab, setSelectedTab] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedAccordions, setExpandedAccordions] = useState<Set<string>>(new Set(['iocs', 'ioas']));

  const getIOCIcon = (type: string) => {
    switch (type) {
      case 'filename':
      case 'filepath':
        return <StorageIcon sx={{ fontSize: 18 }} />;
      case 'command-line':
      case 'process-name':
        return <TerminalIcon sx={{ fontSize: 18 }} />;
      case 'domain':
      case 'url':
      case 'ipv4':
      case 'ipv6':
        return <LanguageIcon sx={{ fontSize: 18 }} />;
      default:
        return <ComputerIcon sx={{ fontSize: 18 }} />;
    }
  };

  const getIOCTypeColor = (type: string) => {
    switch (type) {
      case 'domain':
      case 'url':
      case 'ipv4':
      case 'ipv6':
        return '#4ECDC4';
      case 'filename':
      case 'filepath':
        return '#FFB347';
      case 'command-line':
      case 'process-name':
        return '#FF6B6B';
      case 'md5':
      case 'sha1':
      case 'sha256':
        return '#DDA0DD';
      default:
        return '#96CEB4';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '#FF6B6B';
      case 'high':
        return '#FFB347';
      case 'medium':
        return '#FFEAA7';
      case 'low':
        return '#96CEB4';
      default:
        return '#96CEB4';
    }
  };

  // Filter and group IOCs
  const filteredIOCs = useMemo(() => {
    if (!iocAnalysisResult) {return [];}
    
    let iocs = iocAnalysisResult.iocs;
    
    // Filter by search term
    if (searchTerm) {
      iocs = iocs.filter(ioc => 
        ioc.value.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ioc.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (ioc.context && ioc.context.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    // Filter by selected tab
    if (selectedTab !== 'all') {
      iocs = iocs.filter(ioc => ioc.type === selectedTab);
    }
    
    return iocs;
  }, [iocAnalysisResult, searchTerm, selectedTab]);

  const filteredIOAs = useMemo(() => {
    if (!iocAnalysisResult) {return [];}
    
    let ioas = iocAnalysisResult.ioas;
    
    // Filter by search term
    if (searchTerm) {
      ioas = ioas.filter(ioa => 
        ioa.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ioa.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (ioa.description && ioa.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    return ioas;
  }, [iocAnalysisResult, searchTerm]);

  // Group IOCs by type
  const iocsByType = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    filteredIOCs.forEach(ioc => {
      if (!grouped[ioc.type]) {
        grouped[ioc.type] = [];
      }
      grouped[ioc.type].push(ioc);
    });
    return grouped;
  }, [filteredIOCs]);

  // Get unique IOC types for tabs
  const iocTypes = useMemo(() => {
    if (!iocAnalysisResult) {return [];}
    const types = [...new Set(iocAnalysisResult.iocs.map(ioc => ioc.type))];
    return types.sort();
  }, [iocAnalysisResult]);

  const handleAccordionChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    const newExpanded = new Set(expandedAccordions);
    if (isExpanded) {
      newExpanded.add(panel);
    } else {
      newExpanded.delete(panel);
    }
    setExpandedAccordions(newExpanded);
  };

  const renderIOCCard = (ioc: any, index: number) => {
    const typeColor = getIOCTypeColor(ioc.type);

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
            <Box sx={{ color: typeColor, mr: 1 }}>
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
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
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
            <Chip
              label={ioc.source}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.6rem', height: 18 }}
            />
          </Box>

          {ioc.context && (
            <Typography 
              variant="caption" 
              sx={{ 
                color: THEME.text.secondary,
                fontStyle: 'italic',
                mt: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical'
              }}
            >
              Context: {ioc.context}
            </Typography>
          )}

          {ioc.tags && ioc.tags.length > 0 && (
            <Box sx={{ mt: 1 }}>
              {ioc.tags.slice(0, 3).map((tag: string, tagIndex: number) => (
                <Chip
                  key={tagIndex}
                  label={tag}
                  size="small"
                  variant="outlined"
                  sx={{ 
                    fontSize: '0.6rem', 
                    height: 16, 
                    mr: 0.5,
                    mb: 0.5
                  }}
                />
              ))}
            </Box>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderIOACard = (ioa: any, index: number) => {
    const severityColor = getSeverityColor(ioa.severity);

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
            <SecurityIcon sx={{ color: severityColor, mr: 1, fontSize: 18 }} />
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
                mb: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical'
              }}
            >
              {ioa.description}
            </Typography>
          )}

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
            <Chip
              label={ioa.source}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.6rem', height: 18 }}
            />
          </Box>
        </CardContent>
      </Card>
    );
  };

  if (!iocAnalysisResult || (iocAnalysisResult.summary.totalIOCs === 0 && iocAnalysisResult.summary.totalIOAs === 0)) {
    return (
      <Box sx={{ 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 2
      }}>
        <BugReportIcon sx={{ fontSize: 64, color: THEME.text.muted }} />
        <Typography variant="h6" sx={{ color: THEME.text.secondary }}>
          No IOCs/IOAs Available
        </Typography>
        <Typography variant="body2" sx={{ color: THEME.text.muted, textAlign: 'center' }}>
          IOC/IOA analysis will appear here when indicators are extracted from analyzed content
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper sx={{ 
        p: 2, 
        mb: 2, 
        backgroundColor: THEME.background.secondary,
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h5" sx={{ color: THEME.text.primary, display: 'flex', alignItems: 'center', gap: 1 }}>
            <BugReportIcon />
            IOC/IOA Analysis
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Badge badgeContent={iocAnalysisResult.summary.totalIOCs} color="primary">
              <Chip label="IOCs" variant="outlined" />
            </Badge>
            <Badge badgeContent={iocAnalysisResult.summary.totalIOAs} color="secondary">
              <Chip label="IOAs" variant="outlined" />
            </Badge>
          </Box>
        </Box>

        {/* Search */}
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search IOCs/IOAs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: THEME.text.secondary }} />
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: THEME.background.tertiary,
              '& fieldset': {
                borderColor: 'rgba(255, 255, 255, 0.1)',
              },
              '&:hover fieldset': {
                borderColor: 'rgba(255, 255, 255, 0.2)',
              },
            }
          }}
        />
      </Paper>

      {/* IOC Type Tabs */}
      {iocAnalysisResult.summary.totalIOCs > 0 && (
        <Box sx={{ borderBottom: 1, borderColor: 'rgba(255, 255, 255, 0.1)', mb: 2 }}>
          <Tabs
            value={selectedTab}
            onChange={(e, newValue) => setSelectedTab(newValue)}
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
                  <FilterListIcon fontSize="small" />
                  All IOCs
                  <Badge badgeContent={iocAnalysisResult.summary.totalIOCs} color="primary" />
                </Box>
              } 
            />
            {iocTypes.map(type => (
              <Tab
                key={type}
                value={type}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {getIOCIcon(type)}
                    {type.toUpperCase()}
                    <Badge badgeContent={iocAnalysisResult.summary.iocsByType[type]} color="primary" />
                  </Box>
                }
              />
            ))}
          </Tabs>
        </Box>
      )}

      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {/* IOCs Section */}
        {filteredIOCs.length > 0 && (
          <Accordion
            expanded={expandedAccordions.has('iocs')}
            onChange={handleAccordionChange('iocs')}
            sx={{
              backgroundColor: THEME.background.secondary,
              border: '1px solid rgba(255, 255, 255, 0.1)',
              mb: 2,
              '&:before': { display: 'none' }
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon sx={{ color: THEME.text.secondary }} />}
              sx={{
                backgroundColor: THEME.background.tertiary,
                borderBottom: expandedAccordions.has('iocs') ? '1px solid rgba(255, 255, 255, 0.1)' : 'none'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <BugReportIcon sx={{ color: '#4ECDC4' }} />
                <Typography variant="h6" sx={{ color: THEME.text.primary }}>
                  Indicators of Compromise
                </Typography>
                <Chip
                  label={`${filteredIOCs.length} IOCs`}
                  size="small"
                  sx={{
                    backgroundColor: '#4ECDC430',
                    color: '#4ECDC4'
                  }}
                />
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 2 }}>
              <Grid container spacing={2}>
                {filteredIOCs.map((ioc, index) => (
                  <Grid item xs={12} md={6} lg={4} key={index}>
                    {renderIOCCard(ioc, index)}
                  </Grid>
                ))}
              </Grid>
            </AccordionDetails>
          </Accordion>
        )}

        {/* IOAs Section */}
        {filteredIOAs.length > 0 && (
          <Accordion
            expanded={expandedAccordions.has('ioas')}
            onChange={handleAccordionChange('ioas')}
            sx={{
              backgroundColor: THEME.background.secondary,
              border: '1px solid rgba(255, 255, 255, 0.1)',
              mb: 2,
              '&:before': { display: 'none' }
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon sx={{ color: THEME.text.secondary }} />}
              sx={{
                backgroundColor: THEME.background.tertiary,
                borderBottom: expandedAccordions.has('ioas') ? '1px solid rgba(255, 255, 255, 0.1)' : 'none'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <SecurityIcon sx={{ color: '#FFB347' }} />
                <Typography variant="h6" sx={{ color: THEME.text.primary }}>
                  Indicators of Attack
                </Typography>
                <Chip
                  label={`${filteredIOAs.length} IOAs`}
                  size="small"
                  sx={{
                    backgroundColor: '#FFB34730',
                    color: '#FFB347'
                  }}
                />
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 2 }}>
              <Grid container spacing={2}>
                {filteredIOAs.map((ioa, index) => (
                  <Grid item xs={12} md={6} lg={4} key={index}>
                    {renderIOACard(ioa, index)}
                  </Grid>
                ))}
              </Grid>
            </AccordionDetails>
          </Accordion>
        )}

        {/* No Results */}
        {filteredIOCs.length === 0 && filteredIOAs.length === 0 && searchTerm && (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 2,
            py: 4
          }}>
            <SearchIcon sx={{ fontSize: 48, color: THEME.text.muted }} />
            <Typography variant="h6" sx={{ color: THEME.text.secondary }}>
              No results found
            </Typography>
            <Typography variant="body2" sx={{ color: THEME.text.muted, textAlign: 'center' }}>
              Try adjusting your search terms or clear the search to see all IOCs/IOAs
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default IOCView;