import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8000'

  return {
    plugins: [react()],
    server: {
      host: true,
      allowedHosts: true, 
      proxy: {
        '/auth': {
          target: apiTarget,
          changeOrigin: true,
        },
        '/items': {
          target: apiTarget,
          changeOrigin: true,
        },
        '/employees': {
          target: apiTarget,
          changeOrigin: true,
        },
        '/transactions': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
  }
})