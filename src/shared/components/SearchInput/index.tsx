import ClearIcon from '@mui/icons-material/Clear';
import SearchIcon from '@mui/icons-material/Search';
import {
  TextField,
  TextFieldProps,
  InputAdornment,
  IconButton,
  styled,
  Box,
} from '@mui/material';
import React from 'react';

import { createScrollbarStyle } from '../../theme/threatflow-theme';
import { useThemeContext } from '../../context/ThemeProvider';

// Theme-aware search input styling function
const createSearchInputStyles = (theme: any) => ({
  '& .MuiOutlinedInput-root': {
    color: theme.colors.text.primary,
    backgroundColor: theme.colors.background.glass,
    borderRadius: `${theme.borderRadius.md}px`,
    transition: theme.motion.normal,
    
    '&:hover': {
      backgroundColor: theme.colors.background.glassLight,
    },
    
    '&.Mui-focused': {
      backgroundColor: theme.colors.background.glassLight,
    },
    
    // Autofill handling for theme consistency
    '& input:-webkit-autofill, & input:-webkit-autofill:hover, & input:-webkit-autofill:focus': {
      WebkitTextFillColor: `${theme.colors.text.primary} !important`,
      WebkitBoxShadow: `0 0 0px 1000px ${theme.colors.background.glass} inset !important`,
      transition: 'background-color 5000s ease-in-out 0s',
      fontSize: 'inherit',
      caretColor: `${theme.colors.text.primary} !important`,
    },
  },
  
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: theme.colors.surface.border.default,
    borderWidth: 1,
    transition: theme.motion.fast,
  },
  
  '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: theme.colors.surface.border.emphasis,
  },
  
  // Theme-aware focus
  '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: theme.colors.surface.border.focus,
    borderWidth: 1,
  },
  
  // Error state - using theme colors
  '& .MuiOutlinedInput-root.Mui-error .MuiOutlinedInput-notchedOutline': {
    borderColor: theme.colors.status.error.border,
  },
  
  '& .MuiInputLabel-root': {
    color: theme.colors.text.secondary,
    
    '&.Mui-focused': {
      color: theme.colors.text.primary,
    },
    
    '&.Mui-error': {
      color: theme.colors.status.error.text,
    },
  },
  
  '& input::placeholder, & textarea::placeholder': {
    color: theme.colors.text.tertiary,
    opacity: 1,
    letterSpacing: '0.01em',
  },
  
  '& .MuiFormHelperText-root': {
    color: theme.colors.text.tertiary,
    fontSize: '0.75rem',
    marginTop: `${theme.spacing?.xs || 4}px`,
    
    '&.Mui-error': {
      color: theme.colors.status.error.text,
    },
  },
});

// Compact variant styling for dialogs and smaller spaces
const createCompactSearchStyles = (theme: any) => {
  const baseStyles = createSearchInputStyles(theme);
  return {
    ...baseStyles,
    '& .MuiOutlinedInput-root': {
      ...baseStyles['& .MuiOutlinedInput-root'],
      fontSize: '0.875rem',
      '& input': {
        padding: `${(theme.spacing?.sm || 8) + 2}px ${(theme.spacing?.sm || 8) + 6}px`,
      },
    },
  };
};

// Theme-aware search input component
export const SearchInput: React.FC<TextFieldProps> = (props) => {
  const { theme } = useThemeContext();
  const searchStyles = createSearchInputStyles(theme);
  
  return <TextField {...props} sx={{ ...searchStyles, ...(props.sx as object || {}) }} />;
};

// Search input with integrated clear button
interface SearchInputWithClearProps extends Omit<TextFieldProps, 'InputProps'> {
  onClear?: () => void;
  showSearchIcon?: boolean;
}

