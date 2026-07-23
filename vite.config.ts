/// <reference types="vite-react-ssg" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
  // vite-react-ssg options.
  ssgOptions: {
    entry: 'src/main.tsx',
    // Emit /events/index.html rather than /events.html so nginx's
    // `try_files $uri $uri/ /index.html` resolves clean URLs to the right file.
    dirStyle: 'nested',
  },
})
