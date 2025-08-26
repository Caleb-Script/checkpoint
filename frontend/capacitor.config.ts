import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.omnixys.checkpoint',
  appName: 'Checkpoint',
  webDir: '.next',

  // ⛳️ DEV: iPhone lädt direkt vom Next.js-Devserver (Hot Reload)
  server: {
    url: 'http://192.168.178.102:3000', // <— deine LAN-IP + Port vom `pnpm dev`
    cleartext: true,
  },

  ios: {
    // WICHTIG: AppBoundDomains nicht limitieren im Dev
    limitsNavigationsToAppBoundDomains: false,
    scheme: 'app',
  },

  android: {
    allowMixedContent: true,
    webContentsDebuggingEnabled: true,
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 0
    },
  },
};

export default config;
