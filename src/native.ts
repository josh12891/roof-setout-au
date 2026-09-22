import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";

export async function setupNativeShell(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await StatusBar.setStyle({ style: Style.Dark });
    if (Capacitor.getPlatform() === "android") {
      await StatusBar.setBackgroundColor({ color: "#d9e2e8" });
    }
  } catch {
    // Status bar plugin is absent in some browser previews.
  }
  try {
    await SplashScreen.hide();
  } catch {
    // Splash is only present on device builds.
  }
}
