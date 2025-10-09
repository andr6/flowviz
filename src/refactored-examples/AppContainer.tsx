// REFACTORED: Simplified App Container following Single Responsibility Principle
import React from 'react';
import { ThemeProvider } from './shared/context/ThemeProvider';
import { AuthProvider } from './features/auth/context/AuthContext';
import { AuthGuard } from './features/auth/components/AuthGuard';
import { ThreatFlowMainApp } from './components/ThreatFlowMainApp';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000,   // 10 minutes
    },
  },
});

export default function AppContainer() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <AuthGuard>
            <ThreatFlowMainApp />
          </AuthGuard>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}