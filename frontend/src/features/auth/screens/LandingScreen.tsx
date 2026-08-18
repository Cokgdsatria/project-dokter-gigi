import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { APP_LONG_NAME, APP_NAME, APP_NOTICES, APP_TAGLINE } from '../../../shared/brand';
import { AppButton } from '../../../shared/components/AppButton';
import { appColors } from '../../../shared/theme/colors';

const logo = require('../../../../assets/logo/New Logo Cek Gigi.png');

export function LandingScreen() {
  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <LinearGradient
        colors={[appColors.white, appColors.aquaLight, appColors.aqua]}
        locations={[0, 0.58, 1]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          bounces={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}>
          <View style={styles.brandBlock}>
            <Image source={logo} resizeMode="contain" style={styles.logo} />
            <Text style={styles.brandName}>{APP_NAME}</Text>
            <Text style={styles.longName}>{APP_LONG_NAME}</Text>
            <Text style={styles.tagline}>{APP_TAGLINE}</Text>
          </View>

          <View style={styles.noticeSection}>
            <Text style={styles.noticeTitle}>Informasi penggunaan</Text>
            {APP_NOTICES.map((notice, index) => (
              <View key={notice} style={styles.noticeRow}>
                <Text style={styles.noticeNumber}>{index + 1}.</Text>
                <Text style={styles.noticeText}>{notice}</Text>
              </View>
            ))}
          </View>

          <View style={styles.actions}>
            <AppButton title="Login" onPress={() => router.push('/login')} />
            <AppButton title="Sign Up" variant="secondary" onPress={() => router.push('/signup')} />
          </View>
        </ScrollView>
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
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 680,
    boxSizing: 'border-box',
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 34,
    paddingBottom: 34,
  },
  brandBlock: {
    alignItems: 'center',
  },
  logo: {
    width: 180,
    height: 148,
  },
  brandName: {
    color: appColors.blueDeep,
    fontSize: 38,
    fontWeight: '900',
    marginTop: 4,
  },
  longName: {
    color: appColors.blueDeep,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 4,
  },
  tagline: {
    color: '#5F5672',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
  },
  noticeSection: {
    marginTop: 30,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#CFC2ED',
    paddingVertical: 20,
    gap: 13,
  },
  noticeTitle: {
    color: appColors.blueDeep,
    fontSize: 17,
    fontWeight: '800',
  },
  noticeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  noticeNumber: {
    width: 20,
    color: appColors.blue,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '800',
  },
  noticeText: {
    flex: 1,
    color: '#3F3A49',
    fontSize: 13,
    lineHeight: 19,
  },
  actions: {
    marginTop: 'auto',
    paddingTop: 30,
    gap: 16,
  },
});
