# Personal OS — Frontend

> A fast, privacy-first personal operating system designed for frictionless daily planning, financial tracking, subscriptions management, and quick voice/text capture.

---

## 🚀 Key Features

### 📅 1. Today & Planner
- **Agenda & Timeline**: Real-time breakdown of your daily commitments, tasks, and habits.
- **Context-Aware Sidebar**: Dynamic right sidebar providing calendar navigation, upcoming bills, and quick reminders.
- **Daily Review**: Focused end-of-day reconciliation and planning flow.

### 💳 2. Finances & Multi-Wallets
- **Multi-Account Tracking**: Manage Spending, Savings, and Investment accounts with real-time balance calculations.
- **Wealth Breakdown**: Collapsible accordion breakdown displaying available funds, savings, investments, receivables, and payables.
- **Debts & Loans**: Track Payables (*I Owe*) and Receivables (*Owed to Me*) with single-tap debt settlement.
- **Bank Charges & Breakdowns**: Granular transaction fees (e.g. transfer fees, stamp duties) broken down in transaction history.

### 🔄 3. Subscriptions & Wishlist
- **Subscriptions Manager**: Track recurring monthly/weekly bills, view burn rate, and execute one-tap cycle-aware charges.
- **Planned Purchases & Wishlist**: Checklist for upcoming one-time, weekly, and monthly expenses with direct checkout to Expense or Payable (Debt).
- **Asana-Style Underline Navigation**: Smooth URL query parameter state persistence (`?tab=subscriptions` vs `?tab=wishlist`).

### ⚡ 4. Fast Global Capture & Voice AI
- **Voice / Text Capture**: Natural language transaction & task parsing powered by local ONNX Web Runtime AI.
- **Keyboard Shortcuts**: Global `⌘K` / `Ctrl+K` search & action palette.
- **PWA & Offline First**: Full offline support with Progressive Web App capabilities, Service Worker sync, and local storage caching.

---

## 🛠️ Technology Stack

- **Framework**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vite.dev/)
- **Routing**: [React Router 7](https://reactrouter.com/)
- **State Management**: [Redux Toolkit](https://redux-toolkit.js.org/) + [Zustand](https://github.com/pmndrs/zustand)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- **Icons**: [Lucide React](https://lucide.dev/) (strictly no emojis)
- **Local AI / NLP**: [ONNX Web Runtime](https://onnxruntime.ai/) in Web Worker
- **Mobile Support**: [Capacitor](https://capacitorjs.com/)

---

## 📁 Directory Structure

```
frontend/
├── public/               # Static assets & PWA manifest
├── src/
│   ├── components/       # UI components & feature modules
│   │   ├── sidebar/      # Left navigation & adaptive right sidebar
│   │   ├── ui/           # shadcn/ui base primitives
│   │   ├── capture-sheet.tsx
│   │   ├── subscriptions-manager.tsx
│   │   ├── planned-purchases-checklist.tsx
│   │   └── VoiceControl.tsx
│   ├── hooks/            # Custom React hooks (usePosQuery, useHeader, etc.)
│   ├── lib/              # API clients, storage, sync engine & AI parser
│   ├── pages/            # Application views (Today, Money, Subscriptions, etc.)
│   ├── store/            # Redux store slices
│   ├── stores/           # Zustand UI stores
│   ├── App.tsx           # Route layout & providers
│   └── main.tsx          # Application entrypoint
├── capacitor.config.ts   # Mobile configuration
├── vite.config.ts        # Vite build & PWA configuration
└── package.json
```

---

## 🏁 Getting Started

### Prerequisites
- Node.js 18+
- npm / yarn / pnpm

### Installation
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install
```

### Development
```bash
# Start Vite development server
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### Production Build
```bash
# Type check and build bundle
npm run build

# Preview production build locally
npm run preview
```

---

## 📱 Mobile (Capacitor)
```bash
# Sync web build to native iOS / Android projects
npx cap sync

# Open in Xcode or Android Studio
npx cap open ios
npx cap open android
```

---

## 📄 License
MIT
