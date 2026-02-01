// vite.config.ts - PRODUCTION OPTIMIZED
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "favicon.svg",
        "favicon.ico",
        "logo.svg",
        "apple-touch-icon.png",
        "og-image.png",
        "developer.jpg", // Developer profile image
      ],

      workbox: {
        // Only precache essential files for faster initial load
        globPatterns: ["**/*.{html,ico,png,svg,woff,woff2}"],
        // Don't precache large JS chunks - load on demand
        globIgnores: [
          "**/recharts-*.js",
          "**/CategoricalChart-*.js",
          "**/Analytics-*.js",
          "**/Settings-*.js",
        ],
        // Maximum cache size
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // 3MB
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/cdnjs\.cloudflare\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "cdn-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },

      manifest: {
        name: "Repota - GES Report Generator",
        short_name: "Repota",
        description:
          "Free, offline-first report card generator for Ghanaian teachers. Generate GES-compliant reports in minutes.",
        theme_color: "#1E3A8A",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        categories: ["education", "productivity", "utilities"],

        icons: [
          {
            src: "pwa-64x64.png",
            sizes: "64x64",
            type: "image/png",
          },
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],

        // Screenshots for app stores (optional but recommended)
        screenshots: [
          {
            src: "screenshot-mobile.png",
            sizes: "750x1334",
            type: "image/png",
            form_factor: "narrow",
          },
          {
            src: "screenshot-desktop.png",
            sizes: "1920x1080",
            type: "image/png",
            form_factor: "wide",
          },
        ],
      },

      devOptions: {
        enabled: true, // Enable PWA in development for testing
      },
    }),
    visualizer({
      filename: "./dist/stats.html",
      open: false, // Set to true to auto-open after build
      gzipSize: true,
      brotliSize: true,
    }),
  ],

  // Production optimizations
  build: {
    target: "es2015",
    minify: "esbuild",
    cssMinify: true,
    chunkSizeWarningLimit: 400, // Warn if chunks exceed 400KB
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React libraries
          vendor: ["react", "react-dom"],
          router: ["@tanstack/react-router"],
          icons: ["lucide-react"],
          // Don't manually chunk recharts - let lazy loading handle it
          // recharts: ["recharts"],
        },
      },
    },
  },
});
