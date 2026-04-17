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
    /* VitePWA({
      selfDestroying: true, // PURGE TOTALE
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true
      },
      manifest: {
        name: 'Gestion360 Immo',
        short_name: 'Gestion360',
        description: 'Solution de Gestion Immobilière et Hôtelière',
        theme_color: '#4f46e5',
      }
    }) */
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
    hmr: {
      overlay: false
    }
  },
  preview: {
    port: 3000,
    host: true
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});