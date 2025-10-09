import { CssBaseline, ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App';
import ErrorBoundary from './shared/components/ErrorBoundary';
import { ThemeProvider } from './shared/context/ThemeProvider';
import { useThemeContext } from './shared/context/ThemeProvider';
import './index.css';
import './shared/styles/theme-transitions.css';
import './shared/styles/force-light-theme.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Material-UI theme factory that uses the custom theme
const createMaterialUITheme = (customTheme: any, themeMode: 'light' | 'dark') => {
  
  return createTheme({
    palette: {
      mode: themeMode,
      primary: {
        main: customTheme.colors.brand.primary,
      },
      secondary: {
        main: customTheme.colors.brand.secondary,
      },
      background: {
        default: customTheme.colors.background.primary,
        paper: customTheme.colors.background.secondary,
      },
      text: {
        primary: customTheme.colors.text.primary,
        secondary: customTheme.colors.text.secondary,
      },
      success: {
        main: customTheme.colors.status.success.accent,
      },
      error: {
        main: customTheme.colors.status.error.accent,
      },
      warning: {
        main: customTheme.colors.status.warning.accent,
      },
      info: {
        main: customTheme.colors.brand.primary,
      },
    },
    typography: {
      fontFamily: customTheme.typography.fontFamily.primary,
    },
    components: {
      // Force CssBaseline to use our theme colors
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: customTheme.colors.background.primary + ' !important',
            color: customTheme.colors.text.primary,
          },
          html: {
            backgroundColor: customTheme.colors.background.primary + ' !important',
          },
        },
      },
      // Material-UI AppBar override for dark theme
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: customTheme.colors.background.secondary,
            color: customTheme.colors.text.primary,
            borderBottom: themeMode === 'dark' ? `1px solid ${customTheme.colors.border?.default || 'rgba(255, 255, 255, 0.1)'}` : 'none',
          },
        },
      },
      // Material-UI Paper override for dark theme
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundColor: customTheme.colors.background.secondary,
            color: customTheme.colors.text.primary,
          },
        },
      },
      // Material-UI TextField override for dark theme
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              backgroundColor: themeMode === 'dark' ? customTheme.colors.background.primary : 'transparent',
              '& fieldset': {
                borderColor: themeMode === 'dark' ? (customTheme.colors.border?.default || 'rgba(255, 255, 255, 0.1)') : undefined,
              },
              '&:hover fieldset': {
                borderColor: themeMode === 'dark' ? (customTheme.colors.border?.emphasis || 'rgba(0, 225, 255, 0.35)') : undefined,
              },
              '&.Mui-focused fieldset': {
                borderColor: customTheme.colors.brand.primary,
              },
            },
            '& .MuiInputLabel-root': {
              color: customTheme.colors.text.secondary,
            },
            '& .MuiOutlinedInput-input': {
              color: customTheme.colors.text.primary,
            },
          },
        },
      },
      // Material-UI Button override for dark theme
      MuiButton: {
        styleOverrides: {
          root: {
            color: customTheme.colors.text.primary,
          },
        },
      },
      // Material-UI Container override for dark theme
      MuiContainer: {
        styleOverrides: {
          root: {
            backgroundColor: 'transparent',
          },
        },
      },
      // Material-UI Box override for dark theme
      MuiBox: {
        styleOverrides: {
          root: {
            // Don't force background unless specifically styled
          },
        },
      },
      // Material-UI Dialog override for dark theme
      MuiDialog: {
        styleOverrides: {
          paper: {
            backgroundColor: customTheme.colors.background.secondary,
            color: customTheme.colors.text.primary,
          },
        },
      },
      // Material-UI Menu/Dropdown override for dark theme
      MuiMenu: {
        styleOverrides: {
          paper: {
            backgroundColor: customTheme.colors.background.secondary,
            color: customTheme.colors.text.primary,
          },
        },
      },
      // Material-UI Card override for dark theme
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundColor: customTheme.colors.background.secondary,
            color: customTheme.colors.text.primary,
          },
        },
      },
      // Material-UI Typography override for dark theme
      MuiTypography: {
        styleOverrides: {
          root: {
            color: 'inherit', // Use inherited color from theme
          },
        },
      },
    },
  });
};

// App wrapper that consumes the theme context
const AppWithTheme: React.FC = () => {
  const { theme, actualTheme } = useThemeContext();
  const materialUITheme = createMaterialUITheme(theme, actualTheme);


  // Update body background color based on theme
  React.useEffect(() => {
    document.body.style.backgroundColor = theme.colors.background.primary;
    document.body.style.transition = 'background-color 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
  }, [theme.colors.background.primary]);

  return (
    <MuiThemeProvider theme={materialUITheme}>
      <CssBaseline />
      <App />
    </MuiThemeProvider>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AppWithTheme />
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
