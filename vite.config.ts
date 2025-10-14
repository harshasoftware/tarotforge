import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { resolve } from 'path';
import fs from 'fs';
import path from 'path';

// Read package.json to get the version
const packageJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'));
const appVersion = packageJson.version;

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'generateSW',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'prompt',
      includeAssets: ['tarot-icon.svg', 'android/**/*', 'ios/**/*', 'windows11/**/*', 'sounds/*.mp3'],
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,gif,webp,woff,woff2,ttf,eot}'],
        navigateFallback: 'index.html',
        skipWaiting: true,
        clientsClaim: true,
        // Increase cache limit to accommodate Privy and other large dependencies
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024, // 4MB (was 2MB)
      },
      devOptions: {
        enabled: true,
        type: 'module',
        navigateFallback: 'index.html'
      }
    })
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion),
    global: 'window', // Polyfill for Node.js global object
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['framer-motion', 'lucide-react'],
          'analytics': ['logrocket', 'logrocket-react', 'mixpanel-browser', '@sentry/react', '@sentry/tracing'],
          'crypto': ['crypto-js'],
          'pdf': ['html2canvas', 'jspdf'],
          // Separate Privy and Web3 dependencies into their own chunk
          'web3-vendor': ['@privy-io/react-auth', '@privy-io/wagmi', '@solana/web3.js', '@solana/wallet-adapter-react']
        }
      }
    },
    chunkSizeWarningLimit: 1500, // Increased for Web3 dependencies
    target: 'esnext',
    minify: 'esbuild'
  },
  assetsInclude: ['**/*.lottie', '**/*.mp3'],
});