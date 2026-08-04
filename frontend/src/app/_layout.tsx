import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View, useColorScheme } from 'react-native';

import {
  getAuthSession,
  hydrateSession,
  isAuthSessionHydrated,
  subscribeAuthSession,
} from "../features/auth/api/authSession";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [authState, setAuthState] = useState(() => ({
    hydrated: isAuthSessionHydrated(),
    authenticated: Boolean(getAuthSession().accessToken),
  }));

  useEffect(() => {
    const synchronize = () => {
      setAuthState({
        hydrated: isAuthSessionHydrated(),
        authenticated: Boolean(getAuthSession().accessToken),
      });
    };

    const unsubscribe = subscribeAuthSession(synchronize);
    void hydrateSession();

    return unsubscribe;
  }, []);

  if (!authState.hydrated) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
  <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!authState.authenticated}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
      </Stack.Protected>

      <Stack.Protected guard={authState.authenticated}>
        <Stack.Screen name="dashboard" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="history" />
        <Stack.Screen name="history/[id]" />
        <Stack.Screen name="diagnosis-initial" />
        <Stack.Screen name="diagnosis-detail" />
        <Stack.Screen name="diagnosis-loading" />
        <Stack.Screen name="diagnosis-report" />
      </Stack.Protected>
    </Stack>
  </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});