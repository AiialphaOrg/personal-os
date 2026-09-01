# Capacitor — live web UI

Personal OS can keep a **native shell** (keyboard, biometrics, notifications) while loading the **UI from the web**. That way you ship UI changes by deploying the Vite app — no App Store / Play rebuild for layout-only updates.

## Modes

| Mode | When | How |
|------|------|-----|
| **Bundled** | Offline / store release | Leave `CAP_SERVER_URL` empty → `npm run cap:sync` embeds `dist/` |
| **Live web** | Day-to-day UI iteration | Set `CAP_SERVER_URL` → sync once → deploy web freely |

## Setup (live web)

1. Copy env example and set your URL:

```bash
cp .env.example .env
# CAP_SERVER_URL=https://your-app.vercel.app
# or for local Vite from a phone on the same Wi‑Fi:
# CAP_SERVER_URL=http://YOUR_LAN_IP:5173
```

2. Sync native projects (only needed when the URL or native plugins change):

```bash
npm run cap:live
# or: CAP_SERVER_URL=https://… npx cap sync
```

3. Open iOS / Android:

```bash
npm run cap:ios
# or
npm run cap:android
```

4. For local Vite on a device: run `npm run dev -- --host`, use your LAN IP in `CAP_SERVER_URL`, then reopen the app.

## Notes

- Native plugins (biometrics, local notifications, keyboard) still require a native build when **those** packages change.
- Cleartext HTTP is allowed when the URL starts with `http://` (dev only).
- Production should use `https://`.
