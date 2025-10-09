import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import LinkIcon from '@mui/icons-material/Link';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import SearchIcon from '@mui/icons-material/Search';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import {
  Box,
  Container,
  Typography,
  Paper,
  Chip,
} from '@mui/material';
import { keyframes } from '@mui/system';

import { HeroSubmitButton } from '../../../shared/components/Button';
import { SearchInputURL, SearchInputMultiline } from '../../../shared/components/SearchInput';
import { LIMITS } from '../../../shared/constants/AppConstants';
import { threatFlowTheme } from '../../../shared/theme/threatflow-theme';

const streamingGradient = keyframes`
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
`;

const getTextStats = (text: string) => {
  const chars = text.length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const isNearLimit = chars > LIMITS.TEXT.WARNING_CHARS;
  const isOverLimit = chars > LIMITS.TEXT.MAX_CHARS;
  return { chars, words, isNearLimit, isOverLimit };
};

interface SearchFormProps {
  isLoading: boolean;
  isStreaming: boolean;
  inputMode: 'url' | 'text' | 'pdf';
  url: string;
  textContent: string;
  pdfFile: File | null;
  urlError: boolean;
  urlHelperText: string;
  onInputModeChange: (mode: 'url' | 'text' | 'pdf') => void;
  onUrlChange: (url: string) => void;
  onTextChange: (text: string) => void;
  onPdfChange: (file: File | null) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export default function SearchForm({
  isLoading,
  isStreaming,
  inputMode,
  url,
  textContent,
  pdfFile,
  urlError,
  urlHelperText,
  onInputModeChange,
  onUrlChange,
  onTextChange,
  onPdfChange,
  onSubmit,
}: SearchFormProps) {
  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>

      <Paper
        elevation={0}
        sx={{
          p: { xs: 4, md: 5 },
          backgroundColor: threatFlowTheme.colors.background.glassHeavy,
          backdropFilter: threatFlowTheme.effects.blur['2xl'],
          border: `1px solid ${threatFlowTheme.colors.surface.border.default}`,
          borderRadius: threatFlowTheme.borderRadius['2xl'],
          position: 'relative',
          overflow: 'hidden',
          boxShadow: `
            ${threatFlowTheme.effects.shadows.xl}, 
            inset 0 1px 0 rgba(255, 255, 255, 0.1),
            0 0 60px rgba(0, 225, 255, 0.08)
          `,
          // Enhanced professional border effects
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '2px',
            background: `linear-gradient(90deg, transparent 0%, ${threatFlowTheme.colors.brand.primary}40 30%, ${threatFlowTheme.colors.brand.primary}60 50%, ${threatFlowTheme.colors.brand.primary}40 70%, transparent 100%)`,
            boxShadow: `0 0 10px ${threatFlowTheme.colors.brand.primary}30`,
          },
          // Subtle background pattern
          '&::after': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `
              radial-gradient(circle at 20% 80%, ${threatFlowTheme.colors.brand.light} 0%, transparent 50%),
              radial-gradient(circle at 80% 20%, rgba(0, 225, 255, 0.05) 0%, transparent 50%),
              radial-gradient(circle at 40% 40%, rgba(255, 112, 67, 0.03) 0%, transparent 50%)
            `,
            pointerEvents: 'none',
            zIndex: 0,
          },
          // Ensure content is above background effects
          '& > *': {
            position: 'relative',
            zIndex: 1,
          },
        }}
      >
        {/* Enhanced Professional Input Mode Tabs */}
        <Box sx={{ 
          mb: 5,
          display: 'flex',
          justifyContent: 'center'
        }}>
          <Box sx={{
            display: 'inline-flex',
            gap: '2px',
            p: '4px',
            background: `
              linear-gradient(145deg, ${threatFlowTheme.colors.background.secondary} 0%, ${threatFlowTheme.colors.background.tertiary} 100%),
              radial-gradient(circle at 50% 50%, ${threatFlowTheme.colors.brand.light} 0%, transparent 60%)
            `,
            borderRadius: '20px',
            border: `1px solid ${threatFlowTheme.colors.surface.border.emphasis}`,
            backdropFilter: threatFlowTheme.effects.blur.xl,
            boxShadow: `
              ${threatFlowTheme.effects.shadows.lg},
              inset 0 1px 0 rgba(255, 255, 255, 0.1),
              0 0 30px rgba(0, 225, 255, 0.1)
            `,
            position: 'relative',
            overflow: 'hidden',
            // Professional gradient overlay
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '1px',
              background: `linear-gradient(90deg, transparent, ${threatFlowTheme.colors.brand.primary}40, transparent)`,
            },
          }}>
            <Box
              component="button"
              role="tab"
              tabIndex={0}
              aria-selected={inputMode === 'url'}
              aria-label="Switch to URL analysis mode"
              onClick={() => onInputModeChange('url')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onInputModeChange('url');
                }
                if (e.key === 'ArrowRight') {
                  e.preventDefault();
                  onInputModeChange('text');
                }
              }}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                px: 4,
                py: 2,
                borderRadius: '16px',
                cursor: 'pointer',
                transition: `all ${threatFlowTheme.motion.normal}`,
                position: 'relative',
                overflow: 'hidden',
                backgroundColor: 'transparent',
                background: inputMode === 'url' 
                  ? `
                    linear-gradient(135deg, ${threatFlowTheme.colors.brand.lightMedium} 0%, ${threatFlowTheme.colors.surface.active} 100%),
                    radial-gradient(circle at 50% 50%, ${threatFlowTheme.colors.brand.light} 0%, transparent 60%)
                  `
                  : 'transparent',
                backdropFilter: inputMode === 'url' ? threatFlowTheme.effects.blur.md : 'none',
                boxShadow: inputMode === 'url'
                  ? `${threatFlowTheme.effects.shadows.md}, 0 0 20px ${threatFlowTheme.colors.brand.primary}20`
                  : 'none',
                border: inputMode === 'url'
                  ? `1px solid ${threatFlowTheme.colors.brand.primary}40`
                  : '1px solid transparent',
                color: inputMode === 'url'
                  ? threatFlowTheme.colors.text.primary
                  : threatFlowTheme.colors.text.tertiary,
                // Professional glow effect for active state
                ...(inputMode === 'url' && {
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '1px',
                    background: `linear-gradient(90deg, transparent, ${threatFlowTheme.colors.brand.primary}60, transparent)`,
                  },
                }),
                '&:focus': {
                  outline: 'none',
                  boxShadow: inputMode === 'url'
                    ? `${threatFlowTheme.effects.shadows.lg}, 0 0 0 3px ${threatFlowTheme.colors.brand.primary}40`
                    : `${threatFlowTheme.effects.shadows.md}, 0 0 0 2px ${threatFlowTheme.colors.surface.border.focus}`,
                },
                '&:hover': {
                  background: inputMode === 'url'
                    ? `
                      linear-gradient(135deg, ${threatFlowTheme.colors.brand.lightMedium} 0%, ${threatFlowTheme.colors.surface.active} 100%),
                      radial-gradient(circle at 50% 50%, ${threatFlowTheme.colors.brand.light} 0%, transparent 60%)
                    `
                    : threatFlowTheme.colors.surface.hover,
                  color: inputMode === 'url'
                    ? threatFlowTheme.colors.text.primary
                    : threatFlowTheme.colors.text.secondary,
                  transform: 'translateY(-1px)',
                  boxShadow: inputMode === 'url'
                    ? `${threatFlowTheme.effects.shadows.lg}, 0 0 25px ${threatFlowTheme.colors.brand.primary}30`
                    : threatFlowTheme.effects.shadows.sm,
                },
              }}
            >
              <LinkIcon sx={{ 
                fontSize: '18px',
                opacity: inputMode === 'url' ? 0.9 : 0.6,
                transition: 'all 0.3s ease',
              }} />
              <Typography sx={{ 
                fontSize: '15px',
                fontWeight: 500,
                letterSpacing: '0.01em',
                transition: 'opacity 0.3s ease, color 0.3s ease',
              }}>
                Article URL
              </Typography>
            </Box>
            
            <Box
              onClick={() => onInputModeChange('text')}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
                px: 3.5,
                py: 1.5,
                borderRadius: '13px',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden',
                background: inputMode === 'text' 
                  ? `linear-gradient(135deg, ${threatFlowTheme.colors.surface.active} 0%, ${threatFlowTheme.colors.surface.hover} 100%)`
                  : 'transparent',
                backdropFilter: inputMode === 'text' ? threatFlowTheme.effects.blur.light : 'none',
                boxShadow: inputMode === 'text'
                  ? threatFlowTheme.effects.shadows.sm
                  : 'none',
                border: inputMode === 'text'
                  ? `1px solid ${threatFlowTheme.colors.surface.border.subtle}`
                  : '1px solid transparent',
                color: inputMode === 'text'
                  ? threatFlowTheme.colors.text.primary
                  : threatFlowTheme.colors.text.tertiary,
                '&:hover': {
                  background: inputMode === 'text'
                    ? `linear-gradient(135deg, ${threatFlowTheme.colors.surface.active} 0%, ${threatFlowTheme.colors.surface.hover} 100%)`
                    : threatFlowTheme.colors.surface.rest,
                  color: inputMode === 'text'
                    ? threatFlowTheme.colors.text.primary
                    : threatFlowTheme.colors.text.secondary,
                },
              }}
            >
              <TextFieldsIcon sx={{ 
                fontSize: '18px',
                opacity: inputMode === 'text' ? 0.9 : 0.6,
                transition: 'all 0.3s ease',
              }} />
              <Typography sx={{ 
                fontSize: '15px',
                fontWeight: 500,
                letterSpacing: '0.01em',
                transition: 'opacity 0.3s ease, color 0.3s ease',
              }}>
                Paste Text
              </Typography>
            </Box>

            <Box
              onClick={() => onInputModeChange('pdf')}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
                px: 3.5,
                py: 1.5,
                borderRadius: '13px',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden',
                background: inputMode === 'pdf' 
                  ? `linear-gradient(135deg, ${threatFlowTheme.colors.surface.active} 0%, ${threatFlowTheme.colors.surface.hover} 100%)`
                  : 'transparent',
                backdropFilter: inputMode === 'pdf' ? threatFlowTheme.effects.blur.light : 'none',
                boxShadow: inputMode === 'pdf'
                  ? threatFlowTheme.effects.shadows.sm
                  : 'none',
                border: inputMode === 'pdf'
                  ? `1px solid ${threatFlowTheme.colors.surface.border.subtle}`
                  : '1px solid transparent',
                color: inputMode === 'pdf'
                  ? threatFlowTheme.colors.text.primary
                  : threatFlowTheme.colors.text.tertiary,
                '&:hover': {
                  background: inputMode === 'pdf'
                    ? `linear-gradient(135deg, ${threatFlowTheme.colors.surface.active} 0%, ${threatFlowTheme.colors.surface.hover} 100%)`
                    : threatFlowTheme.colors.surface.rest,
                  color: inputMode === 'pdf'
                    ? threatFlowTheme.colors.text.primary
                    : threatFlowTheme.colors.text.secondary,
                },
              }}
            >
              <PictureAsPdfIcon sx={{ 
                fontSize: '18px',
                opacity: inputMode === 'pdf' ? 0.9 : 0.6,
                transition: 'all 0.3s ease',
              }} />
              <Typography sx={{ 
                fontSize: '15px',
                fontWeight: 500,
                letterSpacing: '0.01em',
                transition: 'opacity 0.3s ease, color 0.3s ease',
              }}>
                Upload PDF
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box component="form" onSubmit={onSubmit}>
          {inputMode === 'url' ? (
            <SearchInputURL
              fullWidth
              placeholder="Enter article URL"
              variant="outlined"
              value={url}
              onChange={(e) => onUrlChange(e.target.value)}
              error={urlError}
              helperText={urlHelperText}
              sx={{ mb: 3 }}
            />
          ) : inputMode === 'pdf' ? (
            <Box sx={{ mb: 3 }}>
              <Box
                component="label"
                htmlFor="pdf-upload"
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                  p: 6,
                  borderRadius: threatFlowTheme.borderRadius.xl,
                  border: `2px dashed ${pdfFile ? threatFlowTheme.colors.accent.secure : threatFlowTheme.colors.surface.border.default}`,
                  backgroundColor: pdfFile ? `${threatFlowTheme.colors.accent.secure  }10` : threatFlowTheme.colors.surface.rest,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    borderColor: threatFlowTheme.colors.brand.primary,
                    backgroundColor: threatFlowTheme.colors.brand.light,
                  },
                }}
              >
                <input
                  id="pdf-upload"
                  type="file"
                  accept=".pdf"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && file.type === 'application/pdf' && file.size <= 10 * 1024 * 1024) {
                      onPdfChange(file);
                    } else if (file && file.size > 10 * 1024 * 1024) {
                      alert('File size must be less than 10MB');
                      e.target.value = '';
                    } else if (file && file.type !== 'application/pdf') {
                      alert('Please select a PDF file');
                      e.target.value = '';
                    }
                  }}
                />
                <CloudUploadIcon 
                  sx={{ 
                    fontSize: 48, 
                    color: pdfFile ? threatFlowTheme.colors.accent.secure : threatFlowTheme.colors.text.secondary,
                    opacity: 0.8,
                  }} 
                />
                <Box sx={{ textAlign: 'center' }}>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      color: pdfFile ? threatFlowTheme.colors.accent.secure : threatFlowTheme.colors.text.primary,
                      fontWeight: 600,
                      mb: 1,
                    }}
                  >
                    {pdfFile ? pdfFile.name : 'Click to upload PDF'}
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: threatFlowTheme.colors.text.tertiary,
                      maxWidth: '400px',
                    }}
                  >
                    {pdfFile 
                      ? `Size: ${(pdfFile.size / 1024 / 1024).toFixed(2)} MB • Click to change`
                      : 'Upload a cybersecurity article or report in PDF format (max 10MB)'
                    }
                  </Typography>
                </Box>
                {pdfFile && (
                  <Chip
                    label="PDF Ready"
                    color="success"
                    size="small"
                    sx={{
                      backgroundColor: `${threatFlowTheme.colors.accent.secure  }20`,
                      color: threatFlowTheme.colors.accent.secure,
                      border: `1px solid ${threatFlowTheme.colors.accent.secure}40`,
                    }}
                  />
                )}
              </Box>
            </Box>
          ) : (
            <Box sx={{ mb: 3 }}>
              <SearchInputMultiline
                fullWidth
                multiline
                rows={12}
                placeholder="Paste your article or report here"
                variant="outlined"
                value={textContent}
                onChange={(e) => onTextChange(e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: getTextStats(textContent).isOverLimit 
                      ? threatFlowTheme.colors.status.error.border
                      : getTextStats(textContent).isNearLimit 
                        ? threatFlowTheme.colors.status.warning.border
                        : threatFlowTheme.colors.surface.border.default,
                  },
                }}
              />
              
              {/* Text Statistics */}
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                mt: 1,
                px: 1
              }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <Typography variant="caption" sx={{ 
                    color: getTextStats(textContent).isOverLimit 
                      ? threatFlowTheme.colors.status.error.text
                      : getTextStats(textContent).isNearLimit 
                        ? threatFlowTheme.colors.status.warning.text
                        : threatFlowTheme.colors.text.tertiary
                  }}>
                    {getTextStats(textContent).chars.toLocaleString()} / {LIMITS.TEXT.MAX_CHARS.toLocaleString()} characters
                  </Typography>
                  <Typography variant="caption" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
                    ~{getTextStats(textContent).words.toLocaleString()} words
                  </Typography>
                </Box>
                
                {getTextStats(textContent).isNearLimit && (
                  <Chip
                    size="small"
                    label={getTextStats(textContent).isOverLimit ? "Too Long" : "Near Limit"}
                    color={getTextStats(textContent).isOverLimit ? "error" : "warning"}
                    sx={{
                      fontSize: '0.7rem',
                      height: '20px',
                      '& .MuiChip-label': {
                        px: 1
                      }
                    }}
                  />
                )}
              </Box>
            </Box>
          )}
          
          <Box
            sx={{
              position: 'relative',
              display: 'inline-flex',
              alignItems: 'center',
              zIndex: 10,
            }}
          >
            {/* First blur layer */}
            <Box
              sx={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                height: 'calc(100% + 2px)',
                width: 'calc(100% + 2px)',
                transform: 'translate(-50%, -50%)',
                borderRadius: '100px',
                willChange: 'transform',
                opacity: 0.4,
              }}
            >
              <Box
                sx={{
                  position: 'relative',
                  height: '100%',
                  width: '100%',
                  borderRadius: '100px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  backdropFilter: 'blur(2px)',
                }}
              />
            </Box>

            {/* Second blur layer */}
            <Box
              sx={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                height: 'calc(100% + 2px)',
                width: 'calc(100% + 2px)',
                transform: 'translate(-50%, -50%) scaleX(-1)',
                borderRadius: '100px',
                willChange: 'transform',
                opacity: 0.2,
              }}
            >
              <Box
                sx={{
                  position: 'relative',
                  height: '100%',
                  width: '100%',
                  borderRadius: '100px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  backdropFilter: 'blur(2px)',
                }}
              />
            </Box>

            <HeroSubmitButton
              variant="contained"
              type="submit"
              disabled={isLoading || (inputMode === 'text' && getTextStats(textContent).isOverLimit) || (inputMode === 'pdf' && !pdfFile)}
              isLoading={isLoading}
            >
              <SearchIcon sx={{ fontSize: 20, color: threatFlowTheme.colors.text.primary }} />
              <span>
                {inputMode === 'url' ? 'Analyze Article' : 
                 inputMode === 'pdf' ? 'Analyze PDF' : 
                 'Analyze Text'}
              </span>
            </HeroSubmitButton>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}