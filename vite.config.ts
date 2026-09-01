import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { VitePWA } from "vite-plugin-pwa"

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "Personal OS",
        short_name: "PersonalOS",
        description: "Personal money, goals, and daily clarity",
        theme_color: "#3b82f6",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        icons: [
          {
            src: "/favicon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
        shortcuts: [
          {
            name: "Add Expense",
            short_name: "Expense",
            description: "Quickly record a new expense",
            url: "/capture/expense",
            icons: [{ src: "/favicon.svg", sizes: "192x192" }],
          },
          {
            name: "Transfer Funds",
            short_name: "Transfer",
            description: "Transfer money between wallets or accounts",
            url: "/capture/transfer",
            icons: [{ src: "/favicon.svg", sizes: "192x192" }],
          },
          {
            name: "Record Debt / Owed",
            short_name: "Debt",
            description: "Record payable or receivable",
            url: "/capture/i_owe",
            icons: [{ src: "/favicon.svg", sizes: "192x192" }],
          },
          {
            name: "Add Income",
            short_name: "Income",
            description: "Log incoming cash or salary",
            url: "/capture/income",
            icons: [{ src: "/favicon.svg", sizes: "192x192" }],
          },
        ],
      },

      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,svg,woff2}"],
        navigateFallback: "/index.html",
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/api/quotes"),
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "quotes-api",
              expiration: { maxEntries: 64, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
  server: {
    port: 5177,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    exclude: ["@huggingface/transformers"],
  },
  worker: {
    format: "es",
  },
})
