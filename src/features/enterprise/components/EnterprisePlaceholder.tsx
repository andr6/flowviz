import React from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
} from '@mui/material';
import {
  Business as BusinessIcon,
  Domain as DomainIcon,
  People as PeopleIcon,
  Payment as PaymentIcon,
  History as HistoryIcon,
  Security as SecurityIcon,
  Settings as SettingsIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';

interface EnterpriseFeature {
  title: string;
  description: string;
  icon: React.ReactNode;
  status: 'available' | 'coming-soon';
}

export const EnterprisePlaceholder: React.FC = () => {
  const features: EnterpriseFeature[] = [
    {
      title: 'Multi-Tenancy',
      description: 'Isolated workspaces for different organizations with complete data separation',
      icon: <DomainIcon />,
      status: 'available',
    },
    {
      title: 'User & Role Management',
      description: 'Granular RBAC with custom roles, permissions, and team management',
      icon: <PeopleIcon />,
      status: 'available',
    },
    {
      title: 'Subscription Management',
      description: 'Flexible pricing tiers, usage tracking, and billing automation',
      icon: <PaymentIcon />,
      status: 'available',
    },
    {
      title: 'Audit Logging',
      description: 'Comprehensive activity logs with compliance reporting and forensics',
      icon: <HistoryIcon />,
      status: 'available',
    },
    {
      title: 'SSO & Authentication',
      description: 'SAML, OAuth2, and enterprise identity provider integration',
      icon: <SecurityIcon />,
      status: 'available',
    },
    {
      title: 'Advanced Configuration',
      description: 'Custom branding, API limits, and organization-wide settings',
      icon: <SettingsIcon />,
      status: 'available',
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
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          }}
        >
          <BusinessIcon sx={{ fontSize: 48, color: 'white' }} />
        </Box>
        <Typography variant="h3" gutterBottom sx={{ fontWeight: 700 }}>
          Enterprise Features
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 800, mx: 'auto', mb: 3 }}>
          Backend services are fully implemented and production-ready. Frontend UI integration is in progress.
        </Typography>
        <Chip
          label="Backend: 100% Complete"
          color="success"
          icon={<CheckCircleIcon />}
          sx={{ mr: 2, px: 2, py: 2.5, fontSize: '0.95rem' }}
        />
        <Chip
          label="Frontend: UI In Development"
          color="warning"
          sx={{ px: 2, py: 2.5, fontSize: '0.95rem' }}
        />
      </Box>

      {/* Backend Implementation Status */}
      <Paper
        elevation={0}
        sx={{
          p: 4,
          mb: 4,
          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
          Backend Services Ready
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="body1" sx={{ mb: 1 }}>
              <strong>MultiTenancyService.ts</strong> - 797 lines
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ pl: 2 }}>
              Organization management, workspace isolation, tenant provisioning
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body1" sx={{ mb: 1 }}>
              <strong>AuthService.ts</strong> - 510 lines
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ pl: 2 }}>
              JWT authentication, SSO, role-based access control, session management
            </Typography>
          </Grid>
        </Grid>
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
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 3,
                },
              }}
            >
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
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                  }}
                >
                  {feature.icon}
                </Box>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  {feature.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {feature.description}
                </Typography>
                <Chip
                  label={feature.status === 'available' ? 'Backend Ready' : 'Coming Soon'}
                  size="small"
                  color={feature.status === 'available' ? 'success' : 'default'}
                />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* CTA */}
      <Box sx={{ mt: 6, textAlign: 'center' }}>
        <Paper
          elevation={0}
          sx={{
            p: 4,
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
            Want to Access Enterprise Features?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            The enterprise backend services are fully functional. Contact us to enable the complete UI experience.
          </Typography>
          <Button
            variant="contained"
            size="large"
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              px: 4,
            }}
          >
            Contact Sales
          </Button>
        </Paper>
      </Box>
    </Container>
  );
};

export default EnterprisePlaceholder;
