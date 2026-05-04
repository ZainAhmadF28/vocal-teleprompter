import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Vocal Teleprompter',
  slug: 'vocal-teleprompter',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#000000',
  },
  android: {
    package: 'com.zain.vocalteleprompter',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#000000',
    },
    permissions: [
      'android.permission.RECORD_AUDIO',
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_MICROPHONE',
      'android.permission.FOREGROUND_SERVICE_SPECIAL_USE',
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.WAKE_LOCK',
      'android.permission.BLUETOOTH',
      'android.permission.BLUETOOTH_CONNECT',
    ],
  },
  plugins: [
    './plugins/withKspVersion',
    'expo-router',
    [
      'expo-speech-recognition',
      {
        microphonePermission:
          'Aplikasi ini butuh akses mic untuk teleprompter vokal.',
        speechRecognitionPermission:
          'Aplikasi ini butuh speech recognition untuk track ucapan.',
        androidSpeechServicePackages: [
          'com.google.android.googlequicksearchbox',
        ],
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  scheme: 'vocal-teleprompter',
});
