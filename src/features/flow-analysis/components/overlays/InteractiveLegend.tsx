/**
 * Interactive Legend with MITRE ATT&CK Technique Explanations
 * Comprehensive legend overlay with detailed technique documentation
 */
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Close as CloseIcon,
  Search as SearchIcon,
  Info as InfoIcon,
  Security as SecurityIcon,
  Category as CategoryIcon,
  BookmarkBorder as BookmarkBorderIcon,
  Bookmark as BookmarkIcon,
  Launch as LaunchIcon,
  FilterList as FilterListIcon,
  Help as HelpIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  CardHeader,
  IconButton,
  Button,
  Collapse,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Avatar,
  Badge,
  Tooltip,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Alert,
  Menu,
  MenuItem,
  Switch,
  FormControlLabel,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { motion } from 'framer-motion';
import React, { useState, useCallback, useMemo, useEffect } from 'react';

// Types for MITRE ATT&CK data
interface MitreTechnique {
  id: string;
  name: string;
  description: string;
  tactic: string;
  platforms: string[];
  dataSources: string[];
  mitigations: MitreMitigation[];
  detection: string;
  examples: MitreExample[];
  references: MitreReference[];
  subtechniques?: MitreSubtechnique[];
  killChainPhases: string[];
  revoked: boolean;
  deprecated: boolean;
}

interface MitreSubtechnique {
  id: string;
  name: string;
  description: string;
  platforms: string[];
}

interface MitreMitigation {
  id: string;
  name: string;
  description: string;
  url: string;
}

interface MitreExample {
  name: string;
  description: string;
  url?: string;
}

interface MitreReference {
  title: string;
  url: string;
  external_id?: string;
}

interface TacticInfo {
  id: string;
  name: string;
  description: string;
  shortName: string;
  color: string;
  techniques: string[];
  order: number;
}

interface LegendSettings {
  showDescriptions: boolean;
  showMitigations: boolean;
  showExamples: boolean;
  showSubtechniques: boolean;
  expandAll: boolean;
  showOnlyUsed: boolean;
  groupByTactic: boolean;
}

interface InteractiveLegendProps {
  isVisible: boolean;
  onToggle: (visible: boolean) => void;
  usedTechniques?: string[];
  onTechniqueSelect?: (technique: MitreTechnique) => void;
  onTacticSelect?: (tactic: TacticInfo) => void;
  position?: 'left' | 'right';
  height?: number;
}

