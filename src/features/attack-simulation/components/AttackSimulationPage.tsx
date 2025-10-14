/**
 * Attack Simulation Feature Page
 *
 * Main page for attack simulation and breach and attack simulation (BAS) features
 */

import React, { useState } from 'react';
import { Box, Typography, Button, Stack, Grid, Card, CardContent } from '@mui/material';
import {
  Security as SecurityIcon,
  PlayArrow as PlayIcon,
  Schedule as ScheduleIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';
import { ContentArea } from '../../../shared/components/ContentArea';
import { useThemeContext } from '../../../shared/context/ThemeProvider';

export const AttackSimulationPage: React.FC = () => {
  const { theme } = useThemeContext();
  const [loading, setLoading] = useState(false);

  const handleStartSimulation = () => {
    setLoading(true);
    // TODO: Implement simulation start
    setTimeout(() => setLoading(false), 1000);
  };

  const simulationFeatures = [
    {
      title: 'Automated Simulations',
      description: 'Run automated attack simulations based on real-world threat scenarios',
      icon: <PlayIcon />,
      color: theme.colors.status.info.accent,
    },
    {
      title: 'Scheduled Testing',
      description: 'Schedule recurring security validation tests across your environment',
      icon: <ScheduleIcon />,
      color: theme.colors.status.warning.accent,
    },
    {
      title: 'Analytics Dashboard',
      description: 'Comprehensive analytics and reporting on simulation results',
      icon: <AssessmentIcon />,
      color: theme.colors.status.success.accent,
    },
  ];

  return (
    <ContentArea
      title="Attack Simulation"
      subtitle="Breach and Attack Simulation (BAS) for continuous security validation"
      showScrollToTop={true}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        {/* Hero Section */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            py: 4,
          }}
        >
          <SecurityIcon
            sx={{
              fontSize: 100,
              color: theme.colors.brand.primary,
              opacity: 0.3,
              mb: 3,
            }}
          />

          <Typography
            variant="h4"
            sx={{
              fontFamily: theme.typography.fontFamily.display,
              fontWeight: theme.typography.fontWeight.semibold,
              color: theme.colors.text.primary,
              mb: 2,
            }}
          >
            Attack Simulation Platform
          </Typography>

          <Typography
            variant="body1"
            sx={{
              color: theme.colors.text.secondary,
              maxWidth: 700,
              mb: 4,
            }}
          >
            Continuously validate your security controls with automated breach and attack
            simulations. Test your defenses against real-world attack techniques and
            identify gaps in your security posture.
          </Typography>

          <Stack direction="row" spacing={2}>
            <Button
              variant="contained"
              startIcon={<PlayIcon />}
              onClick={handleStartSimulation}
              disabled={loading}
              sx={{
                backgroundColor: theme.colors.brand.primary,
                color: theme.colors.text.inverse,
                '&:hover': {
                  backgroundColor: theme.colors.brand.secondary,
                },
              }}
            >
              {loading ? 'Starting...' : 'Start Simulation'}
            </Button>

            <Button
              variant="outlined"
              startIcon={<ScheduleIcon />}
              sx={{
                borderColor: theme.colors.surface.border.emphasis,
                color: theme.colors.text.primary,
                '&:hover': {
                  borderColor: theme.colors.brand.primary,
                  backgroundColor: `${theme.colors.brand.primary}10`,
                },
              }}
            >
              Schedule Tests
            </Button>
          </Stack>
        </Box>

        {/* Feature Cards */}
        <Grid container spacing={3}>
          {simulationFeatures.map((feature, index) => (
            <Grid item xs={12} md={4} key={index}>
              <Card
                sx={{
                  height: '100%',
                  backgroundColor: theme.colors.surface.elevated,
                  border: `1px solid ${theme.colors.surface.border.subtle}`,
                  borderRadius: theme.borderRadius.lg,
                  transition: theme.motion.normal,
                  '&:hover': {
                    borderColor: feature.color,
                    boxShadow: theme.effects.shadows.md,
                  },
                }}
              >
                <CardContent>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      mb: 2,
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 48,
                        height: 48,
                        borderRadius: theme.borderRadius.md,
                        backgroundColor: `${feature.color}20`,
                        color: feature.color,
                      }}
                    >
                      {feature.icon}
                    </Box>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: theme.typography.fontWeight.semibold,
                        color: theme.colors.text.primary,
                      }}
                    >
                      {feature.title}
                    </Typography>
                  </Box>

                  <Typography
                    variant="body2"
                    sx={{
                      color: theme.colors.text.secondary,
                    }}
                  >
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Integration Info */}
        <Box
          sx={{
            p: 3,
            backgroundColor: theme.colors.surface.elevated,
            borderRadius: theme.borderRadius.lg,
            border: `1px solid ${theme.colors.surface.border.subtle}`,
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: theme.typography.fontWeight.semibold,
              color: theme.colors.text.primary,
              mb: 2,
            }}
          >
            Supported Integrations
          </Typography>

          <Stack spacing={1.5}>
            {[
              'Atomic Red Team - Pre-built attack simulations',
              'Picus Security - Enterprise BAS platform',
              'CALDERA - Automated adversary emulation',
              'SIEM Integration - Real-time alert correlation',
              'Ticketing Systems - Automated incident response',
            ].map((integration, index) => (
              <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: theme.colors.brand.primary,
                  }}
                />
                <Typography
                  variant="body2"
                  sx={{
                    color: theme.colors.text.secondary,
                  }}
                >
                  {integration}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Box>
      </Box>
    </ContentArea>
  );
};

export default AttackSimulationPage;
