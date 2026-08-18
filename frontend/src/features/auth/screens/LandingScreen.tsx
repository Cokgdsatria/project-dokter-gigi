import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Image, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '../../../shared/components/AppButton';
import { appColors } from '../../../shared/theme/colors';

const logo = require('../../../../assets/logo/New Logo Cek Gigi.png');
const LOGO_ASPECT_RATIO = 433 / 355;

export function LandingScreen() {
  const { width, height } = useWindowDimensions();
  const horizontalPadding = Math.min(70, Math.max(26, width * 0.09));
  const logoWidth = Math.min(320, Math.max(210, width * 0.48));
  const logoHeight = logoWidth / LOGO_ASPECT_RATIO;
  const brandTop = Math.max(150, height * 0.34);
  const buttonBottom = Math.min(78, Math.max(42, height * 0.045));

  return (
    <View style={styles.screen}>
      <StatusBar hidden />
      <LinearGradient
        colors={[
          appColors.white,
          appColors.white,
          appColors.aquaLight,
          appColors.aqua,
          '#8FE5E3',
        ]}
        locations={[0, 0.47, 0.58, 0.78, 1]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
        <Image
          source={logo}
          resizeMode="contain"
          style={[
            styles.logo,
            {
              top: brandTop,
              width: logoWidth,
              height: logoHeight,
              marginLeft: -logoWidth / 2,
            },
          ]}
        />

        <View
          style={[
            styles.actions,
            {
              left: horizontalPadding,
              right: horizontalPadding,
              bottom: buttonBottom,
            },
          ]}>
          <AppButton title="Login" onPress={() => router.push('/login')} />
          <AppButton title="Sign Up" variant="secondary" onPress={() => router.push('/signup')} />
        </View>
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
  logo: {
    position: 'absolute',
    left: '50%',
  },
  actions: {
    position: 'absolute',
    gap: 42,
  },
});

