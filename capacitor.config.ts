
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.20aff3b52fbd4979afe069ddb30fd200',
  appName: 'islamic-prayer-and-third-part-of-night',
  webDir: 'dist',
  server: {
    url: "https://20aff3b5-2fbd-4979-afe0-69ddb30fd200.lovableproject.com?forceHideBadge=true",
    cleartext: true
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined
    }
  }
};

export default config;
