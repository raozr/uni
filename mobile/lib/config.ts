import { Platform } from 'react-native';

const DEV_HOST = process.env.EXPO_PUBLIC_DEV_HOST || '192.168.4.166';
const DEV_PORT = process.env.EXPO_PUBLIC_DEV_PORT || '3000';

function getApiBase(): string {
  if (__DEV__) {
    if (Platform.OS === 'android') {
      try {
        const Constants = require('expo-constants').default;
        if (Constants.isDevice === false) {
          return `http://10.0.2.2:${DEV_PORT}/api`;
        }
      } catch {}
    }
    return `http://${DEV_HOST}:${DEV_PORT}/api`;
  }
  return process.env.EXPO_PUBLIC_API_URL || `http://${DEV_HOST}:${DEV_PORT}/api`;
}

export const API_BASE = getApiBase();
