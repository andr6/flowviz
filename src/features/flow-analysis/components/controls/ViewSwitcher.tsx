import {
  AccountTree as GraphIcon,
  ViewList as ListIcon,
  Timeline as TimelineIcon,
  Dashboard as DashboardIcon,
  BugReport as IOCIcon
} from '@mui/icons-material';
import {
  Box,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  Paper
} from '@mui/material';
import React from 'react';

import { THEME } from '../constants';

export type ViewMode = 'graph' | 'tactic' | 'timeline' | 'hybrid' | 'ioc';

interface ViewSwitcherProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  nodeCount: number;
  disabled?: boolean;
}

const VIEW_OPTIONS = [
  {
    value: 'graph' as ViewMode,
    icon: <GraphIcon />,
    label: 'Graph View',
    description: 'Traditional node-edge visualization'
  },
  {
    value: 'tactic' as ViewMode,
    icon: <ListIcon />,
    label: 'Tactic Groups',
    description: 'Organized by MITRE ATT&CK tactics'
  },
  {
    value: 'timeline' as ViewMode,
    icon: <TimelineIcon />,
    label: 'Timeline',
    description: 'Chronological attack progression'
  },
  {
    value: 'hybrid' as ViewMode,
    icon: <DashboardIcon />,
    label: 'Split View',
    description: 'Graph + details panel'
  },
  {
    value: 'ioc' as ViewMode,
    icon: <IOCIcon />,
    label: 'IOC/IOA',
    description: 'Indicators of Compromise and Attack analysis'
  }
];

const ViewSwitcher: React.FC<ViewSwitcherProps> = ({
  currentView,
  onViewChange,
  nodeCount,
  disabled = false
}) => {
  const getPerformanceWarning = () => {
    if (nodeCount > 50 && currentView === 'graph') {
      return 'Large graphs may impact performance';
    }
    return null;
  };

  const performanceWarning = getPerformanceWarning();

  return (
    <Paper sx={{ 
      p: 2, 
      backgroundColor: THEME.background.secondary,
      border: '1px solid rgba(255, 255, 255, 0.1)',
      mb: 2
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="subtitle2" sx={{ color: THEME.text.primary, fontWeight: 600 }}>
          Visualization Mode
        </Typography>
        <Typography variant="caption" sx={{ color: THEME.text.secondary }}>
          {nodeCount} nodes
        </Typography>
      </Box>

      <ToggleButtonGroup
        value={currentView}
        exclusive
        onChange={(e, newView) => newView && onViewChange(newView)}
        size="small"
        sx={{
          display: 'flex',
          gap: 1,
          '& .MuiToggleButton-root': {
            flex: 1,
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '8px',
            color: THEME.text.secondary,
            backgroundColor: 'transparent',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderColor: 'rgba(255, 255, 255, 0.3)'
            },
            '&.Mui-selected': {
              backgroundColor: 'rgba(59, 130, 246, 0.2)',
              borderColor: '#3b82f6',
              color: '#3b82f6',
              '&:hover': {
                backgroundColor: 'rgba(59, 130, 246, 0.3)'
              }
            },
            '&.Mui-disabled': {
              opacity: 0.5
            }
          }
        }}
      >
        {VIEW_OPTIONS.map(option => (
          <ToggleButton 
            key={option.value} 
            value={option.value}
            disabled={disabled}
            sx={{ 
              flexDirection: 'column', 
              gap: 0.5, 
              p: 1.5,
              minHeight: 80
            }}
          >
            <Tooltip title={option.description} placement="top">
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                {option.icon}
                <Typography variant="caption" sx={{ fontSize: '0.7rem', textAlign: 'center' }}>
                  {option.label}
                </Typography>
              </Box>
            </Tooltip>
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      {performanceWarning && (
        <Box sx={{ 
          mt: 1, 
          p: 1, 
          backgroundColor: 'rgba(255, 193, 7, 0.1)', 
          border: '1px solid rgba(255, 193, 7, 0.3)',
          borderRadius: 1
        }}>
          <Typography variant="caption" sx={{ color: '#ffc107', display: 'flex', alignItems: 'center', gap: 1 }}>
            ⚠️ {performanceWarning}
          </Typography>
        </Box>
      )}

      {/* View-specific help text */}
      <Box sx={{ mt: 1 }}>
        <Typography variant="caption" sx={{ color: THEME.text.muted, fontSize: '0.7rem' }}>
          {currentView === 'graph' && 'Interactive node-edge diagram with drag and zoom'}
          {currentView === 'tactic' && 'Nodes organized by MITRE ATT&CK tactic categories'}
          {currentView === 'timeline' && 'Step-through attack progression with playback controls'}
          {currentView === 'hybrid' && 'Combined graph view with expandable details panel'}
          {currentView === 'ioc' && 'Comprehensive analysis of Indicators of Compromise and Attack'}
        </Typography>
      </Box>
    </Paper>
  );
};

export default ViewSwitcher;