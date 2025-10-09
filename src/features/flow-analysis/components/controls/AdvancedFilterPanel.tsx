/**
 * Advanced Filtering System
 * Comprehensive filtering by time, severity, actor, technique, and more
 */
import {
  ExpandMore as ExpandMoreIcon,
  FilterList as FilterListIcon,
  Clear as ClearIcon,
  Save as SaveIcon,
  Restore as RestoreIcon,
  Schedule as ScheduleIcon,
  Security as SecurityIcon,
  Person as PersonIcon,
  Search as SearchIcon,
  BookmarkBorder as BookmarkBorderIcon,
} from '@mui/icons-material';
import {
  Box,
  Paper,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Slider,
  Chip,
  Autocomplete,
  TextField,
  FormGroup,
  FormControlLabel,
  Checkbox,
  RadioGroup,
  Radio,
  IconButton,
  Tooltip,
  Switch,
  Divider,
  Alert,
  Badge,
  Menu,
  MenuItem,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { motion } from 'framer-motion';
import React, { useState, useCallback, useEffect } from 'react';

// Types for filtering
interface FilterCriteria {
  // Time-based filters
  timeRange: {
    start?: Date;
    end?: Date;
    preset?: 'last_hour' | 'last_day' | 'last_week' | 'last_month' | 'custom';
  };
  
  // Severity filters
  severity: {
    levels: ('low' | 'medium' | 'high' | 'critical')[];
    minConfidence: number;
    includeUnknown: boolean;
  };
  
  // Actor/Attribution filters
  actors: {
    groups: string[];
    campaigns: string[];
    malware: string[];
    includeUnattributed: boolean;
  };
  
  // Technique filters
  techniques: {
    tactics: string[];
    techniqueIds: string[];
    platforms: string[];
    dataSources: string[];
  };
  
  // Advanced filters
  advanced: {
    nodeCount: { min: number; max: number };
    connectionDensity: { min: number; max: number };
    includeIncomplete: boolean;
    requireValidation: boolean;
    showOnlyRecent: boolean;
  };
  
  // Search filters
  search: {
    query: string;
    fields: ('title' | 'description' | 'techniques' | 'indicators')[];
    fuzzySearch: boolean;
  };
}

interface FilterPreset {
  id: string;
  name: string;
  description: string;
  criteria: FilterCriteria;
  isBuiltIn: boolean;
  usageCount: number;
  lastUsed?: Date;
}

interface FilterStats {
  totalFlows: number;
  filteredFlows: number;
  uniqueActors: number;
  uniqueTechniques: number;
  severityDistribution: { [key: string]: number };
  timeDistribution: { [key: string]: number };
}

interface AdvancedFilterPanelProps {
  onFilterChange: (criteria: FilterCriteria) => void;
  onPresetSelect: (preset: FilterPreset) => void;
  filterStats?: FilterStats;
  availableActors?: string[];
  availableTechniques?: string[];
  availableCampaigns?: string[];
  initialCriteria?: Partial<FilterCriteria>;
  isVisible?: boolean;
  onToggleVisibility?: (visible: boolean) => void;
}

// Default filter criteria
const defaultCriteria: FilterCriteria = {
  timeRange: { preset: 'last_month' },
  severity: {
    levels: ['low', 'medium', 'high', 'critical'],
    minConfidence: 0,
    includeUnknown: true,
  },
  actors: {
    groups: [],
    campaigns: [],
    malware: [],
    includeUnattributed: true,
  },
  techniques: {
    tactics: [],
    techniqueIds: [],
    platforms: [],
    dataSources: [],
  },
  advanced: {
    nodeCount: { min: 1, max: 100 },
    connectionDensity: { min: 0, max: 100 },
    includeIncomplete: true,
    requireValidation: false,
    showOnlyRecent: false,
  },
  search: {
    query: '',
    fields: ['title', 'description', 'techniques'],
    fuzzySearch: true,
  },
};

// Built-in filter presets
const builtInPresets: FilterPreset[] = [
  {
    id: 'high-confidence-apt',
    name: 'High Confidence APT',
    description: 'High confidence attacks by known APT groups',
    criteria: {
      ...defaultCriteria,
      severity: {
        levels: ['high', 'critical'],
        minConfidence: 80,
        includeUnknown: false,
      },
      actors: {
        ...defaultCriteria.actors,
        includeUnattributed: false,
      },
      advanced: {
        ...defaultCriteria.advanced,
        requireValidation: true,
      },
    },
    isBuiltIn: true,
    usageCount: 45,
    lastUsed: new Date(Date.now() - 86400000),
  },
  {
    id: 'recent-critical',
    name: 'Recent Critical Threats',
    description: 'Critical severity threats from the last 24 hours',
    criteria: {
      ...defaultCriteria,
      timeRange: { preset: 'last_day' },
      severity: {
        levels: ['critical'],
        minConfidence: 60,
        includeUnknown: true,
      },
      advanced: {
        ...defaultCriteria.advanced,
        showOnlyRecent: true,
      },
    },
    isBuiltIn: true,
    usageCount: 89,
    lastUsed: new Date(Date.now() - 3600000),
  },
  {
    id: 'ransomware-campaigns',
    name: 'Ransomware Campaigns',
    description: 'Flows related to ransomware operations',
    criteria: {
      ...defaultCriteria,
      search: {
        query: 'ransomware OR encrypt OR payment',
        fields: ['title', 'description', 'techniques'],
        fuzzySearch: true,
      },
      techniques: {
        ...defaultCriteria.techniques,
        tactics: ['Impact', 'Command and Control'],
      },
    },
    isBuiltIn: true,
    usageCount: 23,
  },
];

// Time Range Selector Component
const TimeRangeSelector: React.FC<{
  value: FilterCriteria['timeRange'];
  onChange: (timeRange: FilterCriteria['timeRange']) => void;
}> = ({ value, onChange }) => {
  const [customRange, setCustomRange] = useState(false);

  const presetOptions = [
    { value: 'last_hour', label: 'Last Hour' },
    { value: 'last_day', label: 'Last 24 Hours' },
    { value: 'last_week', label: 'Last Week' },
    { value: 'last_month', label: 'Last Month' },
    { value: 'custom', label: 'Custom Range' },
  ];

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
        <RadioGroup
          value={value.preset || 'custom'}
          onChange={(e) => {
            const preset = e.target.value as FilterCriteria['timeRange']['preset'];
            setCustomRange(preset === 'custom');
            onChange({ preset });
          }}
        >
          {presetOptions.map(option => (
            <FormControlLabel
              key={option.value}
              value={option.value}
              control={<Radio size="small" />}
              label={option.label}
            />
          ))}
        </RadioGroup>

        {(customRange || value.preset === 'custom') && (
          <Box sx={{ mt: 2, display: 'flex', gap: 2, flexDirection: 'column' }}>
            <DateTimePicker
              label="Start Date"
              value={value.start || null}
              onChange={(date) => onChange({ ...value, start: date || undefined })}
              slotProps={{ textField: { size: 'small', fullWidth: true } }}
            />
            <DateTimePicker
              label="End Date"
              value={value.end || null}
              onChange={(date) => onChange({ ...value, end: date || undefined })}
              slotProps={{ textField: { size: 'small', fullWidth: true } }}
            />
          </Box>
        )}
      </Box>
    </LocalizationProvider>
  );
};

