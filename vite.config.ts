import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate", // Auto-update the app when you push new code
      includeAssets: ["favicon.svg", "logo.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Repota - GES Report Generator",
        short_name: "Repota",
        description: "Offline-first report card generator for Ghanaian teachers.",
        theme_color: "#1E3A8A", // Your Navy Blue
        background_color: "#ffffff",
        display: "standalone", // Removes browser address bar
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "pwa-192x192.png", // We will create these in Step 4
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
            purpose: "any maskable", // Looks good on Android round icons
          },
        ],
      },
    }),
  ],
});
