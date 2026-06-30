import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { login } from '@/features/auth/api/authApi';
import { setAuthSession } from '@/features/auth/api/authSession';
import { AppButton } from '@/shared/components/AppButton';
import { AuthTextField } from '@/shared/components/AuthTextField';
import { appColors } from '@/shared/theme/colors';

const logo = require('@/assets/logo/logo_CekGigi.png');
const LOGO_ASPECT_RATIO = 102 / 106;

export function LoginScreen() {
  const { width, height } = useWindowDimensions();
  const [email, setEmail] = useState('Admin@gmail.com');
  const [password, setPassword] = useState('password');
  const [isPasswordHidden, setIsPasswordHidden] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const horizontalPadding = Math.min(34, Math.max(16, width * 0.045));
  const logoWidth = Math.min(150, Math.max(98, width * 0.28));
  const logoHeight = logoWidth / LOGO_ASPECT_RATIO;
  const cardMinHeight = Math.max(height * 0.72, 520);

  async function handleLogin() {
    if (!email.trim() || !password) {
      setErrorMessage('Email dan password wajib diisi');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage('');
      const response = await login({ email: email.trim(), password });
      setAuthSession(response.access_token, response.token_type);
      Alert.alert('Login berhasil', 'Token berhasil diterima dari backend.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Login gagal');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.screen}>
      <StatusBar hidden />
      <LinearGradient
        colors={[appColors.white, appColors.white, appColors.aquaLight, appColors.aqua]}
        locations={[0, 0.44, 0.72, 1]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Kembali ke halaman awal"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
          <View style={styles.backChevron} />
        </Pressable>

        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            bounces={false}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingHorizontal: horizontalPadding,
                minHeight: height,
              },
            ]}>
            <View style={styles.logoWrap}>
              <Image
                source={logo}
                resizeMode="contain"
                style={{ width: logoWidth, height: logoHeight }}
              />
            </View>

            <View style={[styles.card, { minHeight: cardMinHeight }]}>
              <Text style={styles.title}>Login</Text>

              <View style={styles.form}>
                <AuthTextField
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                />
                <AuthTextField
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={isPasswordHidden}
                  showSecureToggle
                  onToggleSecure={() => setIsPasswordHidden((current) => !current)}
                />
                {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
              </View>

              <View style={styles.footer}>
                <AppButton
                  title={isSubmitting ? 'Memproses...' : 'Login'}
                  disabled={isSubmitting}
                  onPress={handleLogin}
                />
                <Text style={styles.loginWithText}>Login Dengan</Text>
                <Pressable style={({ pressed }) => [styles.googleButton, pressed && styles.pressed]}>
                  <Text style={styles.googleText}>G</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: appColors.white,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 58,
  },
  backButton: {
    position: 'absolute',
    top: 22,
    left: 20,
    zIndex: 10,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: appColors.blueDeep,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 5,
    elevation: 4,
  },
  backChevron: {
    width: 13,
    height: 13,
    borderLeftWidth: 3,
    borderBottomWidth: 3,
    borderColor: appColors.blue,
    transform: [{ rotate: '45deg' }],
    marginLeft: 4,
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: 54,
  },
  card: {
    backgroundColor: appColors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 52,
    paddingTop: 54,
    paddingBottom: 38,
    shadowColor: appColors.aquaStrong,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.24,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    color: '#000000',
    fontSize: 34,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 54,
  },
  form: {
    gap: 34,
  },
  errorText: {
    color: '#C83232',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    marginTop: 'auto',
    alignItems: 'stretch',
    gap: 22,
  },
  loginWithText: {
    color: '#9B9B9B',
    fontSize: 24,
    fontWeight: '400',
    textAlign: 'center',
  },
  googleButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: appColors.white,
    borderWidth: 1,
    borderColor: '#E2E2E2',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  googleText: {
    color: '#4285F4',
    fontSize: 26,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.98 }],
  },
});
