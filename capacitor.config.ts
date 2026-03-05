import type { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize } from '@capacitor/keyboard';

const config: CapacitorConfig = {
  appId: 'com.kramiz.productiontracker',
  appName: 'Kramiz',
  webDir: 'dist',

  // Server configuration
  server: {
    // This points the app to your live website so you can update UI/UX without a new APK
    url: 'https://kramiz.vercel.app',
    androidScheme: 'https',
    iosScheme: 'https',
  },

  // Plugin configurations
  plugins: {
    // Push Notifications
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },

    // Local Notifications
    LocalNotifications: {
      smallIcon: 'ic_stat_icon',
      iconColor: '#008069',
      sound: 'notification.wav',
    },

    // Splash Screen
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#008069',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },

    // Keyboard
    Keyboard: {
      resize: KeyboardResize.Body,
      resizeOnFullScreen: true,
    },

    // Status Bar
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#008069',
      overlaysWebView: false,
    },
  },

  // Android-specific configuration
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false, // Set to true for debug builds
  },

  // iOS-specific configuration
  ios: {
    contentInset: 'automatic',
    allowsLinkPreview: true,
    scrollEnabled: true,
  },
};

export default config;
