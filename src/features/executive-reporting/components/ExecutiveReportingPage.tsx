/**
 * Executive Reporting Feature Page
 *
 * Main page for executive-level security reporting and dashboards
 */

import React, { useState } from 'react';
import { Box, Typography, Button, Stack, Grid, Card, CardContent } from '@mui/material';
import {
  Analytics as AnalyticsIcon,
  PictureAsPdf as PdfIcon,
  TrendingUp as TrendingUpIcon,
  Security as SecurityIcon,
  Assessment as AssessmentIcon,
  Timeline as TimelineIcon,
} from '@mui/icons-material';
import { ContentArea } from '../../../shared/components/ContentArea';
import { useThemeContext } from '../../../shared/context/ThemeProvider';

export const ExecutiveReportingPage: React.FC = () => {
  const { theme } = useThemeContext();
  const [loading, setLoading] = useState(false);

  const handleGenerateReport = () => {
    setLoading(true);
    // TODO: Implement report generation
    setTimeout(() => setLoading(false), 1000);
  };

  const reportTypes = [
    {
      title: 'Security Posture',
      description: 'Overall security status and risk assessment',
      icon: <SecurityIcon />,
      color: theme.colors.status.info.accent,
    },
    {
      title: 'Threat Trends',
      description: 'Trending threats and attack patterns',
      icon: <TrendingUpIcon />,
      color: theme.colors.status.warning.accent,
    },
    {
      title: 'Compliance Status',
      description: 'Compliance metrics and audit findings',
      icon: <AssessmentIcon />,
      color: theme.colors.status.success.accent,
    },
  ];

  return (
    <ContentArea
      title="Executive Reporting"
      subtitle="Executive-level security dashboards and reporting"
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
          <AnalyticsIcon
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
            Executive Security Reporting
          </Typography>

          <Typography
            variant="body1"
            sx={{
              color: theme.colors.text.secondary,
              maxWidth: 700,
              mb: 4,
            }}
          >
            Comprehensive security reporting designed for executive leadership. Transform
            complex security data into actionable insights with professional visualizations,
            trend analysis, and risk assessments tailored for strategic decision-making.
          </Typography>

          <Stack direction="row" spacing={2}>
            <Button
              variant="contained"
              startIcon={<PdfIcon />}
              onClick={handleGenerateReport}
              disabled={loading}
              sx={{
                backgroundColor: theme.colors.brand.primary,
                color: theme.colors.text.inverse,
                '&:hover': {
                  backgroundColor: theme.colors.brand.secondary,
                },
              }}
            >
              {loading ? 'Generating...' : 'Generate Report'}
            </Button>

            <Button
              variant="outlined"
              startIcon={<TimelineIcon />}
              sx={{
                borderColor: theme.colors.surface.border.emphasis,
                color: theme.colors.text.primary,
                '&:hover': {
                  borderColor: theme.colors.brand.primary,
                  backgroundColor: `${theme.colors.brand.primary}10`,
                },
              }}
            >
              View Dashboard
            </Button>
          </Stack>
        </Box>

        {/* Report Type Cards */}
        <Grid container spacing={3}>
          {reportTypes.map((report, index) => (
            <Grid item xs={12} md={4} key={index}>
              <Card
                sx={{
                  height: '100%',
                  backgroundColor: theme.colors.surface.elevated,
                  border: `1px solid ${theme.colors.surface.border.subtle}`,
                  borderRadius: theme.borderRadius.lg,
                  transition: theme.motion.normal,
                  cursor: 'pointer',
                  '&:hover': {
                    borderColor: report.color,
                    boxShadow: theme.effects.shadows.md,
                    transform: 'translateY(-2px)',
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
                        backgroundColor: `${report.color}20`,
                        color: report.color,
                      }}
                    >
                      {report.icon}
                    </Box>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: theme.typography.fontWeight.semibold,
                        color: theme.colors.text.primary,
                      }}
                    >
                      {report.title}
                    </Typography>
                  </Box>

                  <Typography
                    variant="body2"
                    sx={{
                      color: theme.colors.text.secondary,
                    }}
                  >
                    {report.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Features Info */}
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
            Report Features
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Stack spacing={1.5}>
                {[
                  'Executive-friendly visualizations',
                  'Risk trend analysis and forecasting',
                  'Security investment ROI metrics',
                ].map((feature, index) => (
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
                      {feature}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Grid>
            <Grid item xs={12} md={6}>
              <Stack spacing={1.5}>
                {[
                  'Compliance and audit reporting',
                  'Threat intelligence summaries',
                  'Customizable report templates',
                ].map((feature, index) => (
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
                      {feature}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Grid>
          </Grid>
        </Box>
      </Box>
    </ContentArea>
  );
};

export default ExecutiveReportingPage;
