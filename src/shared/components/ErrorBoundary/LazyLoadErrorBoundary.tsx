import { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button, Alert, AlertTitle } from '@mui/material';
import { ErrorOutline as ErrorOutlineIcon, Refresh as RefreshIcon } from '@mui/icons-material';

interface Props {
  children: ReactNode;
  componentName?: string;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

/**
 * Error Boundary specifically designed for lazy-loaded components.
 * Provides a lightweight fallback UI for component loading failures.
 *
 * Usage:
 * ```tsx
 * <LazyLoadErrorBoundary componentName="Settings Dialog">
 *   <Suspense fallback={<CircularProgress />}>
 *     <LazyComponent />
 *   </Suspense>
 * </LazyLoadErrorBoundary>
 * ```
 */
class LazyLoadErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const componentName = this.props.componentName || 'Component';
    console.error(`LazyLoadErrorBoundary: Failed to load ${componentName}`, error, errorInfo);

    this.setState({
      error,
      errorInfo
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to error monitoring service (if available)
    if (typeof window !== 'undefined' && (window as any).errorMonitoring) {
      (window as any).errorMonitoring.captureException(error, {
        componentName,
        errorInfo
      });
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const componentName = this.props.componentName || 'component';

      // Default lightweight error UI
      return (
        <Box
          sx={{
            p: 3,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 200
          }}
        >
          <Alert
            severity="error"
            sx={{
              maxWidth: 600,
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              '& .MuiAlert-icon': {
                color: '#ef4444'
              }
            }}
          >
            <AlertTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ErrorOutlineIcon fontSize="small" />
              Failed to load {componentName}
            </AlertTitle>

            <Typography variant="body2" sx={{ mb: 2 }}>
              {this.state.error?.message || 'An unexpected error occurred while loading this component.'}
            </Typography>

            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <Box
                sx={{
                  mt: 2,
                  p: 1,
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                  borderRadius: 1,
                  maxHeight: 150,
                  overflow: 'auto'
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    fontFamily: 'monospace',
                    fontSize: '0.75rem',
                    whiteSpace: 'pre-wrap',
                    display: 'block'
                  }}
                >
                  {this.state.errorInfo.componentStack}
                </Typography>
              </Box>
            )}

            <Box sx={{ mt: 2 }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={this.handleRetry}
                sx={{
                  borderColor: 'rgba(239, 68, 68, 0.5)',
                  color: '#ef4444',
                  '&:hover': {
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)'
                  }
                }}
              >
                Reload Page
              </Button>
            </Box>
          </Alert>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default LazyLoadErrorBoundary;
