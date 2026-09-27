import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// NOTE: when deploying to GitHub Pages at username.github.io/<repo>,
// set base to '/<repo>/'. Leave as '/' for a custom domain or a
// username.github.io root repo.
export default defineConfig({
  base: '/aiui/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // Registered manually in main.tsx so we can force an update check
      // whenever the app regains focus — installed PWAs on mobile often get
      // resumed from a frozen background state rather than freshly
      // navigated, so the default lifecycle can miss checking for updates.
      injectRegister: false,
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'AI UI',
        short_name: 'AI UI',
        description: 'Minimal local-first AI chat over OpenRouter',
        start_url: '.',
        display: 'standalone',
        background_color: '#fafcfe',
        theme_color: '#3772bb',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Only precache the app shell; OpenRouter requests always hit the network.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
