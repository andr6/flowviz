/**
 * SOAR Integration Panel
 *
 * Manages SOAR platform connections and playbook synchronization
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormControlLabel,
  Checkbox,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
} from '@mui/material';
import {
  CloudSync as SyncIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Settings as SettingsIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  VisibilityOff as HideIcon,
  CloudUpload as UploadIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import type { SOARPlatform, SOARConfig, SOARIntegration } from '../types';

// ============================================================================
// Types
// ============================================================================

interface SOARIntegrationPanelProps {
  playbookId: string;
  onSync: (integration: SOARIntegration) => void;
  onDisconnect: () => void;
}

interface PlatformInfo {
  id: SOARPlatform;
  name: string;
  supported: boolean;
  description: string;
}

// ============================================================================
// Main Component
// ============================================================================

export const SOARIntegrationPanel: React.FC<SOARIntegrationPanelProps> = ({
  playbookId,
  onSync,
  onDisconnect,
}) => {
  const [platforms, setPlatforms] = useState<PlatformInfo[]>([]);
  const [integration, setIntegration] = useState<SOARIntegration | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  // Configuration state
  const [selectedPlatform, setSelectedPlatform] = useState<SOARPlatform>('cortex_xsoar');
  const [apiUrl, setApiUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [username, setUsername] = useState('');
  const [autoSync, setAutoSync] = useState(true);
  const [bidirectionalSync, setBidirectionalSync] = useState(false);
  const [importExecutions, setImportExecutions] = useState(false);

  useEffect(() => {
    loadPlatforms();
    loadIntegration();
  }, [playbookId]);

  const loadPlatforms = async () => {
    try {
      const response = await fetch('/api/soar/platforms');
      if (response.ok) {
        const data = await response.json();
        setPlatforms(data.platforms);
      }
    } catch (error) {
      console.error('Failed to load platforms:', error);
    }
  };

  const loadIntegration = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/soar/integrations?playbookId=${playbookId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.integration) {
          setIntegration(data.integration);
          setSelectedPlatform(data.integration.platform);
          setApiUrl(data.integration.platformUrl || '');
        }
      }
    } catch (error) {
      console.error('Failed to load integration:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setError(null);

    try {
      const config: SOARConfig = {
        apiUrl,
        apiKey,
        username: username || undefined,
        autoSync,
        bidirectionalSync,
        importExecutions,
      };

      const response = await fetch('/api/soar/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: selectedPlatform, config }),
      });

      if (!response.ok) {
        throw new Error('Connection test failed');
      }

      const result = await response.json();

      if (result.connected) {
        setError(null);
      } else {
        setError('Connection failed. Please check your credentials.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection test failed');
    } finally {
      setTesting(false);
    }
  };

  const handleConnect = async () => {
    try {
      setError(null);

      const config: SOARConfig = {
        apiUrl,
        apiKey,
        username: username || undefined,
        autoSync,
        bidirectionalSync,
        importExecutions,
      };

      const response = await fetch('/api/soar/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playbookId,
          platform: selectedPlatform,
          config,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to connect to SOAR platform');
      }

      const newIntegration = await response.json();
      setIntegration(newIntegration);
      setShowConfigDialog(false);
      onSync(newIntegration);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    }
  };

  const handleSync = async () => {
    if (!integration) return;

    setSyncing(true);
    setError(null);

    try {
      const response = await fetch('/api/soar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ integrationId: integration.id }),
      });

      if (!response.ok) {
        throw new Error('Sync failed');
      }

      await loadIntegration();
      onSync(integration);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!integration) return;

    try {
      const response = await fetch(`/api/soar/integrations/${integration.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect');
      }

      setIntegration(null);
      onDisconnect();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Disconnect failed');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <SyncIcon sx={{ fontSize: 32, mr: 2, color: 'primary.main' }} />
          <Typography variant="h6">SOAR Platform Integration</Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {!integration ? (
          // Not Connected State
          <Box>
            <Alert severity="info" sx={{ mb: 3 }}>
              Connect this playbook to a SOAR platform to enable automated execution and synchronization.
            </Alert>

            <Typography variant="subtitle2" gutterBottom>
              Available Platforms
            </Typography>

            <List>
              {platforms.map(platform => (
                <ListItem
                  key={platform.id}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    mb: 1,
                    opacity: platform.supported ? 1 : 0.5,
                  }}
                >
                  <ListItemText
                    primary={platform.name}
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {platform.description}
                        </Typography>
                        {!platform.supported && (
                          <Chip label="Coming Soon" size="small" sx={{ mt: 1 }} />
                        )}
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => {
                        setSelectedPlatform(platform.id);
                        setShowConfigDialog(true);
                      }}
                      disabled={!platform.supported}
                    >
                      Connect
                    </Button>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </Box>
        ) : (
          // Connected State
          <Box>
            <Alert
              severity="success"
              icon={<CheckIcon />}
              sx={{ mb: 3 }}
              action={
                <IconButton color="inherit" size="small" onClick={() => setShowConfigDialog(true)}>
                  <SettingsIcon />
                </IconButton>
              }
            >
              Connected to {platforms.find(p => p.id === integration.platform)?.name}
            </Alert>

            <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1, mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Connection Details
              </Typography>

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 1, mb: 2 }}>
                <Typography variant="body2" color="text.secondary">Platform:</Typography>
                <Typography variant="body2">
                  {platforms.find(p => p.id === integration.platform)?.name}
                </Typography>

                <Typography variant="body2" color="text.secondary">Platform URL:</Typography>
                <Typography variant="body2">{integration.platformUrl}</Typography>

                <Typography variant="body2" color="text.secondary">Status:</Typography>
                <Box>
                  <Chip
                    label={integration.syncStatus}
                    size="small"
                    color={
                      integration.syncStatus === 'synced' ? 'success' :
                      integration.syncStatus === 'failed' ? 'error' :
                      'default'
                    }
                    icon={
                      integration.syncStatus === 'synced' ? <CheckIcon /> :
                      integration.syncStatus === 'failed' ? <ErrorIcon /> :
                      undefined
                    }
                  />
                </Box>

                <Typography variant="body2" color="text.secondary">Last Synced:</Typography>
                <Typography variant="body2">
                  {integration.lastSyncedAt
                    ? new Date(integration.lastSyncedAt).toLocaleString()
                    : 'Never'}
                </Typography>

                <Typography variant="body2" color="text.secondary">Platform Playbook ID:</Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                  {integration.platformPlaybookId}
                </Typography>
              </Box>

              {integration.syncError && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {integration.syncError}
                </Alert>
              )}
            </Box>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" gutterBottom>
              Sync Options
            </Typography>

            <FormControlLabel
              control={
                <Checkbox
                  checked={integration.integrationConfig.autoSync}
                  disabled
                />
              }
              label="Auto-sync on save"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={integration.integrationConfig.bidirectionalSync}
                  disabled
                />
              }
              label="Bi-directional sync"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={integration.integrationConfig.importExecutions}
                  disabled
                />
              }
              label="Import executions from SOAR"
            />

            <Divider sx={{ my: 2 }} />

            <Stack direction="row" spacing={2}>
              <Button
                variant="contained"
                startIcon={syncing ? <CircularProgress size={20} /> : <SyncIcon />}
                onClick={handleSync}
                disabled={syncing}
              >
                {syncing ? 'Syncing...' : 'Sync Now'}
              </Button>

              <Button
                variant="outlined"
                startIcon={<UploadIcon />}
                onClick={() => window.open(integration.platformUrl, '_blank')}
              >
                Open in SOAR
              </Button>

              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={loadIntegration}
              >
                Refresh Status
              </Button>

              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={handleDisconnect}
              >
                Disconnect
              </Button>
            </Stack>
          </Box>
        )}

        {/* Configuration Dialog */}
        <Dialog
          open={showConfigDialog}
          onClose={() => setShowConfigDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            Configure SOAR Integration
            <Typography variant="body2" color="text.secondary">
              {platforms.find(p => p.id === selectedPlatform)?.name}
            </Typography>
          </DialogTitle>

          <DialogContent>
            <FormControl fullWidth sx={{ mb: 2, mt: 1 }}>
              <InputLabel>Platform</InputLabel>
              <Select
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value as SOARPlatform)}
                label="Platform"
              >
                {platforms
                  .filter(p => p.supported)
                  .map(platform => (
                    <MenuItem key={platform.id} value={platform.id}>
                      {platform.name}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="API URL"
              required
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="https://xsoar.company.com"
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="API Key"
              required
              type={showApiKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              sx={{ mb: 2 }}
              InputProps={{
                endAdornment: (
                  <IconButton onClick={() => setShowApiKey(!showApiKey)} edge="end">
                    {showApiKey ? <VisibilityOff /> : <ViewIcon />}
                  </IconButton>
                ),
              }}
            />

            {(selectedPlatform === 'ibm_resilient' || selectedPlatform === 'servicenow') && (
              <TextField
                fullWidth
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                sx={{ mb: 2 }}
              />
            )}

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" gutterBottom>
              Sync Options
            </Typography>

            <FormControlLabel
              control={
                <Checkbox
                  checked={autoSync}
                  onChange={(e) => setAutoSync(e.target.checked)}
                />
              }
              label={
                <Box>
                  <Typography variant="body2">Auto-sync on save</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Automatically sync playbook changes to SOAR platform
                  </Typography>
                </Box>
              }
              sx={{ mb: 1 }}
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={bidirectionalSync}
                  onChange={(e) => setBidirectionalSync(e.target.checked)}
                />
              }
              label={
                <Box>
                  <Typography variant="body2">Bi-directional sync</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Sync changes from SOAR platform back to ThreatFlow
                  </Typography>
                </Box>
              }
              sx={{ mb: 1 }}
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={importExecutions}
                  onChange={(e) => setImportExecutions(e.target.checked)}
                />
              }
              label={
                <Box>
                  <Typography variant="body2">Import executions</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Import playbook execution history from SOAR platform
                  </Typography>
                </Box>
              }
            />
          </DialogContent>

          <DialogActions>
            <Button onClick={() => setShowConfigDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleTestConnection}
              disabled={!apiUrl || !apiKey || testing}
              startIcon={testing ? <CircularProgress size={20} /> : undefined}
            >
              Test Connection
            </Button>
            <Button
              variant="contained"
              onClick={handleConnect}
              disabled={!apiUrl || !apiKey}
            >
              {integration ? 'Update' : 'Connect'}
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default SOARIntegrationPanel;
