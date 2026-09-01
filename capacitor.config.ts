import type { CapacitorConfig } from "@capacitor/cli"

/**
 * Live UI updates without rebuilding native packages:
 * Set CAP_SERVER_URL to your Vite/dev or hosted web app.
 * The native shell (Capacitor) stays installed; UI loads from that URL.
 *
 * Examples:
 *   CAP_SERVER_URL=http://192.168.1.12:5173   # LAN Vite (phone + laptop same Wi‑Fi)
 *   CAP_SERVER_URL=https://your-app.vercel.app # Deployed web build
 *
 * Leave unset to bundle `dist/` into the app (offline / store builds).
 */
const liveUrl = process.env.CAP_SERVER_URL?.trim() || ""

const config: CapacitorConfig = {
  appId: "app.personalos.app",
  appName: "Personal OS",
  webDir: "dist",
  server: {
    androidScheme: "https",
    ...(liveUrl
      ? {
          url: liveUrl,
          cleartext: liveUrl.startsWith("http://"),
        }
      : {}),
  },
  plugins: {
    Keyboard: {
      resize: "body",
      resizeOnFullScreen: true,
    },
    StatusBar: {
      style: "DEFAULT",
    },
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#3b82f6",
    },
  },
}

export default config
