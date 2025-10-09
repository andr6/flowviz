import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  TextField,
  FormControl,
  FormLabel,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Chip,
  Autocomplete,
  Slider,
  Typography,
  Divider,
  Paper,
  IconButton,
  Collapse,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Badge,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  ExpandMore as ExpandMoreIcon,
  Security as ThreatIcon,
  Schedule as TimeIcon,
  Assessment as ConfidenceIcon,
  BugReport as IOCIcon,
  Shield as MitreIcon,
  Person as ActorIcon,
  Public as CountryIcon,
  Computer as AssetIcon,
  SaveAlt as SaveIcon,
  Bookmark as BookmarkIcon,
  History as RecentIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

// Types for search filters
export interface SearchFilters {
  // Text search
  query: string;
  
  // IOC filters
  iocTypes: string[];
  iocSeverity: string[];
  
  // MITRE ATT&CK filters
  tactics: string[];
  techniques: string[];
  
  // Confidence and scoring
  confidenceRange: [number, number];
  riskScore: [number, number];
  
  // Temporal filters
  timeRange: {
    start: Date | null;
    end: Date | null;
    preset?: string;
  };
  
  // Actor and attribution
  actors: string[];
  countries: string[];
  campaigns: string[];
  
  // Technical details
  assetTypes: string[];
  platforms: string[];
  dataSources: string[];
  
  // Advanced filters
  hasRelationships: boolean;
  isBookmarked: boolean;
  recentlyViewed: boolean;
  
  // Custom tags
  tags: string[];
}

export interface SearchResult {
  nodes: any[];
  edges: any[];
  metadata: {
    totalMatches: number;
    filterCounts: Record<string, number>;
    executionTime: number;
  };
}

interface AdvancedSearchProps {
  open: boolean;
  onClose: () => void;
  onSearch: (filters: SearchFilters) => Promise<SearchResult>;
  onSaveSearch: (name: string, filters: SearchFilters) => void;
  savedSearches: Array<{ name: string; filters: SearchFilters; createdAt: Date }>;
  initialFilters?: Partial<SearchFilters>;
  availableData: {
    iocTypes: string[];
    tactics: string[];
    techniques: string[];
    actors: string[];
    countries: string[];
    campaigns: string[];
    assetTypes: string[];
    platforms: string[];
    dataSources: string[];
    tags: string[];
  };
}

