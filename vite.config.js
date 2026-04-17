import { defineConfig, loadEnv } from 'vite'
import path from 'path'
import react from '@vitejs/plugin-react'
import fs from 'fs'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const aiWsProxyTarget = env.AI_WS_PROXY_TARGET || 'http://localhost:8087'
  // CandidateBackend (REST) – use for all candidate APIs; set VITE_API_BASE_URL to '' in dev to use this proxy
  const candidateBackendTarget = env.VITE_API_BASE_URL || 'http://localhost:8003'
  const sslKeyPath = env.SSL_KEY_PATH
  const sslCertPath = env.SSL_CERT_PATH
  const httpsConfig = sslKeyPath && sslCertPath && fs.existsSync(sslKeyPath) && fs.existsSync(sslCertPath)
    ? {
        key: fs.readFileSync(sslKeyPath),
        cert: fs.readFileSync(sslCertPath),
      }
    : false

  return {
    plugins: [react()],
    resolve: {
      alias: {
        react: path.resolve(__dirname, 'node_modules/react'),
        'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      },
      dedupe: ['react', 'react-dom', 'three'],
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'three', '@react-three/fiber', '@react-three/drei'],
    },
    server: {
      port: 4003,
      host: '0.0.0.0',
      https: httpsConfig,
      allowedHosts: true,
      proxy: {
        '/ai-ws': {
          target: aiWsProxyTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/ai-ws/, ''),
          ws: true,
        },
        // CandidateBackend REST – coding-practice, candidate-interviews, public, etc.
        '/coding-practice': { target: candidateBackendTarget, changeOrigin: true },
        '/run-code': { target: candidateBackendTarget, changeOrigin: true },
        '/candidate-interviews': { target: candidateBackendTarget, changeOrigin: true },
        '/public': { target: candidateBackendTarget, changeOrigin: true },
        '/candidate-coding-responses': { target: candidateBackendTarget, changeOrigin: true },
        '/candidate-aptitude-responses': { target: candidateBackendTarget, changeOrigin: true },
        '/candidate/assessment-summary': { target: candidateBackendTarget, changeOrigin: true },
        '/candidate-status': { target: candidateBackendTarget, changeOrigin: true },
        '/candidates': { target: candidateBackendTarget, changeOrigin: true },
        '/health': { target: candidateBackendTarget, changeOrigin: true },
        '/api': { target: candidateBackendTarget, changeOrigin: true },
        // Streaming AI REST — resume content enhancement
        '/resume-content': { target: 'https://localhost:9443', changeOrigin: true },
      },
    },
  }
})
