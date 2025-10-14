/**
 * Purple Team Feature Page
 *
 * Main page for purple team collaboration and operations
 */

import React, { useState } from 'react';
import { Box, Typography, Button, Stack, Chip } from '@mui/material';
import {
  People as PeopleIcon,
  Group as GroupIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';
import { ContentArea } from '../../../shared/components/ContentArea';
import { useThemeContext } from '../../../shared/context/ThemeProvider';

export const PurpleTeamPage: React.FC = () => {
  const { theme } = useThemeContext();
  const [loading, setLoading] = useState(false);

  const handleStartExercise = () => {
    setLoading(true);
    // TODO: Implement purple team exercise start
    setTimeout(() => setLoading(false), 1000);
  };

  return (
    <ContentArea
      title="Purple Team Operations"
      subtitle="Collaborative security validation combining offensive and defensive techniques"
      showScrollToTop={true}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          textAlign: 'center',
          gap: 3,
        }}
      >
        <PeopleIcon
          sx={{
            fontSize: 120,
            color: theme.colors.brand.secondary,
            opacity: 0.3,
          }}
        />

        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <Chip
            label="Red Team"
            size="small"
            sx={{
              backgroundColor: `${theme.colors.status.error.accent}20`,
              color: theme.colors.status.error.accent,
              fontWeight: theme.typography.fontWeight.semibold,
            }}
          />
          <Typography sx={{ color: theme.colors.text.tertiary }}>+</Typography>
          <Chip
            label="Blue Team"
            size="small"
            sx={{
              backgroundColor: `${theme.colors.status.info.accent}20`,
              color: theme.colors.status.info.accent,
              fontWeight: theme.typography.fontWeight.semibold,
            }}
          />
          <Typography sx={{ color: theme.colors.text.tertiary }}>=</Typography>
          <Chip
            label="Purple Team"
            size="small"
            sx={{
              backgroundColor: `${theme.colors.brand.secondary}20`,
              color: theme.colors.brand.secondary,
              fontWeight: theme.typography.fontWeight.semibold,
            }}
          />
        </Stack>

        <Typography
          variant="h4"
          sx={{
            fontFamily: theme.typography.fontFamily.display,
            fontWeight: theme.typography.fontWeight.semibold,
            color: theme.colors.text.primary,
            mb: 2,
          }}
        >
          Purple Team Collaboration
        </Typography>

        <Typography
          variant="body1"
          sx={{
            color: theme.colors.text.secondary,
            maxWidth: 600,
            mb: 3,
          }}
        >
          Purple teaming combines red team offensive tactics with blue team defensive
          strategies to create a collaborative environment for continuous security
          improvement. Run coordinated exercises, share findings in real-time, and
          enhance your organization's security posture through collaborative validation.
        </Typography>

        <Stack direction="row" spacing={2}>
          <Button
            variant="contained"
            startIcon={<GroupIcon />}
            onClick={handleStartExercise}
            disabled={loading}
            sx={{
              backgroundColor: theme.colors.brand.secondary,
              color: theme.colors.text.inverse,
              '&:hover': {
                backgroundColor: theme.colors.brand.primary,
              },
            }}
          >
            {loading ? 'Loading...' : 'Start Exercise'}
          </Button>

          <Button
            variant="outlined"
            startIcon={<AssessmentIcon />}
            sx={{
              borderColor: theme.colors.surface.border.emphasis,
              color: theme.colors.text.primary,
              '&:hover': {
                borderColor: theme.colors.brand.secondary,
                backgroundColor: `${theme.colors.brand.secondary}10`,
              },
            }}
          >
            View Reports
          </Button>
        </Stack>

        <Box
          sx={{
            mt: 4,
            p: 3,
            backgroundColor: theme.colors.surface.elevated,
            borderRadius: theme.borderRadius.lg,
            border: `1px solid ${theme.colors.surface.border.subtle}`,
            maxWidth: 700,
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
            Purple Team Capabilities
          </Typography>

          <Stack spacing={1.5} alignItems="flex-start">
            {[
              'Coordinated red/blue team exercises',
              'Real-time attack and defense collaboration',
              'Shared threat intelligence and findings',
              'Automated workflow orchestration',
              'Comprehensive exercise reporting',
              'Continuous security validation',
            ].map((capability, index) => (
              <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: theme.colors.brand.secondary,
                  }}
                />
                <Typography
                  variant="body2"
                  sx={{
                    color: theme.colors.text.secondary,
                  }}
                >
                  {capability}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Box>
      </Box>
    </ContentArea>
  );
};

export default PurpleTeamPage;
