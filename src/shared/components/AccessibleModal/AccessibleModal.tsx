import { Close } from '@mui/icons-material';
import {
  Box,
  Modal,
  IconButton,
  Typography,
  Backdrop,
  Fade,
} from '@mui/material';
import React, { useEffect, useRef, ReactNode } from 'react';

import { useThemeContext } from '../../context/ThemeProvider';
import { useFocusTrap, useAnnouncer } from '../../hooks/useAccessibility';

interface AccessibleModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  description?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  initialFocus?: string; // CSS selector
  returnFocus?: boolean;
  announceOnOpen?: boolean;
  className?: string;
  role?: 'dialog' | 'alertdialog';
}

const sizeMap = {
  xs: 400,
  sm: 600,
  md: 800,
  lg: 1000,
  xl: 1200,
};

export const AccessibleModal: React.FC<AccessibleModalProps> = ({
  open,
  onClose,
  title,
  children,
  description,
  size = 'md',
  closeOnBackdropClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  initialFocus,
  returnFocus = true,
  announceOnOpen = true,
  className,
  role = 'dialog',
}) => {
  const { theme } = useThemeContext();
  const { announcePolite } = useAnnouncer();
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Set up focus trap
  const focusTrapRef = useFocusTrap(open, {
    initialFocus,
    restoreFocus: returnFocus,
    allowTabToEscape: false,
  });

  // Store previous focus when modal opens
  useEffect(() => {
    if (open) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      
      // Announce modal opening to screen readers
      if (announceOnOpen) {
        const announcement = description 
          ? `${title} dialog opened. ${description}`
          : `${title} dialog opened`;
        announcePolite(announcement);
      }

      // Hide content behind modal from screen readers
      const mainContent = document.querySelector('main, #root, [role="main"]');
      if (mainContent) {
        mainContent.setAttribute('aria-hidden', 'true');
      }
    } else {
      // Restore screen reader access to main content
      const mainContent = document.querySelector('main, #root, [role="main"]');
      if (mainContent) {
        mainContent.removeAttribute('aria-hidden');
      }

      // Announce modal closing
      if (announceOnOpen) {
        announcePolite(`${title} dialog closed`);
      }
    }

    return () => {
      // Cleanup on unmount
      const mainContent = document.querySelector('main, #root, [role="main"]');
      if (mainContent) {
        mainContent.removeAttribute('aria-hidden');
      }
    };
  }, [open, title, description, announceOnOpen, announcePolite]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && closeOnEscape && open) {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscape, true);
      return () => document.removeEventListener('keydown', handleEscape, true);
    }
  }, [open, closeOnEscape, onClose]);

  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget && closeOnBackdropClick) {
      onClose();
    }
  };

  const handleCloseClick = () => {
    onClose();
  };

  // Generate unique IDs for accessibility
  const titleId = `modal-title-${Math.random().toString(36).substr(2, 9)}`;
  const descriptionId = description ? `modal-description-${Math.random().toString(36).substr(2, 9)}` : undefined;

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeAfterTransition
      BackdropComponent={Backdrop}
      BackdropProps={{
        timeout: 500,
        sx: {
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(4px)',
        },
      }}
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        zIndex: theme.zIndex.modal,
      }}
      // Accessibility props
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      role={role}
      aria-modal="true"
    >
      <Fade in={open}>
        <Box
          ref={(node) => {
            if (node) {
              modalRef.current = node;
              focusTrapRef.current = node;
            }
          }}
          onClick={handleBackdropClick}
          sx={{
            outline: 'none',
            width: '100%',
            maxWidth: sizeMap[size],
            maxHeight: '90vh',
            backgroundColor: theme.colors.background.primary,
            border: `1px solid ${theme.colors.surface.border.default}`,
            borderRadius: theme.borderRadius.lg,
            boxShadow: theme.colors.effects.shadows.xl,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
          }}
          className={className}
          tabIndex={-1}
        >
          {/* Header */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 3,
              borderBottom: `1px solid ${theme.colors.surface.border.default}`,
              backgroundColor: theme.colors.background.secondary,
              flexShrink: 0,
            }}
          >
            <Box sx={{ flex: 1, pr: showCloseButton ? 2 : 0 }}>
              <Typography
                id={titleId}
                variant="h6"
                component="h2"
                sx={{
                  color: theme.colors.text.primary,
                  fontWeight: theme.typography.fontWeight.semibold,
                  fontSize: theme.typography.fontSize.xl,
                  lineHeight: 1.4,
                  mb: description ? 0.5 : 0,
                }}
              >
                {title}
              </Typography>
              {description && (
                <Typography
                  id={descriptionId}
                  variant="body2"
                  sx={{
                    color: theme.colors.text.secondary,
                    fontSize: theme.typography.fontSize.sm,
                  }}
                >
                  {description}
                </Typography>
              )}
            </Box>

            {showCloseButton && (
              <IconButton
                onClick={handleCloseClick}
                sx={{
                  color: theme.colors.text.secondary,
                  '&:hover': {
                    backgroundColor: theme.colors.surface.hover,
                    color: theme.colors.text.primary,
                  },
                  '&:focus': {
                    backgroundColor: theme.colors.surface.hover,
                    color: theme.colors.text.primary,
                  },
                }}
                aria-label={`Close ${title} dialog`}
                size="large"
              >
                <Close />
              </IconButton>
            )}
          </Box>

          {/* Content */}
          <Box
            sx={{
              flex: 1,
              overflow: 'auto',
              p: 0,
              '&:focus': {
                outline: 'none',
              },
            }}
            tabIndex={-1}
          >
            {children}
          </Box>
        </Box>
      </Fade>
    </Modal>
  );
};