interface CapacitorConfig {
  appId: string;
  appName: string;
  webDir: string;
  server?: { androidScheme?: string; cleartext?: boolean };
  android?: { allowMixedContent?: boolean; captureInput?: boolean; webContentsDebuggingEnabled?: boolean };
  plugins?: Record<string, Record<string, unknown>>;
}

const config: CapacitorConfig = {
  appId: 'com.qafiyah.poetrychallenge',
  appName: process.env.VITE_APP_NAME || 'مِضمار القوافي',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#0D6E52',
      showSpinner: false,
    },
    Keyboard: {
      resize: 'body',
      style: 'DARK',
    },
  },
};

export default config;
