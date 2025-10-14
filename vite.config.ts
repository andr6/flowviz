import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Enable Fast Refresh
      fastRefresh: true,
      // Optimize JSX runtime
      jsxRuntime: 'automatic',
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    // Target modern browsers for smaller bundles
    target: 'es2020',
    // Remove console statements in production builds, keep console.error and console.warn for debugging
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: ['log', 'info', 'debug'],
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.debug', 'console.info'],
        passes: 2, // Run compression twice for better results
      },
      mangle: {
        safari10: true, // Ensure Safari 10+ compatibility
      },
    },
    // Optimize chunk size
    chunkSizeWarningLimit: 600, // Warn for chunks larger than 600kb
    // Source maps for production debugging
    sourcemap: false, // Disable to reduce build size
    // CSS code splitting
    cssCodeSplit: true,
    // Optimize assets
    assetsInlineLimit: 4096, // Inline assets smaller than 4kb
    // Advanced code splitting for optimal loading
    rollupOptions: {
      output: {
        // Optimize chunk file names for better caching
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',

        manualChunks: (id) => {
          // Core vendors - split by library for better caching
          if (id.includes('node_modules')) {
            // React ecosystem (frequently used, cache separately)
            if (id.includes('react') || id.includes('react-dom')) return 'react-vendor';
            if (id.includes('react/jsx-runtime')) return 'react-vendor';

            // MUI components (large library, split into two chunks)
            if (id.includes('@mui/material')) return 'mui-material-vendor';
            if (id.includes('@mui/icons-material')) return 'mui-icons-vendor';
            if (id.includes('@emotion')) return 'mui-material-vendor';

            // Visualization libraries
            if (id.includes('reactflow')) return 'reactflow-vendor';
            if (id.includes('d3')) return 'd3-vendor';
            if (id.includes('dagre')) return 'd3-vendor';

            // AI/ML libraries (may not always be needed)
            if (id.includes('@anthropic-ai/sdk')) return 'anthropic-vendor';

            // State management and data fetching
            if (id.includes('@tanstack/react-query')) return 'query-vendor';

            // Utility libraries (small, can be grouped)
            if (id.includes('date-fns') || id.includes('uuid')) return 'utils-vendor';

            // Crypto libraries
            if (id.includes('crypto-js') || id.includes('bcrypt')) return 'crypto-vendor';

            // Three.js and WebGL (large, separate chunk)
            if (id.includes('three') || id.includes('@react-three')) return 'three-vendor';

            // Everything else goes into general vendor
            return 'vendor';
          }

          // Feature-based splitting - each feature loads independently
          if (id.includes('/src/features/')) {
            const feature = id.split('/src/features/')[1]?.split('/')[0];
            return feature ? `feature-${feature}` : undefined;
          }

          // Shared utilities - loaded once and cached
          if (id.includes('/src/shared/')) {
            if (id.includes('/src/shared/components')) return 'shared-components';
            if (id.includes('/src/shared/services')) return 'shared-services';
            if (id.includes('/src/shared/theme')) return 'shared-theme';
            if (id.includes('/src/shared/hooks')) return 'shared-hooks';
            if (id.includes('/src/shared/utils')) return 'shared-utils';
            return 'shared';
          }
        }
      }
    }
  }
})