export const SearchInputWithClear: React.FC<SearchInputWithClearProps> = ({
  value,
  onClear,
  showSearchIcon = true,
  ...props
}) => {
  const { theme } = useThemeContext();
  const hasValue = Boolean(value);
  
  return (
    <SearchInput
      {...props}
      value={value}
      InputProps={{
        startAdornment: showSearchIcon ? (
          <InputAdornment position="start">
            <SearchIcon sx={{ color: theme.colors.text.tertiary }} />
          </InputAdornment>
        ) : undefined,
        endAdornment: hasValue && onClear ? (
          <InputAdornment position="end">
            <IconButton
              size="small"
              onClick={onClear}
              sx={{
                color: theme.colors.text.tertiary,
                '&:hover': {
                  color: theme.colors.text.secondary,
                  backgroundColor: theme.colors.surface.hover,
                },
              }}
            >
              <ClearIcon fontSize="small" />
            </IconButton>
          </InputAdornment>
        ) : undefined,
      }}
    />
  );
};

// Compact search input for dialogs
export const SearchInputCompact: React.FC<TextFieldProps> = (props) => {
  const { theme } = useThemeContext();
  const compactStyles = createCompactSearchStyles(theme);
  
  return <TextField {...props} sx={{ ...compactStyles, ...(props.sx as object || {}) }} />;
};

// URL input with larger height
export const SearchInputURL: React.FC<TextFieldProps> = (props) => {
  const { theme } = useThemeContext();
  const baseStyles = createSearchInputStyles(theme);
  const urlStyles = {
    ...baseStyles,
    '& .MuiOutlinedInput-root': {
      ...baseStyles['& .MuiOutlinedInput-root'],
      height: 56,
    },
  };
  
  return <TextField {...props} sx={{ ...urlStyles, ...(props.sx as object || {}) }} />;
};

// Multiline search input for text content
export const SearchInputMultiline: React.FC<TextFieldProps> = (props) => {
  const { theme } = useThemeContext();
  const baseStyles = createSearchInputStyles(theme);
  const multilineStyles = {
    ...baseStyles,
    '& .MuiOutlinedInput-root': {
      ...baseStyles['& .MuiOutlinedInput-root'],
      '& textarea': {
        ...createScrollbarStyle(`${theme.spacing?.sm || 8}px`),
      },
    },
  };
  
  return <TextField {...props} sx={{ ...multilineStyles, ...(props.sx as object || {}) }} />;
};

// Search input with status indicator (for validation states)
interface SearchInputWithStatusProps extends Omit<TextFieldProps, 'error'> {
  status?: 'default' | 'warning' | 'error' | 'success';
  statusMessage?: string;
}

export const SearchInputWithStatus: React.FC<SearchInputWithStatusProps> = ({
  status = 'default',
  statusMessage,
  ...props
}) => {
  const { theme } = useThemeContext();
  
  const getBorderColor = () => {
    switch (status) {
      case 'warning':
        return theme.colors.status.warning.border;
      case 'error':
        return theme.colors.status.error.border;
      case 'success':
        return theme.colors.status.success.border;
      default:
        return theme.colors.surface.border.default;
    }
  };
  
  const getTextColor = () => {
    switch (status) {
      case 'warning':
        return theme.colors.status.warning.text;
      case 'error':
        return theme.colors.status.error.text;
      case 'success':
        return theme.colors.status.success.text;
      default:
        return theme.colors.text.tertiary;
    }
  };
  
  return (
    <Box>
      <SearchInput
        {...props}
        error={status === 'error'}
        sx={{
          ...(props.sx as object || {}),
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: getBorderColor(),
          },
        }}
      />
      {statusMessage && (
        <Box
          sx={{
            mt: (theme.spacing?.xs || 4) / 8,
            fontSize: '0.75rem',
            color: getTextColor(),
          }}
        >
          {statusMessage}
        </Box>
      )}
    </Box>
  );
};

// Export all components and utilities
export default {
  SearchInput,
  SearchInputWithClear,
  SearchInputCompact,
  SearchInputURL,
  SearchInputMultiline,
  SearchInputWithStatus,
};