// MITRE ATT&CK Tactics data
const MITRE_TACTICS: TacticInfo[] = [
  {
    id: 'TA0043',
    name: 'Reconnaissance',
    shortName: 'Recon',
    description: 'Gather information to plan future adversary operations',
    color: '#FF6B6B',
    techniques: ['T1595', 'T1592', 'T1589', 'T1590', 'T1591', 'T1598', 'T1597', 'T1596', 'T1593', 'T1594'],
    order: 1,
  },
  {
    id: 'TA0042',
    name: 'Resource Development',
    shortName: 'Resource Dev',
    description: 'Establish resources to support operations',
    color: '#4ECDC4',
    techniques: ['T1583', 'T1586', 'T1584', 'T1587', 'T1585', 'T1588', 'T1608'],
    order: 2,
  },
  {
    id: 'TA0001',
    name: 'Initial Access',
    shortName: 'Initial Access',
    description: 'Get into your network',
    color: '#45B7D1',
    techniques: ['T1566', 'T1091', 'T1200', 'T1566.001', 'T1566.002', 'T1566.003'],
    order: 3,
  },
  {
    id: 'TA0002',
    name: 'Execution',
    shortName: 'Execution',
    description: 'Run malicious code',
    color: '#96CEB4',
    techniques: ['T1059', 'T1055', 'T1053', 'T1106', 'T1129', 'T1059.001', 'T1059.003', 'T1059.007'],
    order: 4,
  },
  {
    id: 'TA0003',
    name: 'Persistence',
    shortName: 'Persistence',
    description: 'Maintain presence',
    color: '#FFEAA7',
    techniques: ['T1543', 'T1547', 'T1053', 'T1546', 'T1574', 'T1547.001', 'T1053.005'],
    order: 5,
  },
  {
    id: 'TA0004',
    name: 'Privilege Escalation',
    shortName: 'Priv Esc',
    description: 'Gain higher-level permissions',
    color: '#FD79A8',
    techniques: ['T1548', 'T1134', 'T1055', 'T1068', 'T1574', 'T1055.012'],
    order: 6,
  },
  {
    id: 'TA0005',
    name: 'Defense Evasion',
    shortName: 'Defense Evasion',
    description: 'Avoid being detected',
    color: '#A29BFE',
    techniques: ['T1055', 'T1027', 'T1036', 'T1562', 'T1070', 'T1218', 'T1027.002'],
    order: 7,
  },
  {
    id: 'TA0006',
    name: 'Credential Access',
    shortName: 'Cred Access',
    description: 'Steal account names and passwords',
    color: '#6C5CE7',
    techniques: ['T1110', 'T1003', 'T1558', 'T1212', 'T1555', 'T1003.001'],
    order: 8,
  },
  {
    id: 'TA0007',
    name: 'Discovery',
    shortName: 'Discovery',
    description: 'Figure out your environment',
    color: '#74B9FF',
    techniques: ['T1083', 'T1087', 'T1057', 'T1018', 'T1082', 'T1016', 'T1049'],
    order: 9,
  },
  {
    id: 'TA0008',
    name: 'Lateral Movement',
    shortName: 'Lateral Movement',
    description: 'Move through your environment',
    color: '#00B894',
    techniques: ['T1021', 'T1550', 'T1563', 'T1021.001', 'T1021.002'],
    order: 10,
  },
  {
    id: 'TA0009',
    name: 'Collection',
    shortName: 'Collection',
    description: 'Gather data of interest',
    color: '#FDCB6E',
    techniques: ['T1560', 'T1123', 'T1115', 'T1113', 'T1005', 'T1039'],
    order: 11,
  },
  {
    id: 'TA0011',
    name: 'Command and Control',
    shortName: 'C2',
    description: 'Communicate with compromised systems',
    color: '#E17055',
    techniques: ['T1071', 'T1568', 'T1573', 'T1008', 'T1105', 'T1071.001'],
    order: 12,
  },
  {
    id: 'TA0010',
    name: 'Exfiltration',
    shortName: 'Exfiltration',
    description: 'Steal data',
    color: '#D63031',
    techniques: ['T1041', 'T1048', 'T1567', 'T1029', 'T1052'],
    order: 13,
  },
  {
    id: 'TA0040',
    name: 'Impact',
    shortName: 'Impact',
    description: 'Manipulate, interrupt, or destroy systems and data',
    color: '#2D3436',
    techniques: ['T1486', 'T1489', 'T1490', 'T1485', 'T1491', 'T1561'],
    order: 14,
  },
];