// Severity Filter Component
const SeverityFilter: React.FC<{
  value: FilterCriteria['severity'];
  onChange: (severity: FilterCriteria['severity']) => void;
}> = ({ value, onChange }) => {
  const theme = useTheme();

  const severityOptions = [
    { value: 'critical', label: 'Critical', color: theme.palette.error.main },
    { value: 'high', label: 'High', color: theme.palette.warning.main },
    { value: 'medium', label: 'Medium', color: theme.palette.info.main },
    { value: 'low', label: 'Low', color: theme.palette.success.main },
  ];

  return (
    <Box>
      <FormGroup>
        {severityOptions.map(option => (
          <FormControlLabel
            key={option.value}
            control={
              <Checkbox
                checked={value.levels.includes(option.value as any)}
                onChange={(e) => {
                  const levels = e.target.checked
                    ? [...value.levels, option.value as any]
                    : value.levels.filter(l => l !== option.value);
                  onChange({ ...value, levels });
                }}
                sx={{ color: option.color, '&.Mui-checked': { color: option.color } }}
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    backgroundColor: option.color,
                    mr: 1,
                  }}
                />
                {option.label}
              </Box>
            }
          />
        ))}
      </FormGroup>

      <Box sx={{ mt: 2 }}>
        <Typography variant="body2" gutterBottom>
          Minimum Confidence: {value.minConfidence}%
        </Typography>
        <Slider
          value={value.minConfidence}
          onChange={(_, newValue) => onChange({ ...value, minConfidence: newValue as number })}
          min={0}
          max={100}
          step={5}
          marks={[
            { value: 0, label: '0%' },
            { value: 50, label: '50%' },
            { value: 100, label: '100%' },
          ]}
          valueLabelDisplay="auto"
        />
      </Box>

      <FormControlLabel
        control={
          <Checkbox
            checked={value.includeUnknown}
            onChange={(e) => onChange({ ...value, includeUnknown: e.target.checked })}
          />
        }
        label="Include Unknown Severity"
      />
    </Box>
  );
};

