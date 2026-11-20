// vite.config.ts - PRODUCTION OPTIMIZED
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
  test: {
    globals: true,
    environment: "happy-dom",
    setupFiles: "./src/test/setup.ts",
    css: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "src/test/",
        "*.config.{js,ts}",
        "dist/",
        "**/*.d.ts",
        "**/*.test.{ts,tsx}",
        "**/*.spec.{ts,tsx}",
      ],
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: [
        "favicon.svg",
        "favicon.ico",
        "favicon-96x96.png",
        "logo.svg",
        "apple-touch-icon.png",
        "maskable-icon-512x512.png",
      ],

      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        // Precache essential files for offline functionality
        globPatterns: ["**/*.{html,js,css,ico,png,svg,woff,woff2}"],
        globIgnores: ["og-image.png", "screenshot-*.png"],
        // Maximum cache size
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // 3MB
        // Navigation fallback for offline support
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api/, /^\/assets\//],
        runtimeCaching: [
          // Cache JS/CSS files with NetworkFirst strategy
          {
            urlPattern: /^https?.*\.(js|css)$/,
            handler: "NetworkFirst",
            options: {
              cacheName: "assets-cache",
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              cacheableResponse: {
                statuses: [200],
              },
              plugins: [
                {
                  cacheWillUpdate: async ({ response }: { response?: Response | null }) => {
                    if (!response) return null;
                    const contentType = response.headers.get("content-type") || "";
                    if (contentType.includes("text/html")) {
                      return null;
                    }
                    return response;
                  },
                },
              ],
            },
          },
          // Cache images with CacheFirst strategy
          {
            urlPattern: /^https?.*\.(png|jpg|jpeg|svg|gif|webp)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "images-cache",
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
          // Cache CDN resources
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
            src: "pwa-any-64x64.png",
            sizes: "64x64",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "pwa-any-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "pwa-any-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "maskable-icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],

        // Screenshots for app stores (optional but recommended)
        screenshots: [
          {
            src: "screenshot-mobile.png",
            sizes: "750x1334",
            type: "image/png",
            form_factor: "narrow",
            label: "Student Dashboard & Class Overview (Mobile)",
          },
          {
            src: "screenshot-analytics-mobile.png",
            sizes: "750x1334",
            type: "image/png",
            form_factor: "narrow",
            label: "Class Performance Analytics & Insights (Mobile)",
          },
          {
            src: "screenshot-desktop.png",
            sizes: "1920x1080",
            type: "image/png",
            form_factor: "wide",
            label: "Student Dashboard & Sidebar Navigation (Desktop)",
          },
          {
            src: "screenshot-analytics-desktop.png",
            sizes: "1920x1080",
            type: "image/png",
            form_factor: "wide",
            label: "Class Performance Analytics & Insights (Desktop)",
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
    chunkSizeWarningLimit: 400,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/react-dom") || id.includes("node_modules/react/")) {
            return "vendor";
          }
          if (id.includes("node_modules/@tanstack/react-router")) {
            return "router";
          }
          if (id.includes("node_modules/recharts") || id.includes("node_modules/d3-")) {
            return "recharts";
          }
          if (id.includes("node_modules/lucide-react")) {
            return "icons";
          }
        },
      },
    },
  },
});
