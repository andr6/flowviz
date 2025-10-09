import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  IconButton,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  LinearProgress,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert as MuiAlert,
  Stack,
  Divider,
  Avatar,
  Badge,
  Fab,
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Intelligence as IntelligenceIcon,
  Security as SecurityIcon,
  Group as ActorIcon,
  Campaign as CampaignIcon,
  Visibility as WatchIcon,
  Feed as FeedIcon,
  Analytics as AnalyticsIcon,
  TrendingUp as TrendingUpIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Share as ShareIcon,
  GetApp as ExportIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  Public as PublicIcon,
  Lock as LockIcon,
  Speed as SpeedIcon,
  Assessment as AssessmentIcon,
  Psychology as AttributionIcon,
  Timeline as TimelineIcon,
  Map as MapIcon,
  Merge as MergeIcon,
  Scatter as CorrelationIcon,
  ExpandMore as ExpandIcon
} from '@mui/icons-material';
import { threatFlowTheme } from '../../../shared/theme/threatflow-theme';
import { ThreatActor, ThreatActorMetrics } from '../types/ThreatActor';
import { Campaign, CampaignAnalytics } from '../types/Campaign';
import { IOCWatchlist, WatchlistIndicator } from '../types/IOCWatchlist';

interface ThreatIntelligenceDashboardProps {
  organizationId: string;
  userId: string;
  userRole: string;
  onActorSelect?: (actor: ThreatActor) => void;
  onCampaignSelect?: (campaign: Campaign) => void;
  onWatchlistSelect?: (watchlist: IOCWatchlist) => void;
  showActions?: boolean;
  compact?: boolean;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`threat-intel-tabpanel-${index}`}
      aria-labelledby={`threat-intel-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export const ThreatIntelligenceDashboard: React.FC<ThreatIntelligenceDashboardProps> = ({
  organizationId,
  userId,
  userRole,
  onActorSelect,
  onCampaignSelect,
  onWatchlistSelect,
  showActions = true,
  compact = false
}) => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // Data states
  const [threatActors, setThreatActors] = useState<ThreatActor[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [watchlists, setWatchlists] = useState<IOCWatchlist[]>([]);
  const [recentIOCs, setRecentIOCs] = useState<WatchlistIndicator[]>([]);
  
  // Metrics states
  const [actorMetrics, setActorMetrics] = useState<ThreatActorMetrics>({
    totalActors: 0,
    activeActors: 0,
    topActorsByThreatScore: [],
    recentActivity: [],
    attributionDistribution: {},
    motivationDistribution: {},
    typeDistribution: {},
    geographicDistribution: {},
    trendAnalysis: []
  });
  
  const [campaignAnalytics, setCampaignAnalytics] = useState<CampaignAnalytics>({
    totalCampaigns: 0,
    activeCampaigns: 0,
    recentCampaigns: 0,
    avgDuration: 0,
    mostTargetedSectors: [],
    mostUsedTechniques: [],
    geographicDistribution: {},
    sophisticationTrends: [],
    impactAssessment: { high_impact: 0, medium_impact: 0, low_impact: 0 },
    attributionQuality: {},
    actorInvolvement: []
  });

  // Filter states
  const [filters, setFilters] = useState({
    searchTerm: '',
    dateRange: { start: null as Date | null, end: null as Date | null },
    threatLevel: [] as string[],
    confidence: [] as string[],
    status: [] as string[]
  });

  // Pagination states
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      // Simulate loading comprehensive threat intelligence data
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock threat actors
      const mockActors: ThreatActor[] = [
        {
          id: '1',
          organizationId,
          name: 'APT29 (Cozy Bear)',
          aliases: ['The Dukes', 'CozyDuke', 'Minidionis'],
          description: 'Russian state-sponsored cyber espionage group',
          type: 'nation_state',
          sophistication: 'expert',
          attribution: {
            level: 'high_confidence',
            methods: ['technical_analysis', 'infrastructure_analysis', 'behavioral_analysis'],
            evidence: [],
            confidence: 0.92,
            lastAssessment: new Date(),
            assessedBy: 'analyst1',
            reasoning: 'High confidence based on TTPs, infrastructure, and targeting patterns',
            alternatives: []
          },
          confidence: 0.92,
          status: 'active',
          origin: {
            primaryCountry: 'Russia',
            additionalCountries: [],
            regions: ['Eastern Europe'],
            confidence: 0.9,
            evidenceBasis: ['Infrastructure geolocation', 'Linguistic analysis', 'Targeting patterns']
          },
          targets: [],
          motivations: [
            {
              type: 'espionage',
              description: 'Intelligence collection against Western governments and organizations',
              priority: 'primary',
              confidence: 0.95,
              evidence: ['Targeting patterns', 'Data exfiltration methods']
            }
          ],
          capabilities: [],
          resources: 'government',
          infrastructure: {
            hosting: {
              providers: [],
              countries: [],
              patterns: [],
              reuse: { frequency: 'occasional', patterns: [], timeline: 30 }
            },
            command_control: {
              protocols: [],
              domains: [],
              ips: [],
              certificates: [],
              communication_patterns: []
            },
            operational_security: {
              level: 'excellent',
              tradecraft: ['Advanced OPSEC', 'Living off the land'],
              mistakes: [],
              improvements: []
            },
            patterns: []
          },
          tactics: ['TA0001', 'TA0002', 'TA0003'],
          techniques: [],
          tools: [],
          malwareFamilies: [],
          activityPatterns: [],
          timeline: [],
          campaigns: ['1', '2'],
          operations: [],
          indicators: [],
          reportedBy: [],
          reports: [],
          evidence: [],
          affiliations: [],
          relationships: [],
          firstSeen: new Date('2014-01-01'),
          lastSeen: new Date(),
          activityScore: 0.85,
          threatScore: 0.95,
          tags: ['APT', 'Russia', 'Government'],
          customFields: {},
          createdBy: userId,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      // Mock campaigns
      const mockCampaigns: Campaign[] = [
        {
          id: '1',
          organizationId,
          name: 'SolarWinds Supply Chain Attack',
          aliases: ['SUNBURST', 'Solorigate'],
          description: 'Sophisticated supply chain attack targeting SolarWinds Orion platform',
          status: 'concluded',
          actors: [
            {
              actorId: '1',
              name: 'APT29 (Cozy Bear)',
              role: 'primary_actor',
              confidence: 0.9,
              evidence: ['TTPs analysis', 'Infrastructure overlap'],
              attribution_method: ['technical_analysis', 'behavioral_analysis']
            }
          ],
          confidence: 0.9,
          attribution_quality: 'high_confidence',
          firstActivity: new Date('2019-03-01'),
          lastActivity: new Date('2020-12-31'),
          duration: 665,
          phases: [],
          timeline: [],
          scope: {
            scale: 'massive',
            duration_category: 'persistent',
            complexity: 'highly_complex',
            coordination_level: 'organizational',
            resource_requirements: []
          },
          targets: [],
          geography: {
            source_countries: [],
            target_countries: [],
            infrastructure_countries: [],
            operational_regions: [],
            geographic_patterns: []
          },
          victims: [],
          techniques: [],
          tools: [],
          malware: [],
          infrastructure: {
            command_control: {
              domains: [],
              ip_addresses: [],
              protocols: [],
              ports: [],
              encryption: [],
              communication_patterns: [],
              redundancy: 'high_redundancy',
              geographic_distribution: []
            },
            delivery: {
              email_providers: [],
              domains: [],
              hosting_providers: [],
              cdn_services: [],
              url_shorteners: [],
              social_media_accounts: [],
              messaging_platforms: []
            },
            hosting: {
              providers: [],
              countries: [],
              payment_methods: [],
              registration_patterns: [],
              bulletproof_hosting: false,
              cloud_services: [],
              compromised_sites: []
            },
            payment: {
              methods: [],
              currencies: [],
              wallets: [],
              financial_institutions: [],
              money_laundering: [],
              transaction_patterns: []
            },
            communication: {
              platforms: [],
              encrypted_channels: [],
              dead_drops: [],
              covert_channels: [],
              backup_methods: [],
              operational_language: []
            },
            patterns: [],
            operational_security: {
              level: 'excellent',
              practices: [],
              mistakes: [],
              improvements: [],
              assessment: ''
            }
          },
          objectives: [],
          motivations: ['espionage', 'strategic_advantage'],
          sophistication: 'nation_state_level',
          success_metrics: [],
          indicators: [],
          signatures: [],
          evidence: [],
          related_campaigns: [],
          impact: {
            overall_severity: 'severe',
            scope: 'global',
            domains: [],
            quantitative_metrics: [],
            qualitative_assessment: 'Major supply chain compromise affecting thousands of organizations',
            long_term_effects: ['Increased supply chain security awareness', 'Enhanced monitoring requirements'],
            recovery_timeline: '12-18 months'
          },
          affected_sectors: ['Government', 'Technology', 'Telecommunications'],
          affected_countries: ['United States', 'Canada', 'United Kingdom', 'Israel'],
          sources: [],
          reports: [],
          tags: ['Supply Chain', 'APT29', 'Nation State'],
          classification: 'TLP:WHITE',
          customFields: {},
          createdBy: userId,
          createdAt: new Date(),
          updatedAt: new Date(),
          analyzedBy: [userId],
          tracking_status: 'archived',
          monitoring: {
            priority: 'high',
            frequency: 'weekly',
            indicators: [],
            alerts: [],
            automated_analysis: true,
            escalation_rules: []
          }
        }
      ];

      // Mock watchlists
      const mockWatchlists: IOCWatchlist[] = [
        {
          id: '1',
          organizationId,
          name: 'APT Group Indicators',
          description: 'IOCs associated with advanced persistent threat groups',
          purpose: 'threat_detection',
          status: 'active',
          priority: 'high',
          sensitivity: 'confidential',
          retention_period: 365,
          auto_update: true,
          indicators: [],
          total_indicators: 1247,
          active_indicators: 1189,
          expired_indicators: 58,
          sources: [],
          feed_integrations: [],
          manual_additions: 89,
          monitoring: {
            enabled: true,
            real_time: true,
            monitoring_sources: [],
            detection_methods: [],
            correlation_rules: [],
            false_positive_suppression: true,
            context_enrichment: true
          },
          alerting: {
            enabled: true,
            alert_levels: [],
            escalation_rules: [],
            suppression_rules: [],
            aggregation: {
              enabled: true,
              time_window_minutes: 60,
              max_alerts_per_window: 100,
              grouping_fields: ['type', 'severity']
            },
            rate_limiting: {
              enabled: true,
              max_alerts_per_minute: 10,
              max_alerts_per_hour: 100,
              burst_limit: 20
            }
          },
          notifications: {
            channels: [],
            templates: [],
            recipients: [],
            schedules: [],
            preferences: {
              digest_frequency: 'daily',
              batch_similar: true,
              quiet_hours: {
                enabled: false,
                start_time: '22:00',
                end_time: '06:00',
                timezone: 'UTC',
                emergency_override: true
              },
              priority_override: true,
              max_frequency: {
                max_per_hour: 50,
                max_per_day: 200,
                burst_allowance: 10
              }
            }
          },
          metrics: {
            total_indicators: 1247,
            active_indicators: 1189,
            expired_indicators: 58,
            false_positives: 12,
            total_matches: 156,
            matches_last_24h: 8,
            matches_last_7d: 23,
            matches_last_30d: 89,
            unique_matches: 67,
            false_positive_rate: 0.08,
            confidence_distribution: {},
            source_reliability_distribution: {},
            avg_enrichment_time: 2.3,
            avg_detection_time: 0.5,
            monitoring_coverage: 0.95,
            indicator_growth_rate: 0.15,
            match_trend: [],
            top_matching_indicators: [],
            source_performance: []
          },
          match_history: [],
          sharing: {
            enabled: false,
            sharing_levels: [],
            external_partners: [],
            export_formats: [],
            sharing_agreements: [],
            attribution_requirements: []
          },
          access_control: {
            access_model: 'rbac',
            roles: [],
            permissions: [],
            audit_logging: true,
            session_management: {
              session_timeout: 480,
              concurrent_sessions: 5,
              ip_restrictions: [],
              device_restrictions: false,
              geographical_restrictions: []
            },
            multi_factor_auth: false
          },
          created_by: userId,
          created_at: new Date('2023-01-15'),
          updated_at: new Date(),
          last_match: new Date(),
          tags: ['APT', 'High Priority'],
          categories: ['Malware', 'Infrastructure'],
          custom_fields: {}
        }
      ];

      setThreatActors(mockActors);
      setCampaigns(mockCampaigns);
      setWatchlists(mockWatchlists);
      
      // Update metrics
      setActorMetrics({
        totalActors: mockActors.length,
        activeActors: mockActors.filter(a => a.status === 'active').length,
        topActorsByThreatScore: mockActors.sort((a, b) => b.threatScore - a.threatScore).slice(0, 10),
        recentActivity: [],
        attributionDistribution: {},
        motivationDistribution: {},
        typeDistribution: {},
        geographicDistribution: {},
        trendAnalysis: []
      });

      setCampaignAnalytics({
        totalCampaigns: mockCampaigns.length,
        activeCampaigns: mockCampaigns.filter(c => c.status === 'active').length,
        recentCampaigns: mockCampaigns.filter(c => {
          const daysSince = (Date.now() - c.createdAt.getTime()) / (1000 * 60 * 60 * 24);
          return daysSince <= 30;
        }).length,
        avgDuration: mockCampaigns.reduce((sum, c) => sum + c.duration, 0) / mockCampaigns.length,
        mostTargetedSectors: [
          { sector: 'Government', count: 15 },
          { sector: 'Technology', count: 12 },
          { sector: 'Financial', count: 8 }
        ],
        mostUsedTechniques: [
          { technique: 'T1566.001 - Spearphishing Attachment', count: 23 },
          { technique: 'T1055 - Process Injection', count: 18 },
          { technique: 'T1003 - OS Credential Dumping', count: 15 }
        ],
        geographicDistribution: {},
        sophisticationTrends: [],
        impactAssessment: {
          high_impact: 1,
          medium_impact: 0,
          low_impact: 0
        },
        attributionQuality: {},
        actorInvolvement: []
      });

    } catch (error) {
      console.error('Failed to load threat intelligence data:', error);
    } finally {
      setLoading(false);
    }
  }, [organizationId, userId]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return threatFlowTheme.colors.status.error.text;
      case 'high':
        return threatFlowTheme.colors.status.warning.text;
      case 'medium':
        return threatFlowTheme.colors.brand.primary;
      case 'low':
        return threatFlowTheme.colors.text.tertiary;
      default:
        return threatFlowTheme.colors.text.secondary;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return threatFlowTheme.colors.status.success.text;
    if (confidence >= 0.6) return threatFlowTheme.colors.status.warning.text;
    return threatFlowTheme.colors.status.error.text;
  };

  const MetricsCard = ({ title, value, subtitle, icon, color, trend }: any) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h4" sx={{ color, fontWeight: 'bold', mb: 0.5 }}>
              {value}
            </Typography>
            <Typography variant="h6" sx={{ mb: 0.5 }}>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="body2" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
                {subtitle}
              </Typography>
            )}
            {trend !== undefined && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                <TrendingUpIcon sx={{ 
                  fontSize: 16, 
                  color: trend > 0 ? threatFlowTheme.colors.status.success.text : threatFlowTheme.colors.status.error.text,
                  transform: trend < 0 ? 'rotate(180deg)' : 'none'
                }} />
                <Typography variant="caption" sx={{ 
                  color: trend > 0 ? threatFlowTheme.colors.status.success.text : threatFlowTheme.colors.status.error.text 
                }}>
                  {trend > 0 ? '+' : ''}{trend}%
                </Typography>
              </Box>
            )}
          </Box>
          <Avatar sx={{ bgcolor: `${color}20`, color }}>
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );

  if (compact) {
    return (
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IntelligenceIcon sx={{ color: threatFlowTheme.colors.brand.primary }} />
            <Typography variant="h6">Threat Intelligence</Typography>
          </Box>
          <Button
            variant="outlined"
            size="small"
            startIcon={<AnalyticsIcon />}
            onClick={() => window.open('/threat-intelligence', '_blank')}
          >
            View Dashboard
          </Button>
        </Box>
        
        <Grid container spacing={2}>
          <Grid item xs={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ color: threatFlowTheme.colors.brand.primary }}>
                {actorMetrics.totalActors}
              </Typography>
              <Typography variant="caption">Threat Actors</Typography>
            </Box>
          </Grid>
          <Grid item xs={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ color: threatFlowTheme.colors.status.warning.text }}>
                {campaignAnalytics.activeCampaigns}
              </Typography>
              <Typography variant="caption">Active Campaigns</Typography>
            </Box>
          </Grid>
          <Grid item xs={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ color: threatFlowTheme.colors.accent.secure }}>
                {watchlists.reduce((sum, w) => sum + w.total_indicators, 0)}
              </Typography>
              <Typography variant="caption">IOCs</Typography>
            </Box>
          </Grid>
          <Grid item xs={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ color: threatFlowTheme.colors.status.success.text }}>
                {watchlists.reduce((sum, w) => sum + w.metrics.matches_last_24h, 0)}
              </Typography>
              <Typography variant="caption">Matches 24h</Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IntelligenceIcon sx={{ color: threatFlowTheme.colors.brand.primary, fontSize: 32 }} />
          <Box>
            <Typography variant="h4">Threat Intelligence</Typography>
            <Typography variant="body2" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
              Advanced threat actor tracking, campaign analysis, and IOC monitoring
            </Typography>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadDashboardData}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            startIcon={<ExportIcon />}
          >
            Export
          </Button>
          {showActions && (
            <>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                sx={{ bgcolor: threatFlowTheme.colors.brand.primary }}
              >
                Add Intel
              </Button>
            </>
          )}
        </Box>
      </Box>

      {/* Overview Metrics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricsCard
            title="Threat Actors"
            value={actorMetrics.totalActors}
            subtitle={`${actorMetrics.activeActors} active`}
            icon={<ActorIcon />}
            color={threatFlowTheme.colors.brand.primary}
            trend={8}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricsCard
            title="Active Campaigns"
            value={campaignAnalytics.activeCampaigns}
            subtitle={`${campaignAnalytics.recentCampaigns} new this month`}
            icon={<CampaignIcon />}
            color={threatFlowTheme.colors.status.warning.text}
            trend={-3}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricsCard
            title="IOC Watchlists"
            value={watchlists.length}
            subtitle={`${watchlists.reduce((sum, w) => sum + w.total_indicators, 0)} indicators`}
            icon={<WatchIcon />}
            color={threatFlowTheme.colors.accent.secure}
            trend={12}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricsCard
            title="Matches Today"
            value={watchlists.reduce((sum, w) => sum + w.metrics.matches_last_24h, 0)}
            subtitle="IOC detections"
            icon={<SecurityIcon />}
            color={threatFlowTheme.colors.status.success.text}
            trend={-15}
          />
        </Grid>
      </Grid>

      {/* Main Content Tabs */}
      <Paper>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={selectedTab} onChange={(_, newValue) => setSelectedTab(newValue)}>
            <Tab icon={<ActorIcon />} label="Threat Actors" />
            <Tab icon={<CampaignIcon />} label="Campaigns" />
            <Tab icon={<WatchIcon />} label="IOC Watchlists" />
            <Tab icon={<FeedIcon />} label="Feed Management" />
            <Tab icon={<AttributionIcon />} label="Attribution" />
            <Tab icon={<AnalyticsIcon />} label="Analytics" />
          </Tabs>
        </Box>

        <TabPanel value={selectedTab} index={0}>
          {/* Threat Actors Tab */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
              <FilterIcon sx={{ color: threatFlowTheme.colors.text.tertiary }} />
              
              <TextField
                size="small"
                placeholder="Search threat actors..."
                value={filters.searchTerm}
                onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ color: threatFlowTheme.colors.text.tertiary, mr: 1 }} />
                }}
                sx={{ minWidth: 200 }}
              />

              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Type</InputLabel>
                <Select
                  multiple
                  value={filters.threatLevel}
                  onChange={(e) => setFilters(prev => ({ ...prev, threatLevel: e.target.value as string[] }))}
                >
                  <MenuItem value="nation_state">Nation State</MenuItem>
                  <MenuItem value="criminal_group">Criminal Group</MenuItem>
                  <MenuItem value="hacktivist">Hacktivist</MenuItem>
                  <MenuItem value="insider_threat">Insider Threat</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Sophistication</InputLabel>
                <Select
                  multiple
                  value={filters.confidence}
                  onChange={(e) => setFilters(prev => ({ ...prev, confidence: e.target.value as string[] }))}
                >
                  <MenuItem value="expert">Expert</MenuItem>
                  <MenuItem value="advanced">Advanced</MenuItem>
                  <MenuItem value="intermediate">Intermediate</MenuItem>
                  <MenuItem value="basic">Basic</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>

          {loading && <LinearProgress sx={{ mb: 2 }} />}

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Actor</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Sophistication</TableCell>
                  <TableCell>Attribution</TableCell>
                  <TableCell>Threat Score</TableCell>
                  <TableCell>Last Activity</TableCell>
                  <TableCell>Campaigns</TableCell>
                  {showActions && <TableCell>Actions</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {threatActors.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((actor) => (
                  <TableRow 
                    key={actor.id}
                    hover
                    onClick={() => onActorSelect?.(actor)}
                    sx={{ cursor: onActorSelect ? 'pointer' : 'default' }}
                  >
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                          {actor.name}
                        </Typography>
                        {actor.aliases.length > 0 && (
                          <Typography variant="body2" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
                            aka: {actor.aliases.slice(0, 2).join(', ')}
                            {actor.aliases.length > 2 && ` +${actor.aliases.length - 2} more`}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={actor.type.replace('_', ' ').toUpperCase()}
                        size="small"
                        sx={{
                          bgcolor: `${getSeverityColor(actor.type)}20`,
                          color: getSeverityColor(actor.type)
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={actor.sophistication.toUpperCase()}
                        size="small"
                        variant="outlined"
                        sx={{ color: getConfidenceColor(actor.threatScore) }}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={actor.attribution.confidence * 100}
                          sx={{ 
                            width: 60, 
                            height: 8, 
                            borderRadius: 4,
                            '& .MuiLinearProgress-bar': {
                              bgcolor: getConfidenceColor(actor.attribution.confidence)
                            }
                          }}
                        />
                        <Typography variant="body2">
                          {Math.round(actor.attribution.confidence * 100)}%
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={actor.threatScore * 100}
                          sx={{ 
                            width: 60, 
                            height: 8, 
                            borderRadius: 4,
                            '& .MuiLinearProgress-bar': {
                              bgcolor: getSeverityColor('high')
                            }
                          }}
                        />
                        <Typography variant="body2">
                          {Math.round(actor.threatScore * 100)}%
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(actor.lastSeen).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Badge badgeContent={actor.campaigns.length} color="primary">
                        <CampaignIcon sx={{ color: threatFlowTheme.colors.text.tertiary }} />
                      </Badge>
                    </TableCell>
                    {showActions && (
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="View Profile">
                            <IconButton size="small">
                              <PersonIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Attribution Analysis">
                            <IconButton size="small">
                              <AttributionIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Related Campaigns">
                            <IconButton size="small">
                              <CampaignIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          <TablePagination
            rowsPerPageOptions={[10, 25, 50]}
            component="div"
            count={threatActors.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            onRowsPerPageChange={(event) => {
              setRowsPerPage(parseInt(event.target.value, 10));
              setPage(0);
            }}
          />
        </TabPanel>

        <TabPanel value={selectedTab} index={1}>
          {/* Campaigns Tab */}
          <Typography variant="h6" sx={{ mb: 2 }}>Active Threat Campaigns</Typography>
          
          {campaigns.map((campaign) => (
            <Card key={campaign.id} sx={{ mb: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                      {campaign.name}
                    </Typography>
                    <Typography variant="body2" sx={{ color: threatFlowTheme.colors.text.tertiary, mb: 2 }}>
                      {campaign.description}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {campaign.aliases.map((alias, index) => (
                        <Chip key={index} label={alias} size="small" variant="outlined" />
                      ))}
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                    <Chip
                      label={campaign.status.toUpperCase()}
                      size="small"
                      sx={{
                        bgcolor: `${getSeverityColor(campaign.status)}20`,
                        color: getSeverityColor(campaign.status)
                      }}
                    />
                    <Typography variant="caption" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
                      Confidence: {Math.round(campaign.confidence * 100)}%
                    </Typography>
                  </Box>
                </Box>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                      Attribution
                    </Typography>
                    {campaign.actors.map((actor, index) => (
                      <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <PersonIcon sx={{ fontSize: 16 }} />
                        <Typography variant="body2">{actor.name}</Typography>
                        <Chip 
                          label={`${Math.round(actor.confidence * 100)}%`}
                          size="small"
                          sx={{ 
                            bgcolor: `${getConfidenceColor(actor.confidence)}20`,
                            color: getConfidenceColor(actor.confidence)
                          }}
                        />
                      </Box>
                    ))}
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                      Impact & Scope
                    </Typography>
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="body2">
                        Severity: <strong>{campaign.impact.overall_severity}</strong>
                      </Typography>
                      <Typography variant="body2">
                        Scope: <strong>{campaign.impact.scope}</strong>
                      </Typography>
                      <Typography variant="body2">
                        Duration: <strong>{campaign.duration} days</strong>
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
              {showActions && (
                <CardActions>
                  <Button size="small" startIcon={<TimelineIcon />}>
                    View Timeline
                  </Button>
                  <Button size="small" startIcon={<AnalyticsIcon />}>
                    Analyze TTPs
                  </Button>
                  <Button size="small" startIcon={<MapIcon />}>
                    Attribution
                  </Button>
                </CardActions>
              )}
            </Card>
          ))}
        </TabPanel>

        <TabPanel value={selectedTab} index={2}>
          {/* IOC Watchlists Tab */}
          <Typography variant="h6" sx={{ mb: 2 }}>IOC Watchlists</Typography>
          
          {watchlists.map((watchlist) => (
            <Card key={watchlist.id} sx={{ mb: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                      {watchlist.name}
                    </Typography>
                    <Typography variant="body2" sx={{ color: threatFlowTheme.colors.text.tertiary, mb: 2 }}>
                      {watchlist.description}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Chip 
                        label={watchlist.purpose.replace('_', ' ').toUpperCase()}
                        size="small"
                        variant="outlined"
                      />
                      <Chip 
                        label={watchlist.priority.toUpperCase()}
                        size="small"
                        sx={{
                          bgcolor: `${getSeverityColor(watchlist.priority)}20`,
                          color: getSeverityColor(watchlist.priority)
                        }}
                      />
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                    <Chip
                      label={watchlist.status.toUpperCase()}
                      size="small"
                      sx={{
                        bgcolor: watchlist.status === 'active' 
                          ? `${threatFlowTheme.colors.status.success.text}20`
                          : `${threatFlowTheme.colors.text.tertiary}20`,
                        color: watchlist.status === 'active' 
                          ? threatFlowTheme.colors.status.success.text
                          : threatFlowTheme.colors.text.tertiary
                      }}
                    />
                    <Typography variant="caption" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
                      Updated: {new Date(watchlist.updated_at).toLocaleDateString()}
                    </Typography>
                  </Box>
                </Box>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                      Indicators
                    </Typography>
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="body2">
                        Total: <strong>{watchlist.total_indicators}</strong>
                      </Typography>
                      <Typography variant="body2">
                        Active: <strong>{watchlist.active_indicators}</strong>
                      </Typography>
                      <Typography variant="body2">
                        Expired: <strong>{watchlist.expired_indicators}</strong>
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                      Matches
                    </Typography>
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="body2">
                        Today: <strong>{watchlist.metrics.matches_last_24h}</strong>
                      </Typography>
                      <Typography variant="body2">
                        This Week: <strong>{watchlist.metrics.matches_last_7d}</strong>
                      </Typography>
                      <Typography variant="body2">
                        This Month: <strong>{watchlist.metrics.matches_last_30d}</strong>
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                      Performance
                    </Typography>
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="body2">
                        False Positive Rate: <strong>{Math.round(watchlist.metrics.false_positive_rate * 100)}%</strong>
                      </Typography>
                      <Typography variant="body2">
                        Coverage: <strong>{Math.round(watchlist.metrics.monitoring_coverage * 100)}%</strong>
                      </Typography>
                      <Typography variant="body2">
                        Avg Detection: <strong>{watchlist.metrics.avg_detection_time}s</strong>
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
              {showActions && (
                <CardActions>
                  <Button size="small" startIcon={<WatchIcon />}>
                    View IOCs
                  </Button>
                  <Button size="small" startIcon={<AnalyticsIcon />}>
                    Analytics
                  </Button>
                  <Button size="small" startIcon={<EditIcon />}>
                    Configure
                  </Button>
                </CardActions>
              )}
            </Card>
          ))}
        </TabPanel>

        <TabPanel value={selectedTab} index={3}>
          {/* Feed Management Tab */}
          <Typography variant="h6" sx={{ mb: 2 }}>Threat Intelligence Feeds</Typography>
          <MuiAlert severity="info" sx={{ mb: 2 }}>
            Feed management interface for configuring and monitoring external threat intelligence sources.
          </MuiAlert>
        </TabPanel>

        <TabPanel value={selectedTab} index={4}>
          {/* Attribution Tab */}
          <Typography variant="h6" sx={{ mb: 2 }}>ML-Assisted Attribution Analysis</Typography>
          <MuiAlert severity="info" sx={{ mb: 2 }}>
            Advanced attribution analysis using machine learning models to identify threat actor patterns and correlations.
          </MuiAlert>
        </TabPanel>

        <TabPanel value={selectedTab} index={5}>
          {/* Analytics Tab */}
          <Typography variant="h6" sx={{ mb: 2 }}>Threat Intelligence Analytics</Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>Campaign Trends</Typography>
                <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography variant="body2" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
                    Campaign analytics visualization would be implemented here
                  </Typography>
                </Box>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>Actor Attribution</Typography>
                <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography variant="body2" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
                    Attribution confidence visualization would be implemented here
                  </Typography>
                </Box>
              </Paper>
            </Grid>
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>IOC Match Trends</Typography>
                <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography variant="body2" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
                    IOC detection trends would be visualized here
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>
      </Paper>

      {/* Floating Action Button */}
      {showActions && (
        <Fab
          color="primary"
          aria-label="add intelligence"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
        >
          <AddIcon />
        </Fab>
      )}
    </Box>
  );
};