import React, { useState, useEffect } from 'react';
import {
  Box,
  FormControl,
  Select,
  MenuItem,
  Typography,
  Chip,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Tab,
  Tabs,
  Paper,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Psychology as PromptIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  FileCopy as CopyIcon,
  ExpandMore as ExpandIcon,
  Star as StarIcon,
  Schedule as RecentIcon,
  Category as CategoryIcon,
  Code as VariableIcon
} from '@mui/icons-material';
import { threatFlowTheme } from '../../../../shared/theme/threatflow-theme';
import { advancedAI, CustomPrompt } from '../../services/advancedAICapabilities';

interface CustomPromptManagerProps {
  selectedPromptId?: string;
  onPromptChange: (promptId: string | null) => void;
  onPromptApply?: (prompt: CustomPrompt, variables: Record<string, string>) => void;
  disabled?: boolean;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index} style={{ paddingTop: 16 }}>
    {value === index && children}
  </div>
);

export const CustomPromptManager: React.FC<CustomPromptManagerProps> = ({
  selectedPromptId,
  onPromptChange,
  onPromptApply,
  disabled = false
}) => {
  const [prompts, setPrompts] = useState<CustomPrompt[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<CustomPrompt | null>(null);
  const [managerOpen, setManagerOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [variablesOpen, setVariablesOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [editingPrompt, setEditingPrompt] = useState<CustomPrompt | null>(null);
  const [variables, setVariables] = useState<Record<string, string>>({});
  
  // Form state for prompt creation/editing
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'general' as CustomPrompt['category'],
    template: '',
    variables: [] as string[],
    tags: [] as string[]
  });

  const categories = [
    { value: 'security', label: 'Security Analysis', icon: '🔐' },
    { value: 'malware', label: 'Malware Analysis', icon: '🦠' },
    { value: 'network', label: 'Network Analysis', icon: '🌐' },
    { value: 'incident', label: 'Incident Response', icon: '🚨' },
    { value: 'threat-intel', label: 'Threat Intelligence', icon: '🎯' },
    { value: 'general', label: 'General Analysis', icon: '📊' }
  ];

  useEffect(() => {
    loadPrompts();
  }, []);

  useEffect(() => {
    if (selectedPromptId) {
      const prompt = prompts.find(p => p.id === selectedPromptId);
      setSelectedPrompt(prompt || null);
    }
  }, [selectedPromptId, prompts]);

  const loadPrompts = () => {
    const allPrompts = advancedAI.getCustomPrompts();
    setPrompts(allPrompts);
  };

  const handlePromptSelect = (promptId: string | null) => {
    const prompt = promptId ? prompts.find(p => p.id === promptId) : null;
    setSelectedPrompt(prompt);
    onPromptChange(promptId);
    
    if (prompt && prompt.variables.length > 0) {
      // Initialize variables
      const initVars: Record<string, string> = {};
      prompt.variables.forEach(variable => {
        initVars[variable] = '';
      });
      setVariables(initVars);
    }
  };

  const openEditor = (prompt?: CustomPrompt) => {
    if (prompt) {
      setEditingPrompt(prompt);
      setFormData({
        name: prompt.name,
        description: prompt.description,
        category: prompt.category,
        template: prompt.template,
        variables: [...prompt.variables],
        tags: [...prompt.tags]
      });
    } else {
      setEditingPrompt(null);
      setFormData({
        name: '',
        description: '',
        category: 'general',
        template: '',
        variables: [],
        tags: []
      });
    }
    setEditorOpen(true);
  };

  const savePrompt = () => {
    try {
      if (editingPrompt && !editingPrompt.isBuiltIn) {
        // Update existing custom prompt
        advancedAI.updateCustomPrompt(editingPrompt.id, {
          name: formData.name,
          description: formData.description,
          category: formData.category,
          template: formData.template,
          variables: formData.variables,
          tags: formData.tags
        });
      } else {
        // Create new prompt
        advancedAI.createCustomPrompt({
          name: formData.name,
          description: formData.description,
          category: formData.category,
          template: formData.template,
          variables: formData.variables,
          tags: formData.tags,
          isBuiltIn: false
        });
      }
      loadPrompts();
      setEditorOpen(false);
    } catch (error) {
      console.error('Failed to save prompt:', error);
    }
  };

  const deletePrompt = (promptId: string) => {
    if (window.confirm('Are you sure you want to delete this custom prompt?')) {
      advancedAI.deleteCustomPrompt(promptId);
      loadPrompts();
      if (selectedPromptId === promptId) {
        handlePromptSelect(null);
      }
    }
  };

  const duplicatePrompt = (prompt: CustomPrompt) => {
    setFormData({
      name: `${prompt.name} (Copy)`,
      description: prompt.description,
      category: prompt.category,
      template: prompt.template,
      variables: [...prompt.variables],
      tags: [...prompt.tags]
    });
    setEditingPrompt(null);
    setEditorOpen(true);
  };

  const extractVariables = (template: string): string[] => {
    const regex = /\{(\w+)\}/g;
    const variables = new Set<string>();
    let match;
    while ((match = regex.exec(template)) !== null) {
      variables.add(match[1]);
    }
    return Array.from(variables);
  };

  const addVariable = (variable: string) => {
    if (variable && !formData.variables.includes(variable)) {
      setFormData(prev => ({
        ...prev,
        variables: [...prev.variables, variable]
      }));
    }
  };

  const removeVariable = (variable: string) => {
    setFormData(prev => ({
      ...prev,
      variables: prev.variables.filter(v => v !== variable)
    }));
  };

  const applyPromptWithVariables = () => {
    if (!selectedPrompt || !onPromptApply) return;
    
    // Validate all variables are filled
    const missingVars = selectedPrompt.variables.filter(v => !variables[v] || variables[v].trim() === '');
    if (missingVars.length > 0) {
      alert(`Please fill in all variables: ${missingVars.join(', ')}`);
      return;
    }
    
    onPromptApply(selectedPrompt, variables);
    setVariablesOpen(false);
  };

  const renderPromptsByCategory = (category: string) => {
    const categoryPrompts = prompts.filter(p => p.category === category);
    const categoryInfo = categories.find(c => c.value === category);
    
    if (categoryPrompts.length === 0) return null;

    return (
      <Accordion key={category} defaultExpanded={category === 'general'}>
        <AccordionSummary expandIcon={<ExpandIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <span>{categoryInfo?.icon}</span>
            <Typography variant="h6">{categoryInfo?.label}</Typography>
            <Chip size="small" label={categoryPrompts.length} />
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <List dense>
            {categoryPrompts.map((prompt) => (
              <ListItem
                key={prompt.id}
                button
                selected={selectedPrompt?.id === prompt.id}
                onClick={() => handlePromptSelect(prompt.id)}
                sx={{
                  borderRadius: 1,
                  mb: 0.5,
                  '&.Mui-selected': {
                    backgroundColor: `${threatFlowTheme.colors.brand.primary}20`
                  }
                }}
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {prompt.isBuiltIn && <StarIcon sx={{ fontSize: 16, color: threatFlowTheme.colors.status.warning.text }} />}
                      <Typography variant="body1">{prompt.name}</Typography>
                      {prompt.usage > 0 && <Chip size="small" label={`${prompt.usage} uses`} />}
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="caption" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
                        {prompt.description}
                      </Typography>
                      {prompt.variables.length > 0 && (
                        <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                          {prompt.variables.map(variable => (
                            <Chip
                              key={variable}
                              label={`{${variable}}`}
                              size="small"
                              sx={{
                                height: 16,
                                fontSize: '0.6rem',
                                backgroundColor: `${threatFlowTheme.colors.brand.secondary}20`
                              }}
                            />
                          ))}
                        </Box>
                      )}
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    {!prompt.isBuiltIn && (
                      <>
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => openEditor(prompt)}>
                            <EditIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" onClick={() => deletePrompt(prompt.id)}>
                            <DeleteIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                    <Tooltip title="Duplicate">
                      <IconButton size="small" onClick={() => duplicatePrompt(prompt)}>
                        <CopyIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </AccordionDetails>
      </Accordion>
    );
  };

  return (
    <>
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 2,
        p: 2,
        backgroundColor: threatFlowTheme.colors.background.secondary,
        borderRadius: threatFlowTheme.borderRadius.lg,
        border: `1px solid ${threatFlowTheme.colors.surface.border.default}`,
        mb: 2
      }}>
        <PromptIcon sx={{ color: threatFlowTheme.colors.brand.primary }} />
        
        <FormControl fullWidth size="small">
          <Select
            value={selectedPrompt?.id || ''}
            onChange={(e) => handlePromptSelect(e.target.value || null)}
            disabled={disabled}
            displayEmpty
          >
            <MenuItem value="">
              <Typography sx={{ color: threatFlowTheme.colors.text.tertiary }}>
                Default Analysis
              </Typography>
            </MenuItem>
            {prompts.map((prompt) => (
              <MenuItem key={prompt.id} value={prompt.id}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                  {prompt.isBuiltIn && <StarIcon sx={{ fontSize: 16, color: threatFlowTheme.colors.status.warning.text }} />}
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2">{prompt.name}</Typography>
                    <Typography variant="caption" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
                      {categories.find(c => c.value === prompt.category)?.label}
                    </Typography>
                  </Box>
                  {prompt.variables.length > 0 && (
                    <Chip
                      size="small"
                      label={`${prompt.variables.length} vars`}
                      sx={{ height: 18, fontSize: '0.7rem' }}
                    />
                  )}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {selectedPrompt && selectedPrompt.variables.length > 0 && (
            <Tooltip title="Configure Variables">
              <IconButton size="small" onClick={() => setVariablesOpen(true)}>
                <VariableIcon />
              </IconButton>
            </Tooltip>
          )}
          
          <Tooltip title="Manage Prompts">
            <IconButton size="small" onClick={() => setManagerOpen(true)}>
              <CategoryIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Prompt Manager Dialog */}
      <Dialog open={managerOpen} onClose={() => setManagerOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PromptIcon />
          Custom Prompt Manager
        </DialogTitle>
        
        <DialogContent>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
              <Tab label="Browse Prompts" />
              <Tab label="Recent & Favorites" />
            </Tabs>
          </Box>

          <TabPanel value={activeTab} index={0}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Available Prompts</Typography>
              <Button
                startIcon={<AddIcon />}
                variant="contained"
                onClick={() => openEditor()}
              >
                Create New Prompt
              </Button>
            </Box>
            
            {categories.map(category => renderPromptsByCategory(category.value))}
          </TabPanel>

          <TabPanel value={activeTab} index={1}>
            <Typography variant="h6" sx={{ mb: 2 }}>Recently Used</Typography>
            <List>
              {prompts
                .filter(p => p.lastUsed)
                .sort((a, b) => (b.lastUsed?.getTime() || 0) - (a.lastUsed?.getTime() || 0))
                .slice(0, 10)
                .map((prompt) => (
                  <ListItem key={prompt.id} button onClick={() => handlePromptSelect(prompt.id)}>
                    <RecentIcon sx={{ mr: 2, color: threatFlowTheme.colors.text.tertiary }} />
                    <ListItemText
                      primary={prompt.name}
                      secondary={`Last used: ${prompt.lastUsed?.toLocaleDateString()}`}
                    />
                  </ListItem>
                ))}
            </List>
          </TabPanel>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setManagerOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Prompt Editor Dialog */}
      <Dialog open={editorOpen} onClose={() => setEditorOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingPrompt ? 'Edit Custom Prompt' : 'Create New Prompt'}
        </DialogTitle>
        
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Prompt Name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              fullWidth
            />
            
            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              fullWidth
              multiline
              rows={2}
            />
            
            <FormControl fullWidth>
              <Select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as CustomPrompt['category'] }))}
              >
                {categories.map((category) => (
                  <MenuItem key={category.value} value={category.value}>
                    {category.icon} {category.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <TextField
              label="Prompt Template"
              value={formData.template}
              onChange={(e) => {
                const template = e.target.value;
                setFormData(prev => ({ 
                  ...prev, 
                  template,
                  variables: extractVariables(template)
                }));
              }}
              fullWidth
              multiline
              rows={8}
              helperText="Use {variable_name} to define variables that users can customize"
            />
            
            {formData.variables.length > 0 && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Variables Found:</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {formData.variables.map((variable) => (
                    <Chip
                      key={variable}
                      label={`{${variable}}`}
                      size="small"
                      onDelete={() => removeVariable(variable)}
                      sx={{
                        backgroundColor: `${threatFlowTheme.colors.brand.primary}20`,
                        color: threatFlowTheme.colors.brand.primary
                      }}
                    />
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setEditorOpen(false)}>Cancel</Button>
          <Button 
            onClick={savePrompt} 
            variant="contained"
            disabled={!formData.name || !formData.template}
          >
            {editingPrompt ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Variables Configuration Dialog */}
      <Dialog open={variablesOpen} onClose={() => setVariablesOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Configure Prompt Variables</DialogTitle>
        
        <DialogContent>
          {selectedPrompt && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <Alert severity="info">
                Fill in the variables below to customize the analysis prompt.
              </Alert>
              
              {selectedPrompt.variables.map((variable) => (
                <TextField
                  key={variable}
                  label={variable.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  value={variables[variable] || ''}
                  onChange={(e) => setVariables(prev => ({ ...prev, [variable]: e.target.value }))}
                  fullWidth
                  multiline={variable.toLowerCase().includes('content') || variable.toLowerCase().includes('description')}
                  rows={variable.toLowerCase().includes('content') || variable.toLowerCase().includes('description') ? 3 : 1}
                />
              ))}
            </Box>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setVariablesOpen(false)}>Cancel</Button>
          <Button 
            onClick={applyPromptWithVariables} 
            variant="contained"
            disabled={!selectedPrompt || selectedPrompt.variables.some(v => !variables[v])}
          >
            Apply Prompt
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};