import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB limit
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      },
      manifest: {
        name: 'Gestion360 Immo',
        short_name: 'Gestion360',
        description: 'Solution de Gestion Immobilière et Hôtelière',
        theme_color: '#4f46e5',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-core': ['react', 'react-dom'],
          'vendor-router': ['react-router-dom', '@tanstack/react-query'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-ui': ['lucide-react', 'clsx', 'tailwind-merge', 'react-hot-toast'],
          'vendor-utils': ['date-fns', 'dexie', 'html2canvas', 'jspdf'],
          'modular-core': [
            './src/lib/db/modularService.ts',
            './src/lib/offlineSync.ts'
          ]
        }
      }
    }
  },
  server: {
    port: 3000,
    host: true,
    hmr: false
  },
  preview: {
    port: 3000,
    host: true
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});