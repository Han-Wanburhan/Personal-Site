import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Send API calls to the Go server (APP_PORT, default 8080) so the browser
    // sees one origin and no CORS setup is needed in dev.
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
})
