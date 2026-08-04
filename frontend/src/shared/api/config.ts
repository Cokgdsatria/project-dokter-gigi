import { Platform } from 'react-native';

const configuredApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

if (!__DEV__ && !configuredApiBaseUrl) {
  throw new Error('EXPO_PUBLIC_API_BASE_URL wajib diisi untuk build production.');
}

if (!__DEV__ && !configuredApiBaseUrl?.startsWith('https://')) {
  throw new Error('EXPO_PUBLIC_API_BASE_URL production wajib menggunakan HTTPS.');
}

export const API_BASE_URL = (
  configuredApiBaseUrl ??
  (Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://127.0.0.1:8000')
).replace(/\/$/, '');
