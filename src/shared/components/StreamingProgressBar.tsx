import { Box } from '@mui/material';
import { keyframes } from '@mui/system';
import React from 'react';

import { threatFlowTheme } from '../theme/threatflow-theme';

const streamingAnimation = keyframes`
  0% {
    transform: translateX(-100%);
    opacity: 0;
  }
  30% {
    opacity: 0.8;
  }
  70% {
    opacity: 1;
  }
  100% {
    transform: translateX(100%);
    opacity: 0;
  }
`;

const pulseGlow = keyframes`
  0%, 100% {
    opacity: 0.2;
    transform: scaleY(1);
  }
  50% {
    opacity: 0.6;
    transform: scaleY(1.5);
  }
`;

const dataFlow = keyframes`
  0% {
    transform: translateX(-50px);
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  90% {
    opacity: 1;
  }
  100% {
    transform: translateX(calc(100vw + 50px));
    opacity: 0;
  }
`;

interface StreamingProgressBarProps {
  isVisible: boolean;
}

const StreamingProgressBar: React.FC<StreamingProgressBarProps> = ({ isVisible }) => {
  if (!isVisible) {return null;}

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '3px',
        background: `linear-gradient(90deg, ${threatFlowTheme.colors.background.primary}, ${threatFlowTheme.colors.background.secondary})`,
        overflow: 'hidden',
        zIndex: 1300, // Above AppBar
        borderBottom: `1px solid ${threatFlowTheme.colors.surface.border.subtle}`,
      }}
    >
      {/* Primary threat intelligence data stream */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '100%',
          background: `linear-gradient(90deg, 
            transparent 0%, 
            ${threatFlowTheme.colors.brand.primary}40 20%, 
            ${threatFlowTheme.colors.brand.primary}80 40%,
            ${threatFlowTheme.colors.brand.primary} 50%,
            ${threatFlowTheme.colors.brand.primary}80 60%, 
            ${threatFlowTheme.colors.brand.primary}40 80%, 
            transparent 100%
          )`,
          animation: `${streamingAnimation} 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite`,
          width: '40%',
          boxShadow: `0 0 10px ${threatFlowTheme.colors.brand.primary}60`,
        }}
      />
      
      {/* Secondary analysis stream */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '100%',
          background: `linear-gradient(90deg, 
            transparent 0%, 
            ${threatFlowTheme.colors.accent.cyber}30 30%, 
            ${threatFlowTheme.colors.accent.cyber}60 50%,
            ${threatFlowTheme.colors.accent.cyber}30 70%, 
            transparent 100%
          )`,
          animation: `${streamingAnimation} 3s cubic-bezier(0.4, 0, 0.2, 1) infinite`,
          animationDelay: '0.8s',
          width: '25%',
        }}
      />
      
      {/* Data packet indicators */}
      {Array.from({ length: 3 }, (_, i) => (
        <Box
          key={i}
          sx={{
            position: 'absolute',
            top: '50%',
            left: 0,
            width: '4px',
            height: '4px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${threatFlowTheme.colors.brand.primary} 0%, ${threatFlowTheme.colors.brand.primary}60 70%, transparent 100%)`,
            transform: 'translateY(-50%)',
            animation: `${dataFlow} 4s linear infinite`,
            animationDelay: `${i * 1.2}s`,
            boxShadow: `0 0 6px ${threatFlowTheme.colors.brand.primary}80`,
          }}
        />
      ))}
      
      {/* Background neural network activity */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '100%',
          background: `linear-gradient(90deg, 
            transparent 0%, 
            ${threatFlowTheme.colors.surface.border.emphasis} 50%, 
            transparent 100%
          )`,
          animation: `${pulseGlow} 4s ease-in-out infinite`,
          transformOrigin: 'center',
        }}
      />
    </Box>
  );
};

export default StreamingProgressBar;