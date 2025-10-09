import {
  Typography,
  Box,
  FormControlLabel,
  Switch,
  InputLabel,
  TextField,
  Chip,
  CircularProgress,
  Tabs,
  Tab,
  Avatar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Alert,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  SmartToy as AiIcon,
  Security as SecurityIcon,
  Movie as StoryIcon,
  Timeline as EdgeIcon,
  Palette as ThemeIcon,
  Info as InfoIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import React, { useState, useEffect } from 'react';

import { ProviderSettings } from '../../../shared/hooks/useProviderSettings';
import { useThemeContext } from '../../../shared/context/ThemeProvider';

import { 
  DropdownFormControl, 
  DropdownSelect,
  DropdownMenuItem
} from '../../../shared/components/Dropdown';
import { 
  EnhancedDialog, 
  EnhancedDialogContent, 
  EnhancedDialogActions,
  PrimaryButton,
  SecondaryButton 
} from '../../../shared/components/EnhancedDialog';
import { 
  FormSection,
  FormSectionTitle,
  EnhancedSlider 
} from '../../../shared/components/EnhancedForm';

interface SettingsDialogProps {
  open: boolean;
  cinematicMode: boolean;
  edgeColor: string;
  edgeStyle: string;
  edgeCurve: string;
  storyModeSpeed: number;
  providerSettings: ProviderSettings;
  onClose: () => void;
  onCinematicModeChange: (enabled: boolean) => void;
  onEdgeColorChange: (color: string) => void;
  onEdgeStyleChange: (style: string) => void;
  onEdgeCurveChange: (curve: string) => void;
  onStoryModeSpeedChange: (speed: number) => void;
  onProviderSettingsChange: (settings: ProviderSettings) => void;
  onSave: (settings: {
    cinematicMode: boolean;
    edgeColor: string;
    edgeStyle: string;
    edgeCurve: string;
    storyModeSpeed: number;
    providerSettings: ProviderSettings;
  }) => void;
}

export default function SettingsDialog({
  open,
  cinematicMode,
  edgeColor,
  edgeStyle,
  edgeCurve,
  storyModeSpeed,
  providerSettings,
  onClose,
  onCinematicModeChange,
  onEdgeColorChange,
  onEdgeStyleChange,
  onEdgeCurveChange,
  onStoryModeSpeedChange,
  onProviderSettingsChange,
  onSave,
}: SettingsDialogProps) {
  const { theme, themeMode, setThemeMode } = useThemeContext();
  
  const togglePasswordVisibility = (field: string) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };
  
  const getConnectionIcon = (provider: string) => {
    const status = connectionStatus[provider];
    if (status === 'success') return <CheckIcon sx={{ color: theme.colors.status.success.accent, fontSize: 16 }} />;
    if (status === 'error') return <ErrorIcon sx={{ color: theme.colors.status.error.accent, fontSize: 16 }} />;
    return null;
  };
  
  // Local state for dialog - only apply on save
  const [localCinematicMode, setLocalCinematicMode] = useState(cinematicMode);
  const [localEdgeColor, setLocalEdgeColor] = useState(edgeColor);
  const [localEdgeStyle, setLocalEdgeStyle] = useState(edgeStyle);
  const [localEdgeCurve, setLocalEdgeCurve] = useState(edgeCurve);
  const [localStoryModeSpeed, setLocalStoryModeSpeed] = useState(storyModeSpeed);
  const [localProviderSettings, setLocalProviderSettings] = useState(providerSettings);
  const [testingConnection, setTestingConnection] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<Record<string, 'success' | 'error' | 'idle'>>({});
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  
  // Update local state when props change (when dialog opens)
  useEffect(() => {
    setLocalCinematicMode(cinematicMode);
    setLocalEdgeColor(edgeColor);
    setLocalEdgeStyle(edgeStyle);
    setLocalEdgeCurve(edgeCurve);
    setLocalStoryModeSpeed(storyModeSpeed);
    setLocalProviderSettings(providerSettings);
    
    // Debug logging
    if (open) {
      console.log('🔧 Settings Dialog opened with providerSettings:', providerSettings);
      console.log('🔧 Picus settings:', providerSettings.picus);
    }
  }, [cinematicMode, edgeColor, edgeStyle, edgeCurve, storyModeSpeed, providerSettings, open]);
  
  const handleSave = () => {
    // Apply all settings at once by passing the local values directly
    onCinematicModeChange(localCinematicMode);
    onEdgeColorChange(localEdgeColor);
    onEdgeStyleChange(localEdgeStyle);
    onEdgeCurveChange(localEdgeCurve);
    onStoryModeSpeedChange(localStoryModeSpeed);
    onProviderSettingsChange(localProviderSettings);
    
    // Pass the values to save immediately
    onSave({
      cinematicMode: localCinematicMode,
      edgeColor: localEdgeColor,
      edgeStyle: localEdgeStyle,
      edgeCurve: localEdgeCurve,
      storyModeSpeed: localStoryModeSpeed,
      providerSettings: localProviderSettings
    });
  };
  
  const handleCancel = () => {
    // Reset local state to current values
    setLocalCinematicMode(cinematicMode);
    setLocalEdgeColor(edgeColor);
    setLocalEdgeStyle(edgeStyle);
    setLocalEdgeCurve(edgeCurve);
    setLocalStoryModeSpeed(storyModeSpeed);
    setLocalProviderSettings(providerSettings);
    onClose();
  };

  const handleProviderChange = (provider: 'claude' | 'ollama' | 'openai' | 'openrouter') => {
    setLocalProviderSettings(prev => ({
      ...prev,
      currentProvider: provider
    }));
  };

  const handleProviderConfigChange = (provider: 'claude' | 'ollama' | 'openai' | 'openrouter' | 'picus', field: string, value: string) => {
    setLocalProviderSettings(prev => {
      // Initialize picus object if it doesn't exist
      const currentPicus = prev.picus || { baseUrl: 'https://api.picussecurity.com', refreshToken: '', enabled: false };
      
      return {
        ...prev,
        [provider]: provider === 'picus' ? {
          ...currentPicus,
          [field]: field === 'enabled' ? value === 'true' : value
        } : {
          ...prev[provider],
          [field]: field === 'enabled' ? value === 'true' : value
        }
      };
    });
  };

  const testConnection = async (provider: 'claude' | 'ollama' | 'openai' | 'openrouter' | 'picus') => {
    setTestingConnection(provider);
    try {
      const config = localProviderSettings[provider];
      const endpoint = provider === 'picus' ? '/api/test-picus' : '/api/test-provider';
      
      const response = await fetch(`http://localhost:3001${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider,
          config,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        console.log(`✅ ${provider} connection successful`);
        setConnectionStatus(prev => ({ ...prev, [provider]: 'success' }));
      } else {
        console.error(`❌ ${provider} connection failed:`, result.error);
        setConnectionStatus(prev => ({ ...prev, [provider]: 'error' }));
      }
    } catch (error) {
      console.error(`❌ ${provider} connection test failed:`, error);
      setConnectionStatus(prev => ({ ...prev, [provider]: 'error' }));
    } finally {
      setTestingConnection(null);
    }
  };
  const tabs = [
    { label: 'AI Provider', icon: <AiIcon />, value: 0 },
    { label: 'Security', icon: <SecurityIcon />, value: 1 },
    { label: 'Appearance', icon: <ThemeIcon />, value: 2 },
    { label: 'Visualization', icon: <EdgeIcon />, value: 3 },
  ];
  
  return (
    <EnhancedDialog
      open={open}
      onClose={handleCancel}
      title="Settings"
      maxWidth="md"
      fullWidth
      size="large"
    >
      <EnhancedDialogContent sx={{ p: 0 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3, pt: 2 }}>
          <Tabs 
            value={activeTab} 
            onChange={(_, newValue) => setActiveTab(newValue)}
            variant="fullWidth"
            sx={{
              '& .MuiTab-root': {
                color: theme.colors.text.secondary,
                textTransform: 'none',
                fontWeight: 500,
                minHeight: 48,
                '&.Mui-selected': {
                  color: theme.colors.brand.primary,
                },
              },
              '& .MuiTabs-indicator': {
                backgroundColor: theme.colors.brand.primary,
              },
            }}
          >
            {tabs.map((tab) => (
              <Tab
                key={tab.value}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {tab.icon}
                    {tab.label}
                  </Box>
                }
                value={tab.value}
              />
            ))}
          </Tabs>
        </Box>
        
        <Box sx={{ p: 3, minHeight: 400 }}>
          
          {/* Tab Content */}
          
          {/* AI Provider Tab */}
          {activeTab === 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Avatar sx={{ 
                  bgcolor: theme.colors.brand.primary, 
                  width: 32, 
                  height: 32 
                }}>
                  <AiIcon sx={{ fontSize: 18 }} />
                </Avatar>
                <Box>
                  <Typography variant="h6" sx={{ 
                    color: theme.colors.text.primary,
                    fontWeight: 600,
                    mb: 0.5 
                  }}>
                    AI Provider Configuration
                  </Typography>
                  <Typography variant="body2" sx={{ 
                    color: theme.colors.text.secondary 
                  }}>
                    Configure your AI provider for threat analysis
                  </Typography>
                </Box>
              </Box>
              
              <FormSection>
                <FormSectionTitle>
                  Select Provider
                </FormSectionTitle>
            
            {/* Provider Selection */}
            <DropdownFormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Current Provider</InputLabel>
              <DropdownSelect
                value={localProviderSettings.currentProvider}
                onChange={(e) => handleProviderChange(e.target.value as 'claude' | 'ollama' | 'openai' | 'openrouter')}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      backgroundColor: theme.colors.menu.dialog,
                      border: `1px solid ${theme.colors.surface.border.subtle}`,
                      borderRadius: 2,
                      '& .MuiMenuItem-root': {
                        color: theme.colors.text.primary,
                        '&:hover': {
                          backgroundColor: theme.colors.surface.hover,
                        },
                        '&.Mui-selected': {
                          backgroundColor: theme.colors.surface.selected,
                          '&:hover': {
                            backgroundColor: theme.colors.surface.selected,
                          },
                        },
                      },
                    }
                  }
                }}
              >
                <DropdownMenuItem value="claude">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    Claude (Anthropic)
                    <Chip 
                      size="small" 
                      label="Vision" 
                      sx={{ 
                        height: 18, 
                        fontSize: '0.65rem',
                        backgroundColor: 'rgba(76, 175, 80, 0.2)',
                        color: 'rgba(76, 175, 80, 0.9)'
                      }} 
                    />
                  </Box>
                </DropdownMenuItem>
                <DropdownMenuItem value="ollama">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    Ollama (Local)
                    <Chip 
                      size="small" 
                      label="Free" 
                      sx={{ 
                        height: 18, 
                        fontSize: '0.65rem',
                        backgroundColor: 'rgba(33, 150, 243, 0.2)',
                        color: 'rgba(33, 150, 243, 0.9)'
                      }} 
                    />
                  </Box>
                </DropdownMenuItem>
                <DropdownMenuItem value="openai">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    OpenAI
                    <Chip 
                      size="small" 
                      label="Vision" 
                      sx={{ 
                        height: 18, 
                        fontSize: '0.65rem',
                        backgroundColor: 'rgba(76, 175, 80, 0.2)',
                        color: 'rgba(76, 175, 80, 0.9)'
                      }} 
                    />
                  </Box>
                </DropdownMenuItem>
                <DropdownMenuItem value="openrouter">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    OpenRouter
                    <Chip 
                      size="small" 
                      label="Multi-Model" 
                      sx={{ 
                        height: 18, 
                        fontSize: '0.65rem',
                        backgroundColor: 'rgba(156, 39, 176, 0.2)',
                        color: 'rgba(156, 39, 176, 0.9)'
                      }} 
                    />
                  </Box>
                </DropdownMenuItem>
              </DropdownSelect>
            </DropdownFormControl>

            {/* Claude Configuration */}
            {localProviderSettings.currentProvider === 'claude' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2, border: `1px solid ${theme.colors.surface.border.subtle}`, borderRadius: 2, backgroundColor: theme.colors.background.secondary }}>
                <Typography variant="body2" sx={{ color: theme.colors.text.secondary, mb: 1 }}>
                  Claude Configuration
                </Typography>
                
                <TextField
                  label="API Key"
                  type="password"
                  value={localProviderSettings.claude.apiKey}
                  onChange={(e) => handleProviderConfigChange('claude', 'apiKey', e.target.value)}
                  fullWidth
                  size="small"
                  placeholder="sk-ant-..."
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: theme.colors.text.primary,
                      '& fieldset': { borderColor: theme.colors.surface.border.default },
                      '&:hover fieldset': { borderColor: theme.colors.surface.border.emphasis },
                    },
                    '& .MuiInputLabel-root': { color: theme.colors.text.secondary },
                  }}
                />
                
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <TextField
                    label="Model"
                    value={localProviderSettings.claude.model}
                    onChange={(e) => handleProviderConfigChange('claude', 'model', e.target.value)}
                    size="small"
                    sx={{
                      flex: 1,
                      '& .MuiOutlinedInput-root': {
                        color: 'rgba(255, 255, 255, 0.9)',
                        '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                        '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                      },
                      '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
                    }}
                  />
                  <SecondaryButton 
                    onClick={() => testConnection('claude')}
                    disabled={testingConnection === 'claude' || !localProviderSettings.claude.apiKey}
                    sx={{ minWidth: 80 }}
                  >
                    {testingConnection === 'claude' ? <CircularProgress size={16} /> : 'Test'}
                  </SecondaryButton>
                </Box>
              </Box>
            )}

            {/* Ollama Configuration */}
            {localProviderSettings.currentProvider === 'ollama' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2, border: `1px solid ${theme.colors.surface.border.subtle}`, borderRadius: 2, backgroundColor: theme.colors.background.secondary }}>
                <Typography variant="body2" sx={{ color: theme.colors.text.secondary, mb: 1 }}>
                  Ollama Configuration
                </Typography>
                
                <TextField
                  label="Base URL"
                  value={localProviderSettings.ollama.baseUrl}
                  onChange={(e) => handleProviderConfigChange('ollama', 'baseUrl', e.target.value)}
                  fullWidth
                  size="small"
                  placeholder="http://localhost:11434"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: theme.colors.text.primary,
                      '& fieldset': { borderColor: theme.colors.surface.border.default },
                      '&:hover fieldset': { borderColor: theme.colors.surface.border.emphasis },
                    },
                    '& .MuiInputLabel-root': { color: theme.colors.text.secondary },
                  }}
                />
                
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <TextField
                    label="Model"
                    value={localProviderSettings.ollama.model}
                    onChange={(e) => handleProviderConfigChange('ollama', 'model', e.target.value)}
                    size="small"
                    placeholder="llama3.2-vision:latest"
                    sx={{
                      flex: 1,
                      '& .MuiOutlinedInput-root': {
                        color: 'rgba(255, 255, 255, 0.9)',
                        '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                        '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                      },
                      '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
                    }}
                  />
                  <SecondaryButton 
                    onClick={() => testConnection('ollama')}
                    disabled={testingConnection === 'ollama' || !localProviderSettings.ollama.baseUrl}
                    sx={{ minWidth: 80 }}
                  >
                    {testingConnection === 'ollama' ? <CircularProgress size={16} /> : 'Test'}
                  </SecondaryButton>
                </Box>
                
                <Typography variant="body2" sx={{ color: theme.colors.text.tertiary, fontSize: '0.75rem' }}>
                  💡 Recommended models: llama3.2-vision:latest, llava:latest
                </Typography>
              </Box>
            )}

            {/* OpenAI Configuration */}
            {localProviderSettings.currentProvider === 'openai' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2, border: `1px solid ${theme.colors.surface.border.subtle}`, borderRadius: 2, backgroundColor: theme.colors.background.secondary }}>
                <Typography variant="body2" sx={{ color: theme.colors.text.secondary, mb: 1 }}>
                  OpenAI Configuration
                </Typography>
                
                <TextField
                  label="API Key"
                  type="password"
                  value={localProviderSettings.openai.apiKey}
                  onChange={(e) => handleProviderConfigChange('openai', 'apiKey', e.target.value)}
                  fullWidth
                  size="small"
                  placeholder="sk-..."
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: theme.colors.text.primary,
                      '& fieldset': { borderColor: theme.colors.surface.border.default },
                      '&:hover fieldset': { borderColor: theme.colors.surface.border.emphasis },
                    },
                    '& .MuiInputLabel-root': { color: theme.colors.text.secondary },
                  }}
                />
                
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <TextField
                    label="Model"
                    value={localProviderSettings.openai.model}
                    onChange={(e) => handleProviderConfigChange('openai', 'model', e.target.value)}
                    size="small"
                    placeholder="gpt-4o"
                    sx={{
                      flex: 1,
                      '& .MuiOutlinedInput-root': {
                        color: 'rgba(255, 255, 255, 0.9)',
                        '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                        '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                      },
                      '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
                    }}
                  />
                  
                  <SecondaryButton
                    onClick={() => testConnection('openai')}
                    disabled={testingConnection === 'openai' || !localProviderSettings.openai.apiKey}
                    sx={{ minWidth: 80 }}
                  >
                    {testingConnection === 'openai' ? <CircularProgress size={16} /> : 'Test'}
                  </SecondaryButton>
                </Box>
                
                <Typography variant="body2" sx={{ color: theme.colors.text.tertiary, fontSize: '0.75rem' }}>
                  💡 Recommended models: gpt-4o, gpt-4-vision-preview, gpt-4-turbo
                </Typography>
              </Box>
            )}

            {/* OpenRouter Configuration */}
            {localProviderSettings.currentProvider === 'openrouter' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2, border: `1px solid ${theme.colors.surface.border.subtle}`, borderRadius: 2, backgroundColor: theme.colors.background.secondary }}>
                <Typography variant="body2" sx={{ color: theme.colors.text.secondary, mb: 1 }}>
                  OpenRouter Configuration
                </Typography>
                
                <TextField
                  label="API Key"
                  type="password"
                  value={localProviderSettings.openrouter.apiKey}
                  onChange={(e) => handleProviderConfigChange('openrouter', 'apiKey', e.target.value)}
                  fullWidth
                  size="small"
                  placeholder="sk-or-..."
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: theme.colors.text.primary,
                      '& fieldset': { borderColor: theme.colors.surface.border.default },
                      '&:hover fieldset': { borderColor: theme.colors.surface.border.emphasis },
                    },
                    '& .MuiInputLabel-root': { color: theme.colors.text.secondary },
                  }}
                />
                
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <TextField
                    label="Model"
                    value={localProviderSettings.openrouter.model}
                    onChange={(e) => handleProviderConfigChange('openrouter', 'model', e.target.value)}
                    size="small"
                    placeholder="anthropic/claude-3.5-sonnet"
                    sx={{
                      flex: 1,
                      '& .MuiOutlinedInput-root': {
                        color: 'rgba(255, 255, 255, 0.9)',
                        '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                        '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                      },
                      '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
                    }}
                  />
                  
                  <SecondaryButton
                    onClick={() => testConnection('openrouter')}
                    disabled={testingConnection === 'openrouter' || !localProviderSettings.openrouter.apiKey}
                    sx={{ minWidth: 80 }}
                  >
                    {testingConnection === 'openrouter' ? <CircularProgress size={16} /> : 'Test'}
                  </SecondaryButton>
                </Box>
                
                <Typography variant="body2" sx={{ color: theme.colors.text.tertiary, fontSize: '0.75rem' }}>
                  💡 Popular models: anthropic/claude-3.5-sonnet, openai/gpt-4o, google/gemini-pro-vision
                </Typography>
              </Box>
            )}
          </FormSection>
            </Box>
          )}

          {/* Security Tab */}
          {activeTab === 1 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Avatar sx={{ 
                  bgcolor: theme.colors.brand.primary, 
                  width: 32, 
                  height: 32 
                }}>
                  <SecurityIcon sx={{ fontSize: 18 }} />
                </Avatar>
                <Box>
                  <Typography variant="h6" sx={{ 
                    color: theme.colors.text.primary,
                    fontWeight: 600,
                    mb: 0.5 
                  }}>
                    Security & Integrations
                  </Typography>
                  <Typography variant="body2" sx={{ 
                    color: theme.colors.text.secondary 
                  }}>
                    Configure security tools and threat intelligence feeds
                  </Typography>
                </Box>
              </Box>

              <FormSection>
                <FormSectionTitle>
                  Picus Security Integration
                </FormSectionTitle>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2, border: `1px solid ${theme.colors.surface.border.subtle}`, borderRadius: 2, backgroundColor: theme.colors.background.secondary }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Box>
                      <Typography variant="body2" sx={{ color: theme.colors.text.primary, fontWeight: 500 }}>
                        Enable Picus Security IOC Enrichment
                      </Typography>
                      <Typography variant="caption" sx={{ color: theme.colors.text.tertiary }}>
                        Enhance IOCs with threat intelligence from Picus
                      </Typography>
                    </Box>
                    <Switch
                      checked={localProviderSettings.picus?.enabled || false}
                      onChange={(e) => handleProviderConfigChange('picus', 'enabled', e.target.checked.toString())}
                      sx={{
                        '& .MuiSwitch-switchBase': {
                          color: theme.colors.text.secondary,
                          '&.Mui-checked': {
                            color: theme.colors.brand.primary,
                          },
                          '&.Mui-checked + .MuiSwitch-track': {
                            backgroundColor: theme.colors.brand.light,
                          },
                        },
                        '& .MuiSwitch-track': {
                          backgroundColor: theme.colors.surface.rest,
                        },
                      }}
                    />
                  </Box>

                  {(localProviderSettings.picus?.enabled === true) && (
                    <>
                      <TextField
                        label="Picus API Base URL"
                        value={localProviderSettings.picus?.baseUrl || ''}
                        onChange={(e) => handleProviderConfigChange('picus', 'baseUrl', e.target.value)}
                        fullWidth
                        size="small"
                        placeholder="https://api.picussecurity.com"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            color: theme.colors.text.primary,
                            '& fieldset': { borderColor: theme.colors.surface.border.default },
                            '&:hover fieldset': { borderColor: theme.colors.surface.border.emphasis },
                          },
                          '& .MuiInputLabel-root': { color: theme.colors.text.secondary },
                        }}
                      />
                      
                      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
                        <TextField
                          label="Refresh Token"
                          type={showPasswords.picus ? 'text' : 'password'}
                          value={localProviderSettings.picus?.refreshToken || ''}
                          onChange={(e) => handleProviderConfigChange('picus', 'refreshToken', e.target.value)}
                          size="small"
                          placeholder="Your Picus refresh token"
                          sx={{
                            flex: 1,
                            '& .MuiOutlinedInput-root': {
                              color: theme.colors.text.primary,
                              '& fieldset': { borderColor: theme.colors.surface.border.default },
                              '&:hover fieldset': { borderColor: theme.colors.surface.border.emphasis },
                            },
                            '& .MuiInputLabel-root': { color: theme.colors.text.secondary },
                          }}
                          InputProps={{
                            endAdornment: (
                              <IconButton
                                onClick={() => togglePasswordVisibility('picus')}
                                edge="end"
                                size="small"
                                sx={{ color: theme.colors.text.secondary }}
                              >
                                {showPasswords.picus ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                              </IconButton>
                            ),
                          }}
                        />
                        <Tooltip title={connectionStatus.picus === 'success' ? 'Connection successful' : connectionStatus.picus === 'error' ? 'Connection failed' : 'Test connection'}>
                          <SecondaryButton 
                            onClick={() => testConnection('picus')}
                            disabled={testingConnection === 'picus' || !localProviderSettings.picus?.baseUrl || !localProviderSettings.picus?.refreshToken}
                            sx={{ minWidth: 80, display: 'flex', alignItems: 'center', gap: 1 }}
                          >
                            {testingConnection === 'picus' ? (
                              <CircularProgress size={16} />
                            ) : (
                              <>
                                {getConnectionIcon('picus')}
                                Test
                              </>
                            )}
                          </SecondaryButton>
                        </Tooltip>
                      </Box>
                      
                      <Alert severity="info" sx={{ mt: 1 }}>
                        <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                          💡 Get your refresh token from Picus Security Console → API Settings
                        </Typography>
                      </Alert>
                    </>
                  )}
                </Box>
              </FormSection>
            </Box>
          )}

          {/* Appearance Tab */}
          {activeTab === 2 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Avatar sx={{ 
                  bgcolor: theme.colors.brand.primary, 
                  width: 32, 
                  height: 32 
                }}>
                  <ThemeIcon sx={{ fontSize: 18 }} />
                </Avatar>
                <Box>
                  <Typography variant="h6" sx={{ 
                    color: theme.colors.text.primary,
                    fontWeight: 600,
                    mb: 0.5 
                  }}>
                    Appearance & Theme
                  </Typography>
                  <Typography variant="body2" sx={{ 
                    color: theme.colors.text.secondary 
                  }}>
                    Customize the visual appearance of ThreatFlow
                  </Typography>
                </Box>
              </Box>

              <FormSection>
                <FormSectionTitle>
                  Theme Selection
                </FormSectionTitle>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <List sx={{ p: 0 }}>
                    <ListItem 
                      button 
                      onClick={() => setThemeMode('light')}
                      sx={{ 
                        border: `1px solid ${themeMode === 'light' ? theme.colors.brand.primary : theme.colors.surface.border.subtle}`,
                        borderRadius: 2,
                        mb: 1,
                        backgroundColor: themeMode === 'light' ? theme.colors.brand.light : 'transparent',
                        '&:hover': {
                          backgroundColor: theme.colors.surface.hover,
                        }
                      }}
                    >
                      <ListItemIcon>
                        <Box sx={{ 
                          width: 24, 
                          height: 24, 
                          borderRadius: '50%', 
                          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                          border: '2px solid #e2e8f0'
                        }} />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Light Theme"
                        secondary="Clean white interface for bright environments"
                        primaryTypographyProps={{ 
                          sx: { color: theme.colors.text.primary, fontWeight: themeMode === 'light' ? 600 : 400 } 
                        }}
                        secondaryTypographyProps={{ 
                          sx: { color: theme.colors.text.secondary } 
                        }}
                      />
                      {themeMode === 'light' && (
                        <CheckIcon sx={{ color: theme.colors.brand.primary }} />
                      )}
                    </ListItem>
                    
                    <ListItem 
                      button 
                      onClick={() => setThemeMode('dark')}
                      sx={{ 
                        border: `1px solid ${themeMode === 'dark' ? theme.colors.brand.primary : theme.colors.surface.border.subtle}`,
                        borderRadius: 2,
                        backgroundColor: themeMode === 'dark' ? theme.colors.brand.light : 'transparent',
                        '&:hover': {
                          backgroundColor: theme.colors.surface.hover,
                        }
                      }}
                    >
                      <ListItemIcon>
                        <Box sx={{ 
                          width: 24, 
                          height: 24, 
                          borderRadius: '50%', 
                          background: 'linear-gradient(135deg, #080a0f 0%, #0f1419 100%)',
                          border: '2px solid #1a1f26'
                        }} />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Dark Theme"
                        secondary="Professional dark interface for extended use"
                        primaryTypographyProps={{ 
                          sx: { color: theme.colors.text.primary, fontWeight: themeMode === 'dark' ? 600 : 400 } 
                        }}
                        secondaryTypographyProps={{ 
                          sx: { color: theme.colors.text.secondary } 
                        }}
                      />
                      {themeMode === 'dark' && (
                        <CheckIcon sx={{ color: theme.colors.brand.primary }} />
                      )}
                    </ListItem>
                  </List>
                </Box>
              </FormSection>

              <FormSection>
                <FormSectionTitle>
                  Story Mode
                </FormSectionTitle>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={localCinematicMode}
                        onChange={(e) => setLocalCinematicMode(e.target.checked)}
                        sx={{
                          '& .MuiSwitch-switchBase': {
                            color: theme.colors.text.secondary,
                            '&.Mui-checked': {
                              color: theme.colors.brand.primary,
                            },
                            '&.Mui-checked + .MuiSwitch-track': {
                              backgroundColor: theme.colors.brand.light,
                            },
                          },
                          '& .MuiSwitch-track': {
                            backgroundColor: theme.colors.surface.rest,
                          },
                        }}
                      />
                    }
                    label={
                      <Box>
                        <Typography sx={{ 
                          color: theme.colors.text.primary, 
                          fontSize: '0.9rem',
                          fontWeight: 500 
                        }}>
                          Cinematic Mode
                        </Typography>
                        <Typography sx={{ 
                          color: theme.colors.text.tertiary, 
                          fontSize: '0.75rem',
                          mt: 0.5 
                        }}>
                          Fade top and bottom edges during story mode playback
                        </Typography>
                      </Box>
                    }
                    sx={{ alignItems: 'flex-start', ml: 0 }}
                  />
                  
                  <Box>
                    <Typography sx={{ 
                      color: theme.colors.text.primary,
                      fontSize: '0.9rem',
                      fontWeight: 500,
                      mb: 1,
                    }}>
                      Playback Speed
                    </Typography>
                    <Typography sx={{ 
                      color: theme.colors.text.tertiary, 
                      fontSize: '0.75rem',
                      mb: 2
                    }}>
                      Time between each step in story mode playback
                    </Typography>
                    <Box sx={{ px: 1 }}>
                      <EnhancedSlider
                        value={localStoryModeSpeed || 3}
                        onChange={(_, newValue) => setLocalStoryModeSpeed(newValue as number)}
                        min={1}
                        max={10}
                        step={0.5}
                        marks={[
                          { value: 1, label: '1s' },
                          { value: 3, label: '3s' },
                          { value: 5, label: '5s' },
                          { value: 10, label: '10s' },
                        ]}
                        valueLabelDisplay="auto"
                        valueLabelFormat={(value) => `${value}s`}
                      />
                    </Box>
                  </Box>
                </Box>
              </FormSection>
            </Box>
          )}

          {/* Visualization Tab */}
          {activeTab === 3 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Avatar sx={{ 
                  bgcolor: theme.colors.brand.primary, 
                  width: 32, 
                  height: 32 
                }}>
                  <EdgeIcon sx={{ fontSize: 18 }} />
                </Avatar>
                <Box>
                  <Typography variant="h6" sx={{ 
                    color: theme.colors.text.primary,
                    fontWeight: 600,
                    mb: 0.5 
                  }}>
                    Visualization Settings
                  </Typography>
                  <Typography variant="body2" sx={{ 
                    color: theme.colors.text.secondary 
                  }}>
                    Customize how attack flows are displayed
                  </Typography>
                </Box>
              </Box>

              <FormSection>
                <FormSectionTitle>
                  Edge Styling
                </FormSectionTitle>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <DropdownFormControl size="small" fullWidth>
                    <InputLabel>Color</InputLabel>
                    <DropdownSelect
                      value={localEdgeColor}
                      onChange={(e) => setLocalEdgeColor(e.target.value as string)}
                      label="Color"
                      MenuProps={{
                        PaperProps: {
                          sx: {
                            backgroundColor: theme.colors.menu.dialog,
                            border: `1px solid ${theme.colors.surface.border.subtle}`,
                            borderRadius: 2,
                            '& .MuiMenuItem-root': {
                              color: theme.colors.text.primary,
                              '&:hover': {
                                backgroundColor: theme.colors.surface.hover,
                              },
                              '&.Mui-selected': {
                                backgroundColor: theme.colors.surface.selected,
                                '&:hover': {
                                  backgroundColor: theme.colors.surface.selected,
                                },
                              },
                            },
                          }
                        }
                      }}
                    >
                      <DropdownMenuItem value="default">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 16, height: 2, backgroundColor: theme.colors.brand.primary, borderRadius: 1 }} />
                          Default (Brand Blue)
                        </Box>
                      </DropdownMenuItem>
                      <DropdownMenuItem value="white">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 16, height: 2, backgroundColor: '#ffffff', borderRadius: 1, border: '1px solid rgba(255,255,255,0.3)' }} />
                          White
                        </Box>
                      </DropdownMenuItem>
                    </DropdownSelect>
                  </DropdownFormControl>
                  
                  <DropdownFormControl size="small" fullWidth>
                    <InputLabel>Style</InputLabel>
                    <DropdownSelect
                      value={localEdgeStyle}
                      onChange={(e) => setLocalEdgeStyle(e.target.value as string)}
                      label="Style"
                      MenuProps={{
                        PaperProps: {
                          sx: {
                            backgroundColor: theme.colors.menu.dialog,
                            border: `1px solid ${theme.colors.surface.border.subtle}`,
                            borderRadius: 2,
                            '& .MuiMenuItem-root': {
                              color: theme.colors.text.primary,
                              '&:hover': {
                                backgroundColor: theme.colors.surface.hover,
                              },
                              '&.Mui-selected': {
                                backgroundColor: theme.colors.surface.selected,
                                '&:hover': {
                                  backgroundColor: theme.colors.surface.selected,
                                },
                              },
                            },
                          }
                        }
                      }}
                    >
                      <DropdownMenuItem value="solid">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 16, height: 2, backgroundColor: theme.colors.brand.primary, borderRadius: 1 }} />
                          Solid
                        </Box>
                      </DropdownMenuItem>
                      <DropdownMenuItem value="dashed">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ 
                            width: 16, 
                            height: 2, 
                            background: `repeating-linear-gradient(to right, ${theme.colors.brand.primary}, ${theme.colors.brand.primary} 3px, transparent 3px, transparent 6px)`,
                            borderRadius: 1 
                          }} />
                          Dashed
                        </Box>
                      </DropdownMenuItem>
                    </DropdownSelect>
                  </DropdownFormControl>
                  
                  <DropdownFormControl size="small" fullWidth>
                    <InputLabel>Curve</InputLabel>
                    <DropdownSelect
                      value={localEdgeCurve}
                      onChange={(e) => setLocalEdgeCurve(e.target.value as string)}
                      label="Curve"
                      MenuProps={{
                        PaperProps: {
                          sx: {
                            backgroundColor: theme.colors.menu.dialog,
                            border: `1px solid ${theme.colors.surface.border.subtle}`,
                            borderRadius: 2,
                            '& .MuiMenuItem-root': {
                              color: theme.colors.text.primary,
                              '&:hover': {
                                backgroundColor: theme.colors.surface.hover,
                              },
                              '&.Mui-selected': {
                                backgroundColor: theme.colors.surface.selected,
                                '&:hover': {
                                  backgroundColor: theme.colors.surface.selected,
                                },
                              },
                            },
                          }
                        }
                      }}
                    >
                      <DropdownMenuItem value="smooth">Smooth (Curved)</DropdownMenuItem>
                      <DropdownMenuItem value="straight">Straight</DropdownMenuItem>
                      <DropdownMenuItem value="step">Step (Elbows)</DropdownMenuItem>
                    </DropdownSelect>
                  </DropdownFormControl>
                </Box>
              </FormSection>
            </Box>
          )}
          
        </Box>
      </EnhancedDialogContent>
      
      <EnhancedDialogActions>
        <SecondaryButton onClick={handleCancel}>
          Cancel
        </SecondaryButton>
        <PrimaryButton onClick={handleSave}>
          Save Settings
        </PrimaryButton>
      </EnhancedDialogActions>
    </EnhancedDialog>
  );
}