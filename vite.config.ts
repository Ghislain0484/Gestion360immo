import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    legacy({
      targets: ['defaults', 'not IE 11', 'Safari 12'],
    }),
    VitePWA({
      registerType: 'prompt', // On utilise prompt pour forcer la visibilité du changement
      devOptions: {
        enabled: true
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      workbox: {
        cleanupOutdatedCaches: true, // Nettoyage agressif
        skipWaiting: true, // Force le nouveau SW à s'activer immediately
        clientsClaim: true,
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
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