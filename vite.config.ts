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
      includeAssets: ['tarot-icon.svg', 'android/**/*', 'ios/**/*', 'windows11/**/*', 'sounds/**/*.mp3'],
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,gif,webp,woff,woff2,ttf,eot}'],
        // Handle MP3 files separately
        additionalManifestEntries: [
          { url: 'sounds/ambient-background-loop.mp3', revision: null },
          { url: 'sounds/flipcard.mp3', revision: null },
          { url: 'sounds/happy-relaxing-loop.mp3', revision: null },
          { url: 'sounds/tarot-shuffle.mp3', revision: null },
          { url: 'sounds/ui-pop-sound.mp3', revision: null }
        ],
        navigateFallback: 'index.html',
        skipWaiting: true,
        clientsClaim: true,
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
    // exclude: ['lucide-react'], // Commented out as a potential fix
  },
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion),
    global: 'window', // Polyfill for Node.js global object
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    // Set a higher limit to prevent inlining large audio files
    assetsInlineLimit: 4096, // 4KB - ensures MP3s aren't inlined
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'react-vendor';
            }
            if (id.includes('framer-motion') || id.includes('lucide-react')) {
              return 'ui-vendor';
            }
            if (id.includes('logrocket') || id.includes('mixpanel') || id.includes('sentry')) {
              return 'analytics';
            }
            if (id.includes('crypto-js')) {
              return 'crypto';
            }
            if (id.includes('html2canvas') || id.includes('jspdf')) {
              return 'pdf';
            }
            return 'vendor'; // all other node_modules
          }
        },
        // Special handling for asset files, particularly MP3s
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name ? assetInfo.name.split('.') : [];
          const ext = info.length > 1 ? info[info.length - 1] : '';
          
          if (ext === 'mp3') {
            return 'assets/sounds/[name][extname]';
          }
          
          return 'assets/[name]-[hash][extname]';
        }
      }
    },
    chunkSizeWarningLimit: 1500,
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false,
        drop_debugger: true,
        pure_funcs: ['console.debug']
      },
      format: {
        comments: false
      },
      mangle: {
        safari10: true
      }
    }
  }
});