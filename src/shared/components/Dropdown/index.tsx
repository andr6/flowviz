import {
  Menu,
  MenuItem,
  Select,
  SelectProps,
  MenuProps,
  MenuItemProps,
  ListItemIcon,
  ListItemText,
  styled,
  FormControl,
} from '@mui/material';
import React from 'react';

import { threatFlowTheme } from '../../theme/threatflow-theme';

// ============= Base Styling Configuration =============

// Menu styling for dropdown menus
export const dropdownMenuStyles: Partial<MenuProps> = {
  PaperProps: {
    sx: {
      background: threatFlowTheme.colors.menu.dialog,
      border: `1px solid ${threatFlowTheme.colors.surface.border.default}`,
      borderRadius: `${threatFlowTheme.borderRadius.md}px`,
      backdropFilter: threatFlowTheme.effects.blur.heavy,
      boxShadow: threatFlowTheme.effects.shadows.md,
      minWidth: '180px',
    }
  },
  MenuListProps: {
    sx: {
      padding: `${threatFlowTheme.spacing.sm - 2}px`,
    }
  }
};

// Darker menu variant for app bars
export const dropdownMenuStylesDark: Partial<MenuProps> = {
  PaperProps: {
    sx: {
      background: threatFlowTheme.colors.menu.appBar,
      border: `1px solid ${threatFlowTheme.colors.surface.border.default}`,
      borderRadius: `${threatFlowTheme.borderRadius.md}px`,
      backdropFilter: threatFlowTheme.effects.blur.heavy,
      boxShadow: threatFlowTheme.effects.shadows.md,
      minWidth: '180px',
    }
  },
  MenuListProps: {
    sx: {
      padding: `${threatFlowTheme.spacing.sm - 2}px`,
    }
  }
};

// ============= Dropdown Menu Item Component =============

export const DropdownMenuItem = styled(MenuItem)({
  borderRadius: `${threatFlowTheme.borderRadius.sm}px`,
  marginBottom: `${threatFlowTheme.spacing.xs / 2}px`,
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
  },
  
  '&:last-child': {
    marginBottom: 0,
  }
});

// Danger variant for destructive actions
export const DropdownMenuItemDanger = styled(DropdownMenuItem)({
  color: threatFlowTheme.colors.status.error.text,
  
  '&:hover': {
    backgroundColor: threatFlowTheme.colors.status.error.bg,
    color: threatFlowTheme.colors.status.error.accent,
  },
});

// ============= Dropdown Menu Component =============

interface DropdownMenuProps extends Omit<MenuProps, 'PaperProps' | 'MenuListProps'> {
  variant?: 'default' | 'dark';
  minWidth?: number | string;
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({
  variant = 'default',
  minWidth,
  children,
  ...props
}) => {
  const styles = variant === 'dark' ? dropdownMenuStylesDark : dropdownMenuStyles;
  
  const customStyles = minWidth ? {
    ...styles,
    PaperProps: {
      ...styles.PaperProps,
      sx: {
        ...styles.PaperProps?.sx,
        minWidth,
      }
    }
  } : styles;
  
  return (
    <Menu {...customStyles} {...props}>
      {children}
    </Menu>
  );
};

// ============= Dropdown Select Component =============

export const DropdownSelect = styled(Select)<SelectProps>({
  color: threatFlowTheme.colors.text.primary,
  backgroundColor: threatFlowTheme.colors.background.glass,
  borderRadius: `${threatFlowTheme.borderRadius.md}px`,
  fontSize: '14px',
  fontWeight: 500,
  
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: threatFlowTheme.colors.surface.border.default,
    transition: threatFlowTheme.motion.fast,
  },
  
  '&:hover': {
    backgroundColor: threatFlowTheme.colors.background.glassLight,
    
    '& .MuiOutlinedInput-notchedOutline': {
      borderColor: threatFlowTheme.colors.surface.border.emphasis,
    }
  },
  
  '&.Mui-focused': {
    backgroundColor: threatFlowTheme.colors.background.glassLight,
    
    '& .MuiOutlinedInput-notchedOutline': {
      borderColor: threatFlowTheme.colors.surface.border.focus,
      borderWidth: 1,
    }
  },
  
  '& .MuiSelect-icon': {
    color: threatFlowTheme.colors.text.secondary,
    transition: threatFlowTheme.motion.fast,
  },
  
  '&:hover .MuiSelect-icon': {
    color: threatFlowTheme.colors.text.primary,
  },
});

// ============= Menu Item with Icon Component =============

interface DropdownMenuItemWithIconProps extends MenuItemProps {
  icon: React.ReactNode;
  text: string;
  variant?: 'default' | 'danger';
}

export const DropdownMenuItemWithIcon: React.FC<DropdownMenuItemWithIconProps> = ({
  icon,
  text,
  variant = 'default',
  ...props
}) => {
  const Component = variant === 'danger' ? DropdownMenuItemDanger : DropdownMenuItem;
  
  return (
    <Component {...props}>
      <ListItemIcon 
        sx={{ 
          minWidth: '36px',
          color: variant === 'danger' 
            ? threatFlowTheme.colors.status.error.text
            : threatFlowTheme.colors.text.secondary,
        }}
      >
        {icon}
      </ListItemIcon>
      <ListItemText 
        primary={text}
        primaryTypographyProps={{
          fontSize: '14px',
          fontWeight: 500,
          color: 'inherit',
        }}
      />
    </Component>
  );
};

// ============= Dropdown Form Control =============

export const DropdownFormControl = styled(FormControl)({
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

// ============= Compact Dropdown Select =============

export const DropdownSelectCompact = styled(DropdownSelect)({
  fontSize: '13px',
  
  '& .MuiSelect-select': {
    padding: `${threatFlowTheme.spacing.sm}px ${threatFlowTheme.spacing.md}px`,
  },
});

// ============= Action Menu Component =============

interface ActionMenuItem {
  id: string;
  text: string;
  icon: React.ReactNode;
  variant?: 'default' | 'danger';
  onClick: () => void;
}

interface ActionMenuProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  items: ActionMenuItem[];
  variant?: 'default' | 'dark';
}

export const ActionMenu: React.FC<ActionMenuProps> = ({
  anchorEl,
  open,
  onClose,
  items,
  variant = 'default',
}) => {
  const handleItemClick = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <DropdownMenu
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      variant={variant}
      transformOrigin={{ horizontal: 'right', vertical: 'top' }}
      anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
    >
      {items.map((item) => (
        <DropdownMenuItemWithIcon
          key={item.id}
          icon={item.icon}
          text={item.text}
          variant={item.variant}
          onClick={() => handleItemClick(item.onClick)}
        />
      ))}
    </DropdownMenu>
  );
};

// ============= Export all components =============

export default {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuItemDanger,
  DropdownMenuItemWithIcon,
  DropdownSelect,
  DropdownSelectCompact,
  DropdownFormControl,
  ActionMenu,
  dropdownMenuStyles,
  dropdownMenuStylesDark,
};