// Actor Filter Component
const ActorFilter: React.FC<{
  value: FilterCriteria['actors'];
  onChange: (actors: FilterCriteria['actors']) => void;
  availableActors?: string[];
  availableCampaigns?: string[];
}> = ({ value, onChange, availableActors = [], availableCampaigns = [] }) => {
  const [malwareOptions] = useState([
    'Sunburst', 'Cobalt Strike', 'Emotet', 'TrickBot', 'Ryuk',
    'Conti', 'DarkSide', 'REvil', 'Maze', 'SolarWinds',
  ]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Autocomplete
        multiple
        options={availableActors}
        value={value.groups}
        onChange={(_, newValue) => onChange({ ...value, groups: newValue })}
        renderInput={(params) => (
          <TextField {...params} label="Threat Actors" size="small" />
        )}
        renderTags={(tagValue, getTagProps) =>
          tagValue.map((option, index) => (
            <Chip
              label={option}
              {...getTagProps({ index })}
              size="small"
              color="primary"
              key={option}
            />
          ))
        }
      />

      <Autocomplete
        multiple
        options={availableCampaigns}
        value={value.campaigns}
        onChange={(_, newValue) => onChange({ ...value, campaigns: newValue })}
        renderInput={(params) => (
          <TextField {...params} label="Campaigns" size="small" />
        )}
        renderTags={(tagValue, getTagProps) =>
          tagValue.map((option, index) => (
            <Chip
              label={option}
              {...getTagProps({ index })}
              size="small"
              color="secondary"
              key={option}
            />
          ))
        }
      />

      <Autocomplete
        multiple
        options={malwareOptions}
        value={value.malware}
        onChange={(_, newValue) => onChange({ ...value, malware: newValue })}
        renderInput={(params) => (
          <TextField {...params} label="Malware/Tools" size="small" />
        )}
        renderTags={(tagValue, getTagProps) =>
          tagValue.map((option, index) => (
            <Chip
              label={option}
              {...getTagProps({ index })}
              size="small"
              color="warning"
              key={option}
            />
          ))
        }
      />

      <FormControlLabel
        control={
          <Checkbox
            checked={value.includeUnattributed}
            onChange={(e) => onChange({ ...value, includeUnattributed: e.target.checked })}
          />
        }
        label="Include Unattributed Flows"
      />
    </Box>
  );
};

