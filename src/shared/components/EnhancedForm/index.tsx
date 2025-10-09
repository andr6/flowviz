import {
  TextField,
  FormControl,
  Select,
  MenuItem,
  styled,
  TextFieldProps,
  SelectProps,
  Box,
  Typography,
  Slider,
  SliderProps,
} from '@mui/material';

import { threatFlowTheme } from '../../theme/threatflow-theme';

// TextField with monochrome styling
export const EnhancedTextField = styled(TextField)<TextFieldProps>({
  '& .MuiOutlinedInput-root': {
    color: threatFlowTheme.colors.text.primary,
    backgroundColor: threatFlowTheme.colors.background.glass,
    borderRadius: threatFlowTheme.borderRadius.md,
    fontSize: '0.9rem',
    fontWeight: 400,
    transition: threatFlowTheme.motion.normal,
    
    '&:hover': {
      backgroundColor: threatFlowTheme.colors.background.glassLight,
    },
    
    '&.Mui-focused': {
      backgroundColor: threatFlowTheme.colors.background.glassLight,
    },
  },
  
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: threatFlowTheme.colors.surface.border.default,
    borderWidth: 1,
  },
  
  '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: threatFlowTheme.colors.surface.border.emphasis,
  },
  
  '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: threatFlowTheme.colors.surface.border.focus,
    borderWidth: 1,
  },
  
  '& .MuiInputLabel-root': {
    color: threatFlowTheme.colors.text.secondary,
    fontSize: '0.9rem',
    fontWeight: 500,
    
    '&.Mui-focused': {
      color: threatFlowTheme.colors.text.primary,
    },
  },
  
  '& .MuiFormHelperText-root': {
    color: threatFlowTheme.colors.text.tertiary,
    fontSize: '0.8rem',
    marginTop: threatFlowTheme.spacing.xs,
  },
  
  '& .MuiFormHelperText-root.Mui-error': {
    color: threatFlowTheme.colors.status.error.text,
  },
});

// Select with monochrome styling
export const EnhancedSelect = styled(Select)<SelectProps>({
  color: threatFlowTheme.colors.text.primary,
  backgroundColor: threatFlowTheme.colors.background.glass,
  borderRadius: threatFlowTheme.borderRadius.md,
  fontSize: '14px',
  fontWeight: 500,
  
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: threatFlowTheme.colors.surface.border.default,
  },
  
  '&:hover': {
    backgroundColor: threatFlowTheme.colors.background.glassLight,
  },
  
  '&:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: threatFlowTheme.colors.surface.border.emphasis,
  },
  
  '&.Mui-focused': {
    backgroundColor: threatFlowTheme.colors.background.glassLight,
  },
  
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: threatFlowTheme.colors.surface.border.focus,
    borderWidth: 1,
  },
  
  '& .MuiSelect-icon': {
    color: threatFlowTheme.colors.text.secondary,
  },
});

// MenuItem with monochrome styling
export const EnhancedMenuItem = styled(MenuItem)({
  borderRadius: `${threatFlowTheme.borderRadius.sm}px`,
  mb: 0.5,
  padding: `${threatFlowTheme.spacing.sm + 2}px ${threatFlowTheme.spacing.sm + 6}px`,
  color: threatFlowTheme.colors.text.primary,
  fontSize: '14px',
  fontWeight: 500,
  transition: threatFlowTheme.motion.fast,
  
  '&:hover': {
    backgroundColor: threatFlowTheme.colors.surface.hover,
    color: threatFlowTheme.colors.text.primary,
  },
  
  '&.Mui-selected': {
    backgroundColor: threatFlowTheme.colors.surface.active,
    
    '&:hover': {
      backgroundColor: threatFlowTheme.colors.surface.active,
    }
  }
});

// FormControl with monochrome styling
export const EnhancedFormControl = styled(FormControl)({
  '& .MuiInputLabel-root': {
    color: threatFlowTheme.colors.text.secondary,
    fontSize: '14px',
    fontWeight: 500,
    backgroundColor: 'transparent',
    
    '&.Mui-focused': {
      color: threatFlowTheme.colors.text.primary,
    },
    
    '&.MuiInputLabel-shrink': {
      backgroundColor: 'transparent',
      padding: `0 ${threatFlowTheme.spacing.xs}px`,
    },
  },
});

