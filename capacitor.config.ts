import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dokankhata.app',
  appName: 'Dokan Khata',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
