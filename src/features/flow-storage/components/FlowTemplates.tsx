import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  TextField,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  Alert,
  Divider,
  IconButton,
  Tooltip,
  Rating,
  List,
  ListItem,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Template as TemplateIcon,
  Add as AddIcon,
  Download as DownloadIcon,
  Star as StarIcon,
  ExpandMore as ExpandIcon,
  Visibility as PreviewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Verified as VerifiedIcon,
  Public as PublicIcon,
  Lock as PrivateIcon,
  Category as CategoryIcon,
  Person as AuthorIcon,
  GetApp as InstantiateIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import { threatFlowTheme } from '../../../shared/theme/threatflow-theme';
import { flowManagement, FlowTemplate, TemplateVariable } from '../services/FlowManagementService';

interface FlowTemplatesProps {
  onTemplateInstantiate?: (template: FlowTemplate, variables: Record<string, any>) => void;
  disabled?: boolean;
}

export const FlowTemplates: React.FC<FlowTemplatesProps> = ({
  onTemplateInstantiate,
  disabled = false
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [instantiateDialogOpen, setInstantiateDialogOpen] = useState(false);
  const [templates, setTemplates] = useState<FlowTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<FlowTemplate | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<FlowTemplate['category'] | 'all'>('all');
  const [templateVariables, setTemplateVariables] = useState<Record<string, any>>({});
  const [searchQuery, setSearchQuery] = useState('');
  
  // Template creation form
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    category: 'custom' as FlowTemplate['category'],
    tags: '',
    instructions: '',
    useCases: '',
    isPublic: false
  });

  const categories = [
    { value: 'all', label: 'All Categories', icon: '📊' },
    { value: 'apt', label: 'APT Campaigns', icon: '🎯' },
    { value: 'malware', label: 'Malware Analysis', icon: '🦠' },
    { value: 'phishing', label: 'Phishing Attacks', icon: '🎣' },
    { value: 'ransomware', label: 'Ransomware', icon: '🔒' },
    { value: 'insider-threat', label: 'Insider Threats', icon: '👤' },
    { value: 'network-attack', label: 'Network Attacks', icon: '🌐' },
    { value: 'custom', label: 'Custom', icon: '⚙️' }
  ];

  useEffect(() => {
    if (dialogOpen) {
      loadTemplates();
    }
  }, [dialogOpen, selectedCategory]);

  const loadTemplates = async () => {
    try {
      const category = selectedCategory === 'all' ? undefined : selectedCategory;
      const allTemplates = await flowManagement.getTemplates(category);
      setTemplates(allTemplates);
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const handleCreateTemplate = async () => {
    if (!newTemplate.name.trim()) return;

    try {
      const tags = newTemplate.tags.split(',').map(tag => tag.trim()).filter(Boolean);
      const useCases = newTemplate.useCases.split('\n').map(uc => uc.trim()).filter(Boolean);

      await flowManagement.createTemplate(
        newTemplate.name,
        newTemplate.description,
        newTemplate.category,
        [], // nodes - would be populated from current flow
        [], // edges - would be populated from current flow
        [], // variables - would be extracted from template
        'current-user', // author
        newTemplate.instructions,
        useCases,
        tags
      );

      setCreateDialogOpen(false);
      setNewTemplate({
        name: '',
        description: '',
        category: 'custom',
        tags: '',
        instructions: '',
        useCases: '',
        isPublic: false
      });
      loadTemplates();
    } catch (error) {
      console.error('Failed to create template:', error);
    }
  };

  const handleInstantiateTemplate = async () => {
    if (!selectedTemplate) return;

    try {
      const result = await flowManagement.instantiateTemplate(
        selectedTemplate.id,
        templateVariables,
        'current-user'
      );

      if (onTemplateInstantiate) {
        onTemplateInstantiate(selectedTemplate, templateVariables);
      }

      setInstantiateDialogOpen(false);
      setSelectedTemplate(null);
      setTemplateVariables({});
      setDialogOpen(false);
    } catch (error) {
      console.error('Failed to instantiate template:', error);
    }
  };

  const openInstantiateDialog = (template: FlowTemplate) => {
    setSelectedTemplate(template);
    
    // Initialize variables with default values
    const initialVariables: Record<string, any> = {};
    template.variables.forEach(variable => {
      initialVariables[variable.name] = variable.defaultValue || '';
    });
    setTemplateVariables(initialVariables);
    
    setInstantiateDialogOpen(true);
  };

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const renderTemplateCard = (template: FlowTemplate) => (
    <Card key={template.id} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flex: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {template.name}
            {template.isVerified && (
              <VerifiedIcon sx={{ fontSize: 16, color: threatFlowTheme.colors.brand.primary }} />
            )}
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {template.isPublic ? (
              <PublicIcon sx={{ fontSize: 16, color: threatFlowTheme.colors.accent.secure }} />
            ) : (
              <PrivateIcon sx={{ fontSize: 16, color: threatFlowTheme.colors.text.tertiary }} />
            )}
          </Box>
        </Box>

        <Typography variant="body2" sx={{ color: threatFlowTheme.colors.text.secondary, mb: 2 }}>
          {template.description}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Rating value={template.rating} readOnly size="small" />
          <Typography variant="caption">
            ({template.reviews} reviews)
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
          <Chip
            label={categories.find(c => c.value === template.category)?.label || template.category}
            size="small"
            sx={{
              backgroundColor: `${threatFlowTheme.colors.brand.primary}20`,
              color: threatFlowTheme.colors.brand.primary
            }}
          />
          
          {template.tags.slice(0, 3).map(tag => (
            <Chip
              key={tag}
              label={tag}
              size="small"
              sx={{
                backgroundColor: `${threatFlowTheme.colors.text.tertiary}20`,
                color: threatFlowTheme.colors.text.tertiary
              }}
            />
          ))}
          
          {template.tags.length > 3 && (
            <Chip
              label={`+${template.tags.length - 3}`}
              size="small"
              sx={{
                backgroundColor: `${threatFlowTheme.colors.text.tertiary}20`,
                color: threatFlowTheme.colors.text.tertiary
              }}
            />
          )}
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
            <AuthorIcon sx={{ fontSize: 12, mr: 0.5 }} />
            {template.author}
          </Typography>
          
          <Typography variant="caption" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
            <DownloadIcon sx={{ fontSize: 12, mr: 0.5 }} />
            {template.downloads} uses
          </Typography>
        </Box>
      </CardContent>

      <CardActions>
        <Button
          size="small"
          startIcon={<InstantiateIcon />}
          onClick={() => openInstantiateDialog(template)}
          sx={{ flex: 1 }}
        >
          Use Template
        </Button>
        
        <Tooltip title="Preview">
          <IconButton size="small">
            <PreviewIcon />
          </IconButton>
        </Tooltip>
      </CardActions>
    </Card>
  );

  const renderVariableInput = (variable: TemplateVariable) => {
    const value = templateVariables[variable.name] || '';

    switch (variable.type) {
      case 'select':
        return (
          <FormControl fullWidth key={variable.name} sx={{ mb: 2 }}>
            <InputLabel>{variable.name}</InputLabel>
            <Select
              value={value}
              onChange={(e) => setTemplateVariables(prev => ({
                ...prev,
                [variable.name]: e.target.value
              }))}
            >
              {variable.options?.map(option => (
                <MenuItem key={option} value={option}>{option}</MenuItem>
              ))}
            </Select>
          </FormControl>
        );
      
      case 'multiselect':
        return (
          <FormControl fullWidth key={variable.name} sx={{ mb: 2 }}>
            <InputLabel>{variable.name}</InputLabel>
            <Select
              multiple
              value={Array.isArray(value) ? value : []}
              onChange={(e) => setTemplateVariables(prev => ({
                ...prev,
                [variable.name]: e.target.value
              }))}
            >
              {variable.options?.map(option => (
                <MenuItem key={option} value={option}>{option}</MenuItem>
              ))}
            </Select>
          </FormControl>
        );
      
      case 'date':
        return (
          <TextField
            key={variable.name}
            fullWidth
            type="date"
            label={variable.name}
            value={value}
            onChange={(e) => setTemplateVariables(prev => ({
              ...prev,
              [variable.name]: e.target.value
            }))}
            InputLabelProps={{ shrink: true }}
            helperText={variable.description}
            sx={{ mb: 2 }}
          />
        );
      
      case 'number':
        return (
          <TextField
            key={variable.name}
            fullWidth
            type="number"
            label={variable.name}
            value={value}
            onChange={(e) => setTemplateVariables(prev => ({
              ...prev,
              [variable.name]: e.target.value
            }))}
            placeholder={variable.placeholder}
            helperText={variable.description}
            sx={{ mb: 2 }}
          />
        );
      
      default:
        return (
          <TextField
            key={variable.name}
            fullWidth
            label={variable.name}
            value={value}
            onChange={(e) => setTemplateVariables(prev => ({
              ...prev,
              [variable.name]: e.target.value
            }))}
            placeholder={variable.placeholder}
            helperText={variable.description}
            multiline={variable.name.toLowerCase().includes('description')}
            rows={variable.name.toLowerCase().includes('description') ? 3 : 1}
            sx={{ mb: 2 }}
          />
        );
    }
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
        <TemplateIcon sx={{ color: threatFlowTheme.colors.brand.primary }} />
        
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            Flow Templates
          </Typography>
          <Typography variant="caption" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
            Pre-built analysis templates for common attack patterns
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
            disabled={disabled}
            size="small"
          >
            Create
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<TemplateIcon />}
            onClick={() => setDialogOpen(true)}
            disabled={disabled}
            size="small"
          >
            Browse
          </Button>
        </Box>
      </Box>

      {/* Templates Browser Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xl" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TemplateIcon />
          Flow Templates Library
        </DialogTitle>
        
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  size="small"
                />
              </Grid>
              
              <Grid item xs={12} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value as any)}
                  >
                    {categories.map(category => (
                      <MenuItem key={category.value} value={category.value}>
                        {category.icon} {category.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>

          {filteredTemplates.length === 0 ? (
            <Alert severity="info">
              No templates found matching your criteria. Try adjusting your search or category filter.
            </Alert>
          ) : (
            <Grid container spacing={2}>
              {filteredTemplates.map(template => (
                <Grid item xs={12} sm={6} md={4} key={template.id}>
                  {renderTemplateCard(template)}
                </Grid>
              ))}
            </Grid>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Create Template Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create New Template</DialogTitle>
        
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Alert severity="info">
              Create a reusable template from your current flow analysis. Others can use this template as a starting point.
            </Alert>
            
            <TextField
              label="Template Name"
              value={newTemplate.name}
              onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
              fullWidth
            />
            
            <TextField
              label="Description"
              value={newTemplate.description}
              onChange={(e) => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
              multiline
              rows={3}
              fullWidth
            />
            
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={newTemplate.category}
                onChange={(e) => setNewTemplate(prev => ({ ...prev, category: e.target.value as any }))}
              >
                {categories.filter(c => c.value !== 'all').map(category => (
                  <MenuItem key={category.value} value={category.value}>
                    {category.icon} {category.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <TextField
              label="Tags (comma-separated)"
              value={newTemplate.tags}
              onChange={(e) => setNewTemplate(prev => ({ ...prev, tags: e.target.value }))}
              placeholder="apt, campaign, analysis"
              fullWidth
            />
            
            <TextField
              label="Instructions"
              value={newTemplate.instructions}
              onChange={(e) => setNewTemplate(prev => ({ ...prev, instructions: e.target.value }))}
              multiline
              rows={4}
              placeholder="Provide step-by-step instructions for using this template..."
              fullWidth
            />
            
            <TextField
              label="Use Cases (one per line)"
              value={newTemplate.useCases}
              onChange={(e) => setNewTemplate(prev => ({ ...prev, useCases: e.target.value }))}
              multiline
              rows={3}
              placeholder="Nation-state attacks\nLong-term infiltration\nData exfiltration"
              fullWidth
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={newTemplate.isPublic}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, isPublic: e.target.checked }))}
                />
              }
              label="Make template public (visible to all users)"
            />
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateTemplate}
            variant="contained"
            disabled={!newTemplate.name.trim()}
            startIcon={<SaveIcon />}
          >
            Create Template
          </Button>
        </DialogActions>
      </Dialog>

      {/* Instantiate Template Dialog */}
      <Dialog open={instantiateDialogOpen} onClose={() => setInstantiateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Use Template: {selectedTemplate?.name}</DialogTitle>
        
        <DialogContent>
          {selectedTemplate && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <Alert severity="info">
                Fill in the template variables below to customize the analysis for your specific use case.
              </Alert>
              
              <Paper sx={{ p: 2, backgroundColor: threatFlowTheme.colors.background.tertiary }}>
                <Typography variant="h6" sx={{ mb: 1 }}>Template Overview</Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  {selectedTemplate.description}
                </Typography>
                
                {selectedTemplate.instructions && (
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandIcon />}>
                      <Typography variant="subtitle2">Instructions</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                        {selectedTemplate.instructions}
                      </Typography>
                    </AccordionDetails>
                  </Accordion>
                )}
              </Paper>
              
              {selectedTemplate.variables.length > 0 ? (
                <Box>
                  <Typography variant="h6" sx={{ mb: 2 }}>Template Variables</Typography>
                  {selectedTemplate.variables.map(variable => renderVariableInput(variable))}
                </Box>
              ) : (
                <Alert severity="success">
                  This template requires no additional configuration. You can use it as-is.
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setInstantiateDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleInstantiateTemplate}
            variant="contained"
            startIcon={<InstantiateIcon />}
            disabled={
              selectedTemplate?.variables.some(v => 
                v.required && !templateVariables[v.name]
              )
            }
          >
            Create Flow from Template
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};