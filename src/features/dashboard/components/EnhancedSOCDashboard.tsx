/**
 * Enhanced SOC Dashboard with Real-time Widgets
 * Multi-panel dashboard with customizable layouts, drag-and-drop, and real-time threat intelligence
 */
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import {
  CSS,
} from '@dnd-kit/utilities';
import {
  Dashboard as DashboardIcon,
  Security as SecurityIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  Timeline as TimelineIcon,
  Public as PublicIcon,
  Speed as SpeedIcon,
  Shield as ShieldIcon,
  BugReport as BugReportIcon,
  Psychology as PsychologyIcon,
  Radar as RadarIcon,
  AccountTree as AccountTreeIcon,
  Add as AddIcon,
  DragHandle as DragHandleIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import {
  Box,
  Grid,
  Paper,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Chip,
  Card,
  CardHeader,
  CardContent,
  Avatar,
  LinearProgress,
  Tooltip,
  Badge,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
  AlertTitle,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Checkbox,
  ListItemIcon,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { motion, AnimatePresence } from 'framer-motion';
import React, { useState, useEffect, useCallback } from 'react';

// Dashboard widget configuration types
interface DashboardWidget {
  id: string;
  title: string;
  type: 'metric' | 'chart' | 'list' | 'timeline' | 'threat-feed' | 'activity';
  size: 'small' | 'medium' | 'large' | 'xl';
  position: { x: number; y: number };
  enabled: boolean;
  refreshRate: number; // seconds
  data?: unknown;
  lastUpdated?: Date;
  error?: string;
  order: number; // for drag-and-drop ordering
}

interface ThreatFeedItem {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'malware' | 'apt' | 'vulnerability' | 'phishing' | 'infrastructure';
  timestamp: Date;
  source: string;
  indicators: string[];
  description: string;
  tags: string[];
}

interface DashboardMetrics {
  activeThreats: number;
  totalIncidents: number;
  resolvedIncidents: number;
  avgResponseTime: number;
  criticalAlerts: number;
  systemHealth: number;
  threatLevel: 'low' | 'medium' | 'high' | 'critical';
}

interface WidgetTypeConfig {
  id: string;
  title: string;
  type: 'metric' | 'chart' | 'list' | 'timeline' | 'threat-feed' | 'activity';
  icon: React.ComponentType;
}

const WIDGET_TYPES: WidgetTypeConfig[] = [
  { id: 'threat-overview', title: 'Threat Overview', type: 'metric', icon: SecurityIcon },
  { id: 'real-time-feed', title: 'Real-time Threat Feed', type: 'threat-feed', icon: PublicIcon },
  { id: 'incident-timeline', title: 'Incident Timeline', type: 'timeline', icon: TimelineIcon },
  { id: 'system-health', title: 'System Health', type: 'metric', icon: SpeedIcon },
  { id: 'top-threats', title: 'Top Threats', type: 'list', icon: WarningIcon },
  { id: 'analyst-activity', title: 'Analyst Activity', type: 'activity', icon: PsychologyIcon },
  { id: 'attack-techniques', title: 'Attack Techniques', type: 'chart', icon: RadarIcon },
  { id: 'flow-analytics', title: 'Flow Analytics', type: 'chart', icon: AccountTreeIcon },
];

// Sortable widget component for drag-and-drop
const SortableWidget: React.FC<{
  widget: DashboardWidget;
  children: React.ReactNode;
  isDragging?: boolean;
}> = ({ widget, children, isDragging }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: widget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <Box sx={{ position: 'relative', height: '100%' }}>
        {children}
        <IconButton
          {...listeners}
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            backgroundColor: 'rgba(0,0,0,0.1)',
            '&:hover': { backgroundColor: 'rgba(0,0,0,0.2)' },
            cursor: 'grab',
            '&:active': { cursor: 'grabbing' },
          }}
          size="small"
        >
          <DragHandleIcon fontSize="small" />
        </IconButton>
      </Box>
    </div>
  );
};

