import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.zhewar.admin',
  appName: 'ژێوار عزیز ئەدمین',
  webDir: 'www',
  server: {
    // Loads the live admin dashboard — no separate web build needed
    url: 'https://zhewar.shop/admin/dashboard',
    cleartext: false,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
  android: {
    backgroundColor: '#ffffff',
  },
};

export default config;
