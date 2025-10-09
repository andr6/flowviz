import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Button,
  Chip,
  Grid,
  Alert,
  Card,
  CardContent
} from '@mui/material';
import {
  ExpandMore as ExpandIcon,
  AccountTree as FlowIcon,
  History as VersionIcon,
  Compare as CompareIcon,
  Merge as MergeIcon,
  Group as CollaborationIcon,
  Template as TemplateIcon,
  Analytics as AnalyticsIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { threatFlowTheme } from '../../../shared/theme/threatflow-theme';
import { FlowVersioning } from './FlowVersioning';
import { FlowComparisonComponent } from './FlowComparison';
import { FlowMerging } from './FlowMerging';
import { FlowCollaboration } from './FlowCollaboration';
import { FlowTemplates } from './FlowTemplates';

interface FlowManagementPanelProps {
  flowId: string;
  currentNodes: any[];
  currentEdges: any[];
  currentMetadata: any;
  onVersionRestore?: (version: any) => void;
  onFlowMerge?: (result: any) => void;
  onTemplateInstantiate?: (template: any, variables: Record<string, any>) => void;
  disabled?: boolean;
  compact?: boolean;
}

export const FlowManagementPanel: React.FC<FlowManagementPanelProps> = ({
  flowId,
  currentNodes,
  currentEdges,
  currentMetadata,
  onVersionRestore,
  onFlowMerge,
  onTemplateInstantiate,
  disabled = false,
  compact = false
}) => {
  const [activeSection, setActiveSection] = useState<string>('overview');

  const renderOverview = () => (
    <Box sx={{ p: 3 }}>
      <Alert severity="info" sx={{ mb: 3 }}>
        Flow Management provides comprehensive tools for versioning, collaboration, and reusability of your threat analysis workflows.
      </Alert>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <VersionIcon sx={{ color: threatFlowTheme.colors.brand.primary }} />
                <Typography variant="h6">Version Control</Typography>
              </Box>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Track changes and evolution of your threat analysis over time with comprehensive version history.
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setActiveSection('versioning')}
              >
                Manage Versions
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <CompareIcon sx={{ color: threatFlowTheme.colors.accent.secure }} />
                <Typography variant="h6">Flow Comparison</Typography>
              </Box>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Compare different versions or flows side-by-side to understand changes and evolution.
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setActiveSection('comparison')}
              >
                Compare Flows
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <MergeIcon sx={{ color: threatFlowTheme.colors.status.warning.text }} />
                <Typography variant="h6">Flow Merging</Typography>
              </Box>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Combine multiple related analyses into a comprehensive view with intelligent conflict resolution.
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setActiveSection('merging')}
              >
                Merge Flows
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <CollaborationIcon sx={{ color: threatFlowTheme.colors.brand.secondary }} />
                <Typography variant="h6">Collaboration</Typography>
              </Box>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Share flows with team members, add comments, and collaborate in real-time on threat analysis.
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setActiveSection('collaboration')}
              >
                Collaborate
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <TemplateIcon sx={{ color: threatFlowTheme.colors.accent.warning }} />
                <Typography variant="h6">Templates</Typography>
              </Box>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Use pre-built templates for common attack patterns or create your own reusable analysis frameworks.
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setActiveSection('templates')}
              >
                Browse Templates
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  const renderCompactView = () => (
    <Paper sx={{ 
      p: 2, 
      mb: 2,
      backgroundColor: threatFlowTheme.colors.background.secondary,
      border: `1px solid ${threatFlowTheme.colors.surface.border.default}`
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FlowIcon sx={{ color: threatFlowTheme.colors.brand.primary }} />
          <Box>
            <Typography variant="h6">Flow Management</Typography>
            <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
              <Chip
                label="Versioning"
                size="small"
                sx={{
                  backgroundColor: `${threatFlowTheme.colors.brand.primary}20`,
                  color: threatFlowTheme.colors.brand.primary
                }}
              />
              <Chip
                label="Collaboration"
                size="small"
                sx={{
                  backgroundColor: `${threatFlowTheme.colors.accent.secure}20`,
                  color: threatFlowTheme.colors.accent.secure
                }}
              />
              <Chip
                label="Templates"
                size="small"
                sx={{
                  backgroundColor: `${threatFlowTheme.colors.status.warning.text}20`,
                  color: threatFlowTheme.colors.status.warning.text
                }}
              />
            </Box>
          </Box>
        </Box>
        
        <Button
          variant="outlined"
          startIcon={<FlowIcon />}
          onClick={() => setActiveSection('expanded')}
          size="small"
        >
          Manage Flow
        </Button>
      </Box>
    </Paper>
  );

  const renderExpandedView = () => (
    <Paper sx={{ 
      mb: 2,
      backgroundColor: threatFlowTheme.colors.background.secondary,
      border: `1px solid ${threatFlowTheme.colors.surface.border.default}`
    }}>
      {/* Header */}
      <Box sx={{ 
        p: 3, 
        borderBottom: `1px solid ${threatFlowTheme.colors.surface.border.default}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FlowIcon sx={{ color: threatFlowTheme.colors.brand.primary, fontSize: 32 }} />
          <Box>
            <Typography variant="h5">Flow Management</Typography>
            <Typography variant="body2" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
              Version control, collaboration, and template management for threat analysis flows
            </Typography>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant={activeSection === 'overview' ? 'contained' : 'outlined'}
            onClick={() => setActiveSection('overview')}
            size="small"
            startIcon={<InfoIcon />}
          >
            Overview
          </Button>
        </Box>
      </Box>

      {/* Content */}
      <Box>
        {activeSection === 'overview' && renderOverview()}
        
        {activeSection !== 'overview' && (
          <Box sx={{ p: 3 }}>
            {/* Navigation */}
            <Box sx={{ mb: 3 }}>
              <Button
                variant="text"
                onClick={() => setActiveSection('overview')}
                sx={{ mb: 2 }}
              >
                ← Back to Overview
              </Button>
            </Box>

            {/* Feature Components */}
            {activeSection === 'versioning' && (
              <FlowVersioning
                flowId={flowId}
                currentNodes={currentNodes}
                currentEdges={currentEdges}
                currentMetadata={currentMetadata}
                onVersionRestore={onVersionRestore}
                disabled={disabled}
              />
            )}

            {activeSection === 'comparison' && (
              <FlowComparisonComponent
                flowId={flowId}
                disabled={disabled}
              />
            )}

            {activeSection === 'merging' && (
              <FlowMerging
                onMergeComplete={onFlowMerge}
                disabled={disabled}
              />
            )}

            {activeSection === 'collaboration' && (
              <FlowCollaboration
                flowId={flowId}
                disabled={disabled}
              />
            )}

            {activeSection === 'templates' && (
              <FlowTemplates
                onTemplateInstantiate={onTemplateInstantiate}
                disabled={disabled}
              />
            )}
          </Box>
        )}
      </Box>
    </Paper>
  );

  if (compact || activeSection === 'compact') {
    return renderCompactView();
  }

  return renderExpandedView();
};