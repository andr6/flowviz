import {
  Visibility,
  VisibilityOff,
  Security,
  Business,
  Login as LoginIcon,
} from '@mui/icons-material';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  Divider,
  IconButton,
  InputAdornment,
  Link,
} from '@mui/material';
import React, { useState } from 'react';

import { threatFlowTheme } from '../../../shared/theme/threatflow-theme';
import { useAuth } from '../context/AuthContext';

interface LoginFormProps {
  onSwitchToSSO?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToSSO }) => {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `
          radial-gradient(circle at 15% 85%, ${threatFlowTheme.colors.brand.dark} 0%, transparent 35%),
          radial-gradient(circle at 85% 15%, rgba(0, 225, 255, 0.12) 0%, transparent 45%),
          linear-gradient(135deg, ${threatFlowTheme.colors.background.primary} 0%, #050810 50%, #030609 100%)
        `,
        px: 2,
      }}
    >
      <Paper
        elevation={24}
        sx={{
          maxWidth: 440,
          width: '100%',
          p: 4,
          background: `linear-gradient(135deg, ${threatFlowTheme.colors.background.secondary}95 0%, ${threatFlowTheme.colors.background.primary}90 100%)`,
          backdropFilter: 'blur(20px)',
          borderRadius: 3,
          border: `1px solid ${threatFlowTheme.colors.brand.primary}20`,
          boxShadow: `0 20px 40px ${threatFlowTheme.colors.brand.dark}40`,
        }}
      >
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 64,
              height: 64,
              borderRadius: 2,
              background: threatFlowTheme.effects.gradients.brand,
              mb: 2,
              boxShadow: `0 8px 32px ${threatFlowTheme.colors.brand.primary}40`,
            }}
          >
            <Security sx={{ fontSize: 32, color: 'white' }} />
          </Box>
          
          <Typography
            variant="h4"
            sx={{
              fontFamily: threatFlowTheme.typography.fontFamily.primary,
              fontWeight: threatFlowTheme.typography.fontWeight.bold,
              color: threatFlowTheme.colors.text.primary,
              mb: 1,
              letterSpacing: '-0.02em',
            }}
          >
            ThreatFlow
          </Typography>
          
          <Typography
            sx={{
              color: threatFlowTheme.colors.text.secondary,
              fontSize: threatFlowTheme.typography.fontSize.sm,
              fontFamily: threatFlowTheme.typography.fontFamily.mono,
              textTransform: 'uppercase',
              letterSpacing: threatFlowTheme.typography.letterSpacing.wide,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
            }}
          >
            <Business sx={{ fontSize: 16 }} />
            Enterprise Security Intelligence
          </Typography>
        </Box>

        {/* Login Form */}
        <Box component="form" onSubmit={handleSubmit}>
          {error && (
            <Alert 
              severity="error" 
              sx={{ 
                mb: 3,
                background: `${threatFlowTheme.colors.status.error}10`,
                border: `1px solid ${threatFlowTheme.colors.status.error}30`,
                color: threatFlowTheme.colors.status.error,
              }}
            >
              {error}
            </Alert>
          )}

          <TextField
            fullWidth
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isSubmitting || isLoading}
            sx={{
              mb: 3,
              '& .MuiOutlinedInput-root': {
                background: `${threatFlowTheme.colors.background.primary}40`,
                '&:hover': {
                  background: `${threatFlowTheme.colors.background.primary}60`,
                },
                '&.Mui-focused': {
                  background: `${threatFlowTheme.colors.background.primary}60`,
                },
              },
              '& .MuiInputLabel-root': {
                color: threatFlowTheme.colors.text.tertiary,
              },
              '& .MuiOutlinedInput-input': {
                color: threatFlowTheme.colors.text.primary,
              },
            }}
          />

          <TextField
            fullWidth
            label="Password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isSubmitting || isLoading}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={togglePasswordVisibility}
                    edge="end"
                    disabled={isSubmitting || isLoading}
                    sx={{ color: threatFlowTheme.colors.text.tertiary }}
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              mb: 4,
              '& .MuiOutlinedInput-root': {
                background: `${threatFlowTheme.colors.background.primary}40`,
                '&:hover': {
                  background: `${threatFlowTheme.colors.background.primary}60`,
                },
                '&.Mui-focused': {
                  background: `${threatFlowTheme.colors.background.primary}60`,
                },
              },
              '& .MuiInputLabel-root': {
                color: threatFlowTheme.colors.text.tertiary,
              },
              '& .MuiOutlinedInput-input': {
                color: threatFlowTheme.colors.text.primary,
              },
            }}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={isSubmitting || isLoading || !email || !password}
            startIcon={<LoginIcon />}
            sx={{
              py: 1.5,
              mb: 3,
              background: threatFlowTheme.effects.gradients.brand,
              color: 'white',
              fontWeight: threatFlowTheme.typography.fontWeight.semibold,
              textTransform: 'none',
              fontSize: threatFlowTheme.typography.fontSize.base,
              borderRadius: 2,
              boxShadow: `0 4px 20px ${threatFlowTheme.colors.brand.primary}40`,
              '&:hover': {
                background: threatFlowTheme.effects.gradients.brandHover,
                boxShadow: `0 6px 30px ${threatFlowTheme.colors.brand.primary}50`,
              },
              '&:disabled': {
                background: `${threatFlowTheme.colors.text.tertiary}20`,
                color: threatFlowTheme.colors.text.tertiary,
              },
            }}
          >
            {isSubmitting ? 'Signing In...' : 'Sign In'}
          </Button>

          {onSwitchToSSO && (
            <>
              <Divider
                sx={{
                  mb: 3,
                  '&::before, &::after': {
                    borderColor: `${threatFlowTheme.colors.text.tertiary}30`,
                  },
                }}
              >
                <Typography
                  sx={{
                    color: threatFlowTheme.colors.text.tertiary,
                    fontSize: threatFlowTheme.typography.fontSize.sm,
                    px: 2,
                  }}
                >
                  or
                </Typography>
              </Divider>

              <Box sx={{ textAlign: 'center' }}>
                <Link
                  component="button"
                  type="button"
                  onClick={onSwitchToSSO}
                  sx={{
                    color: threatFlowTheme.colors.brand.primary,
                    textDecoration: 'none',
                    fontSize: threatFlowTheme.typography.fontSize.sm,
                    fontWeight: threatFlowTheme.typography.fontWeight.medium,
                    '&:hover': {
                      textDecoration: 'underline',
                    },
                  }}
                >
                  Sign in with SSO
                </Link>
              </Box>
            </>
          )}
        </Box>
      </Paper>
    </Box>
  );
};