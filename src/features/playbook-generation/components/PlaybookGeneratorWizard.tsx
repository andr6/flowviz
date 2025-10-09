/**
 * Playbook Generator Wizard
 *
 * Step-by-step wizard for creating incident response playbooks
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Stepper,
  Step,
  StepLabel,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Radio,
  RadioGroup,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  Stack,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  Check as CheckIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';
import type {
  PlaybookGenerationRequest,
  PlaybookGenerationResponse,
  PlaybookSeverity,
  PlaybookGenerationSource,
  PhaseName,
} from '../types';

// ============================================================================
// Types
// ============================================================================

interface PlaybookGeneratorWizardProps {
  onComplete: (response: PlaybookGenerationResponse) => void;
  onCancel: () => void;
  initialSource?: PlaybookGenerationSource;
  initialSourceId?: string;
}

interface WizardState {
  // Step 1: Source Selection
  source: PlaybookGenerationSource;
  sourceId?: string;
  flowOptions: Array<{ id: string; title: string }>;
  campaignOptions: Array<{ id: string; name: string }>;
  templateOptions: Array<{ id: string; name: string }>;

  // Step 2: Configuration
  name: string;
  description: string;
  severity: PlaybookSeverity;
  requiredRoles: string[];
  tags: string[];

  // Step 3: Customize Phases
  selectedPhases: PhaseName[];
  includeDetectionRules: boolean;
  includeAutomation: boolean;

  // Wizard state
  activeStep: number;
  isGenerating: boolean;
  error: string | null;
}

const STEPS = [
  'Select Source',
  'Configure Playbook',
  'Customize Phases',
  'Review & Generate',
];

const ALL_PHASES: Array<{ name: PhaseName; label: string; description: string }> = [
  { name: 'preparation', label: 'Preparation', description: 'Initial setup and team mobilization' },
  { name: 'detection', label: 'Detection', description: 'Identify and detect malicious activity' },
  { name: 'analysis', label: 'Analysis', description: 'Analyze scope and impact' },
  { name: 'containment', label: 'Containment', description: 'Contain the threat' },
  { name: 'eradication', label: 'Eradication', description: 'Remove threats from environment' },
  { name: 'recovery', label: 'Recovery', description: 'Restore normal operations' },
  { name: 'post_incident', label: 'Post-Incident', description: 'Review and improvements' },
];

const COMMON_ROLES = [
  'SOC Analyst',
  'Incident Responder',
  'Security Engineer',
  'System Administrator',
  'Network Administrator',
  'Legal/Compliance',
  'Management',
];

const COMMON_TAGS = [
  'phishing',
  'ransomware',
  'malware',
  'apt',
  'data-breach',
  'dos',
  'insider-threat',
  'vulnerability',
];

// ============================================================================
// Main Component
// ============================================================================

export const PlaybookGeneratorWizard: React.FC<PlaybookGeneratorWizardProps> = ({
  onComplete,
  onCancel,
  initialSource,
  initialSourceId,
}) => {
  const [state, setState] = useState<WizardState>({
    source: initialSource || 'manual',
    sourceId: initialSourceId,
    flowOptions: [],
    campaignOptions: [],
    templateOptions: [],
    name: '',
    description: '',
    severity: 'medium',
    requiredRoles: ['SOC Analyst', 'Incident Responder'],
    tags: [],
    selectedPhases: ALL_PHASES.map(p => p.name),
    includeDetectionRules: true,
    includeAutomation: true,
    activeStep: 0,
    isGenerating: false,
    error: null,
  });

  // Load options on mount
  useEffect(() => {
    loadOptions();
  }, []);

  const loadOptions = async () => {
    try {
      // Load flows
      const flowsResponse = await fetch('/api/flows');
      if (flowsResponse.ok) {
        const flows = await flowsResponse.json();
        setState(prev => ({ ...prev, flowOptions: flows.items || [] }));
      }

      // Load campaigns
      const campaignsResponse = await fetch('/api/campaigns');
      if (campaignsResponse.ok) {
        const campaigns = await campaignsResponse.json();
        setState(prev => ({ ...prev, campaignOptions: campaigns.items || [] }));
      }

      // Load templates
      const templatesResponse = await fetch('/api/templates');
      if (templatesResponse.ok) {
        const templates = await templatesResponse.json();
        setState(prev => ({ ...prev, templateOptions: templates.items || [] }));
      }
    } catch (error) {
      console.error('Failed to load options:', error);
    }
  };

  const handleNext = () => {
    setState(prev => ({ ...prev, activeStep: prev.activeStep + 1 }));
  };

  const handleBack = () => {
    setState(prev => ({ ...prev, activeStep: prev.activeStep - 1 }));
  };

  const handleGenerate = async () => {
    setState(prev => ({ ...prev, isGenerating: true, error: null }));

    try {
      const request: PlaybookGenerationRequest = {
        source: state.source,
        sourceId: state.sourceId,
        name: state.name,
        severity: state.severity,
        includeDetectionRules: state.includeDetectionRules,
        includeAutomation: state.includeAutomation,
        customizePhases: state.selectedPhases,
        requiredRoles: state.requiredRoles,
        tags: state.tags,
      };

      const response = await fetch('/api/playbooks/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error('Failed to generate playbook');
      }

      const result: PlaybookGenerationResponse = await response.json();
      onComplete(result);
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error',
        isGenerating: false,
      }));
    }
  };

  const canProceed = () => {
    switch (state.activeStep) {
      case 0: // Source selection
        if (state.source === 'flow' || state.source === 'campaign' || state.source === 'template') {
          return !!state.sourceId;
        }
        return true;
      case 1: // Configuration
        return state.name.trim().length > 0;
      case 2: // Phases
        return state.selectedPhases.length > 0;
      default:
        return true;
    }
  };

  return (
    <Card sx={{ maxWidth: 900, mx: 'auto', my: 4 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <SecurityIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
          <Typography variant="h4" component="h1">
            Generate Incident Response Playbook
          </Typography>
        </Box>

        <Stepper activeStep={state.activeStep} sx={{ mb: 4 }}>
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {state.error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setState(prev => ({ ...prev, error: null }))}>
            {state.error}
          </Alert>
        )}

        {/* Step Content */}
        <Box sx={{ minHeight: 400 }}>
          {state.activeStep === 0 && (
            <SourceSelectionStep
              state={state}
              setState={setState}
            />
          )}

          {state.activeStep === 1 && (
            <ConfigurationStep
              state={state}
              setState={setState}
            />
          )}

          {state.activeStep === 2 && (
            <PhaseCustomizationStep
              state={state}
              setState={setState}
            />
          )}

          {state.activeStep === 3 && (
            <ReviewStep
              state={state}
            />
          )}
        </Box>

        {/* Navigation Buttons */}
        <Divider sx={{ my: 3 }} />
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button
            onClick={onCancel}
            startIcon={<ArrowBackIcon />}
            disabled={state.isGenerating}
          >
            Cancel
          </Button>

          <Box>
            {state.activeStep > 0 && (
              <Button
                onClick={handleBack}
                sx={{ mr: 1 }}
                disabled={state.isGenerating}
              >
                Back
              </Button>
            )}

            {state.activeStep < STEPS.length - 1 ? (
              <Button
                variant="contained"
                onClick={handleNext}
                endIcon={<ArrowForwardIcon />}
                disabled={!canProceed()}
              >
                Next
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleGenerate}
                startIcon={state.isGenerating ? <CircularProgress size={20} /> : <CheckIcon />}
                disabled={state.isGenerating || !canProceed()}
              >
                {state.isGenerating ? 'Generating...' : 'Generate Playbook'}
              </Button>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

// ============================================================================
// Step 1: Source Selection
// ============================================================================

interface StepProps {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
}

const SourceSelectionStep: React.FC<StepProps> = ({ state, setState }) => {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Select Playbook Source
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Choose how you want to create your incident response playbook
      </Typography>

      <RadioGroup
        value={state.source}
        onChange={(e) => setState(prev => ({ ...prev, source: e.target.value as PlaybookGenerationSource, sourceId: undefined }))}
      >
        <FormControlLabel
          value="flow"
          control={<Radio />}
          label={
            <Box>
              <Typography variant="body1">From Attack Flow</Typography>
              <Typography variant="body2" color="text.secondary">
                Generate playbook based on an existing attack flow analysis
              </Typography>
            </Box>
          }
          sx={{ mb: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
        />

        {state.source === 'flow' && (
          <FormControl fullWidth sx={{ ml: 4, mb: 2 }}>
            <InputLabel>Select Flow</InputLabel>
            <Select
              value={state.sourceId || ''}
              onChange={(e) => setState(prev => ({ ...prev, sourceId: e.target.value }))}
              label="Select Flow"
            >
              {state.flowOptions.map(flow => (
                <MenuItem key={flow.id} value={flow.id}>
                  {flow.title}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        <FormControlLabel
          value="campaign"
          control={<Radio />}
          label={
            <Box>
              <Typography variant="body1">From Campaign</Typography>
              <Typography variant="body2" color="text.secondary">
                Generate playbook for a detected threat campaign
              </Typography>
            </Box>
          }
          sx={{ mb: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
        />

        {state.source === 'campaign' && (
          <FormControl fullWidth sx={{ ml: 4, mb: 2 }}>
            <InputLabel>Select Campaign</InputLabel>
            <Select
              value={state.sourceId || ''}
              onChange={(e) => setState(prev => ({ ...prev, sourceId: e.target.value }))}
              label="Select Campaign"
            >
              {state.campaignOptions.map(campaign => (
                <MenuItem key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        <FormControlLabel
          value="template"
          control={<Radio />}
          label={
            <Box>
              <Typography variant="body1">From Template</Typography>
              <Typography variant="body2" color="text.secondary">
                Start from a pre-built playbook template
              </Typography>
            </Box>
          }
          sx={{ mb: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
        />

        {state.source === 'template' && (
          <FormControl fullWidth sx={{ ml: 4, mb: 2 }}>
            <InputLabel>Select Template</InputLabel>
            <Select
              value={state.sourceId || ''}
              onChange={(e) => setState(prev => ({ ...prev, sourceId: e.target.value }))}
              label="Select Template"
            >
              {state.templateOptions.map(template => (
                <MenuItem key={template.id} value={template.id}>
                  {template.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        <FormControlLabel
          value="manual"
          control={<Radio />}
          label={
            <Box>
              <Typography variant="body1">Manual Creation</Typography>
              <Typography variant="body2" color="text.secondary">
                Create a playbook from scratch with AI assistance
              </Typography>
            </Box>
          }
          sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
        />
      </RadioGroup>
    </Box>
  );
};

// ============================================================================
// Step 2: Configuration
// ============================================================================

const ConfigurationStep: React.FC<StepProps> = ({ state, setState }) => {
  const [newRole, setNewRole] = useState('');
  const [newTag, setNewTag] = useState('');

  const addRole = (role: string) => {
    if (role && !state.requiredRoles.includes(role)) {
      setState(prev => ({ ...prev, requiredRoles: [...prev.requiredRoles, role] }));
      setNewRole('');
    }
  };

  const removeRole = (role: string) => {
    setState(prev => ({ ...prev, requiredRoles: prev.requiredRoles.filter(r => r !== role) }));
  };

  const addTag = (tag: string) => {
    if (tag && !state.tags.includes(tag)) {
      setState(prev => ({ ...prev, tags: [...prev.tags, tag] }));
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setState(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Configure Playbook Details
      </Typography>

      <TextField
        fullWidth
        label="Playbook Name"
        required
        value={state.name}
        onChange={(e) => setState(prev => ({ ...prev, name: e.target.value }))}
        sx={{ mb: 3 }}
        placeholder="e.g., Phishing Response Playbook"
      />

      <TextField
        fullWidth
        label="Description"
        multiline
        rows={3}
        value={state.description}
        onChange={(e) => setState(prev => ({ ...prev, description: e.target.value }))}
        sx={{ mb: 3 }}
        placeholder="Brief description of what this playbook covers"
      />

      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel>Severity</InputLabel>
        <Select
          value={state.severity}
          onChange={(e) => setState(prev => ({ ...prev, severity: e.target.value as PlaybookSeverity }))}
          label="Severity"
        >
          <MenuItem value="low">Low</MenuItem>
          <MenuItem value="medium">Medium</MenuItem>
          <MenuItem value="high">High</MenuItem>
          <MenuItem value="critical">Critical</MenuItem>
        </Select>
      </FormControl>

      <Typography variant="subtitle1" gutterBottom>
        Required Roles
      </Typography>
      <Box sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
          {state.requiredRoles.map(role => (
            <Chip
              key={role}
              label={role}
              onDelete={() => removeRole(role)}
              sx={{ mb: 1 }}
            />
          ))}
        </Stack>
        <Stack direction="row" spacing={1}>
          <FormControl size="small" sx={{ flexGrow: 1 }}>
            <InputLabel>Add Common Role</InputLabel>
            <Select
              value=""
              onChange={(e) => addRole(e.target.value)}
              label="Add Common Role"
            >
              {COMMON_ROLES.map(role => (
                <MenuItem key={role} value={role}>
                  {role}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            size="small"
            placeholder="Or type custom role"
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addRole(newRole)}
            sx={{ flexGrow: 1 }}
          />
          <Button onClick={() => addRole(newRole)} disabled={!newRole}>
            Add
          </Button>
        </Stack>
      </Box>

      <Typography variant="subtitle1" gutterBottom>
        Tags
      </Typography>
      <Box>
        <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
          {state.tags.map(tag => (
            <Chip
              key={tag}
              label={tag}
              onDelete={() => removeTag(tag)}
              size="small"
              sx={{ mb: 1 }}
            />
          ))}
        </Stack>
        <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
          {COMMON_TAGS.filter(t => !state.tags.includes(t)).map(tag => (
            <Chip
              key={tag}
              label={tag}
              onClick={() => addTag(tag)}
              size="small"
              variant="outlined"
              sx={{ mb: 1, cursor: 'pointer' }}
            />
          ))}
        </Stack>
        <TextField
          fullWidth
          size="small"
          placeholder="Add custom tag"
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addTag(newTag)}
        />
      </Box>
    </Box>
  );
};

// ============================================================================
// Step 3: Phase Customization
// ============================================================================

const PhaseCustomizationStep: React.FC<StepProps> = ({ state, setState }) => {
  const togglePhase = (phase: PhaseName) => {
    setState(prev => ({
      ...prev,
      selectedPhases: prev.selectedPhases.includes(phase)
        ? prev.selectedPhases.filter(p => p !== phase)
        : [...prev.selectedPhases, phase],
    }));
  };

  const selectAll = () => {
    setState(prev => ({ ...prev, selectedPhases: ALL_PHASES.map(p => p.name) }));
  };

  const deselectAll = () => {
    setState(prev => ({ ...prev, selectedPhases: [] }));
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Customize Phases
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Select which incident response phases to include in your playbook
      </Typography>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button size="small" onClick={selectAll} sx={{ mr: 1 }}>
          Select All
        </Button>
        <Button size="small" onClick={deselectAll}>
          Deselect All
        </Button>
      </Box>

      <FormGroup>
        {ALL_PHASES.map(phase => (
          <FormControlLabel
            key={phase.name}
            control={
              <Checkbox
                checked={state.selectedPhases.includes(phase.name)}
                onChange={() => togglePhase(phase.name)}
              />
            }
            label={
              <Box>
                <Typography variant="body1">{phase.label}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {phase.description}
                </Typography>
              </Box>
            }
            sx={{ mb: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
          />
        ))}
      </FormGroup>

      <Divider sx={{ my: 3 }} />

      <Typography variant="subtitle1" gutterBottom>
        Additional Options
      </Typography>

      <FormControlLabel
        control={
          <Checkbox
            checked={state.includeDetectionRules}
            onChange={(e) => setState(prev => ({ ...prev, includeDetectionRules: e.target.checked }))}
          />
        }
        label={
          <Box>
            <Typography variant="body1">Include Detection Rules</Typography>
            <Typography variant="body2" color="text.secondary">
              Generate detection rules for SIEM/EDR platforms (Sigma, YARA, KQL, etc.)
            </Typography>
          </Box>
        }
        sx={{ mb: 2 }}
      />

      <FormControlLabel
        control={
          <Checkbox
            checked={state.includeAutomation}
            onChange={(e) => setState(prev => ({ ...prev, includeAutomation: e.target.checked }))}
          />
        }
        label={
          <Box>
            <Typography variant="body1">Include Automation</Typography>
            <Typography variant="body2" color="text.secondary">
              Add automated actions where possible (API calls, scripts, etc.)
            </Typography>
          </Box>
        }
      />
    </Box>
  );
};

// ============================================================================
// Step 4: Review
// ============================================================================

interface ReviewStepProps {
  state: WizardState;
}

const ReviewStep: React.FC<ReviewStepProps> = ({ state }) => {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Review Configuration
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Review your playbook configuration before generating
      </Typography>

      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" color="text.secondary">Source</Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          {state.source === 'flow' ? 'Attack Flow' :
           state.source === 'campaign' ? 'Campaign' :
           state.source === 'template' ? 'Template' : 'Manual Creation'}
        </Typography>

        <Typography variant="subtitle2" color="text.secondary">Name</Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>{state.name}</Typography>

        {state.description && (
          <>
            <Typography variant="subtitle2" color="text.secondary">Description</Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>{state.description}</Typography>
          </>
        )}

        <Typography variant="subtitle2" color="text.secondary">Severity</Typography>
        <Chip label={state.severity.toUpperCase()} color="primary" size="small" sx={{ mb: 2 }} />

        <Typography variant="subtitle2" color="text.secondary">Required Roles</Typography>
        <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
          {state.requiredRoles.map(role => (
            <Chip key={role} label={role} size="small" sx={{ mb: 1 }} />
          ))}
        </Stack>

        {state.tags.length > 0 && (
          <>
            <Typography variant="subtitle2" color="text.secondary">Tags</Typography>
            <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
              {state.tags.map(tag => (
                <Chip key={tag} label={tag} size="small" variant="outlined" sx={{ mb: 1 }} />
              ))}
            </Stack>
          </>
        )}

        <Typography variant="subtitle2" color="text.secondary">Selected Phases ({state.selectedPhases.length})</Typography>
        <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
          {state.selectedPhases.map(phase => (
            <Chip
              key={phase}
              label={ALL_PHASES.find(p => p.name === phase)?.label || phase}
              size="small"
              sx={{ mb: 1 }}
            />
          ))}
        </Stack>

        <Typography variant="subtitle2" color="text.secondary">Options</Typography>
        <Box>
          {state.includeDetectionRules && (
            <Typography variant="body2">✓ Include detection rules</Typography>
          )}
          {state.includeAutomation && (
            <Typography variant="body2">✓ Include automation</Typography>
          )}
        </Box>
      </Box>

      <Alert severity="info">
        Click "Generate Playbook" to create your incident response playbook. This may take a few seconds.
      </Alert>
    </Box>
  );
};

export default PlaybookGeneratorWizard;
