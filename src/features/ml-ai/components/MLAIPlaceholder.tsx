import React from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  Psychology as PsychologyIcon,
  Warning as WarningIcon,
  TrendingUp as TrendingUpIcon,
  EmojiObjects as EmojiObjectsIcon,
  Speed as SpeedIcon,
  Recommend as RecommendIcon,
  CheckCircle as CheckCircleIcon,
  ModelTraining as ModelTrainingIcon,
} from '@mui/icons-material';

interface MLFeature {
  title: string;
  description: string;
  icon: React.ReactNode;
  metrics: { label: string; value: string; color: string }[];
  status: 'active' | 'training' | 'beta';
}

export const MLAIPlaceholder: React.FC = () => {
  const features: MLFeature[] = [
    {
      title: 'Anomaly Detection',
      description: 'Machine learning models identify unusual patterns in network traffic and behavior',
      icon: <WarningIcon />,
      metrics: [
        { label: 'Accuracy', value: '94.2%', color: 'success' },
        { label: 'Anomalies Today', value: '12', color: 'warning' },
      ],
      status: 'active',
    },
    {
      title: 'Threat Predictions',
      description: 'Predictive models forecast potential threats based on historical patterns',
      icon: <TrendingUpIcon />,
      metrics: [
        { label: 'Predictions', value: '34', color: 'info' },
        { label: 'Confidence', value: '87%', color: 'success' },
      ],
      status: 'active',
    },
    {
      title: 'IOC Extraction',
      description: 'AI-powered extraction of indicators from unstructured threat intelligence',
      icon: <EmojiObjectsIcon />,
      metrics: [
        { label: 'Extracted', value: '1.2K', color: 'primary' },
        { label: 'Precision', value: '91%', color: 'success' },
      ],
      status: 'active',
    },
    {
      title: 'Attack Pattern Learning',
      description: 'Continuous learning from attack flows to improve detection accuracy',
      icon: <ModelTrainingIcon />,
      metrics: [
        { label: 'Patterns', value: '456', color: 'info' },
        { label: 'Model Version', value: 'v3.2', color: 'default' },
      ],
      status: 'training',
    },
    {
      title: 'Automated Triage',
      description: 'Intelligent alert prioritization based on severity and context',
      icon: <SpeedIcon />,
      metrics: [
        { label: 'Triaged', value: '245', color: 'primary' },
        { label: 'Auto-Resolved', value: '58%', color: 'success' },
      ],
      status: 'active',
    },
    {
      title: 'Smart Recommendations',
      description: 'Context-aware suggestions for investigation and remediation actions',
      icon: <RecommendIcon />,
      metrics: [
        { label: 'Suggestions', value: '89', color: 'info' },
        { label: 'Accepted', value: '73%', color: 'success' },
      ],
      status: 'beta',
    },
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 6, textAlign: 'center' }}>
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 3,
            p: 3,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          }}
        >
          <PsychologyIcon sx={{ fontSize: 48, color: 'white' }} />
        </Box>
        <Typography variant="h3" gutterBottom sx={{ fontWeight: 700 }}>
          ML & AI Intelligence
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 800, mx: 'auto', mb: 3 }}>
          Advanced machine learning models enhance threat detection, prediction, and automated response capabilities.
        </Typography>
        <Chip
          label="Backend: 100% Complete"
          color="success"
          icon={<CheckCircleIcon />}
          sx={{ mr: 2, px: 2, py: 2.5, fontSize: '0.95rem' }}
        />
        <Chip
          label="Phase 8"
          color="primary"
          sx={{ mr: 2, px: 2, py: 2.5, fontSize: '0.95rem' }}
        />
        <Chip
          label="NEW"
          color="secondary"
          sx={{ px: 2, py: 2.5, fontSize: '0.95rem' }}
        />
      </Box>

      {/* Backend Implementation Status */}
      <Paper
        elevation={0}
        sx={{
          p: 4,
          mb: 4,
          background: 'linear-gradient(135deg, rgba(240, 147, 251, 0.1) 0%, rgba(245, 87, 108, 0.1) 100%)',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
          Backend ML Service Ready
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={8}>
            <Typography variant="body1" sx={{ mb: 1 }}>
              <strong>MLAIService.ts</strong> - 1,179 lines
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ pl: 2, mb: 2 }}>
              Anomaly detection, threat prediction, IOC extraction, pattern learning, automated triage, smart recommendations
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="h4" color="success.main" sx={{ fontWeight: 700 }}>
                100%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Backend Complete
              </Typography>
            </Box>
          </Grid>
        </Grid>
        <Box sx={{ mt: 2 }}>
          <LinearProgress
            variant="determinate"
            value={100}
            sx={{
              height: 8,
              borderRadius: 1,
              backgroundColor: 'rgba(0, 0, 0, 0.1)',
              '& .MuiLinearProgress-bar': {
                background: 'linear-gradient(90deg, #f093fb 0%, #f5576c 100%)',
              },
            }}
          />
        </Box>
      </Paper>

      {/* Features Grid */}
      <Grid container spacing={3}>
        {features.map((feature, index) => (
          <Grid item xs={12} md={6} lg={4} key={index}>
            <Card
              elevation={0}
              sx={{
                height: '100%',
                border: '1px solid',
                borderColor: 'divider',
                transition: 'all 0.3s',
                position: 'relative',
                overflow: 'visible',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 3,
                },
              }}
            >
              {feature.status === 'beta' && (
                <Chip
                  label="BETA"
                  size="small"
                  color="secondary"
                  sx={{
                    position: 'absolute',
                    top: -12,
                    right: 16,
                    fontWeight: 600,
                  }}
                />
              )}
              {feature.status === 'training' && (
                <Chip
                  label="TRAINING"
                  size="small"
                  color="info"
                  sx={{
                    position: 'absolute',
                    top: -12,
                    right: 16,
                    fontWeight: 600,
                  }}
                />
              )}
              <CardContent sx={{ p: 3 }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 56,
                    height: 56,
                    borderRadius: 2,
                    mb: 2,
                    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                    color: 'white',
                  }}
                >
                  {feature.icon}
                </Box>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  {feature.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  {feature.description}
                </Typography>

                {/* Metrics */}
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  {feature.metrics.map((metric, idx) => (
                    <Box key={idx} sx={{ flex: '1 1 45%' }}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {metric.label}
                      </Typography>
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 700,
                          color: `${metric.color}.main`,
                        }}
                      >
                        {metric.value}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Model Performance Section */}
      <Box sx={{ mt: 6 }}>
        <Paper
          elevation={0}
          sx={{
            p: 4,
            background: 'linear-gradient(135deg, rgba(240, 147, 251, 0.05) 0%, rgba(245, 87, 108, 0.05) 100%)',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
            Model Performance Overview
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h3" sx={{ fontWeight: 700, color: 'success.main' }}>
                  94.2%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Detection Accuracy
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h3" sx={{ fontWeight: 700, color: 'info.main' }}>
                  1.2K
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  IOCs Extracted
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h3" sx={{ fontWeight: 700, color: 'warning.main' }}>
                  58%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Auto-Triaged Alerts
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h3" sx={{ fontWeight: 700, color: 'primary.main' }}>
                  456
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Attack Patterns
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </Box>
    </Container>
  );
};

export default MLAIPlaceholder;
