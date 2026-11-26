// vite.config.ts - PRODUCTION OPTIMIZED
import path from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
  define: {
    __VERCEL_ENV__: JSON.stringify(process.env.VERCEL_ENV ?? ""),
  },
  resolve: {
    alias: {
      // jsPDF dynamically imports optional "html2canvas"; alias it to "html2canvas-pro"
      // so the build does not emit a duplicate 200KB html2canvas chunk into dist/ and precache.
      html2canvas: "html2canvas-pro",
      // Repota captures DOM/charts via html2canvas-pro + pdf.addImage(), never jsPDF.html(),
      // so optional SVG/DOMPurify chunks are unused bloat in dist/ and Workbox precache.
      canvg: path.resolve(__dirname, "src/utils/emptyModule.ts"),
      dompurify: path.resolve(__dirname, "src/utils/emptyModule.ts"),
    },
  },
  test: {
    globals: true,
    environment: "happy-dom",
    setupFiles: "./src/test/setup.ts",
    css: true,
    exclude: ["node_modules/**", "dist/**", "e2e/**"],
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
        "apple-touch-icon.png",
        "developer.jpg",
      ],

      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        // Precache essential files for offline functionality
        globPatterns: ["index.html", "**/*.{js,css,woff,woff2}", "assets/**/*.{png,svg}"],
        globIgnores: ["og-image.png", "screenshot-*.png", "stats.html", "**/posthog-*.js"],
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
          // Cache images with StaleWhileRevalidate strategy
          {
            urlPattern: /^https?.*\.(png|jpg|jpeg|svg|gif|webp)$/,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "images-cache",
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
        ],
      },

      manifest: {
        id: "/",
        name: "Repota - GES Report Generator",
        short_name: "Repota",
        description:
          "Free, offline-first report card generator for Ghanaian teachers. Generate GES-compliant reports in minutes.",
        theme_color: "#FFFFFF",
        background_color: "#ffffff",
        display: "standalone",
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
            src: "maskable-icon-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable",
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
            sizes: "780x1688",
            type: "image/png",
            form_factor: "narrow",
            label: "Manage Your Class Offline — Dashboard (Mobile)",
          },
          {
            src: "screenshot-report-mobile.png",
            sizes: "780x1688",
            type: "image/png",
            form_factor: "narrow",
            label: "Print-Ready A4 GES Report Cards (Mobile)",
          },
          {
            src: "screenshot-gradebook-mobile.png",
            sizes: "780x1688",
            type: "image/png",
            form_factor: "narrow",
            label: "Fast Quick Gradebook & SBA Score Entry (Mobile)",
          },
          {
            src: "screenshot-analytics-mobile.png",
            sizes: "780x1688",
            type: "image/png",
            form_factor: "narrow",
            label: "Instant Class Analytics & Charts (Mobile)",
          },
          {
            src: "screenshot-desktop.png",
            sizes: "1280x720",
            type: "image/png",
            form_factor: "wide",
            label: "Manage Your Class Offline — Dashboard (Desktop)",
          },
          {
            src: "screenshot-report-desktop.png",
            sizes: "1280x720",
            type: "image/png",
            form_factor: "wide",
            label: "Print-Ready A4 GES Report Cards (Desktop)",
          },
          {
            src: "screenshot-gradebook-desktop.png",
            sizes: "1280x720",
            type: "image/png",
            form_factor: "wide",
            label: "Fast Quick Gradebook & SBA Score Entry (Desktop)",
          },
          {
            src: "screenshot-analytics-desktop.png",
            sizes: "1280x720",
            type: "image/png",
            form_factor: "wide",
            label: "Instant Class Analytics & Charts (Desktop)",
          },
        ],
      },

      devOptions: {
        enabled: true, // Enable PWA in development for testing
      },
    }),
    visualizer({
      filename: "./.cache/stats.html",
      open: false, // Set to true to auto-open after build
      gzipSize: true,
      brotliSize: true,
    }),
  ],

  // Production optimizations
  build: {
    target: "es2020",
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
          if (id.includes("node_modules/d3-") || id.includes("node_modules/victory-vendor")) {
            return "d3";
          }
          if (id.includes("node_modules/recharts")) {
            return "recharts";
          }
          if (id.includes("node_modules/lucide-react")) {
            return "icons";
          }
          if (id.includes("node_modules/posthog-js")) {
            return "posthog";
          }
        },
      },
    },
  },
});
