import { resolve } from 'node:path';
import dotenv from 'dotenv';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

dotenv.config({ path: resolve(process.cwd(), '.env'), override: true });
const API_TARGET = `http://127.0.0.1:${String(process.env.PORT || '5055')}`;

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: [
      'localhost',
      'gftarenatest.cc',
      'www.gftarenatest.cc',
      '.ngrok-free.dev',
      '.ngrok-free.app',
      '.ngrok.io',
      '.trycloudflare.com',
    ],
    proxy: {
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
      },
    },
  },
  preview: {
    proxy: {
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('react') || id.includes('react-dom')) return 'react-vendor';
          if (id.includes('xrpl') || id.includes('xumm-sdk')) return 'wallet-vendor';
          return 'vendor';
        },
      },
    },
  },
});
