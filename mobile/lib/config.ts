import { Platform } from 'react-native';

const DEV_HOST = process.env.EXPO_PUBLIC_DEV_HOST || 'localhost';
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
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  if (!apiUrl) {
    throw new Error('EXPO_PUBLIC_API_URL must be set for production builds');
  }
  return apiUrl;
}

export const API_BASE = getApiBase();
