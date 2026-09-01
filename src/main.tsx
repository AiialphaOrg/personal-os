import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { Provider } from "react-redux"
import { store } from "@/store"

import "./index.css"
import App from "./App.tsx"
import { ThemeProvider } from "@/components/theme-provider.tsx"
import { NativeShellBootstrap } from "@/components/native-shell-bootstrap"
import { AppQueryProvider } from "@/providers/query-provider"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider store={store}>
      <ThemeProvider>
        <AppQueryProvider>
          <NativeShellBootstrap />
          <App />
        </AppQueryProvider>
      </ThemeProvider>
    </Provider>
  </StrictMode>
)