const AdvancedSearch: React.FC<AdvancedSearchProps> = ({
  open,
  onClose,
  onSearch,
  onSaveSearch,
  savedSearches,
  initialFilters,
  availableData
}) => {
  // Default filter state
  const defaultFilters: SearchFilters = {
    query: '',
    iocTypes: [],
    iocSeverity: [],
    tactics: [],
    techniques: [],
    confidenceRange: [0, 100],
    riskScore: [0, 100],
    timeRange: { start: null, end: null },
    actors: [],
    countries: [],
    campaigns: [],
    assetTypes: [],
    platforms: [],
    dataSources: [],
    hasRelationships: false,
    isBookmarked: false,
    recentlyViewed: false,
    tags: []
  };

  const [filters, setFilters] = useState<SearchFilters>({ ...defaultFilters, ...initialFilters });
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['basic', 'ioc', 'mitre']));
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [searchName, setSearchName] = useState('');

  // Preset time ranges
  const timePresets = [
    { label: 'Last hour', value: 'hour', days: 0, hours: 1 },
    { label: 'Last 24 hours', value: 'day', days: 1 },
    { label: 'Last week', value: 'week', days: 7 },
    { label: 'Last month', value: 'month', days: 30 },
    { label: 'Last 3 months', value: 'quarter', days: 90 },
    { label: 'Last year', value: 'year', days: 365 }
  ];

  // IOC severity levels
  const severityLevels = ['Critical', 'High', 'Medium', 'Low', 'Info'];

  // MITRE tactics with descriptions
  const mitreCtactics = [
    { id: 'TA0043', name: 'Reconnaissance', description: 'Gather information about target' },
    { id: 'TA0042', name: 'Resource Development', description: 'Establish resources for operations' },
    { id: 'TA0001', name: 'Initial Access', description: 'Get into your network' },
    { id: 'TA0002', name: 'Execution', description: 'Run malicious code' },
    { id: 'TA0003', name: 'Persistence', description: 'Maintain access' },
    { id: 'TA0004', name: 'Privilege Escalation', description: 'Gain higher-level permissions' },
    { id: 'TA0005', name: 'Defense Evasion', description: 'Avoid being detected' },
    { id: 'TA0006', name: 'Credential Access', description: 'Steal account names and passwords' },
    { id: 'TA0007', name: 'Discovery', description: 'Figure out your environment' },
    { id: 'TA0008', name: 'Lateral Movement', description: 'Move through your environment' },
    { id: 'TA0009', name: 'Collection', description: 'Gather data of interest' },
    { id: 'TA0011', name: 'Command and Control', description: 'Communicate with compromised systems' },
    { id: 'TA0010', name: 'Exfiltration', description: 'Steal data' },
    { id: 'TA0040', name: 'Impact', description: 'Manipulate, interrupt, or destroy systems and data' }
  ];

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.query) count++;
    if (filters.iocTypes.length > 0) count++;
    if (filters.iocSeverity.length > 0) count++;
    if (filters.tactics.length > 0) count++;
    if (filters.techniques.length > 0) count++;
    if (filters.confidenceRange[0] > 0 || filters.confidenceRange[1] < 100) count++;
    if (filters.riskScore[0] > 0 || filters.riskScore[1] < 100) count++;
    if (filters.timeRange.start || filters.timeRange.end) count++;
    if (filters.actors.length > 0) count++;
    if (filters.countries.length > 0) count++;
    if (filters.campaigns.length > 0) count++;
    if (filters.assetTypes.length > 0) count++;
    if (filters.platforms.length > 0) count++;
    if (filters.dataSources.length > 0) count++;
    if (filters.hasRelationships) count++;
    if (filters.isBookmarked) count++;
    if (filters.recentlyViewed) count++;
    if (filters.tags.length > 0) count++;
    return count;
  }, [filters]);

  // Update filter
  const updateFilter = useCallback(<K extends keyof SearchFilters>(
    key: K,
    value: SearchFilters[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  // Toggle expanded section
  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  }, []);

  // Apply time preset
  const applyTimePreset = useCallback((preset: typeof timePresets[0]) => {
    const end = new Date();
    const start = new Date();
    
    if (preset.hours) {
      start.setHours(start.getHours() - preset.hours);
    } else {
      start.setDate(start.getDate() - preset.days);
    }
    
    updateFilter('timeRange', { start, end, preset: preset.value });
  }, [updateFilter]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters(defaultFilters);
    setSearchResults(null);
  }, [defaultFilters]);

  // Execute search
  const executeSearch = useCallback(async () => {
    setIsSearching(true);
    try {
      const results = await onSearch(filters);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  }, [filters, onSearch]);

  // Save search
  const saveSearch = useCallback(() => {
    if (searchName.trim()) {
      onSaveSearch(searchName.trim(), filters);
      setSearchName('');
      setSaveDialogOpen(false);
    }
  }, [searchName, filters, onSaveSearch]);

  // Load saved search
  const loadSavedSearch = useCallback((savedFilters: SearchFilters) => {
    setFilters(savedFilters);
    setSaveDialogOpen(false);
  }, []);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: 'rgba(13, 17, 23, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            boxShadow: '0 24px 48px rgba(0, 0, 0, 0.8)',
            maxHeight: '90vh'
          }
        }}
        BackdropProps={{
          sx: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(4px)'
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          pb: 2
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <SearchIcon sx={{ color: '#4ade80' }} />
            <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600 }}>
              Advanced Search
            </Typography>
            {activeFilterCount > 0 && (
              <Badge 
                badgeContent={activeFilterCount} 
                sx={{ '& .MuiBadge-badge': { backgroundColor: '#4ade80', color: '#000' } }}
              >
                <FilterIcon sx={{ color: 'rgba(255, 255, 255, 0.6)' }} />
              </Badge>
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton 
              onClick={() => setSaveDialogOpen(true)}
              sx={{ color: 'rgba(255, 255, 255, 0.6)' }}
              title="Save Search"
            >
              <SaveIcon />
            </IconButton>
            <IconButton 
              onClick={clearFilters}
              sx={{ color: 'rgba(255, 255, 255, 0.6)' }}
              title="Clear All Filters"
            >
              <ClearIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 0 }}>
          <Box sx={{ display: 'flex', height: 'calc(90vh - 140px)' }}>
            {/* Search Filters Panel */}
            <Box sx={{ 
              width: '60%', 
              borderRight: '1px solid rgba(255, 255, 255, 0.1)',
              overflow: 'auto',
              p: 2
            }}>
              {/* Basic Search */}
              <Accordion 
                expanded={expandedSections.has('basic')}
                onChange={() => toggleSection('basic')}
                sx={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px !important',
                  mb: 2
                }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#fff' }} />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SearchIcon sx={{ color: '#4ade80' }} />
                    <Typography sx={{ color: '#fff', fontWeight: 500 }}>
                      Basic Search
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <TextField
                    fullWidth
                    placeholder="Search nodes, descriptions, IOCs..."
                    value={filters.query}
                    onChange={(e) => updateFilter('query', e.target.value)}
                    sx={{
                      '& .MuiInputBase-input': { color: '#fff' },
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                        '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                        '&.Mui-focused fieldset': { borderColor: '#4ade80' }
                      }
                    }}
                  />
                </AccordionDetails>
              </Accordion>

              {/* IOC Filters */}
              <Accordion 
                expanded={expandedSections.has('ioc')}
                onChange={() => toggleSection('ioc')}
                sx={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px !important',
                  mb: 2
                }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#fff' }} />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <IOCIcon sx={{ color: '#f59e0b' }} />
                    <Typography sx={{ color: '#fff', fontWeight: 500 }}>
                      IOC Filters
                    </Typography>
                    {(filters.iocTypes.length > 0 || filters.iocSeverity.length > 0) && (
                      <Chip 
                        label={filters.iocTypes.length + filters.iocSeverity.length}
                        size="small"
                        sx={{ ml: 1, backgroundColor: '#f59e0b', color: '#000' }}
                      />
                    )}
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Autocomplete
                      multiple
                      options={availableData.iocTypes}
                      value={filters.iocTypes}
                      onChange={(_, value) => updateFilter('iocTypes', value)}
                      renderInput={(params) => (
                        <TextField 
                          {...params} 
                          label="IOC Types" 
                          placeholder="Select IOC types..."
                          sx={{
                            '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
                            '& .MuiInputBase-input': { color: '#fff' },
                            '& .MuiOutlinedInput-root': {
                              backgroundColor: 'rgba(255, 255, 255, 0.05)',
                              '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' }
                            }
                          }}
                        />
                      )}
                      renderTags={(value, getTagProps) =>
                        value.map((option, index) => (
                          <Chip
                            key={option}
                            variant="outlined"
                            label={option}
                            {...getTagProps({ index })}
                            sx={{ color: '#fff', borderColor: 'rgba(255, 255, 255, 0.3)' }}
                          />
                        ))
                      }
                    />
                    
                    <FormControl>
                      <FormLabel sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 1 }}>
                        Severity Levels
                      </FormLabel>
                      <FormGroup row>
                        {severityLevels.map((severity) => (
                          <FormControlLabel
                            key={severity}
                            control={
                              <Checkbox
                                checked={filters.iocSeverity.includes(severity)}
                                onChange={(e) => {
                                  const newSeverity = e.target.checked
                                    ? [...filters.iocSeverity, severity]
                                    : filters.iocSeverity.filter(s => s !== severity);
                                  updateFilter('iocSeverity', newSeverity);
                                }}
                                sx={{ color: 'rgba(255, 255, 255, 0.6)' }}
                              />
                            }
                            label={severity}
                            sx={{ color: 'rgba(255, 255, 255, 0.8)' }}
                          />
                        ))}
                      </FormGroup>
                    </FormControl>
                  </Box>
                </AccordionDetails>
              </Accordion>

              {/* MITRE ATT&CK Filters */}
              <Accordion 
                expanded={expandedSections.has('mitre')}
                onChange={() => toggleSection('mitre')}
                sx={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px !important',
                  mb: 2
                }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#fff' }} />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <MitreIcon sx={{ color: '#ef4444' }} />
                    <Typography sx={{ color: '#fff', fontWeight: 500 }}>
                      MITRE ATT&CK
                    </Typography>
                    {(filters.tactics.length > 0 || filters.techniques.length > 0) && (
                      <Chip 
                        label={filters.tactics.length + filters.techniques.length}
                        size="small"
                        sx={{ ml: 1, backgroundColor: '#ef4444', color: '#fff' }}
                      />
                    )}
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <FormControl>
                      <FormLabel sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 1 }}>
                        Tactics
                      </FormLabel>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {mitreCtactics.map((tactic) => (
                          <Chip
                            key={tactic.id}
                            label={tactic.name}
                            clickable
                            color={filters.tactics.includes(tactic.id) ? "primary" : "default"}
                            onClick={() => {
                              const newTactics = filters.tactics.includes(tactic.id)
                                ? filters.tactics.filter(t => t !== tactic.id)
                                : [...filters.tactics, tactic.id];
                              updateFilter('tactics', newTactics);
                            }}
                            sx={{
                              backgroundColor: filters.tactics.includes(tactic.id) 
                                ? '#ef4444' 
                                : 'rgba(255, 255, 255, 0.1)',
                              color: '#fff',
                              '&:hover': {
                                backgroundColor: filters.tactics.includes(tactic.id) 
                                  ? '#dc2626' 
                                  : 'rgba(255, 255, 255, 0.2)'
                              }
                            }}
                          />
                        ))}
                      </Box>
                    </FormControl>

                    <Autocomplete
                      multiple
                      options={availableData.techniques}
                      value={filters.techniques}
                      onChange={(_, value) => updateFilter('techniques', value)}
                      renderInput={(params) => (
                        <TextField 
                          {...params} 
                          label="Techniques" 
                          placeholder="Select techniques..."
                          sx={{
                            '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
                            '& .MuiInputBase-input': { color: '#fff' },
                            '& .MuiOutlinedInput-root': {
                              backgroundColor: 'rgba(255, 255, 255, 0.05)',
                              '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' }
                            }
                          }}
                        />
                      )}
                    />
                  </Box>
                </AccordionDetails>
              </Accordion>

              {/* Time Range Filters */}
              <Accordion 
                expanded={expandedSections.has('time')}
                onChange={() => toggleSection('time')}
                sx={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px !important',
                  mb: 2
                }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#fff' }} />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TimeIcon sx={{ color: '#3b82f6' }} />
                    <Typography sx={{ color: '#fff', fontWeight: 500 }}>
                      Time Range
                    </Typography>
                    {(filters.timeRange.start || filters.timeRange.end) && (
                      <Chip 
                        label="Active"
                        size="small"
                        sx={{ ml: 1, backgroundColor: '#3b82f6', color: '#fff' }}
                      />
                    )}
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {timePresets.map((preset) => (
                        <Chip
                          key={preset.value}
                          label={preset.label}
                          clickable
                          color={filters.timeRange.preset === preset.value ? "primary" : "default"}
                          onClick={() => applyTimePreset(preset)}
                          sx={{
                            backgroundColor: filters.timeRange.preset === preset.value 
                              ? '#3b82f6' 
                              : 'rgba(255, 255, 255, 0.1)',
                            color: '#fff'
                          }}
                        />
                      ))}
                    </Box>
                    
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <DatePicker
                        label="Start Date"
                        value={filters.timeRange.start}
                        onChange={(value) => updateFilter('timeRange', { 
                          ...filters.timeRange, 
                          start: value,
                          preset: undefined 
                        })}
                        sx={{
                          '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
                          '& .MuiInputBase-input': { color: '#fff' },
                          '& .MuiOutlinedInput-root': {
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' }
                          }
                        }}
                      />
                      <DatePicker
                        label="End Date"
                        value={filters.timeRange.end}
                        onChange={(value) => updateFilter('timeRange', { 
                          ...filters.timeRange, 
                          end: value,
                          preset: undefined 
                        })}
                        sx={{
                          '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
                          '& .MuiInputBase-input': { color: '#fff' },
                          '& .MuiOutlinedInput-root': {
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' }
                          }
                        }}
                      />
                    </Box>
                  </Box>
                </AccordionDetails>
              </Accordion>

              {/* Confidence & Risk Scoring */}
              <Accordion 
                expanded={expandedSections.has('confidence')}
                onChange={() => toggleSection('confidence')}
                sx={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px !important',
                  mb: 2
                }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#fff' }} />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ConfidenceIcon sx={{ color: '#10b981' }} />
                    <Typography sx={{ color: '#fff', fontWeight: 500 }}>
                      Confidence & Risk
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <Box>
                      <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 1 }}>
                        Confidence Level: {filters.confidenceRange[0]}% - {filters.confidenceRange[1]}%
                      </Typography>
                      <Slider
                        value={filters.confidenceRange}
                        onChange={(_, value) => updateFilter('confidenceRange', value as [number, number])}
                        valueLabelDisplay="auto"
                        min={0}
                        max={100}
                        sx={{ color: '#10b981' }}
                      />
                    </Box>
                    
                    <Box>
                      <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 1 }}>
                        Risk Score: {filters.riskScore[0]} - {filters.riskScore[1]}
                      </Typography>
                      <Slider
                        value={filters.riskScore}
                        onChange={(_, value) => updateFilter('riskScore', value as [number, number])}
                        valueLabelDisplay="auto"
                        min={0}
                        max={100}
                        sx={{ color: '#f59e0b' }}
                      />
                    </Box>
                  </Box>
                </AccordionDetails>
              </Accordion>
            </Box>

            {/* Results Panel */}
            <Box sx={{ width: '40%', p: 2 }}>
              <Typography variant="h6" sx={{ color: '#fff', mb: 2 }}>
                Search Results
              </Typography>
              
              {searchResults ? (
                <Box>
                  <Paper sx={{ 
                    p: 2, 
                    mb: 2,
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}>
                    <Typography sx={{ color: '#4ade80', fontWeight: 600 }}>
                      {searchResults.metadata.totalMatches} matches found
                    </Typography>
                    <Typography sx={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.875rem' }}>
                      Search completed in {searchResults.metadata.executionTime}ms
                    </Typography>
                  </Paper>
                  
                  <Typography variant="subtitle2" sx={{ color: '#fff', mb: 1 }}>
                    Filter Breakdown:
                  </Typography>
                  <List dense>
                    {Object.entries(searchResults.metadata.filterCounts).map(([filter, count]) => (
                      <ListItem key={filter} sx={{ py: 0.5 }}>
                        <ListItemText
                          primary={filter}
                          secondary={`${count} matches`}
                          primaryTypographyProps={{ 
                            color: 'rgba(255, 255, 255, 0.8)',
                            fontSize: '0.875rem'
                          }}
                          secondaryTypographyProps={{ 
                            color: 'rgba(255, 255, 255, 0.5)',
                            fontSize: '0.75rem'
                          }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              ) : (
                <Paper sx={{ 
                  p: 4, 
                  textAlign: 'center',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <SearchIcon sx={{ fontSize: 48, color: 'rgba(255, 255, 255, 0.3)', mb: 2 }} />
                  <Typography sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                    Configure your search filters and click "Search" to find matching nodes and relationships.
                  </Typography>
                </Paper>
              )}
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ 
          justifyContent: 'space-between',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          p: 2
        }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              startIcon={<BookmarkIcon />}
              onClick={() => setSaveDialogOpen(true)}
              sx={{ color: 'rgba(255, 255, 255, 0.6)' }}
            >
              Save Search
            </Button>
            {savedSearches.length > 0 && (
              <Button
                startIcon={<RecentIcon />}
                sx={{ color: 'rgba(255, 255, 255, 0.6)' }}
              >
                Load Saved
              </Button>
            )}
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button onClick={onClose} sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={executeSearch}
              disabled={isSearching}
              startIcon={<SearchIcon />}
              sx={{
                backgroundColor: '#4ade80',
                color: '#000',
                fontWeight: 600,
                '&:hover': { backgroundColor: '#22c55e' }
              }}
            >
              {isSearching ? 'Searching...' : 'Search'}
            </Button>
          </Box>
        </DialogActions>

        {/* Save Search Dialog */}
        <Dialog
          open={saveDialogOpen}
          onClose={() => setSaveDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Save Search</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Search Name"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              placeholder="Enter a name for this search..."
              autoFocus
              sx={{ mt: 1 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={saveSearch}
              variant="contained"
              disabled={!searchName.trim()}
            >
              Save
            </Button>
          </DialogActions>
        </Dialog>
      </Dialog>
    </LocalizationProvider>
  );
};

export default AdvancedSearch;