import {
  Search as SearchIcon,
} from '@mui/icons-material';
import {
  Dialog,
  Box,
  TextField,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Chip,
  InputAdornment,
  Divider,
} from '@mui/material';
import React, { useState, useEffect, useMemo } from 'react';

import { useThemeContext } from '../../context/ThemeProvider';
import { useResponsive } from '../../hooks/useResponsive';

export interface CommandAction {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  category: 'navigation' | 'analysis' | 'export' | 'settings' | 'theme';
  keywords: string[];
  action: () => void;
  disabled?: boolean;
  badge?: string;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  commands: CommandAction[];
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  open,
  onClose,
  commands,
}) => {
  const { theme } = useThemeContext();
  const { isMobile } = useResponsive();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [open]);

  // Filter and search commands
  const filteredCommands = useMemo(() => {
    if (!query.trim()) {
      return commands;
    }

    const searchTerm = query.toLowerCase();
    return commands
      .filter(cmd => 
        cmd.label.toLowerCase().includes(searchTerm) ||
        cmd.description?.toLowerCase().includes(searchTerm) ||
        cmd.keywords.some(keyword => keyword.toLowerCase().includes(searchTerm)) ||
        cmd.category.toLowerCase().includes(searchTerm)
      )
      .sort((a, b) => {
        // Prioritize label matches over description/keyword matches
        const aLabelMatch = a.label.toLowerCase().includes(searchTerm);
        const bLabelMatch = b.label.toLowerCase().includes(searchTerm);
        
        if (aLabelMatch && !bLabelMatch) {return -1;}
        if (!aLabelMatch && bLabelMatch) {return 1;}
        
        return 0;
      });
  }, [commands, query]);

  // Update selected index when filtered results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredCommands]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!open) {return;}

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredCommands.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : prev);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex] && !filteredCommands[selectedIndex].disabled) {
          filteredCommands[selectedIndex].action();
          onClose();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, filteredCommands, selectedIndex, onClose]);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'navigation': return theme.colors.brand.primary;
      case 'analysis': return theme.colors.status.success.accent;
      case 'export': return theme.colors.status.info.accent;
      case 'settings': return theme.colors.status.warning.accent;
      case 'theme': return theme.colors.status.info.accent;
      default: return theme.colors.text.secondary;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'navigation': return '🧭';
      case 'analysis': return '🔍';
      case 'export': return '📤';
      case 'settings': return '⚙️';
      case 'theme': return '🎨';
      default: return '📋';
    }
  };

  // Group commands by category for better organization
  const groupedCommands = useMemo(() => {
    const groups: { [key: string]: CommandAction[] } = {};
    
    filteredCommands.forEach(cmd => {
      if (!groups[cmd.category]) {
        groups[cmd.category] = [];
      }
      groups[cmd.category].push(cmd);
    });

    return groups;
  }, [filteredCommands]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: theme.colors.background.secondary,
          backgroundImage: 'none',
          borderRadius: theme.borderRadius.lg,
          border: `1px solid ${theme.colors.surface.border.default}`,
          boxShadow: `
            ${theme.effects.shadows.xl},
            0 0 30px ${theme.colors.brand.primary}20
          `,
          backdropFilter: theme.effects.blur.xl,
          maxHeight: isMobile ? '90vh' : '70vh',
          margin: isMobile ? 1 : 2,
        },
      }}
      BackdropProps={{
        sx: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: theme.effects.blur.sm,
        },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Search Input */}
        <Box sx={{ p: 3, pb: 2 }}>
          <TextField
            fullWidth
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search commands..."
            autoFocus
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: theme.colors.text.tertiary }} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <Chip
                    label="ESC"
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: theme.typography.fontSize.xs,
                      backgroundColor: theme.colors.surface.subtle,
                      color: theme.colors.text.tertiary,
                      border: `1px solid ${theme.colors.surface.border.default}`,
                    }}
                  />
                </InputAdornment>
              ),
              sx: {
                backgroundColor: theme.colors.background.primary,
                borderRadius: theme.borderRadius.md,
                border: `1px solid ${theme.colors.surface.border.default}`,
                '&:focus-within': {
                  border: `2px solid ${theme.colors.brand.primary}`,
                },
                '& .MuiOutlinedInput-notchedOutline': {
                  border: 'none',
                },
                '& .MuiInputBase-input': {
                  color: theme.colors.text.primary,
                  fontSize: theme.typography.fontSize.base,
                  fontFamily: theme.typography.fontFamily.primary,
                  '&::placeholder': {
                    color: theme.colors.text.quaternary,
                  },
                },
              },
            }}
          />
        </Box>

        {/* Commands List */}
        <Box sx={{ flex: 1, overflowY: 'auto', px: 1, pb: 2 }}>
          {Object.keys(groupedCommands).length > 0 ? (
            Object.entries(groupedCommands).map(([category, categoryCommands], groupIndex) => (
              <Box key={category} sx={{ mb: groupIndex < Object.keys(groupedCommands).length - 1 ? 2 : 0 }}>
                {/* Category Header */}
                <Typography
                  variant="overline"
                  sx={{
                    color: theme.colors.text.tertiary,
                    fontSize: theme.typography.fontSize.xs,
                    fontWeight: theme.typography.fontWeight.semibold,
                    letterSpacing: theme.typography.letterSpacing.wide,
                    textTransform: 'uppercase',
                    px: 2,
                    py: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <span>{getCategoryIcon(category)}</span>
                  {category}
                </Typography>

                {/* Category Commands */}
                <List sx={{ py: 0 }}>
                  {categoryCommands.map((command, index) => {
                    const globalIndex = filteredCommands.findIndex(cmd => cmd.id === command.id);
                    const isSelected = globalIndex === selectedIndex;
                    
                    return (
                      <ListItem
                        key={command.id}
                        button
                        selected={isSelected}
                        onClick={() => {
                          if (!command.disabled) {
                            command.action();
                            onClose();
                          }
                        }}
                        disabled={command.disabled}
                        sx={{
                          borderRadius: theme.borderRadius.md,
                          mx: 1,
                          mb: 0.5,
                          backgroundColor: isSelected ? theme.colors.surface.hover : 'transparent',
                          border: isSelected 
                            ? `1px solid ${theme.colors.brand.primary}40` 
                            : '1px solid transparent',
                          '&:hover': {
                            backgroundColor: theme.colors.surface.hover,
                            border: `1px solid ${theme.colors.surface.border.default}`,
                          },
                          '&.Mui-disabled': {
                            opacity: 0.5,
                          },
                          transition: theme.motion.fast,
                        }}
                      >
                        <ListItemIcon
                          sx={{
                            color: isSelected 
                              ? theme.colors.brand.primary 
                              : getCategoryColor(command.category),
                            minWidth: 40,
                          }}
                        >
                          {command.icon}
                        </ListItemIcon>
                        
                        <ListItemText
                          primary={
                            <Typography
                              sx={{
                                color: theme.colors.text.primary,
                                fontSize: theme.typography.fontSize.base,
                                fontWeight: theme.typography.fontWeight.medium,
                                fontFamily: theme.typography.fontFamily.primary,
                              }}
                            >
                              {command.label}
                            </Typography>
                          }
                          secondary={command.description && (
                            <Typography
                              sx={{
                                color: theme.colors.text.tertiary,
                                fontSize: theme.typography.fontSize.sm,
                                fontFamily: theme.typography.fontFamily.primary,
                                mt: 0.5,
                              }}
                            >
                              {command.description}
                            </Typography>
                          )}
                        />
                        
                        {command.badge && (
                          <Chip
                            label={command.badge}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: theme.typography.fontSize.xs,
                              backgroundColor: `${getCategoryColor(command.category)}20`,
                              color: getCategoryColor(command.category),
                              border: `1px solid ${getCategoryColor(command.category)}40`,
                            }}
                          />
                        )}
                      </ListItem>
                    );
                  })}
                </List>
                
                {groupIndex < Object.keys(groupedCommands).length - 1 && (
                  <Divider sx={{ 
                    mx: 2, 
                    my: 1,
                    borderColor: theme.colors.surface.border.subtle 
                  }} />
                )}
              </Box>
            ))
          ) : (
            <Box sx={{ 
              textAlign: 'center', 
              py: 6,
              color: theme.colors.text.tertiary 
            }}>
              <SearchIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
              <Typography
                sx={{
                  fontSize: theme.typography.fontSize.base,
                  fontFamily: theme.typography.fontFamily.primary,
                }}
              >
                No commands found for "{query}"
              </Typography>
              <Typography
                sx={{
                  fontSize: theme.typography.fontSize.sm,
                  fontFamily: theme.typography.fontFamily.primary,
                  mt: 1,
                  opacity: 0.7,
                }}
              >
                Try a different search term
              </Typography>
            </Box>
          )}
        </Box>

        {/* Footer */}
        <Box sx={{ 
          p: 2, 
          pt: 1,
          borderTop: `1px solid ${theme.colors.surface.border.subtle}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip
              label="↑↓"
              size="small"
              sx={{
                height: 20,
                fontSize: theme.typography.fontSize.xs,
                backgroundColor: theme.colors.surface.subtle,
                color: theme.colors.text.tertiary,
                border: `1px solid ${theme.colors.surface.border.default}`,
              }}
            />
            <Typography sx={{ 
              fontSize: theme.typography.fontSize.xs, 
              color: theme.colors.text.quaternary 
            }}>
              Navigate
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip
              label="↵"
              size="small"
              sx={{
                height: 20,
                fontSize: theme.typography.fontSize.xs,
                backgroundColor: theme.colors.surface.subtle,
                color: theme.colors.text.tertiary,
                border: `1px solid ${theme.colors.surface.border.default}`,
              }}
            />
            <Typography sx={{ 
              fontSize: theme.typography.fontSize.xs, 
              color: theme.colors.text.quaternary 
            }}>
              Execute
            </Typography>
          </Box>
        </Box>
      </Box>
    </Dialog>
  );
};