// Sample technique data (in production, this would come from MITRE API)
const SAMPLE_TECHNIQUES: { [key: string]: MitreTechnique } = {
  'T1566.001': {
    id: 'T1566.001',
    name: 'Spearphishing Attachment',
    description: 'Adversaries may send spearphishing emails with a malicious attachment in an attempt to gain access to victim systems.',
    tactic: 'Initial Access',
    platforms: ['Windows', 'macOS', 'Linux'],
    dataSources: ['Email Gateway', 'File Monitoring', 'Network Traffic', 'Process Monitoring'],
    killChainPhases: ['initial-access'],
    revoked: false,
    deprecated: false,
    mitigations: [
      {
        id: 'M1049',
        name: 'Antivirus/Antimalware',
        description: 'Use signatures or heuristics to detect malicious software.',
        url: 'https://attack.mitre.org/mitigations/M1049',
      },
      {
        id: 'M1031',
        name: 'Network Intrusion Prevention',
        description: 'Use intrusion detection signatures to block traffic at network boundaries.',
        url: 'https://attack.mitre.org/mitigations/M1031',
      },
    ],
    detection: 'Network intrusion detection systems and email gateways can be used to detect spearphishing with malicious attachments in transit.',
    examples: [
      {
        name: 'APT1',
        description: 'APT1 has sent spearphishing emails containing malicious attachments.',
      },
      {
        name: 'APT28',
        description: 'APT28 sent spearphishing emails containing malicious Microsoft Office documents.',
      },
    ],
    references: [
      {
        title: 'Spearphishing Attachment - MITRE ATT&CK',
        url: 'https://attack.mitre.org/techniques/T1566/001/',
        external_id: 'T1566.001',
      },
    ],
  },
  'T1059.001': {
    id: 'T1059.001',
    name: 'PowerShell',
    description: 'Adversaries may abuse PowerShell commands and scripts for execution.',
    tactic: 'Execution',
    platforms: ['Windows'],
    dataSources: ['Process Monitoring', 'PowerShell Logs', 'Command History'],
    killChainPhases: ['execution'],
    revoked: false,
    deprecated: false,
    mitigations: [
      {
        id: 'M1042',
        name: 'Disable or Remove Feature or Program',
        description: 'Remove or deny access to unnecessary and potentially vulnerable software.',
        url: 'https://attack.mitre.org/mitigations/M1042',
      },
      {
        id: 'M1049',
        name: 'Antivirus/Antimalware',
        description: 'Use signatures or heuristics to detect malicious software.',
        url: 'https://attack.mitre.org/mitigations/M1049',
      },
    ],
    detection: 'Monitor PowerShell execution and command-line arguments for suspicious activity.',
    examples: [
      {
        name: 'APT29',
        description: 'APT29 has used PowerShell to execute commands and scripts.',
      },
      {
        name: 'Cobalt Strike',
        description: 'Cobalt Strike can use PowerShell to execute commands.',
      },
    ],
    references: [
      {
        title: 'PowerShell - MITRE ATT&CK',
        url: 'https://attack.mitre.org/techniques/T1059/001/',
        external_id: 'T1059.001',
      },
    ],
  },
  'T1053.005': {
    id: 'T1053.005',
    name: 'Scheduled Task',
    description: 'Adversaries may abuse the Windows Task Scheduler to perform task scheduling for initial or recurring execution of malicious code.',
    tactic: 'Persistence',
    platforms: ['Windows'],
    dataSources: ['File Monitoring', 'Process Monitoring', 'Windows Event Logs'],
    killChainPhases: ['persistence', 'privilege-escalation'],
    revoked: false,
    deprecated: false,
    mitigations: [
      {
        id: 'M1026',
        name: 'Privileged Account Management',
        description: 'Manage the creation, modification, use, and permissions associated to privileged accounts.',
        url: 'https://attack.mitre.org/mitigations/M1026',
      },
    ],
    detection: 'Monitor scheduled task creation and execution for suspicious activity.',
    examples: [
      {
        name: 'APT29',
        description: 'APT29 has used scheduled tasks for persistence.',
      },
    ],
    references: [
      {
        title: 'Scheduled Task - MITRE ATT&CK',
        url: 'https://attack.mitre.org/techniques/T1053/005/',
        external_id: 'T1053.005',
      },
    ],
  },
};

