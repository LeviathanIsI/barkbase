/* eslint-env node */
import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');

  const toNumber = (value, fallback) => {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? fallback : parsed;
  };

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        manifest: {
          name: 'BarkBase Kennel Manager',
          short_name: 'BarkBase',
          description: 'Offline-ready kennel, booking, and pet care management.',
          theme_color: '#3b82f6',
          background_color: '#0f172a',
          display: 'standalone',
          start_url: '/',
          icons: [
            { src: '/favicon.svg', sizes: '192x192', type: 'image/svg+xml' },
            { src: '/favicon.svg', sizes: '512x512', type: 'image/svg+xml' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico,webp}'],
          runtimeCaching: [
            {
              urlPattern: ({ url }) => url.pathname.startsWith('/api'),
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-cache',
                networkTimeoutSeconds: 10,
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: true,
      port: toNumber(env.VITE_PORT, 5173),
      open: false,
      hmr: {
        overlay: true,
      },
      proxy: {
        '/api': {
          target: 'http://localhost:4000',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    preview: {
      host: true,
      port: toNumber(env.VITE_PREVIEW_PORT, 4173),
    },
    envPrefix: 'VITE_',
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            // Core React ecosystem
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            // Data fetching and state
            'vendor-query': ['@tanstack/react-query'],
            // UI animation and icons
            'vendor-ui': ['framer-motion', 'lucide-react'],
            // Charts (large dependency)
            'charts': ['recharts'],
            // Calendar (large dependency)
            'calendar': [
              '@fullcalendar/core',
            ],
            // Form handling
            'forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
            // Drag and drop
            'dnd': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
            // Virtualization
            'virtual': ['@tanstack/react-virtual'],
          },
        },
      },
      // Increase chunk size warning limit
      chunkSizeWarningLimit: 1000,
      // Generate source maps for production debugging
      sourcemap: true,
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setupTests.js',
    },
  };
});
