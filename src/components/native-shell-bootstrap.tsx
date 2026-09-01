import { useNativeShell } from "@/hooks/use-native-shell"

/** Boots Capacitor keyboard + status bar when running as a native shell. */
export function NativeShellBootstrap() {
  useNativeShell()
  return null
}
