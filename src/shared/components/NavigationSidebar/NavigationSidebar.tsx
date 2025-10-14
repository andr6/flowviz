import {
  Dashboard as DashboardIcon,
  Security as SecurityIcon,
  Search as SearchIcon,
  Timeline as TimelineIcon,
  Assessment as AssessmentIcon,
  Storage as StorageIcon,
  Settings as SettingsIcon,
  People as PeopleIcon,
  TrendingUp as TrendingUpIcon,
  BugReport as BugReportIcon,
  Shield as ShieldIcon,
  Analytics as AnalyticsIcon,
  History as HistoryIcon,
  Bookmark as BookmarkIcon,
  CloudUpload as CloudUploadIcon,
  Download as DownloadIcon,
  Add as AddIcon,
  FolderOpen as FolderOpenIcon,
  Save as SaveIcon,
  Home as HomeIcon,
  ChevronRight as ChevronRightIcon,
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
  Circle as CircleIcon,
  AutoAwesome as AutoAwesomeIcon,
  LibraryBooks as LibraryBooksIcon,
  Integration as IntegrationInstructionsIcon,
  Psychology as PsychologyIcon,
  Warning as WarningIcon,
  Recommend as RecommendIcon,
  Business as BusinessIcon,
  Domain as DomainIcon,
  Payment as PaymentIcon,
  Public as PublicIcon,
  Share as ShareIcon,
  Rss as RssIcon,
  Extension as ExtensionIcon,
  EmojiObjects as EmojiObjectsIcon,
  Speed as SpeedIcon,
  ModelTraining as ModelTrainingIcon,
  Insights as InsightsIcon,
} from '@mui/icons-material';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Tooltip,
  Collapse,
  Badge,
  Divider,
  Paper,
  IconButton,
} from '@mui/material';
import React, { useState } from 'react';

import { useThemeContext } from '../../context/ThemeProvider';

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
  href?: string;
  badge?: string | number;
  disabled?: boolean;
  children?: NavigationItem[];
  category?: string;
}

interface NavigationSidebarProps {
  collapsed?: boolean;
  onNavigate?: (item: NavigationItem) => void;
  currentPath?: string;
  // Analysis State
  hasActiveAnalysis?: boolean;
  recentFlowsCount?: number;
  savedFlowsCount?: number;
  // Action Handlers
  onNewAnalysis?: () => void;
  onSaveAnalysis?: () => void;
  onLoadAnalysis?: () => void;
  onExportAnalysis?: () => void;
  onSettings?: () => void;
}

