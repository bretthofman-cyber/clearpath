import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  test: {
    environment: 'node',
  },
  plugins: [react()],
  server: {
    proxy: {
      '/api/anthropic': {
        target: 'https://api.anthropic.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/anthropic/, ''),
      },
      // /api/chat is a Vercel serverless function — not available via `npm run dev`.
      // For local AI testing use: vercel dev (runs on port 3000 and serves both frontend + functions)
      '/api/chat': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  }
})
