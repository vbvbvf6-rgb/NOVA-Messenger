import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.aura.messenger",
  appName: "Aura",
  webDir: "dist",
  server: {
    url: process.env.SERVER_URL || "https://84c88b09-2469-44f5-b393-ea592956df38-00-hvzx5pp2sa64.pike.replit.dev",
    cleartext: false,
  },
  android: {
    backgroundColor: "#0d0f14",
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: "#0d0f14",
      showSpinner: false,
    },
  },
};

export default config;