// Main Advanced Filter Panel Component
export const AdvancedFilterPanel: React.FC<AdvancedFilterPanelProps> = ({
  onFilterChange,
  onPresetSelect,
  filterStats,
  availableActors = [],
  availableTechniques = [],
  availableCampaigns = [],
  initialCriteria,
  isVisible = true,
  onToggleVisibility,
}) => {
  const theme = useTheme();
  const [criteria, setCriteria] = useState<FilterCriteria>({
    ...defaultCriteria,
    ...initialCriteria,
  });
  const [presets, setPresets] = useState<FilterPreset[]>(builtInPresets);
  const [expandedSections, setExpandedSections] = useState<string[]>(['time', 'severity']);
  const [presetMenuAnchor, setPresetMenuAnchor] = useState<null | HTMLElement>(null);
  const [savePresetDialog, setSavePresetDialog] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');

  // Sample data for when props aren't provided
  const sampleActors = ['APT29', 'APT28', 'Lazarus Group', 'FIN7', 'Carbanak'];
  const sampleCampaigns = ['SolarWinds', 'Operation Aurora', 'WannaCry', 'NotPetya'];
  const sampleTechniques = ['T1566.001', 'T1059.001', 'T1053.005', 'T1083', 'T1041'];

  const displayActors = availableActors.length > 0 ? availableActors : sampleActors;
  const displayCampaigns = availableCampaigns.length > 0 ? availableCampaigns : sampleCampaigns;
  const displayTechniques = availableTechniques.length > 0 ? availableTechniques : sampleTechniques;

  // Sample filter stats
  const displayStats: FilterStats = filterStats || {
    totalFlows: 1247,
    filteredFlows: 89,
    uniqueActors: 23,
    uniqueTechniques: 156,
    severityDistribution: {
      critical: 12,
      high: 34,
      medium: 28,
      low: 15,
    },
    timeDistribution: {
      'Last Hour': 5,
      'Last Day': 23,
      'Last Week': 45,
      'Older': 16,
    },
  };

  // Apply filter changes
  useEffect(() => {
    onFilterChange(criteria);
  }, [criteria, onFilterChange]);

  const handleSectionToggle = useCallback((section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  }, []);

  const handlePresetSelect = useCallback((preset: FilterPreset) => {
    setCriteria(preset.criteria);
    setPresets(prev => prev.map(p => 
      p.id === preset.id 
        ? { ...p, usageCount: p.usageCount + 1, lastUsed: new Date() }
        : p
    ));
    onPresetSelect(preset);
    setPresetMenuAnchor(null);
  }, [onPresetSelect]);

  const handleResetFilters = useCallback(() => {
    setCriteria(defaultCriteria);
  }, []);

  const saveCustomPreset = useCallback(() => {
    if (!newPresetName.trim()) {return;}

    const newPreset: FilterPreset = {
      id: `custom-${Date.now()}`,
      name: newPresetName,
      description: `Custom filter preset`,
      criteria,
      isBuiltIn: false,
      usageCount: 1,
      lastUsed: new Date(),
    };

    setPresets(prev => [newPreset, ...prev]);
    setNewPresetName('');
    setSavePresetDialog(false);
  }, [criteria, newPresetName]);

  if (!isVisible) {
    return (
      <Tooltip title="Show Filters">
        <IconButton
          onClick={() => onToggleVisibility?.(true)}
          sx={{
            position: 'fixed',
            right: 16,
            top: '50%',
            transform: 'translateY(-50%)',
            backgroundColor: 'primary.main',
            color: 'white',
            '&:hover': { backgroundColor: 'primary.dark' },
          }}
        >
          <FilterListIcon />
        </IconButton>
      </Tooltip>
    );
  }

  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 400, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      style={{ height: '100%', overflow: 'hidden' }}
    >
      <Paper
        elevation={2}
        sx={{
          width: 400,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 0,
        }}
      >
        {/* Header */}
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FilterListIcon />
              Advanced Filters
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Tooltip title="Filter Presets">
                <IconButton
                  size="small"
                  onClick={(e) => setPresetMenuAnchor(e.currentTarget)}
                >
                  <BookmarkBorderIcon />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Save Preset">
                <IconButton size="small" onClick={() => setSavePresetDialog(true)}>
                  <SaveIcon />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Reset Filters">
                <IconButton size="small" onClick={handleResetFilters}>
                  <RestoreIcon />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Hide Filters">
                <IconButton size="small" onClick={() => onToggleVisibility?.(false)}>
                  <ClearIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {/* Filter Stats */}
          <Box sx={{ mt: 2 }}>
            <Alert severity="info" sx={{ mb: 1 }}>
              <strong>{displayStats.filteredFlows}</strong> of{' '}
              <strong>{displayStats.totalFlows}</strong> flows match current filters
            </Alert>
            
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip size="small" label={`${displayStats.uniqueActors} Actors`} />
              <Chip size="small" label={`${displayStats.uniqueTechniques} Techniques`} />
            </Box>
          </Box>
        </Box>

        {/* Filter Sections */}
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {/* Time Range Filter */}
          <Accordion expanded={expandedSections.includes('time')}>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              onClick={() => handleSectionToggle('time')}
              sx={{ backgroundColor: 'action.hover' }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ScheduleIcon color="primary" />
                <Typography variant="subtitle1">Time Range</Typography>
                <Chip size="small" label={criteria.timeRange.preset || 'Custom'} />
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <TimeRangeSelector
                value={criteria.timeRange}
                onChange={(timeRange) => setCriteria(prev => ({ ...prev, timeRange }))}
              />
            </AccordionDetails>
          </Accordion>

          {/* Severity Filter */}
          <Accordion expanded={expandedSections.includes('severity')}>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              onClick={() => handleSectionToggle('severity')}
              sx={{ backgroundColor: 'action.hover' }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SecurityIcon color="primary" />
                <Typography variant="subtitle1">Severity & Confidence</Typography>
                <Badge
                  badgeContent={criteria.severity.levels.length}
                  color="primary"
                  showZero
                >
                  <Chip size="small" label={`≥${criteria.severity.minConfidence}%`} />
                </Badge>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <SeverityFilter
                value={criteria.severity}
                onChange={(severity) => setCriteria(prev => ({ ...prev, severity }))}
              />
            </AccordionDetails>
          </Accordion>

          {/* Actor Filter */}
          <Accordion expanded={expandedSections.includes('actors')}>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              onClick={() => handleSectionToggle('actors')}
              sx={{ backgroundColor: 'action.hover' }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PersonIcon color="primary" />
                <Typography variant="subtitle1">Threat Actors</Typography>
                <Badge
                  badgeContent={
                    criteria.actors.groups.length + 
                    criteria.actors.campaigns.length + 
                    criteria.actors.malware.length
                  }
                  color="primary"
                  showZero
                >
                  <Chip size="small" label="Attribution" />
                </Badge>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <ActorFilter
                value={criteria.actors}
                onChange={(actors) => setCriteria(prev => ({ ...prev, actors }))}
                availableActors={displayActors}
                availableCampaigns={displayCampaigns}
              />
            </AccordionDetails>
          </Accordion>

          {/* Search Filter */}
          <Accordion expanded={expandedSections.includes('search')}>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              onClick={() => handleSectionToggle('search')}
              sx={{ backgroundColor: 'action.hover' }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SearchIcon color="primary" />
                <Typography variant="subtitle1">Search & Keywords</Typography>
                {criteria.search.query && (
                  <Chip size="small" label="Active" color="success" />
                )}
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Search Query"
                  placeholder="Enter keywords, techniques, or indicators..."
                  value={criteria.search.query}
                  onChange={(e) => setCriteria(prev => ({
                    ...prev,
                    search: { ...prev.search, query: e.target.value },
                  }))}
                />

                <FormGroup>
                  <Typography variant="body2" gutterBottom>Search Fields:</Typography>
                  {(['title', 'description', 'techniques', 'indicators'] as const).map(field => (
                    <FormControlLabel
                      key={field}
                      control={
                        <Checkbox
                          size="small"
                          checked={criteria.search.fields.includes(field)}
                          onChange={(e) => {
                            const fields = e.target.checked
                              ? [...criteria.search.fields, field]
                              : criteria.search.fields.filter(f => f !== field);
                            setCriteria(prev => ({
                              ...prev,
                              search: { ...prev.search, fields },
                            }));
                          }}
                        />
                      }
                      label={field.charAt(0).toUpperCase() + field.slice(1)}
                    />
                  ))}
                </FormGroup>

                <FormControlLabel
                  control={
                    <Switch
                      checked={criteria.search.fuzzySearch}
                      onChange={(e) => setCriteria(prev => ({
                        ...prev,
                        search: { ...prev.search, fuzzySearch: e.target.checked },
                      }))}
                    />
                  }
                  label="Fuzzy Search"
                />
              </Box>
            </AccordionDetails>
          </Accordion>
        </Box>

        {/* Preset Menu */}
        <Menu
          anchorEl={presetMenuAnchor}
          open={Boolean(presetMenuAnchor)}
          onClose={() => setPresetMenuAnchor(null)}
          PaperProps={{ sx: { minWidth: 300, maxHeight: 400 } }}
        >
          <MenuItem disabled>
            <Typography variant="subtitle2">Filter Presets</Typography>
          </MenuItem>
          <Divider />
          {presets.map(preset => (
            <MenuItem
              key={preset.id}
              onClick={() => handlePresetSelect(preset)}
            >
              <Box sx={{ width: '100%' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" fontWeight="medium">
                    {preset.name}
                  </Typography>
                  {preset.isBuiltIn && (
                    <Chip size="small" label="Built-in" variant="outlined" />
                  )}
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {preset.description}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  Used {preset.usageCount} times
                  {preset.lastUsed && ` • ${preset.lastUsed.toLocaleDateString()}`}
                </Typography>
              </Box>
            </MenuItem>
          ))}
        </Menu>
      </Paper>
    </motion.div>
  );
};

export default AdvancedFilterPanel;