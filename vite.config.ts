/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'JesusFeed',
        short_name: 'JesusFeed',
        description: 'An endless scroll of Scripture — verses, trivia, and the world of the Bible.',
        theme_color: '#12151c',
        background_color: '#12151c',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,json}'],
        globIgnores: ['**/commentary/jfb/**', '**/commentary/mhc/**'],
        maximumFileSizeToCacheInBytes: 8388608,
        runtimeCaching: [
          {
            urlPattern: /\/commentary\/(jfb|mhc)\/[A-Z0-9]+\.json$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'ondemand-commentary',
              expiration: { maxEntries: 160 },
            },
          },
        ],
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test-setup.ts',
  },
})
