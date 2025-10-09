import {
  CloudUpload,
  Delete,
  Error as ErrorIcon,
  CheckCircle,
  Settings,
  PlayArrow,
  Pause,
  FilePresent,
  Image as ImageIcon,
  PictureAsPdf,
  Description,
  Slideshow,
  Close,
  ExpandMore,
  ExpandLess,
} from '@mui/icons-material';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Button,
  LinearProgress,
  Chip,
  Grid,
  Card,
  CardMedia,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Collapse,
  Alert,
  Tooltip,
  Switch,
  FormControlLabel,
  TextField,
  MenuItem,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React, { useState, useCallback, useRef, useEffect } from 'react';

import { 
  multiFormatUploadService, 
  UploadFile, 
  BatchUploadProgress, 
  ProcessingOptions,
  SupportedFormat 
} from '../services/multiFormatUpload';

interface EnhancedDropZoneProps {
  onFilesProcessed: (results: string[]) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  maxFiles?: number;
  className?: string;
}

interface FilePreviewProps {
  file: UploadFile;
  onRemove: () => void;
  onPreview: () => void;
}

const FilePreview: React.FC<FilePreviewProps> = ({ file, onRemove, onPreview }) => {
  const theme = useTheme();
  
  const getStatusColor = (status: UploadFile['status']) => {
    switch (status) {
      case 'completed': return theme.palette.success.main;
      case 'error': return theme.palette.error.main;
      case 'processing': return theme.palette.warning.main;
      default: return theme.palette.grey[500];
    }
  };

  const getStatusIcon = (status: UploadFile['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle />;
      case 'error': return <ErrorIcon />;
      case 'processing': return <PlayArrow />;
      default: return <FilePresent />;
    }
  };

  const getFormatIcon = (format: SupportedFormat) => {
    switch (format) {
      case 'pdf': return <PictureAsPdf />;
      case 'docx': return <Description />;
      case 'pptx': return <Slideshow />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp': return <ImageIcon />;
      default: return <FilePresent />;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) {return '0 Bytes';}
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))  } ${  sizes[i]}`;
  };

  return (
    <Card 
      sx={{ 
        height: 200, 
        display: 'flex', 
        flexDirection: 'column',
        border: `2px solid ${getStatusColor(file.status)}`,
        position: 'relative',
      }}
    >
      {file.preview && (
        <CardMedia
          component="img"
          height="120"
          image={file.preview}
          alt={file.name}
          sx={{ 
            objectFit: 'contain',
            backgroundColor: theme.palette.grey[50],
            cursor: 'pointer',
          }}
          onClick={onPreview}
        />
      )}
      
      {!file.preview && (
        <Box
          sx={{
            height: 120,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.palette.grey[50],
            cursor: 'pointer',
          }}
          onClick={onPreview}
        >
          {getFormatIcon(file.format)}
        </Box>
      )}

      <CardContent sx={{ flexGrow: 1, p: 1 }}>
        <Typography variant="caption" noWrap title={file.name}>
          {file.name}
        </Typography>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            {formatFileSize(file.size)}
          </Typography>
          
          <Chip
            icon={getStatusIcon(file.status)}
            label={file.status}
            size="small"
            color={file.status === 'completed' ? 'success' : file.status === 'error' ? 'error' : 'default'}
            sx={{ minWidth: 80 }}
          />
        </Box>

        {file.status === 'processing' && (
          <LinearProgress 
            variant="determinate" 
            value={file.progress} 
            sx={{ mt: 0.5, height: 4 }}
          />
        )}

        {file.error && (
          <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>
            {file.error}
          </Typography>
        )}
      </CardContent>

      <IconButton
        size="small"
        onClick={onRemove}
        sx={{
          position: 'absolute',
          top: 4,
          right: 4,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.9)' },
        }}
      >
        <Close fontSize="small" />
      </IconButton>
    </Card>
  );
};

const EnhancedDropZone: React.FC<EnhancedDropZoneProps> = ({
  onFilesProcessed,
  onError,
  disabled = false,
  maxFiles = 10,
  className,
}) => {
  const theme = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [batchProgress, setBatchProgress] = useState<BatchUploadProgress>({
    totalFiles: 0,
    completedFiles: 0,
    failedFiles: 0,
    overallProgress: 0,
  });
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewFile, setPreviewFile] = useState<UploadFile | null>(null);
  const [processingOptions, setProcessingOptions] = useState<ProcessingOptions>(
    multiFormatUploadService.getOptions()
  );
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Subscribe to service updates
  useEffect(() => {
    const unsubscribeProgress = multiFormatUploadService.onProgressUpdate(setBatchProgress);
    const unsubscribeFile = multiFormatUploadService.onFileUpdate(() => {
      setFiles([...multiFormatUploadService.getAllFiles()]);
    });

    return () => {
      unsubscribeProgress();
      unsubscribeFile();
    };
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {setIsDragOver(true);}
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (disabled) {return;}

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length + files.length > maxFiles) {
      onError?.(`Maximum ${maxFiles} files allowed`);
      return;
    }

    try {
      const uploadFiles = await multiFormatUploadService.addFiles(droppedFiles);
      setFiles([...multiFormatUploadService.getAllFiles()]);
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Failed to add files');
    }
  }, [disabled, files.length, maxFiles, onError]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) {return;}

    if (selectedFiles.length + files.length > maxFiles) {
      onError?.(`Maximum ${maxFiles} files allowed`);
      return;
    }

    try {
      const uploadFiles = await multiFormatUploadService.addFiles(selectedFiles);
      setFiles([...multiFormatUploadService.getAllFiles()]);
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Failed to add files');
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [files.length, maxFiles, onError]);

  const handleRemoveFile = useCallback((fileId: string) => {
    multiFormatUploadService.removeFile(fileId);
    setFiles([...multiFormatUploadService.getAllFiles()]);
  }, []);

  const handlePreviewFile = useCallback((file: UploadFile) => {
    setPreviewFile(file);
    setShowPreview(true);
  }, []);

  const handleProcessFiles = useCallback(async () => {
    const pendingFiles = files.filter(f => f.status === 'pending');
    if (pendingFiles.length === 0) {
      onError?.('No files to process');
      return;
    }

    setIsProcessing(true);

    try {
      // Update processing options
      multiFormatUploadService.setOptions(processingOptions);

      const results = await multiFormatUploadService.processBatch({
        combineResults: processingOptions.combineResults,
        continueOnError: true,
      });

      onFilesProcessed(results);
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Processing failed');
    } finally {
      setIsProcessing(false);
    }
  }, [files, processingOptions, onFilesProcessed, onError]);

  const handleClearFiles = useCallback(() => {
    multiFormatUploadService.clearFiles();
    setFiles([]);
  }, []);

  const handleOptionsChange = useCallback((key: keyof ProcessingOptions, value: any) => {
    const newOptions = { ...processingOptions, [key]: value };
    setProcessingOptions(newOptions);
  }, [processingOptions]);

  const supportedFormats = multiFormatUploadService.getSupportedFormats();
  const formatLabels = {
    pdf: 'PDF',
    docx: 'Word',
    pptx: 'PowerPoint',
    jpg: 'JPEG',
    jpeg: 'JPEG',
    png: 'PNG',
    gif: 'GIF',
    webp: 'WebP',
    txt: 'Text',
    url: 'URL',
  };

  return (
    <Box className={className}>
      {/* Drop Zone */}
      <Paper
        sx={{
          border: `2px dashed ${isDragOver ? theme.palette.primary.main : theme.palette.divider}`,
          borderRadius: 2,
          p: 3,
          textAlign: 'center',
          backgroundColor: isDragOver ? theme.palette.action.hover : 'transparent',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease-in-out',
          opacity: disabled ? 0.6 : 1,
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <CloudUpload sx={{ fontSize: 48, color: theme.palette.primary.main, mb: 2 }} />
        
        <Typography variant="h6" gutterBottom>
          Drop files here or click to browse
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Supports: {supportedFormats.map(f => formatLabels[f] || f.toUpperCase()).join(', ')}
        </Typography>
        
        <Typography variant="caption" color="text.secondary">
          Maximum {maxFiles} files, up to {processingOptions.maxFileSize}MB each
        </Typography>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={supportedFormats.map(f => {
            switch (f) {
              case 'pdf': return '.pdf';
              case 'docx': return '.docx,.doc';
              case 'pptx': return '.pptx,.ppt';
              case 'jpg': case 'jpeg': return '.jpg,.jpeg';
              case 'png': return '.png';
              case 'gif': return '.gif';
              case 'webp': return '.webp';
              case 'txt': return '.txt';
              default: return '';
            }
          }).filter(Boolean).join(',')}
          style={{ display: 'none' }}
          onChange={handleFileSelect}
          disabled={disabled}
        />
      </Paper>

      {/* File Grid */}
      {files.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Files ({files.length}/{maxFiles})
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="Processing Settings">
                <IconButton onClick={() => setShowSettings(true)} size="small">
                  <Settings />
                </IconButton>
              </Tooltip>
              
              <Button
                variant="outlined"
                size="small"
                onClick={handleClearFiles}
                disabled={isProcessing}
                startIcon={<Delete />}
              >
                Clear All
              </Button>
              
              <Button
                variant="contained"
                onClick={handleProcessFiles}
                disabled={isProcessing || files.filter(f => f.status === 'pending').length === 0}
                startIcon={isProcessing ? <Pause /> : <PlayArrow />}
              >
                {isProcessing ? 'Processing...' : 'Process Files'}
              </Button>
            </Box>
          </Box>

          <Grid container spacing={2}>
            {files.map((file) => (
              <Grid item xs={6} sm={4} md={3} lg={2} key={file.id}>
                <FilePreview
                  file={file}
                  onRemove={() => handleRemoveFile(file.id)}
                  onPreview={() => handlePreviewFile(file)}
                />
              </Grid>
            ))}
          </Grid>

          {/* Batch Progress */}
          {isProcessing && (
            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">
                  Processing: {batchProgress.currentFile || 'Initializing...'}
                </Typography>
                <Typography variant="body2">
                  {batchProgress.completedFiles + batchProgress.failedFiles} / {batchProgress.totalFiles}
                  {batchProgress.estimatedTimeRemaining && (
                    <span> • ~{batchProgress.estimatedTimeRemaining}s remaining</span>
                  )}
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={batchProgress.overallProgress} 
                sx={{ height: 6, borderRadius: 3 }}
              />
            </Box>
          )}
        </Box>
      )}

      {/* Processing Settings Dialog */}
      <Dialog open={showSettings} onClose={() => setShowSettings(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Processing Settings
          <IconButton
            onClick={() => setShowSettings(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={processingOptions.enableOCR}
                  onChange={(e) => handleOptionsChange('enableOCR', e.target.checked)}
                />
              }
              label="Enable OCR for images"
            />

            {processingOptions.enableOCR && (
              <TextField
                select
                label="OCR Language"
                value={processingOptions.ocrLanguage}
                onChange={(e) => handleOptionsChange('ocrLanguage', e.target.value)}
                size="small"
                sx={{ minWidth: 200 }}
              >
                <MenuItem value="eng">English</MenuItem>
                <MenuItem value="fra">French</MenuItem>
                <MenuItem value="deu">German</MenuItem>
                <MenuItem value="spa">Spanish</MenuItem>
                <MenuItem value="chi_sim">Chinese (Simplified)</MenuItem>
                <MenuItem value="jpn">Japanese</MenuItem>
              </TextField>
            )}

            <FormControlLabel
              control={
                <Switch
                  checked={processingOptions.combineResults}
                  onChange={(e) => handleOptionsChange('combineResults', e.target.checked)}
                />
              }
              label="Combine all results into single analysis"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={processingOptions.preserveFormatting}
                  onChange={(e) => handleOptionsChange('preserveFormatting', e.target.checked)}
                />
              }
              label="Preserve document formatting"
            />

            <Button
              variant="text"
              onClick={() => setShowAdvanced(!showAdvanced)}
              endIcon={showAdvanced ? <ExpandLess /> : <ExpandMore />}
            >
              Advanced Options
            </Button>

            <Collapse in={showAdvanced}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                <TextField
                  type="number"
                  label="Max File Size (MB)"
                  value={processingOptions.maxFileSize}
                  onChange={(e) => handleOptionsChange('maxFileSize', parseInt(e.target.value))}
                  size="small"
                  inputProps={{ min: 1, max: 500 }}
                />

                <TextField
                  type="number"
                  label="Processing Timeout (seconds)"
                  value={processingOptions.timeout}
                  onChange={(e) => handleOptionsChange('timeout', parseInt(e.target.value))}
                  size="small"
                  inputProps={{ min: 10, max: 1800 }}
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={processingOptions.extractImages}
                      onChange={(e) => handleOptionsChange('extractImages', e.target.checked)}
                    />
                  }
                  label="Extract embedded images"
                />
              </Box>
            </Collapse>
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setShowSettings(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* File Preview Dialog */}
      <Dialog 
        open={showPreview} 
        onClose={() => setShowPreview(false)} 
        maxWidth="md" 
        fullWidth
      >
        {previewFile && (
          <>
            <DialogTitle>
              {previewFile.name}
              <IconButton
                onClick={() => setShowPreview(false)}
                sx={{ position: 'absolute', right: 8, top: 8 }}
              >
                <Close />
              </IconButton>
            </DialogTitle>
            
            <DialogContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {previewFile.preview && (
                  <Box sx={{ textAlign: 'center' }}>
                    <img
                      src={previewFile.preview}
                      alt={previewFile.name}
                      style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain' }}
                    />
                  </Box>
                )}

                <List dense>
                  <ListItem>
                    <ListItemText primary="File Name" secondary={previewFile.name} />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="File Size" secondary={`${(previewFile.size / 1024 / 1024).toFixed(2)} MB`} />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Format" secondary={previewFile.format.toUpperCase()} />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Status" secondary={previewFile.status} />
                  </ListItem>
                  
                  {previewFile.metadata && (
                    <>
                      {previewFile.metadata.pageCount && (
                        <ListItem>
                          <ListItemText primary="Pages" secondary={previewFile.metadata.pageCount} />
                        </ListItem>
                      )}
                      {previewFile.metadata.slideCount && (
                        <ListItem>
                          <ListItemText primary="Slides" secondary={previewFile.metadata.slideCount} />
                        </ListItem>
                      )}
                      {previewFile.metadata.dimensions && (
                        <ListItem>
                          <ListItemText 
                            primary="Dimensions" 
                            secondary={`${previewFile.metadata.dimensions.width} × ${previewFile.metadata.dimensions.height}`} 
                          />
                        </ListItem>
                      )}
                    </>
                  )}
                </List>

                {previewFile.extractedText && (
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Extracted Text (Preview):
                    </Typography>
                    <Paper sx={{ p: 2, backgroundColor: theme.palette.grey[50], maxHeight: 200, overflow: 'auto' }}>
                      <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                        {previewFile.extractedText.substring(0, 1000)}
                        {previewFile.extractedText.length > 1000 && '...'}
                      </Typography>
                    </Paper>
                  </Box>
                )}

                {previewFile.error && (
                  <Alert severity="error">
                    {previewFile.error}
                  </Alert>
                )}
              </Box>
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default EnhancedDropZone;