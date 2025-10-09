import { Box, Typography } from '@mui/material';
import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

import { THEME } from '../constants';

// Simplified node types mapping for performance
const NODE_COLORS: Record<string, string> = {
  'action': '#3b82f6',
  'tool': '#10b981',
  'malware': '#ef4444',
  'asset': '#8b5cf6',
  'infrastructure': '#f59e0b',
  'url': '#06b6d4',
  'vulnerability': '#ec4899',
  'AND_operator': '#6b7280',
  'OR_operator': '#6b7280'
};

const NODE_ICONS: Record<string, string> = {
  'action': '🎯',
  'tool': '🔧',
  'malware': '🦠',
  'asset': '🏢',
  'infrastructure': '🌐',
  'url': '🔗',
  'vulnerability': '⚠️',
  'AND_operator': '&',
  'OR_operator': '|'
};

interface SimplifiedNodeProps extends NodeProps {
  data: {
    name?: string;
    label?: string;
    technique_id?: string;
    type?: string;
    tactic?: string;
  };
}

const SimplifiedNode: React.FC<SimplifiedNodeProps> = memo(({ data, selected, type }) => {
  const nodeColor = NODE_COLORS[type] || '#6b7280';
  const nodeIcon = NODE_ICONS[type] || '📍';
  const displayName = data?.name || data?.label || 'Unknown';

  return (
    <>
      <Handle 
        type="target" 
        position={Position.Top} 
        style={{ 
          background: nodeColor,
          border: 'none',
          width: 8,
          height: 8
        }} 
      />
      
      <Box
        sx={{
          backgroundColor: selected 
            ? `${nodeColor}30` 
            : THEME.background.secondary,
          border: selected 
            ? `2px solid ${nodeColor}` 
            : `1px solid ${nodeColor}60`,
          borderRadius: 2,
          padding: '8px 12px',
          minWidth: 120,
          maxWidth: 200,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: `${nodeColor}20`,
            borderColor: nodeColor,
            transform: 'scale(1.02)'
          }
        }}
      >
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
          <Typography sx={{ fontSize: '14px', mr: 0.5 }}>
            {nodeIcon}
          </Typography>
          <Typography 
            variant="caption" 
            sx={{ 
              color: nodeColor, 
              fontWeight: 600, 
              textTransform: 'uppercase',
              fontSize: '10px',
              letterSpacing: '0.5px'
            }}
          >
            {type}
          </Typography>
        </Box>

        {/* Main content */}
        <Typography
          variant="body2"
          sx={{
            color: THEME.text.primary,
            fontWeight: 600,
            fontSize: '12px',
            lineHeight: 1.2,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            mb: data?.technique_id ? 0.5 : 0
          }}
        >
          {displayName}
        </Typography>

        {/* Technique ID */}
        {data?.technique_id && (
          <Typography
            variant="caption"
            sx={{
              color: THEME.text.secondary,
              fontSize: '10px',
              display: 'block'
            }}
          >
            {data.technique_id}
          </Typography>
        )}
      </Box>
      
      <Handle 
        type="source" 
        position={Position.Bottom} 
        style={{ 
          background: nodeColor,
          border: 'none',
          width: 8,
          height: 8
        }} 
      />
    </>
  );
});

SimplifiedNode.displayName = 'SimplifiedNode';

export default SimplifiedNode;