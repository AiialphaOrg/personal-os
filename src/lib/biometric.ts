import { Capacitor } from "@capacitor/core"
import { BiometricAuth, BiometryType } from "@aparajita/capacitor-biometric-auth"

export type BiometricAvailability = {
  available: boolean
  biometryType: "face" | "fingerprint" | "iris" | "none" | "unknown"
  reason?: string
}

function mapBiometryType(type: BiometryType): BiometricAvailability["biometryType"] {
  switch (type) {
    case BiometryType.faceId:
    case BiometryType.faceAuthentication:
      return "face"
    case BiometryType.touchId:
    case BiometryType.fingerprintAuthentication:
      return "fingerprint"
    case BiometryType.irisAuthentication:
      return "iris"
    case BiometryType.none:
      return "none"
    default:
      return "unknown"
  }
}

export async function checkBiometricAvailability(): Promise<BiometricAvailability> {
  const enrolled = localStorage.getItem("pos_biometrics") === "true"

  if (!Capacitor.isNativePlatform()) {
    return {
      available: enrolled,
      biometryType: enrolled ? "fingerprint" : "none",
      reason: enrolled ? undefined : "Enable biometrics during onboarding.",
    }
  }

  try {
    const result = await BiometricAuth.checkBiometry()
    return {
      available: Boolean(result.isAvailable),
      biometryType: mapBiometryType(result.biometryType),
      reason: result.reason,
    }
  } catch (err) {
    return {
      available: false,
      biometryType: "none",
      reason: err instanceof Error ? err.message : "Biometrics unavailable",
    }
  }
}

/** Enroll biometric unlock for future logins. */
export async function enrollBiometrics(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    // Browser / PWA: persist preference; real Face ID runs in the Capacitor shell
    localStorage.setItem("pos_biometrics", "true")
    return true
  }

  try {
    const availability = await checkBiometricAvailability()
    if (!availability.available) return false

    await BiometricAuth.authenticate({
      reason: "Enable biometric unlock for Personal OS",
      cancelTitle: "Cancel",
      allowDeviceCredential: true,
      iosFallbackTitle: "Use passcode",
      androidTitle: "Personal OS",
      androidSubtitle: "Confirm to enable biometric login",
    })
    localStorage.setItem("pos_biometrics", "true")
    return true
  } catch {
    return false
  }
}

export async function authenticateBiometrics(
  reason = "Unlock Personal OS"
): Promise<boolean> {
  if (localStorage.getItem("pos_biometrics") !== "true") {
    return false
  }

  if (!Capacitor.isNativePlatform()) {
    // Web fallback when preference is on (Capacitor provides real biometrics)
    return true
  }

  try {
    await BiometricAuth.authenticate({
      reason,
      cancelTitle: "Cancel",
      allowDeviceCredential: true,
      iosFallbackTitle: "Use passcode",
      androidTitle: "Personal OS",
      androidSubtitle: reason,
    })
    return true
  } catch {
    return false
  }
}

export function isNativeApp() {
  return Capacitor.isNativePlatform()
}
