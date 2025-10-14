import {
  AutoAwesome as AutoAwesomeIcon,
  CloudUpload as CloudUploadIcon,
  Warning as WarningIcon,
  Dashboard as DashboardIcon,
  Search as SearchIcon,
  Public as PublicIcon,
  Business as BusinessIcon,
  Psychology as PsychologyIcon,
  TrendingUp as TrendingUpIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Info as InfoIcon,
  ArrowForward as ArrowForwardIcon,
  Lightbulb as LightbulbIcon,
  Timeline as TimelineIcon,
} from '@mui/icons-material';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  LinearProgress,
  Divider,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  alpha,
} from '@mui/material';
import React from 'react';
import { useNavigate } from 'react-router-dom';

import { useThemeContext } from '../../../shared/context/ThemeProvider';

interface FeatureCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  phase: string;
  status: 'ready' | 'beta' | 'coming-soon';
  stats?: { label: string; value: string | number }[];
  href: string;
  badge?: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({
  title,
  description,
  icon,
  phase,
  status,
  stats,
  href,
  badge,
}) => {
  const { theme } = useThemeContext();
  const navigate = useNavigate();

  const statusConfig = {
    ready: { label: 'Ready', color: theme.colors.accent.secure, bg: 'rgba(34, 197, 94, 0.1)' },
    beta: { label: 'Beta', color: theme.colors.status.warning.accent, bg: 'rgba(251, 146, 60, 0.1)' },
    'coming-soon': { label: 'Coming Soon', color: theme.colors.text.tertiary, bg: theme.colors.surface.rest },
  };

  return (
    <Card
      sx={{
        height: '100%',
        background: `${theme.colors.background.glassLight}`,
        backdropFilter: theme.effects.blur.md,
        border: `1px solid ${theme.colors.surface.border.default}`,
        borderRadius: theme.borderRadius.lg,
        transition: theme.motion.normal,
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: theme.effects.gradients.brand,
          opacity: 0,
          transition: theme.motion.normal,
        },
        '&:hover': {
          borderColor: theme.colors.brand.primary,
          boxShadow: `${theme.effects.shadows.lg}, 0 0 20px ${theme.colors.brand.primary}20`,
          transform: 'translateY(-4px)',
          '&::before': {
            opacity: 1,
          },
        },
      }}
      onClick={() => navigate(href)}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: theme.borderRadius.md,
              background: `${alpha(theme.colors.brand.primary, 0.1)}`,
              border: `1px solid ${alpha(theme.colors.brand.primary, 0.2)}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: theme.colors.brand.primary,
            }}
          >
            {icon}
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexDirection: 'column', alignItems: 'flex-end' }}>
            <Chip
              label={phase}
              size="small"
              sx={{
                height: 20,
                fontSize: theme.typography.fontSize.xs,
                fontWeight: theme.typography.fontWeight.semibold,
                backgroundColor: alpha(theme.colors.brand.primary, 0.15),
                color: theme.colors.brand.primary,
                border: `1px solid ${alpha(theme.colors.brand.primary, 0.3)}`,
              }}
            />
            <Chip
              label={statusConfig[status].label}
              size="small"
              sx={{
                height: 20,
                fontSize: theme.typography.fontSize.xs,
                fontWeight: theme.typography.fontWeight.semibold,
                backgroundColor: statusConfig[status].bg,
                color: statusConfig[status].color,
                border: `1px solid ${alpha(statusConfig[status].color, 0.3)}`,
              }}
            />
          </Box>
        </Box>

        <Typography
          variant="h6"
          sx={{
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.text.primary,
            mb: 1,
            fontSize: theme.typography.fontSize.lg,
          }}
        >
          {title}
        </Typography>

        <Typography
          variant="body2"
          sx={{
            color: theme.colors.text.secondary,
            mb: 2,
            fontSize: theme.typography.fontSize.sm,
            lineHeight: 1.6,
          }}
        >
          {description}
        </Typography>

        {stats && stats.length > 0 && (
          <>
            <Divider sx={{ my: 2, borderColor: theme.colors.surface.border.subtle }} />
            <Box sx={{ display: 'flex', gap: 3 }}>
              {stats.map((stat, index) => (
                <Box key={index}>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: theme.typography.fontWeight.bold,
                      color: theme.colors.brand.primary,
                      fontSize: theme.typography.fontSize.xl,
                    }}
                  >
                    {stat.value}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: theme.colors.text.tertiary,
                      fontSize: theme.typography.fontSize.xs,
                      textTransform: 'uppercase',
                      letterSpacing: theme.typography.letterSpacing.wide,
                    }}
                  >
                    {stat.label}
                  </Typography>
                </Box>
              ))}
            </Box>
          </>
        )}

        <Button
          variant="text"
          endIcon={<ArrowForwardIcon />}
          sx={{
            mt: 2,
            color: theme.colors.brand.primary,
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.semibold,
            '&:hover': {
              backgroundColor: alpha(theme.colors.brand.primary, 0.05),
            },
          }}
          fullWidth
        >
          Explore {title}
        </Button>
      </CardContent>
    </Card>
  );
};

export const FeatureHubDashboard: React.FC = () => {
  const { theme } = useThemeContext();

  const features: FeatureCardProps[] = [
    {
      title: 'Playbook Generation',
      description: 'AI-powered incident response automation with SOAR integration',
      icon: <AutoAwesomeIcon sx={{ fontSize: 24 }} />,
      phase: 'Phase 1',
      status: 'ready',
      stats: [
        { label: 'Playbooks', value: 45 },
        { label: 'Active', value: 12 },
      ],
      href: '/playbooks',
    },
    {
      title: 'IOC Enrichment',
      description: 'Multi-provider threat intelligence enrichment with 10+ sources',
      icon: <CloudUploadIcon sx={{ fontSize: 24 }} />,
      phase: 'Phase 2',
      status: 'ready',
      stats: [
        { label: 'Enriched', value: '1.2K' },
        { label: 'Sources', value: 12 },
      ],
      href: '/enrichment',
    },
    {
      title: 'Alert & Incident Management',
      description: 'SIEM integration with intelligent alert correlation and triage',
      icon: <WarningIcon sx={{ fontSize: 24 }} />,
      phase: 'Phase 3',
      status: 'ready',
      stats: [
        { label: 'Alerts', value: 245 },
        { label: 'Critical', value: 8 },
      ],
      href: '/alerts/triage',
    },
    {
      title: 'SOC Operations',
      description: 'Real-time SOC dashboard with team performance analytics',
      icon: <DashboardIcon sx={{ fontSize: 24 }} />,
      phase: 'Phase 4',
      status: 'ready',
      stats: [
        { label: 'MTTD', value: '12m' },
        { label: 'MTTR', value: '45m' },
      ],
      href: '/soc',
    },
    {
      title: 'Investigation & Cases',
      description: 'Comprehensive case management with evidence chain tracking',
      icon: <SearchIcon sx={{ fontSize: 24 }} />,
      phase: 'Phase 5',
      status: 'ready',
      stats: [
        { label: 'Active', value: 23 },
        { label: 'Closed', value: 187 },
      ],
      href: '/investigations',
    },
    {
      title: 'Threat Intelligence',
      description: 'STIX/TAXII, MISP integration with community intelligence sharing',
      icon: <PublicIcon sx={{ fontSize: 24 }} />,
      phase: 'Phase 6',
      status: 'ready',
      stats: [
        { label: 'Feeds', value: 8 },
        { label: 'Shared', value: 342 },
      ],
      href: '/intel/feeds',
    },
    {
      title: 'Enterprise Management',
      description: 'Multi-tenancy, RBAC, SSO, audit logs, and compliance reporting',
      icon: <BusinessIcon sx={{ fontSize: 24 }} />,
      phase: 'Phase 7',
      status: 'ready',
      stats: [
        { label: 'Users', value: 48 },
        { label: 'Orgs', value: 3 },
      ],
      href: '/enterprise/organization',
    },
    {
      title: 'ML & AI Insights',
      description: 'Anomaly detection, threat predictions, and intelligent recommendations',
      icon: <PsychologyIcon sx={{ fontSize: 24 }} />,
      phase: 'Phase 8',
      status: 'beta',
      badge: 'NEW',
      stats: [
        { label: 'Anomalies', value: 12 },
        { label: 'Predictions', value: 34 },
      ],
      href: '/ml/anomalies',
    },
  ];

  const recentActivity = [
    {
      icon: <CheckCircleIcon sx={{ color: theme.colors.accent.secure }} />,
      title: 'Playbook Generated',
      description: 'Ransomware Response Playbook created',
      time: '5 min ago',
    },
    {
      icon: <WarningIcon sx={{ color: theme.colors.status.warning.accent }} />,
      title: 'High Severity Alert',
      description: 'Suspicious PowerShell execution detected',
      time: '12 min ago',
    },
    {
      icon: <TrendingUpIcon sx={{ color: theme.colors.brand.primary }} />,
      title: 'IOCs Enriched',
      description: '45 indicators enriched from VirusTotal',
      time: '23 min ago',
    },
    {
      icon: <LightbulbIcon sx={{ color: theme.colors.accent.highlight }} />,
      title: 'ML Recommendation',
      description: 'Similar case detected with 87% similarity',
      time: '1 hour ago',
    },
  ];

  return (
    <Box sx={{ p: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h4"
          sx={{
            fontFamily: theme.typography.fontFamily.display,
            fontWeight: theme.typography.fontWeight.black,
            color: theme.colors.text.primary,
            mb: 1,
            background: theme.effects.gradients.brand,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          ThreatFlow Feature Hub
        </Typography>
        <Typography
          variant="body1"
          sx={{
            color: theme.colors.text.secondary,
            fontSize: theme.typography.fontSize.md,
          }}
        >
          Comprehensive threat intelligence platform with 8 phases of advanced capabilities
        </Typography>
      </Box>

      {/* Quick Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            sx={{
              p: 3,
              background: theme.colors.background.glassLight,
              backdropFilter: theme.effects.blur.md,
              border: `1px solid ${theme.colors.surface.border.default}`,
              borderRadius: theme.borderRadius.lg,
            }}
          >
            <Typography
              variant="h3"
              sx={{
                fontWeight: theme.typography.fontWeight.bold,
                color: theme.colors.brand.primary,
                mb: 1,
              }}
            >
              8
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: theme.colors.text.secondary,
                fontSize: theme.typography.fontSize.sm,
              }}
            >
              Feature Phases
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            sx={{
              p: 3,
              background: theme.colors.background.glassLight,
              backdropFilter: theme.effects.blur.md,
              border: `1px solid ${theme.colors.surface.border.default}`,
              borderRadius: theme.borderRadius.lg,
            }}
          >
            <Typography
              variant="h3"
              sx={{
                fontWeight: theme.typography.fontWeight.bold,
                color: theme.colors.accent.secure,
                mb: 1,
              }}
            >
              245
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: theme.colors.text.secondary,
                fontSize: theme.typography.fontSize.sm,
              }}
            >
              Active Alerts
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            sx={{
              p: 3,
              background: theme.colors.background.glassLight,
              backdropFilter: theme.effects.blur.md,
              border: `1px solid ${theme.colors.surface.border.default}`,
              borderRadius: theme.borderRadius.lg,
            }}
          >
            <Typography
              variant="h3"
              sx={{
                fontWeight: theme.typography.fontWeight.bold,
                color: theme.colors.status.warning.accent,
                mb: 1,
              }}
            >
              1.2K
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: theme.colors.text.secondary,
                fontSize: theme.typography.fontSize.sm,
              }}
            >
              IOCs Enriched
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            sx={{
              p: 3,
              background: theme.colors.background.glassLight,
              backdropFilter: theme.effects.blur.md,
              border: `1px solid ${theme.colors.surface.border.default}`,
              borderRadius: theme.borderRadius.lg,
            }}
          >
            <Typography
              variant="h3"
              sx={{
                fontWeight: theme.typography.fontWeight.bold,
                color: theme.colors.accent.highlight,
                mb: 1,
              }}
            >
              23
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: theme.colors.text.secondary,
                fontSize: theme.typography.fontSize.sm,
              }}
            >
              Active Investigations
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Feature Cards Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {features.map((feature, index) => (
          <Grid item xs={12} sm={6} lg={3} key={index}>
            <FeatureCard {...feature} />
          </Grid>
        ))}
      </Grid>

      {/* Recent Activity */}
      <Paper
        sx={{
          p: 3,
          background: theme.colors.background.glassLight,
          backdropFilter: theme.effects.blur.md,
          border: `1px solid ${theme.colors.surface.border.default}`,
          borderRadius: theme.borderRadius.lg,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.text.primary,
            }}
          >
            Recent Activity
          </Typography>
          <Chip
            icon={<TimelineIcon sx={{ fontSize: 16 }} />}
            label="Live"
            size="small"
            sx={{
              backgroundColor: alpha(theme.colors.accent.secure, 0.15),
              color: theme.colors.accent.secure,
              fontWeight: theme.typography.fontWeight.semibold,
              fontSize: theme.typography.fontSize.xs,
            }}
          />
        </Box>

        <List sx={{ p: 0 }}>
          {recentActivity.map((activity, index) => (
            <React.Fragment key={index}>
              <ListItem
                sx={{
                  px: 0,
                  py: 2,
                  '&:hover': {
                    backgroundColor: alpha(theme.colors.brand.primary, 0.05),
                    borderRadius: theme.borderRadius.md,
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>{activity.icon}</ListItemIcon>
                <ListItemText
                  primary={
                    <Typography
                      sx={{
                        fontWeight: theme.typography.fontWeight.semibold,
                        color: theme.colors.text.primary,
                        fontSize: theme.typography.fontSize.sm,
                      }}
                    >
                      {activity.title}
                    </Typography>
                  }
                  secondary={
                    <Typography
                      sx={{
                        color: theme.colors.text.secondary,
                        fontSize: theme.typography.fontSize.xs,
                      }}
                    >
                      {activity.description}
                    </Typography>
                  }
                />
                <Typography
                  sx={{
                    color: theme.colors.text.tertiary,
                    fontSize: theme.typography.fontSize.xs,
                    fontFamily: theme.typography.fontFamily.mono,
                  }}
                >
                  {activity.time}
                </Typography>
              </ListItem>
              {index < recentActivity.length - 1 && (
                <Divider sx={{ borderColor: theme.colors.surface.border.subtle }} />
              )}
            </React.Fragment>
          ))}
        </List>
      </Paper>
    </Box>
  );
};

export default FeatureHubDashboard;
