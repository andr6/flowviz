import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  LinearProgress,
  FormControl,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Divider,
  Chip,
  IconButton,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import {
  CameraAlt as VisionIcon,
  CloudUpload as UploadIcon,
  Settings as SettingsIcon,
  ExpandMore as ExpandIcon,
  Image as ImageIcon,
  TextFields as OCRIcon,
  TableChart as TableIcon,
  AccountTree as DiagramIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import { threatFlowTheme } from '../../../../shared/theme/threatflow-theme';
import { advancedAI, VisionAnalysisConfig } from '../../services/advancedAICapabilities';

interface VisionAnalysisProps {
  onAnalysisComplete?: (results: any) => void;
  disabled?: boolean;
}

interface AnalysisResult {
  extractedText: string;
  structuredData: any;
  confidence: number;
  metadata: any;
}

export const VisionAnalysis: React.FC<VisionAnalysisProps> = ({
  onAnalysisComplete,
  disabled = false
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  
  const [config, setConfig] = useState<VisionAnalysisConfig>({
    ocrLanguage: 'en',
    preprocessingFilters: ['enhance_contrast', 'noise_reduction'],
    confidenceThreshold: 0.7,
    extractionMode: 'full-analysis',
    enhanceQuality: true,
    detectTables: true,
    detectDiagrams: true
  });

  const supportedFormats = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
  const maxFileSize = 50 * 1024 * 1024; // 50MB

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!supportedFormats.includes(file.type)) {
      setError('Unsupported file format. Please use JPEG, PNG, GIF, WebP, or PDF.');
      return;
    }

    // Validate file size
    if (file.size > maxFileSize) {
      setError('File too large. Maximum size is 50MB.');
      return;
    }

    setSelectedFile(file);
    setError(null);
    setResults(null);

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  }, []);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      const fakeEvent = {
        target: { files: [file] }
      } as React.ChangeEvent<HTMLInputElement>;
      handleFileSelect(fakeEvent);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  const performAnalysis = async () => {
    if (!selectedFile) return;

    setAnalyzing(true);
    setError(null);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageData = e.target?.result as string;
        const base64Data = imageData.split(',')[1]; // Remove data URL prefix

        try {
          const analysisResults = await advancedAI.analyzeImageContent(
            base64Data,
            selectedFile.type,
            config
          );

          setResults(analysisResults);
          
          if (onAnalysisComplete) {
            onAnalysisComplete(analysisResults);
          }
        } catch (error) {
          console.error('Vision analysis failed:', error);
          setError(error instanceof Error ? error.message : 'Analysis failed');
        } finally {
          setAnalyzing(false);
        }
      };

      reader.readAsDataURL(selectedFile);
    } catch (error) {
      console.error('File reading failed:', error);
      setError('Failed to read file');
      setAnalyzing(false);
    }
  };

  const downloadResults = () => {
    if (!results) return;

    const dataStr = JSON.stringify(results, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `vision-analysis-${Date.now()}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const getExtractionModeDescription = (mode: string) => {
    switch (mode) {
      case 'text-only': return 'Extract text content only';
      case 'text-and-structure': return 'Extract text and basic structure';
      case 'full-analysis': return 'Full analysis including tables, diagrams, and relationships';
      default: return '';
    }
  };

  const renderFileUpload = () => (
    <Box
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      sx={{
        border: `2px dashed ${selectedFile ? threatFlowTheme.colors.accent.secure : threatFlowTheme.colors.surface.border.default}`,
        borderRadius: threatFlowTheme.borderRadius.lg,
        p: 4,
        textAlign: 'center',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        backgroundColor: selectedFile ? `${threatFlowTheme.colors.accent.secure}10` : threatFlowTheme.colors.surface.rest,
        '&:hover': {
          borderColor: threatFlowTheme.colors.brand.primary,
          backgroundColor: threatFlowTheme.colors.brand.light
        }
      }}
      component="label"
    >
      <input
        type="file"
        accept={supportedFormats.join(',')}
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
      
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        {selectedFile ? (
          <>
            <CheckIcon sx={{ fontSize: 48, color: threatFlowTheme.colors.accent.secure }} />
            <Typography variant="h6">{selectedFile.name}</Typography>
            <Typography variant="body2" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • {selectedFile.type}
            </Typography>
          </>
        ) : (
          <>
            <UploadIcon sx={{ fontSize: 48, color: threatFlowTheme.colors.text.secondary }} />
            <Typography variant="h6">Drop threat report image here</Typography>
            <Typography variant="body2" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
              Or click to select file (JPEG, PNG, GIF, WebP, PDF • Max 50MB)
            </Typography>
          </>
        )}
      </Box>
    </Box>
  );

  const renderPreview = () => {
    if (!selectedFile) return null;

    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>Preview</Typography>
        {preview ? (
          <Box sx={{ 
            border: `1px solid ${threatFlowTheme.colors.surface.border.default}`,
            borderRadius: threatFlowTheme.borderRadius.md,
            overflow: 'hidden',
            maxHeight: 300
          }}>
            <img
              src={preview}
              alt="Preview"
              style={{
                width: '100%',
                height: 'auto',
                maxHeight: 300,
                objectFit: 'contain'
              }}
            />
          </Box>
        ) : (
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
              PDF preview not available
            </Typography>
          </Paper>
        )}
      </Box>
    );
  };

  const renderResults = () => {
    if (!results) return null;

    return (
      <Box sx={{ mt: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Analysis Results</Typography>
          <Button
            startIcon={<DownloadIcon />}
            onClick={downloadResults}
            size="small"
          >
            Export
          </Button>
        </Box>

        {/* Confidence Score */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="subtitle1">Confidence Score</Typography>
            <Chip
              label={`${Math.round(results.confidence * 100)}%`}
              color={results.confidence > 0.7 ? 'success' : results.confidence > 0.5 ? 'warning' : 'error'}
            />
          </Box>
          <LinearProgress
            variant="determinate"
            value={results.confidence * 100}
            sx={{ mt: 1 }}
          />
        </Paper>

        {/* Extracted Content */}
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <OCRIcon />
              <Typography>Extracted Text ({results.extractedText.length} characters)</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{
              maxHeight: 200,
              overflow: 'auto',
              p: 2,
              backgroundColor: threatFlowTheme.colors.background.tertiary,
              borderRadius: 1,
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              lineHeight: 1.5
            }}>
              {results.extractedText || 'No text extracted'}
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* Structured Data */}
        {results.structuredData && (
          <Accordion>
            <AccordionSummary expandIcon={<ExpandIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <DiagramIcon />
                <Typography>Structured Data</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <List dense>
                {results.structuredData.nodes?.map((node: any, index: number) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <CheckIcon sx={{ color: threatFlowTheme.colors.accent.secure }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={node.data?.technique || node.data?.label || `Node ${index + 1}`}
                      secondary={node.data?.description || 'Attack technique identified'}
                    />
                  </ListItem>
                ))}
              </List>
            </AccordionDetails>
          </Accordion>
        )}

        {/* Metadata */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <InfoIcon />
              <Typography>Processing Metadata</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
              <Box>
                <Typography variant="caption" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
                  Model Used
                </Typography>
                <Typography variant="body2">{results.metadata.model}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
                  Processed
                </Typography>
                <Typography variant="body2">
                  {new Date(results.metadata.processed).toLocaleString()}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
                  Extraction Mode
                </Typography>
                <Typography variant="body2">{results.metadata.config.extractionMode}</Typography>
              </Box>
            </Box>
          </AccordionDetails>
        </Accordion>
      </Box>
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
        <VisionIcon sx={{ color: threatFlowTheme.colors.brand.primary }} />
        
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            Vision Analysis
          </Typography>
          <Typography variant="caption" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
            OCR and analysis of threat reports in image format
          </Typography>
        </Box>

        <Tooltip title="Configure Vision Settings">
          <IconButton size="small" onClick={() => setConfigOpen(true)}>
            <SettingsIcon />
          </IconButton>
        </Tooltip>

        <Button
          variant="outlined"
          startIcon={<ImageIcon />}
          onClick={() => setDialogOpen(true)}
          disabled={disabled}
          size="small"
        >
          Analyze Image
        </Button>
      </Box>

      {/* Vision Analysis Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <VisionIcon />
          Vision Analysis
        </DialogTitle>
        
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Alert severity="info">
              Upload threat intelligence reports, incident diagrams, or security documentation in image format. 
              The AI will extract text, identify structures, and analyze threat indicators.
            </Alert>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {renderFileUpload()}
            {renderPreview()}

            {analyzing && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>Processing Image...</Typography>
                <LinearProgress />
                <Typography variant="body2" sx={{ color: threatFlowTheme.colors.text.tertiary, mt: 1 }}>
                  Performing OCR, structure detection, and threat analysis...
                </Typography>
              </Box>
            )}

            {renderResults()}
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Close</Button>
          <Button 
            onClick={performAnalysis}
            variant="contained"
            disabled={!selectedFile || analyzing}
            startIcon={analyzing ? <VisionIcon /> : <ViewIcon />}
          >
            {analyzing ? 'Analyzing...' : 'Analyze Image'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Configuration Dialog */}
      <Dialog open={configOpen} onClose={() => setConfigOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Vision Analysis Configuration</DialogTitle>
        
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
            {/* OCR Language */}
            <FormControl fullWidth>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>OCR Language</Typography>
              <Select
                value={config.ocrLanguage}
                onChange={(e) => setConfig(prev => ({ ...prev, ocrLanguage: e.target.value }))}
              >
                <MenuItem value="en">English</MenuItem>
                <MenuItem value="es">Spanish</MenuItem>
                <MenuItem value="fr">French</MenuItem>
                <MenuItem value="de">German</MenuItem>
                <MenuItem value="zh">Chinese</MenuItem>
                <MenuItem value="ja">Japanese</MenuItem>
                <MenuItem value="auto">Auto-detect</MenuItem>
              </Select>
            </FormControl>

            {/* Extraction Mode */}
            <FormControl fullWidth>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Extraction Mode</Typography>
              <Select
                value={config.extractionMode}
                onChange={(e) => setConfig(prev => ({ ...prev, extractionMode: e.target.value as any }))}
              >
                <MenuItem value="text-only">
                  <Box>
                    <Typography>Text Only</Typography>
                    <Typography variant="caption" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
                      {getExtractionModeDescription('text-only')}
                    </Typography>
                  </Box>
                </MenuItem>
                <MenuItem value="text-and-structure">
                  <Box>
                    <Typography>Text and Structure</Typography>
                    <Typography variant="caption" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
                      {getExtractionModeDescription('text-and-structure')}
                    </Typography>
                  </Box>
                </MenuItem>
                <MenuItem value="full-analysis">
                  <Box>
                    <Typography>Full Analysis</Typography>
                    <Typography variant="caption" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
                      {getExtractionModeDescription('full-analysis')}
                    </Typography>
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>

            <Divider />

            {/* Quality Options */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 2 }}>Quality Enhancement</Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.enhanceQuality}
                      onChange={(e) => setConfig(prev => ({ ...prev, enhanceQuality: e.target.checked }))}
                    />
                  }
                  label="Enhance image quality before processing"
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.detectTables}
                      onChange={(e) => setConfig(prev => ({ ...prev, detectTables: e.target.checked }))}
                    />
                  }
                  label="Detect and extract tables"
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.detectDiagrams}
                      onChange={(e) => setConfig(prev => ({ ...prev, detectDiagrams: e.target.checked }))}
                    />
                  }
                  label="Detect diagrams and flowcharts"
                />
              </Box>
            </Box>
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setConfigOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};