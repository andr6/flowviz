import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import DescriptionIcon from '@mui/icons-material/Description';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  TextField,
  Alert,
  Tabs,
  Tab,
} from '@mui/material';
import React, { useState, useCallback, useRef } from 'react';

import { HeroSubmitButton } from '../../../shared/components/Button';
import { LIMITS } from '../../../shared/constants/AppConstants';
import { useThemeContext } from '../../../shared/context/ThemeProvider';
import { batchProcessingService } from '../services/BatchProcessingService';

interface BulkUploadDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (jobId: string) => void;
}

interface UploadFile {
  file: File;
  id: string;
  size: string;
  status: 'pending' | 'uploading' | 'uploaded' | 'error';
  error?: string;
}

export const BulkUploadDialog: React.FC<BulkUploadDialogProps> = ({
  open,
  onClose,
  onSubmit,
}) => {
  const { theme } = useThemeContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tabValue, setTabValue] = useState(0);

  // Configuration options
  const [aiProvider, setAiProvider] = useState<'claude' | 'openai' | 'ollama' | 'openrouter'>('claude');
  const [analysisDepth, setAnalysisDepth] = useState<'fast' | 'standard' | 'comprehensive'>('standard');
  const [enableDuplicateDetection, setEnableDuplicateDetection] = useState(true);
  const [enableIOCExtraction, setEnableIOCExtraction] = useState(true);
  const [batchSize, setBatchSize] = useState(5);
  const [tags, setTags] = useState('');

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) {return '0 Bytes';}
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))  } ${  sizes[i]}`;
  };

  const handleFileSelect = useCallback((selectedFiles: FileList | null) => {
    if (!selectedFiles) {return;}

    const newFiles: UploadFile[] = Array.from(selectedFiles).map(file => ({
      file,
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      size: formatFileSize(file.size),
      status: 'pending' as const,
    }));

    // Validate files
    const validFiles = newFiles.filter(({ file }) => {
      const isValidType = ['pdf', 'txt', 'doc', 'docx', 'html', 'json'].some(ext =>
        file.name.toLowerCase().endsWith(`.${ext}`)
      );
      const isValidSize = file.size <= LIMITS.REQUEST.MAX_ARTICLE_SIZE;
      
      if (!isValidType) {
        // Add error for invalid type
        const errorFile = { ...newFiles.find(f => f.file === file)! };
        errorFile.status = 'error';
        errorFile.error = 'Unsupported file type';
        return false;
      }
      
      if (!isValidSize) {
        // Add error for invalid size
        const errorFile = { ...newFiles.find(f => f.file === file)! };
        errorFile.status = 'error';
        errorFile.error = `File too large (max ${formatFileSize(LIMITS.REQUEST.MAX_ARTICLE_SIZE)})`;
        return false;
      }
      
      return true;
    });

    setFiles(prev => [...prev, ...validFiles]);
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files) {
      handleFileSelect(e.dataTransfer.files);
    }
  }, [handleFileSelect]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const clearAllFiles = () => {
    setFiles([]);
  };

  const handleSubmit = async () => {
    if (files.length === 0) {return;}

    setIsSubmitting(true);
    try {
      const jobId = await batchProcessingService.submitBulkDocumentAnalysis(
        files.map(f => f.file),
        {
          aiProvider,
          analysisDepth,
          enableDuplicateDetection,
          enableIOCExtraction,
          batchSize,
          priority: 'normal',
          tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        }
      );

      onSubmit(jobId);
      onClose();
      
      // Reset form
      setFiles([]);
      setTags('');
    } catch (error) {
      console.error('Failed to submit batch job:', error);
      // TODO: Show error notification
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalSize = files.reduce((sum, f) => sum + f.file.size, 0);
  const validFiles = files.filter(f => f.status !== 'error');
  const errorFiles = files.filter(f => f.status === 'error');

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: theme.colors.background.glassHeavy,
          backdropFilter: theme.effects.blur.xl,
          border: `1px solid ${theme.colors.surface.border.default}`,
        },
      }}
    >
      <DialogTitle
        sx={{
          color: theme.colors.text.primary,
          borderBottom: `1px solid ${theme.colors.surface.border.subtle}`,
          pb: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CloudUploadIcon sx={{ color: theme.colors.brand.primary }} />
          <Typography variant="h6" component="div">
            Bulk Document Analysis
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}
        >
          <Tab label="Upload Files" />
          <Tab label="Configuration" />
        </Tabs>

        {tabValue === 0 && (
          <Box>
            {/* File Upload Area */}
            <Box
              sx={{
                border: `2px dashed ${dragActive ? theme.colors.brand.primary : theme.colors.surface.border.default}`,
                borderRadius: theme.borderRadius.xl,
                p: 4,
                textAlign: 'center',
                backgroundColor: dragActive ? `${theme.colors.brand.primary}10` : theme.colors.surface.rest,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': {
                  borderColor: theme.colors.brand.primary,
                  backgroundColor: theme.colors.brand.light,
                },
                mb: 3,
              }}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.txt,.doc,.docx,.html,.json"
                onChange={handleFileInputChange}
                style={{ display: 'none' }}
              />
              
              <CloudUploadIcon
                sx={{
                  fontSize: 48,
                  color: theme.colors.text.tertiary,
                  mb: 2,
                }}
              />
              
              <Typography
                variant="h6"
                sx={{
                  color: theme.colors.text.primary,
                  mb: 1,
                }}
              >
                Drop files here or click to upload
              </Typography>
              
              <Typography
                variant="body2"
                sx={{
                  color: theme.colors.text.tertiary,
                  mb: 2,
                }}
              >
                Supports PDF, TXT, DOC, DOCX, HTML, JSON files up to {formatFileSize(LIMITS.REQUEST.MAX_ARTICLE_SIZE)} each
              </Typography>
              
              <Typography
                variant="caption"
                sx={{
                  color: theme.colors.text.tertiary,
                }}
              >
                You can upload up to 100 files at once
              </Typography>
            </Box>

            {/* File List */}
            {files.length > 0 && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle1" sx={{ color: theme.colors.text.primary }}>
                    Files ({files.length})
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Chip
                      size="small"
                      label={`Total: ${formatFileSize(totalSize)}`}
                      sx={{ backgroundColor: theme.colors.surface.subtle }}
                    />
                    <Button size="small" onClick={clearAllFiles} startIcon={<DeleteIcon />}>
                      Clear All
                    </Button>
                  </Box>
                </Box>

                {errorFiles.length > 0 && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    {errorFiles.length} file(s) have errors and will be skipped.
                  </Alert>
                )}

                <List sx={{ maxHeight: 300, overflow: 'auto' }}>
                  {files.map((uploadFile) => (
                    <ListItem
                      key={uploadFile.id}
                      sx={{
                        borderRadius: theme.borderRadius.md,
                        mb: 1,
                        backgroundColor: uploadFile.status === 'error'
                          ? `${theme.colors.status.error  }20`
                          : theme.colors.surface.subtle,
                        border: uploadFile.status === 'error'
                          ? `1px solid ${theme.colors.status.error}`
                          : 'none',
                      }}
                    >
                      <ListItemIcon>
                        <DescriptionIcon
                          sx={{
                            color: uploadFile.status === 'error'
                              ? theme.colors.status.error
                              : theme.colors.text.secondary,
                          }}
                        />
                      </ListItemIcon>
                      
                      <ListItemText
                        primary={uploadFile.file.name}
                        secondary={
                          uploadFile.status === 'error'
                            ? uploadFile.error
                            : `${uploadFile.size} • ${uploadFile.file.type || 'Unknown type'}`
                        }
                        sx={{
                          '& .MuiListItemText-primary': {
                            color: uploadFile.status === 'error'
                              ? theme.colors.status.error
                              : theme.colors.text.primary,
                          },
                          '& .MuiListItemText-secondary': {
                            color: uploadFile.status === 'error'
                              ? theme.colors.status.error
                              : theme.colors.text.tertiary,
                          },
                        }}
                      />
                      
                      <ListItemSecondaryAction>
                        <IconButton
                          edge="end"
                          onClick={() => removeFile(uploadFile.id)}
                          size="small"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </Box>
        )}

        {tabValue === 1 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* AI Provider Selection */}
            <FormControl fullWidth>
              <InputLabel>AI Provider</InputLabel>
              <Select
                value={aiProvider}
                label="AI Provider"
                onChange={(e) => setAiProvider(e.target.value as any)}
              >
                <MenuItem value="claude">Claude (Anthropic)</MenuItem>
                <MenuItem value="openai">OpenAI GPT-4</MenuItem>
                <MenuItem value="ollama">Ollama (Local)</MenuItem>
                <MenuItem value="openrouter">OpenRouter</MenuItem>
              </Select>
            </FormControl>

            {/* Analysis Depth */}
            <FormControl fullWidth>
              <InputLabel>Analysis Depth</InputLabel>
              <Select
                value={analysisDepth}
                label="Analysis Depth"
                onChange={(e) => setAnalysisDepth(e.target.value as any)}
              >
                <MenuItem value="fast">Fast (Basic flow extraction)</MenuItem>
                <MenuItem value="standard">Standard (Detailed analysis)</MenuItem>
                <MenuItem value="comprehensive">Comprehensive (Full IOC extraction)</MenuItem>
              </Select>
            </FormControl>

            {/* Processing Options */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 2, color: theme.colors.text.primary }}>
                Processing Options
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={enableDuplicateDetection}
                      onChange={(e) => setEnableDuplicateDetection(e.target.checked)}
                    />
                  }
                  label="Enable Duplicate Detection"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={enableIOCExtraction}
                      onChange={(e) => setEnableIOCExtraction(e.target.checked)}
                    />
                  }
                  label="Enable IOC Extraction"
                />
              </Box>
            </Box>

            {/* Batch Configuration */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                label="Batch Size"
                type="number"
                value={batchSize}
                onChange={(e) => setBatchSize(Number(e.target.value))}
                inputProps={{ min: 1, max: 10 }}
                helperText="Number of files to process simultaneously"
              />
              <TextField
                label="Tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="tag1, tag2, tag3"
                helperText="Comma-separated tags for this batch"
              />
            </Box>

            {/* Estimated Processing Time */}
            {validFiles.length > 0 && (
              <Alert severity="info">
                <Typography variant="body2">
                  <strong>Estimated processing time:</strong> {Math.ceil(validFiles.length / batchSize * 2)} minutes
                  <br />
                  <strong>Files to process:</strong> {validFiles.length}
                  <br />
                  <strong>Batch size:</strong> {batchSize} files at a time
                </Typography>
              </Alert>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <HeroSubmitButton
          onClick={handleSubmit}
          disabled={validFiles.length === 0 || isSubmitting}
          loading={isSubmitting}
        >
          {isSubmitting ? 'Starting Analysis...' : `Analyze ${validFiles.length} Files`}
        </HeroSubmitButton>
      </DialogActions>
    </Dialog>
  );
};