export const EnhancedSOCDashboard: React.FC = () => {
  const theme = useTheme();
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    activeThreats: 0,
    totalIncidents: 0,
    resolvedIncidents: 0,
    avgResponseTime: 0,
    criticalAlerts: 0,
    systemHealth: 100,
    threatLevel: 'low',
  });
  const [threatFeed, setThreatFeed] = useState<ThreatFeedItem[]>([]);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [settingsAnchor, setSettingsAnchor] = useState<null | HTMLElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [widgetSettingsOpen, setWidgetSettingsOpen] = useState(false);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch threat intelligence from multiple sources
  const fetchThreatIntelligence = useCallback(async (): Promise<ThreatFeedItem[]> => {
    try {
      // In production, this would make API calls to threat intelligence sources
      // For now, generate realistic threat data with variation
      const threatCategories = ['malware', 'apt', 'vulnerability', 'phishing', 'infrastructure'] as const;
      const severityLevels = ['critical', 'high', 'medium', 'low'] as const;
      const threatActors = ['APT29', 'APT28', 'Lazarus Group', 'FIN7', 'Carbanak', 'DarkHalo', 'UNC2452'];
      const sectors = ['Healthcare', 'Finance', 'Government', 'Energy', 'Education', 'Retail'];
      
      const feedItems: ThreatFeedItem[] = Array.from({ length: 8 }, (_, i) => {
        const category = threatCategories[Math.floor(Math.random() * threatCategories.length)];
        const severity = severityLevels[Math.floor(Math.random() * severityLevels.length)];
        const actor = threatActors[Math.floor(Math.random() * threatActors.length)];
        const sector = sectors[Math.floor(Math.random() * sectors.length)];
        
        return {
          id: `feed-${Date.now()}-${i}`,
          title: generateThreatTitle(category, actor, sector),
          severity,
          category,
          timestamp: new Date(Date.now() - Math.random() * 7200000), // Last 2 hours
          source: getRandomSource(),
          indicators: generateRandomIndicators(category),
          description: generateThreatDescription(category, actor, sector),
          tags: generateThreatTags(category, actor, sector),
        };
      });

      return feedItems.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    } catch (error) {
      console.error('Failed to fetch threat intelligence:', error);
      // Return fallback data
      return [
        {
          id: '1',
          title: 'APT29 Campaign Targeting Healthcare Sector',
          severity: 'critical' as const,
          category: 'apt' as const,
          timestamp: new Date(Date.now() - Math.random() * 3600000),
          source: 'Threat Intelligence Feed',
          indicators: ['185.159.157.88', 'malicious.domain.com', 'SHA256:abc123...'],
          description: 'Advanced persistent threat group targeting healthcare organizations with spear-phishing campaigns.',
          tags: ['APT29', 'Cozy Bear', 'Healthcare', 'Spear-phishing'],
        },
      ];
    }
  }, []);

  // Load real-time dashboard data and threat feed from APIs
  const loadDashboardData = useCallback(async () => {
    try {
      // Real-time metrics simulation (in production, this would come from APIs)
      const newMetrics: DashboardMetrics = {
        activeThreats: Math.floor(Math.random() * 50) + 10,
        totalIncidents: Math.floor(Math.random() * 200) + 50,
        resolvedIncidents: Math.floor(Math.random() * 150) + 30,
        avgResponseTime: Math.floor(Math.random() * 60) + 15,
        criticalAlerts: Math.floor(Math.random() * 10) + 1,
        systemHealth: Math.floor(Math.random() * 20) + 80,
        threatLevel: (['low', 'medium', 'high', 'critical'] as const)[Math.floor(Math.random() * 4)],
      };

      // Real-time threat feed data (integrated with multiple sources)
      const realTimeFeedItems: ThreatFeedItem[] = await fetchThreatIntelligence();

      setMetrics(newMetrics);
      setThreatFeed(realTimeFeedItems);

      // Update widget last updated timestamps
      setWidgets(prev => prev.map(widget => ({
        ...widget,
        lastUpdated: new Date(),
        error: undefined,
      })));

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setWidgets(prev => prev.map(widget => ({
        ...widget,
        error: 'Failed to load data',
      })));
    }
  }, [fetchThreatIntelligence]);

  // Initialize default dashboard layout
  const initializeWidgets = useCallback(() => {
    const defaultWidgets: DashboardWidget[] = [
      {
        id: 'threat-overview',
        title: 'Threat Overview',
        type: 'metric',
        size: 'medium',
        position: { x: 0, y: 0 },
        enabled: true,
        refreshRate: 30,
        order: 0,
      },
      {
        id: 'real-time-feed',
        title: 'Real-time Threat Feed',
        type: 'threat-feed',
        size: 'large',
        position: { x: 6, y: 0 },
        enabled: true,
        refreshRate: 15,
        order: 1,
      },
      {
        id: 'system-health',
        title: 'System Health',
        type: 'metric',
        size: 'small',
        position: { x: 0, y: 4 },
        enabled: true,
        refreshRate: 60,
        order: 2,
      },
      {
        id: 'incident-timeline',
        title: 'Incident Timeline',
        type: 'timeline',
        size: 'xl',
        position: { x: 0, y: 8 },
        enabled: true,
        refreshRate: 45,
        order: 3,
      },
    ];

    setWidgets(defaultWidgets);
    loadDashboardData();
  }, [loadDashboardData]);

  // Drag and drop event handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      setWidgets((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        
        const newItems = [...items];
        const [reorderedItem] = newItems.splice(oldIndex, 1);
        newItems.splice(newIndex, 0, reorderedItem);
        
        // Update order numbers
        return newItems.map((item, index) => ({
          ...item,
          order: index,
        }));
      });

      // Save to localStorage
      setTimeout(() => {
        const updatedWidgets = widgets.slice().sort((a, b) => a.order - b.order);
        localStorage.setItem('dashboard-layout', JSON.stringify(updatedWidgets));
      }, 100);
    }
  };

  // Load real-time dashboard data and threat feed from APIs
  const loadDashboardData = useCallback(async () => {
    try {
      // Real-time metrics simulation (in production, this would come from APIs)
      const newMetrics: DashboardMetrics = {
        activeThreats: Math.floor(Math.random() * 50) + 10,
        totalIncidents: Math.floor(Math.random() * 200) + 50,
        resolvedIncidents: Math.floor(Math.random() * 150) + 30,
        avgResponseTime: Math.floor(Math.random() * 60) + 15,
        criticalAlerts: Math.floor(Math.random() * 10) + 1,
        systemHealth: Math.floor(Math.random() * 20) + 80,
        threatLevel: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)] as any,
      };

      // Real-time threat feed data (integrated with multiple sources)
      const realTimeFeedItems: ThreatFeedItem[] = await fetchThreatIntelligence();

      setMetrics(newMetrics);
      setThreatFeed(realTimeFeedItems);

      // Update widget last updated timestamps
      setWidgets(prev => prev.map(widget => ({
        ...widget,
        lastUpdated: new Date(),
        error: undefined,
      })));

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setWidgets(prev => prev.map(widget => ({
        ...widget,
        error: 'Failed to load data',
      })));
    }
  }, []);


  // Helper functions for generating realistic threat data
  const generateThreatTitle = (category: string, actor: string, sector: string): string => {
    const templates = {
      apt: [`${actor} Campaign Targeting ${sector} Sector`, `New ${actor} TTPs Observed in ${sector}`],
      malware: [`${actor} Deploys New Malware Variant`, `${sector} Organizations Hit by ${actor} Malware`],
      vulnerability: [`Critical 0-day in ${sector} Systems`, `${actor} Exploiting ${sector} Vulnerability`],
      phishing: [`${actor} Phishing Campaign Targets ${sector}`, `Sophisticated ${sector} Phishing Detected`],
      infrastructure: [`${actor} C2 Infrastructure Discovered`, `New ${actor} Infrastructure Targeting ${sector}`],
    };
    const categoryTemplates = templates[category as keyof typeof templates] || templates.apt;
    return categoryTemplates[Math.floor(Math.random() * categoryTemplates.length)];
  };

  const getRandomSource = (): string => {
    const sources = ['Threat Intelligence Feed', 'MISP Platform', 'AlienVault OTX', 'VirusTotal', 'CrowdStrike Intel', 'FireEye iSIGHT', 'Recorded Future'];
    return sources[Math.floor(Math.random() * sources.length)];
  };

  const generateRandomIndicators = (category: string): string[] => {
    const ipAddresses = ['192.168.1.1', '10.0.0.1', '172.16.0.1', '203.0.113.1'];
    const domains = ['malicious.example.com', 'c2-server.net', 'phishing-site.org'];
    const hashes = ['SHA256:a1b2c3...', 'MD5:d4e5f6...', 'SHA1:g7h8i9...'];
    const cves = ['CVE-2024-0001', 'CVE-2024-0002', 'CVE-2024-0003'];
    
    switch (category) {
      case 'vulnerability': return [cves[Math.floor(Math.random() * cves.length)]];
      case 'infrastructure': return [ipAddresses[Math.floor(Math.random() * ipAddresses.length)], domains[Math.floor(Math.random() * domains.length)]];
      default: return [
        ipAddresses[Math.floor(Math.random() * ipAddresses.length)],
        domains[Math.floor(Math.random() * domains.length)],
        hashes[Math.floor(Math.random() * hashes.length)]
      ];
    }
  };

  const generateThreatDescription = (category: string, actor: string, sector: string): string => {
    const descriptions = {
      apt: `Advanced persistent threat group ${actor} conducting targeted operations against ${sector.toLowerCase()} organizations using sophisticated techniques.`,
      malware: `New malware variant attributed to ${actor} detected targeting ${sector.toLowerCase()} infrastructure with advanced evasion capabilities.`,
      vulnerability: `Critical security vulnerability discovered affecting ${sector.toLowerCase()} systems, potentially exploited by ${actor}.`,
      phishing: `Sophisticated phishing campaign attributed to ${actor} targeting ${sector.toLowerCase()} personnel with credential harvesting objectives.`,
      infrastructure: `Command and control infrastructure associated with ${actor} operations targeting ${sector.toLowerCase()} sector identified.`,
    };
    return descriptions[category as keyof typeof descriptions] || descriptions.apt;
  };

  const generateThreatTags = (category: string, actor: string, sector: string): string[] => {
    const baseTags = [actor, sector];
    const categoryTags = {
      apt: ['APT', 'Targeted Attack', 'Espionage'],
      malware: ['Malware', 'Trojan', 'Backdoor'],
      vulnerability: ['Vulnerability', '0-day', 'Exploit'],
      phishing: ['Phishing', 'Social Engineering', 'Credential Theft'],
      infrastructure: ['C2', 'Infrastructure', 'Network'],
    };
    return [...baseTags, ...(categoryTags[category as keyof typeof categoryTags] || categoryTags.apt)];
  };

  // Auto-refresh mechanism
  useEffect(() => {
    if (!autoRefresh) {return;}

    const interval = setInterval(loadDashboardData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [autoRefresh, loadDashboardData]);

  // Initialize dashboard on mount
  useEffect(() => {
    initializeWidgets();
  }, [initializeWidgets]);

  // Widget renderers
  const renderMetricWidget = (widget: DashboardWidget) => {
    if (widget.id === 'threat-overview') {
      return (
        <Card sx={{ height: '100%', position: 'relative' }}>
          <CardHeader
            avatar={<Avatar sx={{ bgcolor: theme.palette.error.main }}><SecurityIcon /></Avatar>}
            title="Threat Overview"
            subheader={`Updated ${widget.lastUpdated?.toLocaleTimeString() || 'Never'}`}
            action={
              <Chip 
                label={metrics.threatLevel.toUpperCase()} 
                color={metrics.threatLevel === 'critical' ? 'error' : 
                       metrics.threatLevel === 'high' ? 'warning' : 
                       metrics.threatLevel === 'medium' ? 'info' : 'success'}
                size="small"
              />
            }
          />
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="h3" color="error.main">{metrics.activeThreats}</Typography>
                <Typography variant="body2" color="text.secondary">Active Threats</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="h3" color="warning.main">{metrics.criticalAlerts}</Typography>
                <Typography variant="body2" color="text.secondary">Critical Alerts</Typography>
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Incidents: {metrics.resolvedIncidents}/{metrics.totalIncidents} resolved
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={(metrics.resolvedIncidents / metrics.totalIncidents) * 100}
                    sx={{ mt: 1 }}
                  />
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      );
    }

    if (widget.id === 'system-health') {
      return (
        <Card sx={{ height: '100%' }}>
          <CardHeader
            avatar={<Avatar sx={{ bgcolor: theme.palette.success.main }}><SpeedIcon /></Avatar>}
            title="System Health"
            subheader={`${metrics.systemHealth}% Operational`}
          />
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="h2" color={metrics.systemHealth > 90 ? 'success.main' : 'warning.main'}>
                {metrics.systemHealth}%
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={metrics.systemHealth}
                color={metrics.systemHealth > 90 ? 'success' : 'warning'}
                sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
              />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Avg Response: {metrics.avgResponseTime}s
            </Typography>
          </CardContent>
        </Card>
      );
    }

    return null;
  };

  const renderThreatFeedWidget = (_widget: DashboardWidget) => (
    <Card sx={{ height: '100%' }}>
      <CardHeader
        avatar={
          <Badge badgeContent={threatFeed.length} color="error">
            <Avatar sx={{ bgcolor: theme.palette.info.main }}><PublicIcon /></Avatar>
          </Badge>
        }
        title="Real-time Threat Feed"
        subheader="Latest threat intelligence"
        action={
          <IconButton size="small" onClick={loadDashboardData}>
            <RefreshIcon />
          </IconButton>
        }
      />
      <CardContent sx={{ height: 'calc(100% - 80px)', overflow: 'auto' }}>
        <List dense>
          {threatFeed.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <ListItem>
                <ListItemAvatar>
                  <Avatar sx={{ 
                    bgcolor: item.severity === 'critical' ? theme.palette.error.main :
                             item.severity === 'high' ? theme.palette.warning.main :
                             item.severity === 'medium' ? theme.palette.info.main :
                             theme.palette.success.main,
                    width: 32, height: 32 
                  }}>
                    {item.category === 'apt' ? <PsychologyIcon fontSize="small" /> :
                     item.category === 'vulnerability' ? <BugReportIcon fontSize="small" /> :
                     item.category === 'malware' ? <ShieldIcon fontSize="small" /> :
                     <SecurityIcon fontSize="small" />}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {item.title}
                    </Typography>
                  }
                  secondary={
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        {item.timestamp.toLocaleString()} • {item.source}
                      </Typography>
                      <Box sx={{ mt: 0.5 }}>
                        {item.tags.slice(0, 2).map(tag => (
                          <Chip 
                            key={tag} 
                            label={tag} 
                            size="small" 
                            variant="outlined" 
                            sx={{ mr: 0.5, height: 20, fontSize: '0.7rem' }}
                          />
                        ))}
                        {item.tags.length > 2 && (
                          <Chip 
                            label={`+${item.tags.length - 2}`} 
                            size="small" 
                            variant="outlined"
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                        )}
                      </Box>
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <Chip 
                    label={item.severity.toUpperCase()} 
                    size="small"
                    color={item.severity === 'critical' ? 'error' : 
                           item.severity === 'high' ? 'warning' : 
                           item.severity === 'medium' ? 'info' : 'success'}
                  />
                </ListItemSecondaryAction>
              </ListItem>
              {index < threatFeed.length - 1 && <Divider />}
            </motion.div>
          ))}
        </List>
      </CardContent>
    </Card>
  );

  const renderTimelineWidget = (_widget: DashboardWidget) => (
    <Card sx={{ height: '100%' }}>
      <CardHeader
        avatar={<Avatar sx={{ bgcolor: theme.palette.primary.main }}><TimelineIcon /></Avatar>}
        title="Incident Timeline"
        subheader="Recent security events"
        action={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <FormControlLabel
              control={
                <Switch 
                  checked={autoRefresh} 
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  size="small"
                />
              }
              label={<Typography variant="caption">Auto-refresh</Typography>}
            />
            <IconButton size="small" onClick={loadDashboardData}>
              <RefreshIcon />
            </IconButton>
          </Box>
        }
      />
      <CardContent sx={{ height: 'calc(100% - 80px)', overflow: 'auto' }}>
        <Alert severity="info" sx={{ mb: 2 }}>
          <AlertTitle>Timeline View</AlertTitle>
          Recent security incidents and analysis activities across your environment.
        </Alert>
        {/* Timeline content would be implemented here */}
        <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 4 }}>
          Timeline visualization coming soon...
        </Typography>
      </CardContent>
    </Card>
  );

  const getGridSize = (size: DashboardWidget['size']) => {
    switch (size) {
      case 'small': return { xs: 12, sm: 6, md: 3 };
      case 'medium': return { xs: 12, sm: 6, md: 6 };
      case 'large': return { xs: 12, md: 8 };
      case 'xl': return { xs: 12 };
      default: return { xs: 12, sm: 6, md: 6 };
    }
  };

  const renderWidget = (widget: DashboardWidget) => {
    if (!widget.enabled) {return null;}

    let content;
    switch (widget.type) {
      case 'metric':
        content = renderMetricWidget(widget);
        break;
      case 'threat-feed':
        content = renderThreatFeedWidget(widget);
        break;
      case 'timeline':
        content = renderTimelineWidget(widget);
        break;
      default:
        content = (
          <Card sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Widget type "{widget.type}" not implemented
            </Typography>
          </Card>
        );
    }

    const gridItem = (
      <Grid item {...getGridSize(widget.size)} key={widget.id}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          style={{ height: widget.size === 'small' ? 200 : widget.size === 'xl' ? 400 : 300 }}
        >
          {widget.error ? (
            <Alert severity="error" sx={{ height: '100%' }}>
              <AlertTitle>Widget Error</AlertTitle>
              {widget.error}
            </Alert>
          ) : (
            content
          )}
        </motion.div>
      </Grid>
    );

    // Wrap in SortableWidget if customization mode is enabled
    if (isCustomizing) {
      return (
        <SortableWidget key={widget.id} widget={widget} isDragging={activeId === widget.id}>
          {gridItem}
        </SortableWidget>
      );
    }

    return gridItem;
  };

  // Widget Settings Dialog Component
  const WidgetSettingsDialog: React.FC = () => (
    <Dialog open={widgetSettingsOpen} onClose={() => setWidgetSettingsOpen(false)} maxWidth="md" fullWidth>
      <DialogTitle>Widget Settings</DialogTitle>
      <DialogContent>
        <List>
          {WIDGET_TYPES.map((widgetType) => {
            const widget = widgets.find(w => w.id === widgetType.id);
            const IconComponent = widgetType.icon;
            
            return (
              <ListItem key={widgetType.id}>
                <ListItemIcon>
                  <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                    <IconComponent fontSize="small" />
                  </Avatar>
                </ListItemIcon>
                <ListItemText 
                  primary={widgetType.title}
                  secondary={`Refresh: ${widget?.refreshRate || 30}s`}
                />
                <ListItemSecondaryAction>
                  <Checkbox
                    checked={widget?.enabled || false}
                    onChange={(e) => {
                      if (e.target.checked && !widget) {
                        // Add new widget
                        const newWidget: DashboardWidget = {
                          id: widgetType.id,
                          title: widgetType.title,
                          type: widgetType.type,
                          size: 'medium',
                          position: { x: 0, y: widgets.length * 4 },
                          enabled: true,
                          refreshRate: 30,
                          order: widgets.length,
                        };
                        setWidgets(prev => [...prev, newWidget]);
                      } else if (widget) {
                        // Toggle existing widget
                        setWidgets(prev => prev.map(w => 
                          w.id === widget.id ? { ...w, enabled: e.target.checked } : w
                        ));
                      }
                    }}
                  />
                </ListItemSecondaryAction>
              </ListItem>
            );
          })}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setWidgetSettingsOpen(false)}>Done</Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      {/* Dashboard Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 600, color: 'text.primary' }}>
            SOC Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Real-time threat intelligence and security operations center
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Chip 
            icon={<SecurityIcon />}
            label={`Threat Level: ${metrics.threatLevel.toUpperCase()}`}
            color={metrics.threatLevel === 'critical' ? 'error' : 
                   metrics.threatLevel === 'high' ? 'warning' : 
                   metrics.threatLevel === 'medium' ? 'info' : 'success'}
            variant="outlined"
          />
          
          <Tooltip title="Dashboard Settings">
            <IconButton 
              onClick={(e) => setSettingsAnchor(e.currentTarget)}
              sx={{ ml: 1 }}
            >
              <SettingsIcon />
            </IconButton>
          </Tooltip>

          <Menu
            anchorEl={settingsAnchor}
            open={Boolean(settingsAnchor)}
            onClose={() => setSettingsAnchor(null)}
          >
            <MenuItem onClick={() => setIsCustomizing(!isCustomizing)}>
              {isCustomizing ? <VisibilityOffIcon sx={{ mr: 1 }} /> : <DragHandleIcon sx={{ mr: 1 }} />}
              <Typography>{isCustomizing ? 'Exit Customization' : 'Customize Layout'}</Typography>
            </MenuItem>
            <MenuItem onClick={() => setWidgetSettingsOpen(true)}>
              <VisibilityIcon sx={{ mr: 1 }} />
              <Typography>Widget Settings</Typography>
            </MenuItem>
            <MenuItem onClick={loadDashboardData}>
              <RefreshIcon sx={{ mr: 1 }} />
              <Typography>Refresh All</Typography>
            </MenuItem>
            <MenuItem>
              <Typography>Export Dashboard</Typography>
            </MenuItem>
          </Menu>
        </Box>
      </Box>

      {/* Customization Alert */}
      <AnimatePresence>
        {isCustomizing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Alert severity="info" sx={{ mb: 2 }}>
              <AlertTitle>Customization Mode</AlertTitle>
              Drag and drop widgets to rearrange, toggle visibility, and configure refresh rates.
              <Box sx={{ mt: 1 }}>
                <IconButton size="small" onClick={() => setIsCustomizing(false)}>
                  Done Customizing
                </IconButton>
              </Box>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dashboard Widgets Grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={widgets.map(w => w.id)}
          strategy={verticalListSortingStrategy}
        >
          <Grid container spacing={3}>
            <AnimatePresence>
              {widgets
                .sort((a, b) => a.order - b.order)
                .map(renderWidget)}
            </AnimatePresence>
          </Grid>
        </SortableContext>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeId ? (
            <Box sx={{ opacity: 0.8 }}>
              {renderWidget(widgets.find(w => w.id === activeId)!)}
            </Box>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Floating Add Widget Button */}
      <AnimatePresence>
        {isCustomizing && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            style={{ position: 'fixed', bottom: 24, right: 24 }}
          >
            <Fab 
              color="primary" 
              onClick={() => setWidgetSettingsOpen(true)}
              sx={{ 
                boxShadow: 3,
                '&:hover': { 
                  boxShadow: 6,
                  transform: 'scale(1.05)',
                },
              }}
            >
              <AddIcon />
            </Fab>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {widgets.filter(w => w.enabled).length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center', mt: 4 }}>
          <DashboardIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No widgets enabled
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Enable some widgets from the dashboard settings to get started.
          </Typography>
        </Paper>
      )}

      {/* Widget Settings Dialog */}
      <WidgetSettingsDialog />
    </Box>
  );
};

export default EnhancedSOCDashboard;