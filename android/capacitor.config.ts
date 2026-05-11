import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.pulse.messenger",
  appName: "Pulse Messenger",
  webDir: "artifacts/pulse/dist",
  server: {
    url: "https://pulse.replit.app",
    cleartext: false,
    androidScheme: "https",
  },
  android: {
    backgroundColor: "#0d0d0d",
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: "#0d0d0d",
      androidSplashResourceName: "splash",
      showSpinner: false,
      launchAutoHide: true,
    },
    StatusBar: {
      style: "Dark",
      backgroundColor: "#0d0d0d",
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    Keyboard: {
      resize: "body",
      style: "dark",
      resizeOnFullScreen: true,
    },
    LocalNotifications: {
      smallIcon: "ic_stat_pulse",
      iconColor: "#ff5500",
    },
  },
};

export default config;