// Form section with elegant spacing
export const FormSection = styled(Box)({
  marginBottom: threatFlowTheme.spacing.lg,
  
  '&:last-child': {
    marginBottom: 0,
  }
});

// Form section title
export const FormSectionTitle = styled(Typography)({
  color: threatFlowTheme.colors.text.primary,
  fontSize: '1rem',
  fontWeight: 600,
  marginBottom: threatFlowTheme.spacing.md,
  letterSpacing: '-0.01em',
});

// Menu props using theme values
export const enhancedMenuProps = {
  PaperProps: {
    sx: {
      background: threatFlowTheme.colors.menu.dialog,
      border: `1px solid ${threatFlowTheme.colors.surface.border.subtle}`,
      borderRadius: `${threatFlowTheme.borderRadius.md}px`,
      backdropFilter: threatFlowTheme.effects.blur.standard,
      boxShadow: threatFlowTheme.effects.shadows.md,
      minWidth: '150px',
      mt: 1,
    }
  },
  MenuListProps: {
    sx: {
      padding: `${threatFlowTheme.spacing.sm - 2}px`,
    }
  }
};

// Menu props for AppBar dropdowns (darker variant)
export const enhancedAppBarMenuProps = {
  PaperProps: {
    sx: {
      background: threatFlowTheme.colors.menu.appBar,
      border: `1px solid ${threatFlowTheme.colors.surface.border.subtle}`,
      borderRadius: `${threatFlowTheme.borderRadius.md}px`,
      backdropFilter: threatFlowTheme.effects.blur.standard,
      boxShadow: threatFlowTheme.effects.shadows.md,
      minWidth: '150px',
      mt: 1,
    }
  },
  MenuListProps: {
    sx: {
      padding: `${threatFlowTheme.spacing.sm - 2}px`,
    }
  }
};

// Enhanced Slider with monochrome styling
export const EnhancedSlider = styled(Slider)<SliderProps>({
  color: threatFlowTheme.colors.text.secondary,
  height: 8,
  padding: `${threatFlowTheme.spacing.md}px 0`,
  
  '& .MuiSlider-thumb': {
    height: 20,
    width: 20,
    backgroundColor: threatFlowTheme.colors.text.primary,
    border: `2px solid ${threatFlowTheme.colors.surface.border.focus}`,
    '&:focus, &:hover, &.Mui-active, &.Mui-focusVisible': {
      boxShadow: `0 0 0 8px rgba(255, 255, 255, 0.16)`,
    },
    '&:before': {
      display: 'none',
    },
  },
  
  '& .MuiSlider-track': {
    height: 4,
    backgroundColor: threatFlowTheme.colors.surface.border.focus,
    border: 'none',
    borderRadius: threatFlowTheme.borderRadius.sm,
  },
  
  '& .MuiSlider-rail': {
    height: 4,
    backgroundColor: threatFlowTheme.colors.surface.border.default,
    opacity: 1,
    borderRadius: threatFlowTheme.borderRadius.sm,
  },
  
  '& .MuiSlider-mark': {
    backgroundColor: threatFlowTheme.colors.surface.border.emphasis,
    height: 8,
    width: 2,
    '&.MuiSlider-markActive': {
      backgroundColor: threatFlowTheme.colors.surface.border.focus,
    },
  },
  
  '& .MuiSlider-markLabel': {
    color: threatFlowTheme.colors.text.tertiary,
    fontSize: '0.75rem',
    fontWeight: 500,
    '&.MuiSlider-markLabelActive': {
      color: threatFlowTheme.colors.text.secondary,
    },
  },
  
  '& .MuiSlider-valueLabel': {
    backgroundColor: threatFlowTheme.colors.background.glass,
    border: `1px solid ${threatFlowTheme.colors.surface.border.subtle}`,
    borderRadius: threatFlowTheme.borderRadius.sm,
    color: threatFlowTheme.colors.text.primary,
    fontSize: '0.75rem',
    fontWeight: 500,
    backdropFilter: threatFlowTheme.effects.blur.standard,
    '&:before': {
      borderColor: threatFlowTheme.colors.surface.border.subtle,
    },
  },
});