// Technique Detail Modal Component
const TechniqueDetailModal: React.FC<{
  technique: MitreTechnique | null;
  open: boolean;
  onClose: () => void;
  onBookmark?: (techniqueId: string, bookmarked: boolean) => void;
  isBookmarked?: boolean;
}> = ({ technique, open, onClose, onBookmark, isBookmarked = false }) => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);

  if (!technique) {return null;}

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h6">
              {technique.id} - {technique.name}
            </Typography>
            <Chip
              size="small"
              label={technique.tactic}
              color="primary"
              sx={{ mt: 0.5 }}
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <IconButton
              onClick={() => onBookmark?.(technique.id, !isBookmarked)}
              color={isBookmarked ? 'primary' : 'default'}
            >
              {isBookmarked ? <BookmarkIcon /> : <BookmarkBorderIcon />}
            </IconButton>
            <IconButton onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab label="Overview" />
          <Tab label="Detection" />
          <Tab label="Mitigations" />
          <Tab label="Examples" />
        </Tabs>

        <Box sx={{ mt: 2 }}>
          {activeTab === 0 && (
            <Box>
              <Typography variant="body1" paragraph>
                {technique.description}
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                <Chip label={`Platforms: ${technique.platforms.join(', ')}`} variant="outlined" />
                {technique.killChainPhases.map(phase => (
                  <Chip key={phase} label={phase} color="secondary" variant="outlined" />
                ))}
              </Box>

              <Typography variant="h6" gutterBottom>
                Data Sources
              </Typography>
              <List dense>
                {technique.dataSources.map((source, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <SecurityIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary={source} />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {activeTab === 1 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Detection Methods
              </Typography>
              <Typography variant="body1" paragraph>
                {technique.detection}
              </Typography>
              
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  Monitor for unusual process execution, network connections, and file system changes
                  that may indicate use of this technique.
                </Typography>
              </Alert>
            </Box>
          )}

          {activeTab === 2 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Mitigations
              </Typography>
              <List>
                {technique.mitigations.map((mitigation, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <CheckCircleIcon color="success" />
                    </ListItemIcon>
                    <ListItemText
                      primary={`${mitigation.id} - ${mitigation.name}`}
                      secondary={mitigation.description}
                    />
                    <ListItemSecondaryAction>
                      <IconButton href={mitigation.url} target="_blank" rel="noopener">
                        <LaunchIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {activeTab === 3 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Real-world Examples
              </Typography>
              <List>
                {technique.examples.map((example, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <WarningIcon color="warning" />
                    </ListItemIcon>
                    <ListItemText
                      primary={example.name}
                      secondary={example.description}
                    />
                    {example.url && (
                      <ListItemSecondaryAction>
                        <IconButton href={example.url} target="_blank" rel="noopener">
                          <LaunchIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    )}
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button
          variant="contained"
          href={technique.references[0]?.url}
          target="_blank"
          rel="noopener"
          startIcon={<LaunchIcon />}
        >
          View on MITRE ATT&CK
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Tactic Section Component
const TacticSection: React.FC<{
  tactic: TacticInfo;
  techniques: MitreTechnique[];
  usedTechniques: string[];
  expanded: boolean;
  onToggle: () => void;
  onTechniqueClick: (technique: MitreTechnique) => void;
  settings: LegendSettings;
}> = ({ tactic, techniques, usedTechniques, expanded, onToggle, onTechniqueClick, settings }) => {
  const theme = useTheme();

  const filteredTechniques = settings.showOnlyUsed 
    ? techniques.filter(t => usedTechniques.includes(t.id))
    : techniques;

  const usedCount = techniques.filter(t => usedTechniques.includes(t.id)).length;

  return (
    <Card elevation={1} sx={{ mb: 1 }}>
      <CardHeader
        avatar={
          <Avatar sx={{ bgcolor: tactic.color, width: 32, height: 32 }}>
            <CategoryIcon fontSize="small" />
          </Avatar>
        }
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6">{tactic.name}</Typography>
            <Badge badgeContent={usedCount} color="primary" showZero>
              <Chip
                size="small"
                label={`${filteredTechniques.length} techniques`}
                variant="outlined"
              />
            </Badge>
          </Box>
        }
        subheader={settings.showDescriptions ? tactic.description : undefined}
        action={
          <IconButton onClick={onToggle}>
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        }
        sx={{
          backgroundColor: `${tactic.color}10`,
          borderLeft: 4,
          borderLeftColor: tactic.color,
        }}
      />
      
      <Collapse in={expanded}>
        <CardContent sx={{ pt: 0 }}>
          <List dense>
            {filteredTechniques.map((technique, index) => (
              <ListItem
                key={technique.id}
                button
                onClick={() => onTechniqueClick(technique)}
                sx={{
                  borderRadius: 1,
                  mb: 0.5,
                  backgroundColor: usedTechniques.includes(technique.id) 
                    ? `${theme.palette.success.main}15` 
                    : 'transparent',
                  border: usedTechniques.includes(technique.id) 
                    ? `1px solid ${theme.palette.success.main}40` 
                    : 'none',
                }}
              >
                <ListItemIcon>
                  <SecurityIcon 
                    fontSize="small"
                    color={usedTechniques.includes(technique.id) ? 'success' : 'action'}
                  />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" fontWeight="medium">
                        {technique.id}
                      </Typography>
                      <Typography variant="body2">
                        {technique.name}
                      </Typography>
                      {usedTechniques.includes(technique.id) && (
                        <Chip size="small" label="Used" color="success" variant="outlined" />
                      )}
                    </Box>
                  }
                  secondary={settings.showDescriptions ? (
                    <Typography variant="caption" color="text.secondary">
                      {technique.description.substring(0, 100)}...
                    </Typography>
                  ) : undefined}
                />
                <ListItemSecondaryAction>
                  <IconButton size="small">
                    <InfoIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Collapse>
    </Card>
  );
};

// Main Interactive Legend Component
export const InteractiveLegend: React.FC<InteractiveLegendProps> = ({
  isVisible,
  onToggle,
  usedTechniques = [],
  onTechniqueSelect,
  onTacticSelect,
  position = 'right',
  height = 600,
}) => {
  const theme = useTheme();
  const [settings, setSettings] = useState<LegendSettings>({
    showDescriptions: true,
    showMitigations: true,
    showExamples: true,
    showSubtechniques: false,
    expandAll: false,
    showOnlyUsed: false,
    groupByTactic: true,
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTactics, setExpandedTactics] = useState<string[]>(['TA0001', 'TA0002', 'TA0003']);
  const [selectedTechnique, setSelectedTechnique] = useState<MitreTechnique | null>(null);
  const [bookmarkedTechniques, setBookmarkedTechniques] = useState<string[]>([]);
  const [settingsAnchor, setSettingsAnchor] = useState<null | HTMLElement>(null);

  // Filter techniques based on search
  const filteredTactics = useMemo(() => {
    return MITRE_TACTICS.map(tactic => ({
      ...tactic,
      techniques: tactic.techniques
        .map(id => SAMPLE_TECHNIQUES[id])
        .filter(Boolean)
        .filter(technique => 
          !searchQuery || 
          technique.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          technique.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          technique.description.toLowerCase().includes(searchQuery.toLowerCase())
        ),
    })).filter(tactic => !searchQuery || tactic.techniques.length > 0);
  }, [searchQuery]);

  // Auto-expand/collapse based on settings
  useEffect(() => {
    if (settings.expandAll) {
      setExpandedTactics(MITRE_TACTICS.map(t => t.id));
    } else if (expandedTactics.length === MITRE_TACTICS.length) {
      setExpandedTactics(['TA0001', 'TA0002', 'TA0003']);
    }
  }, [settings.expandAll]);

  const handleTacticToggle = useCallback((tacticId: string) => {
    setExpandedTactics(prev => 
      prev.includes(tacticId)
        ? prev.filter(id => id !== tacticId)
        : [...prev, tacticId]
    );
  }, []);

  const handleTechniqueClick = useCallback((technique: MitreTechnique) => {
    setSelectedTechnique(technique);
    onTechniqueSelect?.(technique);
  }, [onTechniqueSelect]);

  const handleBookmark = useCallback((techniqueId: string, bookmarked: boolean) => {
    setBookmarkedTechniques(prev => 
      bookmarked 
        ? [...prev, techniqueId]
        : prev.filter(id => id !== techniqueId)
    );
  }, []);

  if (!isVisible) {
    return (
      <Tooltip title="Show Legend">
        <Paper
          elevation={2}
          sx={{
            position: 'fixed',
            [position]: 16,
            top: '50%',
            transform: 'translateY(-50%)',
            p: 1,
            cursor: 'pointer',
            zIndex: 1000,
          }}
          onClick={() => onToggle(true)}
        >
          <HelpIcon color="primary" />
        </Paper>
      </Tooltip>
    );
  }

  return (
    <motion.div
      initial={{ [position]: -400, opacity: 0 }}
      animate={{ [position]: 0, opacity: 1 }}
      exit={{ [position]: -400, opacity: 0 }}
      style={{
        position: 'fixed',
        [position]: 0,
        top: 0,
        height: '100vh',
        width: 400,
        zIndex: 1200,
        pointerEvents: 'auto',
      }}
    >
      <Paper
        elevation={8}
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: position === 'right' ? '8px 0 0 8px' : '0 8px 8px 0',
        }}
      >
        {/* Header */}
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SecurityIcon />
              MITRE ATT&CK Legend
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <IconButton
                size="small"
                onClick={(e) => setSettingsAnchor(e.currentTarget)}
              >
                <FilterListIcon />
              </IconButton>
              <IconButton size="small" onClick={() => onToggle(false)}>
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>

          {/* Search */}
          <TextField
            fullWidth
            size="small"
            placeholder="Search techniques..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ mt: 1 }}
          />

          {/* Stats */}
          <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
            <Chip
              size="small"
              label={`${usedTechniques.length} Used`}
              color="success"
            />
            <Chip
              size="small"
              label={`${bookmarkedTechniques.length} Bookmarked`}
              color="primary"
            />
            <Chip
              size="small"
              label={`${filteredTactics.reduce((sum, t) => sum + t.techniques.length, 0)} Total`}
              variant="outlined"
            />
          </Box>
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
          {filteredTactics.map(tactic => (
            <TacticSection
              key={tactic.id}
              tactic={tactic}
              techniques={tactic.techniques}
              usedTechniques={usedTechniques}
              expanded={expandedTactics.includes(tactic.id)}
              onToggle={() => handleTacticToggle(tactic.id)}
              onTechniqueClick={handleTechniqueClick}
              settings={settings}
            />
          ))}
        </Box>

        {/* Settings Menu */}
        <Menu
          anchorEl={settingsAnchor}
          open={Boolean(settingsAnchor)}
          onClose={() => setSettingsAnchor(null)}
          PaperProps={{ sx: { minWidth: 250 } }}
        >
          <MenuItem>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.showDescriptions}
                  onChange={(e) => setSettings(prev => ({ ...prev, showDescriptions: e.target.checked }))}
                />
              }
              label="Show Descriptions"
            />
          </MenuItem>
          <MenuItem>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.showOnlyUsed}
                  onChange={(e) => setSettings(prev => ({ ...prev, showOnlyUsed: e.target.checked }))}
                />
              }
              label="Show Only Used"
            />
          </MenuItem>
          <MenuItem>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.expandAll}
                  onChange={(e) => setSettings(prev => ({ ...prev, expandAll: e.target.checked }))}
                />
              }
              label="Expand All"
            />
          </MenuItem>
        </Menu>

        {/* Technique Detail Modal */}
        <TechniqueDetailModal
          technique={selectedTechnique}
          open={Boolean(selectedTechnique)}
          onClose={() => setSelectedTechnique(null)}
          onBookmark={handleBookmark}
          isBookmarked={selectedTechnique ? bookmarkedTechniques.includes(selectedTechnique.id) : false}
        />
      </Paper>
    </motion.div>
  );
};

export default InteractiveLegend;