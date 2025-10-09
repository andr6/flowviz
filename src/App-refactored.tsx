import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

import { ThreatFlowMainApp } from './components/ThreatFlowMainApp';
import { AuthProvider } from './features/auth/context/AuthContext';
import { ErrorBoundary } from './shared/components/ErrorBoundary';
import { AppStateProvider } from './shared/context/AppStateContext';
import { ThemeProvider } from './shared/context/ThemeProvider';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

/**
 * Root App Component - Provides global context and error boundaries
 * Simplified to handle only top-level concerns
 */
function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <AppStateProvider>
              <ThreatFlowMainApp />
            </AppStateProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;