import { CssBaseline, ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App';
import ErrorBoundary from './shared/components/ErrorBoundary';
import { DensityProvider } from './shared/context/DensityContext';
import { ThemeProvider } from './shared/context/ThemeProvider';
import { useThemeContext } from './shared/context/ThemeProvider';
import './index.css';
import './shared/styles/theme-transitions.css';
import './shared/styles/force-light-theme.css';

// React Query client with persistence and optimizations
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      // Cache data for 5 minutes
      staleTime: 5 * 60 * 1000,
      // Keep unused data in cache for 10 minutes
      gcTime: 10 * 60 * 1000,
    },
  },
});

// Persist query cache to localStorage for offline support
// This improves perceived performance on repeat visits
if (typeof window !== 'undefined') {
  const CACHE_KEY = 'threatflow:query-cache';

  // Restore cache on load
  const restoreCache = async () => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { timestamp, cache } = JSON.parse(cached);
        // Only restore if cache is less than 1 hour old
        if (Date.now() - timestamp < 60 * 60 * 1000) {
          queryClient.setQueryData(['cached'], cache);
        }
      }
    } catch (error) {
      console.warn('Failed to restore query cache:', error);
    }
  };

  // Persist cache periodically
  const persistCache = () => {
    try {
      const cache = queryClient.getQueryCache().getAll();
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        timestamp: Date.now(),
        cache: cache.slice(0, 50) // Limit to 50 most recent queries
      }));
    } catch (error) {
      // Ignore quota exceeded errors
    }
  };

  restoreCache();

  // Persist on visibility change (when user leaves tab)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      persistCache();
    }
  });

  // Persist before unload
  window.addEventListener('beforeunload', persistCache);
}

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

  // Memoize Material-UI theme creation to prevent recreation on every render
  const materialUITheme = React.useMemo(
    () => createMaterialUITheme(theme, actualTheme),
    [theme, actualTheme]
  );

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
          <DensityProvider>
            <AppWithTheme />
          </DensityProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);

// Register service worker for offline support and caching
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        console.log('[Service Worker] Registered successfully:', registration.scope);

        // Check for updates periodically
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000); // Check every hour

        // Handle updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker available, notify user
                console.log('[Service Worker] New version available');
                // You can dispatch a custom event here to show a toast notification
                window.dispatchEvent(new CustomEvent('sw-update-available'));
              }
            });
          }
        });
      })
      .catch((error) => {
        console.error('[Service Worker] Registration failed:', error);
      });
  });
}
