import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React libraries
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // Material-UI core
          'mui-core': ['@mui/material', '@mui/system'],
          // Material-UI icons (large package)
          'mui-icons': ['@mui/icons-material'],
          // Other vendors (axios, etc.)
          'vendor': ['axios'],
        },
      },
    },
    // Optional: Increase chunk size warning limit if needed
    // chunkSizeWarningLimit: 600,
  },
});
