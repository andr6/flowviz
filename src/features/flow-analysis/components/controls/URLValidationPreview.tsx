import {
  CheckCircle,
  Warning,
  Error as ErrorIcon,
  Security,
  Schedule,
  ExpandMore,
  OpenInNew,
  ContentCopy,
  Info,
  Assessment,
  Close,
  Refresh,
} from '@mui/icons-material';
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Alert,
  IconButton,
  Tooltip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React, { useState, useCallback, useEffect, useRef } from 'react';

import { 
  urlValidationService, 
  URLValidationResult, 
  URLPreview 
} from '../services/urlValidation';

interface URLValidationPreviewProps {
  onValidURL: (url: string, preview: URLPreview) => void;
  onError?: (error: string) => void;
  placeholder?: string;
  disabled?: boolean;
  autoValidate?: boolean;
  showDetails?: boolean;
  className?: string;
}

interface ValidationStatusProps {
  result: URLValidationResult;
  compact?: boolean;
}

const ValidationStatus: React.FC<ValidationStatusProps> = ({ result, compact = false }) => {
  const theme = useTheme();
  
  const getOverallStatus = (): { color: string; icon: React.ReactElement; label: string } => {
    if (result.errors.length > 0) {
      return { color: theme.palette.error.main, icon: <ErrorIcon />, label: 'Invalid' };
    }
    if (result.warnings.length > 0) {
      return { color: theme.palette.warning.main, icon: <Warning />, label: 'Warning' };
    }
    if (result.isValid && result.isReachable) {
      return { color: theme.palette.success.main, icon: <CheckCircle />, label: 'Valid' };
    }
    return { color: theme.palette.grey[500], icon: <Info />, label: 'Unknown' };
  };

  const status = getOverallStatus();

  if (compact) {
    return (
      <Chip
        icon={status.icon}
        label={status.label}
        size="small"
        sx={{ color: status.color, borderColor: status.color }}
        variant="outlined"
      />
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {React.cloneElement(status.icon, { sx: { color: status.color } })}
        <Typography variant="body2" sx={{ color: status.color, fontWeight: 600 }}>
          {status.label}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', gap: 1 }}>
        <Chip
          icon={<Security />}
          label={result.isSecure ? 'HTTPS' : 'HTTP'}
          size="small"
          color={result.isSecure ? 'success' : 'warning'}
          variant="outlined"
        />
        
        {result.statusCode && (
          <Chip
            label={`${result.statusCode}`}
            size="small"
            color={result.statusCode < 400 ? 'success' : 'error'}
            variant="outlined"
          />
        )}
        
        {result.contentType && (
          <Chip
            label={result.contentType.split(';')[0]}
            size="small"
            variant="outlined"
          />
        )}
      </Box>

      {result.warnings.length > 0 && (
        <Alert severity="warning" sx={{ mt: 1 }}>
          <Typography variant="body2">
            {result.warnings.length} warning{result.warnings.length !== 1 ? 's' : ''}
          </Typography>
        </Alert>
      )}

      {result.errors.length > 0 && (
        <Alert severity="error" sx={{ mt: 1 }}>
          <Typography variant="body2">
            {result.errors.length} error{result.errors.length !== 1 ? 's' : ''}
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

const URLValidationPreview: React.FC<URLValidationPreviewProps> = ({
  onValidURL,
  onError,
  placeholder = 'Enter URL to validate and preview...',
  disabled = false,
  autoValidate = true,
  showDetails = true,
  className,
}) => {
  const theme = useTheme();
  const [url, setUrl] = useState('');
  const [validationResult, setValidationResult] = useState<URLValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [threatAssessment, setThreatAssessment] = useState<{
    score: number;
    indicators: string[];
    confidence: 'low' | 'medium' | 'high';
  } | null>(null);
  const validationTimer = useRef<NodeJS.Timeout | null>(null);

  // Auto-validate URL after typing stops
  useEffect(() => {
    if (autoValidate && url.trim() && url.includes('.')) {
      if (validationTimer.current) {
        clearTimeout(validationTimer.current);
      }
      
      validationTimer.current = setTimeout(() => {
        handleValidateURL();
      }, 1000); // 1 second delay after typing stops
    }

    return () => {
      if (validationTimer.current) {
        clearTimeout(validationTimer.current);
      }
    };
  }, [url, autoValidate]);

  const handleValidateURL = useCallback(async () => {
    if (!url.trim()) {
      setValidationResult(null);
      return;
    }

    setIsValidating(true);
    
    try {
      const result = await urlValidationService.validateURL(url.trim());
      setValidationResult(result);
      
      // Assess threat intelligence relevance
      const assessment = urlValidationService.assessThreatIntelRelevance(result);
      setThreatAssessment(assessment);

      // If valid and has preview, call the callback
      if (result.isValid && result.preview && result.errors.length === 0) {
        onValidURL(result.url, result.preview);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Validation failed';
      onError?.(errorMessage);
      setValidationResult({
        url: url.trim(),
        isValid: false,
        isReachable: false,
        isSecure: false,
        warnings: [],
        errors: [errorMessage],
        timestamp: Date.now(),
      });
    } finally {
      setIsValidating(false);
    }
  }, [url, onValidURL, onError]);

  const handleUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
  }, []);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isValidating) {
      handleValidateURL();
    }
  }, [handleValidateURL, isValidating]);

  const handleCopyUrl = useCallback(async () => {
    if (validationResult?.url) {
      await navigator.clipboard.writeText(validationResult.url);
    }
  }, [validationResult]);

  const handleOpenUrl = useCallback(() => {
    if (validationResult?.url) {
      window.open(validationResult.url, '_blank', 'noopener,noreferrer');
    }
  }, [validationResult]);

  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString();
  };

  const getConfidenceColor = (confidence: string): string => {
    switch (confidence) {
      case 'high': return theme.palette.success.main;
      case 'medium': return theme.palette.warning.main;
      case 'low': return theme.palette.error.main;
      default: return theme.palette.grey[500];
    }
  };

  return (
    <Box className={className}>
      {/* URL Input */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <TextField
          fullWidth
          placeholder={placeholder}
          value={url}
          onChange={handleUrlChange}
          onKeyPress={handleKeyPress}
          disabled={disabled || isValidating}
          variant="outlined"
          size="small"
          InputProps={{
            endAdornment: isValidating && (
              <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
                <LinearProgress sx={{ width: 20 }} />
              </Box>
            ),
          }}
        />
        
        <Button
          variant="contained"
          onClick={handleValidateURL}
          disabled={disabled || isValidating || !url.trim()}
          sx={{ minWidth: 100 }}
        >
          {isValidating ? 'Validating...' : 'Validate'}
        </Button>
      </Box>

      {/* Validation Result */}
      {validationResult && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Typography variant="h6" noWrap sx={{ flexGrow: 1, mr: 2 }}>
                URL Validation Result
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Tooltip title="Copy URL">
                  <IconButton size="small" onClick={handleCopyUrl}>
                    <ContentCopy />
                  </IconButton>
                </Tooltip>
                
                <Tooltip title="Open in new tab">
                  <IconButton size="small" onClick={handleOpenUrl}>
                    <OpenInNew />
                  </IconButton>
                </Tooltip>
                
                <Tooltip title="Refresh validation">
                  <IconButton size="small" onClick={handleValidateURL}>
                    <Refresh />
                  </IconButton>
                </Tooltip>
                
                {showDetails && (
                  <Tooltip title="View details">
                    <IconButton size="small" onClick={() => setShowDetailDialog(true)}>
                      <Info />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            </Box>

            <ValidationStatus result={validationResult} />

            {/* URL Preview */}
            {validationResult.preview && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Preview:
                </Typography>
                
                <Card variant="outlined">
                  <Box sx={{ display: 'flex' }}>
                    {validationResult.preview.image && (
                      <CardMedia
                        component="img"
                        sx={{ width: 120, height: 90, objectFit: 'cover' }}
                        image={validationResult.preview.image}
                        alt={validationResult.preview.title}
                      />
                    )}
                    
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        {validationResult.preview.title || 'Untitled'}
                      </Typography>
                      
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {validationResult.preview.description || 'No description available'}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Chip label={validationResult.preview.type} size="small" />
                        
                        {validationResult.preview.readingTime && (
                          <Chip 
                            icon={<Schedule />}
                            label={`${validationResult.preview.readingTime} min read`}
                            size="small"
                            variant="outlined"
                          />
                        )}
                        
                        {validationResult.preview.wordCount && (
                          <Chip 
                            label={`${validationResult.preview.wordCount} words`}
                            size="small"
                            variant="outlined"
                          />
                        )}
                        
                        {validationResult.preview.siteName && (
                          <Chip 
                            label={validationResult.preview.siteName}
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    </CardContent>
                  </Box>
                </Card>
              </Box>
            )}

            {/* Threat Intelligence Assessment */}
            {threatAssessment && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Threat Intelligence Relevance:
                </Typography>
                
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="body2">
                        Relevance Score: <strong>{threatAssessment.score}/100</strong>
                      </Typography>
                      
                      <Chip
                        label={`${threatAssessment.confidence} confidence`}
                        size="small"
                        sx={{ 
                          color: getConfidenceColor(threatAssessment.confidence),
                          borderColor: getConfidenceColor(threatAssessment.confidence),
                        }}
                        variant="outlined"
                      />
                    </Box>
                    
                    <LinearProgress
                      variant="determinate"
                      value={threatAssessment.score}
                      sx={{ mb: 2, height: 6, borderRadius: 3 }}
                    />
                    
                    {threatAssessment.indicators.length > 0 && (
                      <Box>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          Indicators:
                        </Typography>
                        <List dense>
                          {threatAssessment.indicators.map((indicator, index) => (
                            <ListItem key={index} sx={{ py: 0.5 }}>
                              <ListItemIcon sx={{ minWidth: 32 }}>
                                <Assessment fontSize="small" />
                              </ListItemIcon>
                              <ListItemText 
                                primary={indicator}
                                primaryTypographyProps={{ variant: 'body2' }}
                              />
                            </ListItem>
                          ))}
                        </List>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* Detailed Validation Dialog */}
      <Dialog 
        open={showDetailDialog} 
        onClose={() => setShowDetailDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Detailed Validation Results
          <IconButton
            onClick={() => setShowDetailDialog(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        
        <DialogContent dividers>
          {validationResult && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  URL Information:
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText primary="URL" secondary={validationResult.url} />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Status" secondary={`${validationResult.statusCode || 'N/A'}`} />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Content Type" secondary={validationResult.contentType || 'N/A'} />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Validated At" secondary={formatTimestamp(validationResult.timestamp)} />
                  </ListItem>
                </List>
              </Box>

              {validationResult.metadata && (
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography variant="subtitle2">Metadata</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <List dense>
                      {validationResult.metadata.title && (
                        <ListItem>
                          <ListItemText primary="Title" secondary={validationResult.metadata.title} />
                        </ListItem>
                      )}
                      {validationResult.metadata.description && (
                        <ListItem>
                          <ListItemText primary="Description" secondary={validationResult.metadata.description} />
                        </ListItem>
                      )}
                      {validationResult.metadata.author && (
                        <ListItem>
                          <ListItemText primary="Author" secondary={validationResult.metadata.author} />
                        </ListItem>
                      )}
                      {validationResult.metadata.keywords && (
                        <ListItem>
                          <ListItemText 
                            primary="Keywords" 
                            secondary={validationResult.metadata.keywords.join(', ')} 
                          />
                        </ListItem>
                      )}
                    </List>
                  </AccordionDetails>
                </Accordion>
              )}

              {validationResult.warnings.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Warnings:
                  </Typography>
                  <List dense>
                    {validationResult.warnings.map((warning, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <Warning color="warning" />
                        </ListItemIcon>
                        <ListItemText primary={warning} />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              {validationResult.errors.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Errors:
                  </Typography>
                  <List dense>
                    {validationResult.errors.map((error, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <ErrorIcon color="error" />
                        </ListItemIcon>
                        <ListItemText primary={error} />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setShowDetailDialog(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default URLValidationPreview;