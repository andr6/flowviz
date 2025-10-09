import { Box, CircularProgress, Typography } from '@mui/material';
import React from 'react';

import { threatFlowTheme } from '../../../shared/theme/threatflow-theme';
import { useAuth } from '../context/AuthContext';

import { LoginForm } from './LoginForm';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: `
            radial-gradient(circle at 15% 85%, ${threatFlowTheme.colors.brand.dark} 0%, transparent 35%),
            radial-gradient(circle at 85% 15%, rgba(0, 225, 255, 0.12) 0%, transparent 45%),
            linear-gradient(135deg, ${threatFlowTheme.colors.background.primary} 0%, #050810 50%, #030609 100%)
          `,
          gap: 3,
        }}
      >
        <Box sx={{ 
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <CircularProgress 
            size={64} 
            thickness={3}
            sx={{ 
              color: threatFlowTheme.colors.brand.primary,
              filter: `drop-shadow(0 0 16px ${threatFlowTheme.colors.brand.primary}60)`,
            }} 
          />
          <Box
            sx={{
              position: 'absolute',
              width: 48,
              height: 48,
              background: threatFlowTheme.effects.gradients.brand,
              borderRadius: '50%',
              opacity: 0.3,
              animation: 'breathe 3s ease-in-out infinite',
            }}
          />
        </Box>
        
        <Box sx={{ textAlign: 'center' }}>
          <Typography
            sx={{
              color: threatFlowTheme.colors.text.primary,
              fontSize: threatFlowTheme.typography.fontSize.xl,
              fontFamily: threatFlowTheme.typography.fontFamily.primary,
              fontWeight: threatFlowTheme.typography.fontWeight.semibold,
              mb: 1,
              letterSpacing: threatFlowTheme.typography.letterSpacing.wide,
            }}
          >
            ThreatFlow Enterprise
          </Typography>
          <Typography
            sx={{
              color: threatFlowTheme.colors.text.tertiary,
              fontSize: threatFlowTheme.typography.fontSize.sm,
              fontFamily: threatFlowTheme.typography.fontFamily.mono,
              textTransform: 'uppercase',
              letterSpacing: threatFlowTheme.typography.letterSpacing.wide,
            }}
          >
            🔐 Initializing secure session
          </Typography>
        </Box>
        
        <style>
          {`
            @keyframes breathe {
              0%, 100% { transform: scale(1); opacity: 0.3; }
              50% { transform: scale(1.1); opacity: 0.5; }
            }
          `}
        </style>
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  return <>{children}</>;
};