import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  test: {
    environment: 'node',
  },
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) return 'vendor-react';
          if (id.includes('@clerk/clerk-react')) return 'vendor-auth';
          if (id.includes('@supabase/supabase-js')) return 'vendor-db';
        },
      },
    },
  },
  server: {
    proxy: {}
  }
})
