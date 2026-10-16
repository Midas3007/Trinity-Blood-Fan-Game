import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';

// Node's process (no @types/node in this project; only env is read).
declare const process: { env: Record<string, string | undefined> };

// Short commit id shown on the title screen so the owner can see which deploy is running (Vercel sets the env var).
const BUILD_ID = (process.env.VERCEL_GIT_COMMIT_SHA ?? 'dev').slice(0, 7);

export default defineConfig({
  define: { __BUILD_ID__: JSON.stringify(BUILD_ID) },
  build: {
    target: 'es2022',
    // Phaser alone is ~1.2 MB minified; keep it in its own cacheable chunk.
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: (id: string) => (id.includes('node_modules/phaser') ? 'phaser' : undefined),
      },
    },
  },
  plugins: [
    VitePWA({
      // New deploys activate immediately so players are never stranded on a stale cache.
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Trinity Blood Fan Game (unofficial)',
        short_name: 'TB Fan Game',
        description: 'Unofficial, non-commercial fan-made Metroidvania inspired by Trinity Blood.',
        theme_color: '#0b0a10',
        background_color: '#0b0a10',
        display: 'fullscreen',
        orientation: 'landscape',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,json,webmanifest}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        // Music and voices are not precached (size); each file is cached the first time it plays, for offline play.
        runtimeCaching: [
          {
            urlPattern: /\/assets\/audio\/.*\.mp3$/,
            handler: 'CacheFirst',
            options: { cacheName: 'audio', expiration: { maxEntries: 80 }, cacheableResponse: { statuses: [200] }, rangeRequests: true },
          },
        ],
      },
    }),
  ],
  test: {
    include: ['tests/**/*.test.ts'],
    // The file-system module cache misses new files matched by import.meta.glob (rooms, sprite manifests).
    fsModuleCache: false,
    environment: 'node',
  },
});