export const NavigationSidebar: React.FC<NavigationSidebarProps> = ({
  collapsed = false,
  onNavigate,
  currentPath = '',
  hasActiveAnalysis = false,
  recentFlowsCount = 0,
  savedFlowsCount = 0,
  onNewAnalysis,
  onSaveAnalysis,
  onLoadAnalysis,
  onExportAnalysis,
  onSettings,
}) => {
  const { theme } = useThemeContext();
  const [expandedSections, setExpandedSections] = useState<string[]>([
    'quick-actions',
    'analysis',
    'playbook',
    'ml-ai'
  ]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const navigationItems: NavigationItem[] = [
    // Home / Dashboard
    {
      id: 'home',
      label: 'Home',
      icon: <HomeIcon />,
      href: '/',
    },

    // Quick Actions Section
    {
      id: 'quick-actions',
      label: 'Quick Actions',
      icon: <SpeedIcon />,
      category: 'section',
      children: [
        {
          id: 'new-analysis',
          label: 'New Analysis',
          icon: <AddIcon />,
          onClick: onNewAnalysis,
        },
        {
          id: 'save-analysis',
          label: 'Save Analysis',
          icon: <SaveIcon />,
          onClick: onSaveAnalysis,
          disabled: !hasActiveAnalysis,
        },
        {
          id: 'load-analysis',
          label: 'Load Analysis',
          icon: <FolderOpenIcon />,
          onClick: onLoadAnalysis,
          badge: savedFlowsCount > 0 ? savedFlowsCount : undefined,
        },
        {
          id: 'export-analysis',
          label: 'Export Analysis',
          icon: <DownloadIcon />,
          onClick: onExportAnalysis,
          disabled: !hasActiveAnalysis,
        },
      ],
    },

    // Analysis Tools Section
    {
      id: 'analysis',
      label: 'Analysis & Detection',
      icon: <SecurityIcon />,
      category: 'section',
      children: [
        {
          id: 'threat-analysis',
          label: 'Threat Analysis',
          icon: <SearchIcon />,
          href: '/',
        },
        {
          id: 'ioc-analysis',
          label: 'IOC Analysis',
          icon: <BugReportIcon />,
          href: '/ioc-analysis',
        },
        {
          id: 'flow-visualization',
          label: 'Flow Visualization',
          icon: <TimelineIcon />,
          href: '/flow-visualization',
        },
        {
          id: 'attack-patterns',
          label: 'Attack Patterns',
          icon: <ShieldIcon />,
          href: '/attack-patterns',
        },
      ],
    },

    // Phase 1: Playbook & Automation
    {
      id: 'playbook',
      label: 'Playbook & Automation',
      icon: <AutoAwesomeIcon />,
      category: 'section',
      badge: 'Phase 1',
      children: [
        {
          id: 'playbook-generator',
          label: 'Playbook Generator',
          icon: <AutoAwesomeIcon />,
          href: '/playbooks/new',
        },
        {
          id: 'playbook-library',
          label: 'Playbook Library',
          icon: <LibraryBooksIcon />,
          href: '/playbooks',
        },
        {
          id: 'soar-integration',
          label: 'SOAR Integration',
          icon: <IntegrationInstructionsIcon />,
          href: '/playbooks/soar',
        },
        {
          id: 'workflow-automation',
          label: 'Workflow Automation',
          icon: <ExtensionIcon />,
          href: '/playbooks/workflows',
        },
      ],
    },

    // Phase 2: IOC Enrichment
    {
      id: 'enrichment',
      label: 'IOC Enrichment',
      icon: <CloudUploadIcon />,
      category: 'section',
      badge: 'Phase 2',
      children: [
        {
          id: 'enrichment-dashboard',
          label: 'Enrichment Dashboard',
          icon: <DashboardIcon />,
          href: '/enrichment',
        },
        {
          id: 'provider-config',
          label: 'Provider Configuration',
          icon: <SettingsIcon />,
          href: '/enrichment/providers',
        },
        {
          id: 'enrichment-history',
          label: 'Enrichment History',
          icon: <HistoryIcon />,
          href: '/enrichment/history',
        },
        {
          id: 'provider-health',
          label: 'Provider Health',
          icon: <AnalyticsIcon />,
          href: '/enrichment/health',
        },
      ],
    },

    // Phase 3: Alert & Incident Management
    {
      id: 'alerts',
      label: 'Alert & Incident Mgmt',
      icon: <WarningIcon />,
      category: 'section',
      badge: 'Phase 3',
      children: [
        {
          id: 'alert-triage',
          label: 'Alert Triage',
          icon: <AssessmentIcon />,
          href: '/alerts/triage',
        },
        {
          id: 'siem-integration',
          label: 'SIEM Integration',
          icon: <IntegrationInstructionsIcon />,
          href: '/alerts/siem',
        },
        {
          id: 'alert-correlation',
          label: 'Alert Correlation',
          icon: <TimelineIcon />,
          href: '/alerts/correlation',
        },
        {
          id: 'incident-response',
          label: 'Incident Response',
          icon: <SecurityIcon />,
          href: '/alerts/response',
        },
      ],
    },

    // Phase 4: SOC Operations
    {
      id: 'soc',
      label: 'SOC Operations',
      icon: <DashboardIcon />,
      category: 'section',
      badge: 'Phase 4',
      children: [
        {
          id: 'soc-dashboard',
          label: 'SOC Dashboard',
          icon: <DashboardIcon />,
          href: '/soc',
        },
        {
          id: 'team-performance',
          label: 'Team Performance',
          icon: <PeopleIcon />,
          href: '/soc/performance',
        },
        {
          id: 'metrics-analytics',
          label: 'Metrics & Analytics',
          icon: <AnalyticsIcon />,
          href: '/soc/metrics',
        },
        {
          id: 'operational-reports',
          label: 'Operational Reports',
          icon: <AssessmentIcon />,
          href: '/soc/reports',
        },
      ],
    },

    // Phase 5: Investigation & Cases
    {
      id: 'investigations',
      label: 'Investigation & Cases',
      icon: <SearchIcon />,
      category: 'section',
      badge: 'Phase 5',
      children: [
        {
          id: 'investigation-workspace',
          label: 'Investigation Workspace',
          icon: <SearchIcon />,
          href: '/investigations',
        },
        {
          id: 'case-management',
          label: 'Case Management',
          icon: <FolderOpenIcon />,
          href: '/cases',
        },
        {
          id: 'evidence-management',
          label: 'Evidence Management',
          icon: <StorageIcon />,
          href: '/evidence',
        },
        {
          id: 'collaboration',
          label: 'Collaboration',
          icon: <PeopleIcon />,
          href: '/collaboration',
        },
      ],
    },

    // Phase 6: Threat Intelligence
    {
      id: 'threat-intel',
      label: 'Threat Intelligence',
      icon: <PublicIcon />,
      category: 'section',
      badge: 'Phase 6',
      children: [
        {
          id: 'stix-taxii',
          label: 'STIX/TAXII Management',
          icon: <IntegrationInstructionsIcon />,
          href: '/intel/stix-taxii',
        },
        {
          id: 'misp-integration',
          label: 'MISP Integration',
          icon: <ShareIcon />,
          href: '/intel/misp',
        },
        {
          id: 'feed-management',
          label: 'Feed Management',
          icon: <RssIcon />,
          href: '/intel/feeds',
        },
        {
          id: 'community-platform',
          label: 'Community Platform',
          icon: <PublicIcon />,
          href: '/intel/community',
        },
      ],
    },

    // Phase 8: ML & AI
    {
      id: 'ml-ai',
      label: 'ML & AI',
      icon: <PsychologyIcon />,
      category: 'section',
      badge: 'NEW',
      children: [
        {
          id: 'anomaly-detection',
          label: 'Anomaly Detection',
          icon: <WarningIcon />,
          href: '/ml/anomalies',
        },
        {
          id: 'threat-predictions',
          label: 'Threat Predictions',
          icon: <TrendingUpIcon />,
          href: '/ml/predictions',
        },
        {
          id: 'ioc-extraction',
          label: 'IOC Extraction',
          icon: <ExtensionIcon />,
          href: '/ml/extraction',
        },
        {
          id: 'recommendations',
          label: 'Recommendations',
          icon: <RecommendIcon />,
          href: '/ml/recommendations',
        },
        {
          id: 'pattern-recognition',
          label: 'Pattern Recognition',
          icon: <InsightsIcon />,
          href: '/ml/patterns',
        },
        {
          id: 'model-management',
          label: 'Model Management',
          icon: <ModelTrainingIcon />,
          href: '/ml/models',
        },
      ],
    },

    // Phase 7: Enterprise
    {
      id: 'enterprise',
      label: 'Enterprise',
      icon: <BusinessIcon />,
      category: 'section',
      badge: 'Phase 7',
      children: [
        {
          id: 'organization',
          label: 'Organization',
          icon: <DomainIcon />,
          href: '/enterprise/organization',
        },
        {
          id: 'users-roles',
          label: 'Users & Roles',
          icon: <PeopleIcon />,
          href: '/enterprise/users',
        },
        {
          id: 'subscriptions',
          label: 'Subscriptions',
          icon: <PaymentIcon />,
          href: '/enterprise/subscriptions',
        },
        {
          id: 'usage-quotas',
          label: 'Usage & Quotas',
          icon: <AnalyticsIcon />,
          href: '/enterprise/quotas',
        },
        {
          id: 'audit-logs',
          label: 'Audit Logs',
          icon: <HistoryIcon />,
          href: '/enterprise/audit',
        },
        {
          id: 'compliance-reports',
          label: 'Compliance Reports',
          icon: <AssessmentIcon />,
          href: '/enterprise/compliance',
        },
      ],
    },

    // Defense & Security Section
    {
      id: 'defense',
      label: 'Defense & Security',
      icon: <ShieldIcon />,
      category: 'section',
      children: [
        {
          id: 'd3fend-mapping',
          label: 'D3FEND Mapping',
          icon: <ShieldIcon />,
          href: '/d3fend-mapping',
        },
        {
          id: 'attack-simulation',
          label: 'Attack Simulation',
          icon: <SecurityIcon />,
          href: '/attack-simulation',
        },
        {
          id: 'purple-team',
          label: 'Purple Teaming',
          icon: <PeopleIcon />,
          href: '/purple-team',
        },
        {
          id: 'executive-reporting',
          label: 'Executive Reports',
          icon: <AnalyticsIcon />,
          href: '/executive-reporting',
        },
      ],
    },

    // History & Storage Section
    {
      id: 'storage',
      label: 'History & Storage',
      icon: <HistoryIcon />,
      category: 'section',
      children: [
        {
          id: 'recent-flows',
          label: 'Recent Flows',
          icon: <HistoryIcon />,
          href: '/recent-flows',
          badge: recentFlowsCount > 0 ? recentFlowsCount : undefined,
        },
        {
          id: 'saved-flows',
          label: 'Saved Flows',
          icon: <BookmarkIcon />,
          href: '/saved-flows',
          badge: savedFlowsCount > 0 ? savedFlowsCount : undefined,
        },
        {
          id: 'flow-storage',
          label: 'Flow Storage',
          icon: <StorageIcon />,
          href: '/flow-storage',
        },
      ],
    },
  ];

  const renderNavigationItem = (item: NavigationItem, level: number = 0) => {
    const isActive = currentPath === item.href || currentPath.startsWith(item.href || '');
    const isSection = item.category === 'section';
    const isExpanded = expandedSections.includes(item.id);
    const hasChildren = item.children && item.children.length > 0;

    if (isSection && collapsed) {
      return (
        <Tooltip key={item.id} title={item.label} placement="right">
          <ListItem disablePadding sx={{ mb: 1 }}>
            <ListItemButton
              onClick={() => hasChildren && toggleSection(item.id)}
              disabled={item.disabled}
              sx={{
                minHeight: 48,
                px: 2,
                py: 1,
                borderRadius: theme.borderRadius.lg,
                backgroundColor: isActive ? theme.colors.brand.lightMedium : 'transparent',
                color: isActive ? theme.colors.brand.primary : theme.colors.text.secondary,
                '&:hover': {
                  backgroundColor: theme.colors.surface.hover,
                  color: theme.colors.text.primary,
                },
                transition: theme.motion.normal,
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 40,
                  color: 'inherit',
                }}
              >
                {item.icon}
              </ListItemIcon>
            </ListItemButton>
          </ListItem>
        </Tooltip>
      );
    }

    if (isSection) {
      return (
        <Box key={item.id} sx={{ mb: 2 }}>
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => hasChildren && toggleSection(item.id)}
              sx={{
                py: 1.5,
                px: 2,
                borderRadius: theme.borderRadius.md,
                '&:hover': {
                  backgroundColor: theme.colors.surface.hover,
                },
                transition: theme.motion.normal,
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 36,
                  color: theme.colors.brand.primary,
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: theme.typography.fontWeight.semibold,
                      color: theme.colors.text.primary,
                      fontSize: theme.typography.fontSize.sm,
                      letterSpacing: theme.typography.letterSpacing.wide,
                      textTransform: 'uppercase',
                    }}
                  >
                    {item.label}
                  </Typography>
                }
              />
              {hasChildren && (
                <IconButton size="small" sx={{ color: theme.colors.text.tertiary }}>
                  {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
              )}
            </ListItemButton>
          </ListItem>
          
          {hasChildren && (
            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
              <List sx={{ pl: 1, pt: 0.5 }}>
                {item.children!.map(child => renderNavigationItem(child, level + 1))}
              </List>
            </Collapse>
          )}
        </Box>
      );
    }

    // Regular navigation item
    return (
      <ListItem key={item.id} disablePadding sx={{ mb: 0.5 }}>
        <Tooltip title={collapsed ? item.label : ''} placement="right">
          <ListItemButton
            onClick={() => {
              if (item.onClick) {
                item.onClick();
              }
              if (onNavigate) {
                onNavigate(item);
              }
            }}
            disabled={item.disabled}
            sx={{
              minHeight: 42,
              px: level > 0 ? 3 : 2,
              py: 1,
              borderRadius: theme.borderRadius.md,
              backgroundColor: isActive ? theme.colors.brand.lightMedium : 'transparent',
              color: isActive ? theme.colors.brand.primary : theme.colors.text.secondary,
              border: isActive ? `1px solid ${theme.colors.brand.primary}40` : '1px solid transparent',
              boxShadow: isActive ? `0 0 12px ${theme.colors.brand.primary}20` : 'none',
              '&:hover': {
                backgroundColor: isActive ? theme.colors.brand.lightMedium : theme.colors.surface.hover,
                color: theme.colors.text.primary,
                transform: 'translateX(2px)',
                boxShadow: isActive ? `0 0 16px ${theme.colors.brand.primary}30` : theme.effects.shadows.sm,
              },
              '&:disabled': {
                color: theme.colors.text.disabled,
                backgroundColor: 'transparent',
              },
              transition: theme.motion.normal,
              position: 'relative',
              overflow: 'hidden',
              // Active indicator
              ...(isActive && {
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: '3px',
                  backgroundColor: theme.colors.brand.primary,
                  borderRadius: '0 2px 2px 0',
                },
              }),
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: collapsed ? 24 : 36,
                color: 'inherit',
                mr: collapsed ? 0 : 1,
              }}
            >
              {level > 0 ? (
                <CircleIcon sx={{ fontSize: 8, opacity: 0.6 }} />
              ) : (
                item.icon
              )}
            </ListItemIcon>
            
            {!collapsed && (
              <>
                <ListItemText
                  primary={
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: isActive 
                          ? theme.typography.fontWeight.semibold 
                          : theme.typography.fontWeight.medium,
                        fontSize: theme.typography.fontSize.sm,
                      }}
                    >
                      {item.label}
                    </Typography>
                  }
                />
                
                {item.badge && (
                  <Badge
                    badgeContent={item.badge}
                    color="primary"
                    sx={{
                      '& .MuiBadge-badge': {
                        fontSize: '0.65rem',
                        height: 16,
                        minWidth: 16,
                        backgroundColor: theme.colors.brand.primary,
                        color: theme.colors.text.inverse,
                      },
                    }}
                  />
                )}
              </>
            )}
          </ListItemButton>
        </Tooltip>
      </ListItem>
    );
  };

  return (
    <Paper
      elevation={0}
      sx={{
        height: '100%',
        backgroundColor: theme.colors.background.secondary,
        borderRight: `1px solid ${theme.colors.surface.border.default}`,
        backdropFilter: theme.effects.blur.xl,
        position: 'relative',
        overflow: 'hidden',
        // Professional gradient overlay
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            linear-gradient(180deg, 
              ${theme.colors.brand.light} 0%, 
              transparent 10%, 
              transparent 90%, 
              ${theme.colors.brand.light} 100%
            )
          `,
          opacity: 0.3,
          pointerEvents: 'none',
        },
      }}
    >
      <Box sx={{ position: 'relative', zIndex: 1, height: '100%' }}>
        {/* Brand Section */}
        {!collapsed && (
          <Box
            sx={{
              p: 3,
              borderBottom: `1px solid ${theme.colors.surface.border.subtle}`,
              backgroundColor: theme.colors.background.glassLight,
              backdropFilter: theme.effects.blur.md,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: theme.borderRadius.md,
                  background: theme.effects.gradients.brand,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: theme.effects.shadows.brandGlow,
                }}
              >
                <SecurityIcon 
                  sx={{ 
                    fontSize: 18, 
                    color: theme.colors.text.primary,
                    filter: 'drop-shadow(0 0 4px rgba(255, 255, 255, 0.3))',
                  }} 
                />
              </Box>
              <Box>
                <Typography
                  variant="h6"
                  sx={{
                    fontFamily: theme.typography.fontFamily.display,
                    fontWeight: theme.typography.fontWeight.bold,
                    color: theme.colors.text.primary,
                    fontSize: theme.typography.fontSize.lg,
                    lineHeight: 1.2,
                  }}
                >
                  ThreatFlow
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: theme.colors.text.tertiary,
                    fontSize: theme.typography.fontSize.xs,
                    fontFamily: theme.typography.fontFamily.mono,
                    textTransform: 'uppercase',
                    letterSpacing: theme.typography.letterSpacing.wider,
                  }}
                >
                  Threat Intelligence
                </Typography>
              </Box>
            </Box>
          </Box>
        )}

        {/* Navigation Content */}
        <Box
          sx={{
            p: 2,
            overflowY: 'auto',
            height: collapsed ? '100%' : 'calc(100% - 100px)',
            '&::-webkit-scrollbar': {
              width: 6,
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: 'transparent',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: theme.colors.surface.border.default,
              borderRadius: 3,
              '&:hover': {
                backgroundColor: theme.colors.surface.border.emphasis,
              },
            },
          }}
        >
          <List sx={{ p: 0 }}>
            {navigationItems.map(item => renderNavigationItem(item))}
          </List>

          {/* Settings at bottom */}
          <Box sx={{ mt: 4, pt: 2, borderTop: `1px solid ${theme.colors.surface.border.subtle}` }}>
            <ListItem disablePadding>
              <Tooltip title={collapsed ? 'Settings' : ''} placement="right">
                <ListItemButton
                  onClick={onSettings}
                  sx={{
                    minHeight: 42,
                    px: 2,
                    py: 1,
                    borderRadius: theme.borderRadius.md,
                    color: theme.colors.text.secondary,
                    '&:hover': {
                      backgroundColor: theme.colors.surface.hover,
                      color: theme.colors.text.primary,
                    },
                    transition: theme.motion.normal,
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: collapsed ? 24 : 36,
                      color: 'inherit',
                    }}
                  >
                    <SettingsIcon />
                  </ListItemIcon>
                  {!collapsed && (
                    <ListItemText
                      primary={
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: theme.typography.fontWeight.medium,
                            fontSize: theme.typography.fontSize.sm,
                          }}
                        >
                          Settings
                        </Typography>
                      }
                    />
                  )}
                </ListItemButton>
              </Tooltip>
            </ListItem>
          </Box>
        </Box>
      </Box>
    </Paper>
  );
};

export default NavigationSidebar;