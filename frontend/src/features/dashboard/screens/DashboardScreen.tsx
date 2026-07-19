import { router } from 'expo-router';
import { Image, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardActionCard } from '../components/DashboardActionCard';
import { appColors } from '../../../shared/theme/colors';

const logo = require('../../../../assets/logo/logo_CekGigi.png');

export function DashboardScreen() {
  const { width } = useWindowDimensions();
  const contentPadding = Math.min(34, Math.max(20, width * 0.045));

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right', 'bottom']}>
      <View style={[styles.content, { paddingHorizontal: contentPadding }]}> 
        <View style={styles.header}>
          <View style={styles.logoWrap}>
            <Image source={logo} resizeMode="contain" style={styles.logo} />
          </View>
        </View>

        <View style={styles.cardsRow}>
          <DashboardActionCard
            title="Check-up"
            description="Analisis Hasil Ronsen"
            actionLabel="Mulai Analisis"
            icon="checkup"
            onPress={() => router.push('/diagnosis-initial')}
          />
          <DashboardActionCard
            title="Riwayat Check-up"
            description="Lihat Riwayat Hasil Ronsen"
            actionLabel="Lihat Riwayat"
            icon="history"
            onPress={() => router.push('/history')}
          />
        </View>
      </View>

      <View style={styles.bottomNav}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Buka riwayat check-up"
          onPress={() => router.push('/history')}
          style={({ pressed }) => [styles.navButton, pressed && styles.navPressed]}>
          <HistoryNavIcon />
        </Pressable>
        <Pressable style={({ pressed }) => [styles.navButton, pressed && styles.navPressed]}>
          <HomeNavIcon active />
        </Pressable>
        <Pressable style={({ pressed }) => [styles.navButton, pressed && styles.navPressed]}>
          <UserNavIcon />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function HistoryNavIcon() {
  return (
    <View style={styles.navHistoryIcon}>
      <View style={styles.navHistoryCircle} />
      <View style={styles.navHistoryArrow} />
      <View style={styles.navClockVertical} />
      <View style={styles.navClockHorizontal} />
    </View>
  );
}

function HomeNavIcon({ active = false }: { active?: boolean }) {
  const color = active ? appColors.aquaStrong : '#000000';
  return (
    <View style={styles.navHomeWrap}>
      <View style={[styles.homeRoof, { borderColor: color }]} />
      <View style={[styles.homeBase, { borderColor: color }]} />
      <View style={[styles.homeDoor, { backgroundColor: color }]} />
      {active ? <View style={styles.activeIndicator} /> : null}
    </View>
  );
}

function UserNavIcon() {
  return (
    <View style={styles.navUserIcon}>
      <View style={styles.navUserHead} />
      <View style={styles.navUserBody} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: appColors.white,
  },
  content: {
    flex: 1,
    paddingTop: 86,
  },
  header: {
    minHeight: 82,
    justifyContent: 'center',
  },
  logoWrap: {
    alignItems: 'center',
  },
  logo: {
    width: 210,
    height: 92,
  },
  cardsRow: {
    flexDirection: 'row',
    gap: 38,
    marginTop: 42,
  },
  bottomNav: {
    height: 80,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    backgroundColor: '#FDFDFD',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.13,
    shadowRadius: 7,
    elevation: 8,
  },
  navButton: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navPressed: {
    opacity: 0.64,
    transform: [{ scale: 0.97 }],
  },
  navHistoryIcon: {
    width: 42,
    height: 42,
  },
  navHistoryCircle: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#000000',
    borderLeftColor: 'transparent',
  },
  navHistoryArrow: {
    position: 'absolute',
    top: 5,
    left: 5,
    width: 10,
    height: 10,
    borderLeftWidth: 3,
    borderTopWidth: 3,
    borderColor: '#000000',
  },
  navClockVertical: {
    position: 'absolute',
    top: 15,
    left: 22,
    width: 3,
    height: 11,
    borderRadius: 2,
    backgroundColor: '#000000',
  },
  navClockHorizontal: {
    position: 'absolute',
    top: 25,
    left: 23,
    width: 10,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#000000',
    transform: [{ rotate: '35deg' }],
  },
  navHomeWrap: {
    width: 48,
    height: 56,
    alignItems: 'center',
  },
  homeRoof: {
    position: 'absolute',
    top: 6,
    width: 30,
    height: 30,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderRadius: 7,
    transform: [{ rotate: '45deg' }],
  },
  homeBase: {
    position: 'absolute',
    top: 19,
    width: 36,
    height: 26,
    borderWidth: 3,
    borderTopWidth: 0,
    borderRadius: 8,
  },
  homeDoor: {
    position: 'absolute',
    top: 33,
    width: 3,
    height: 9,
    borderRadius: 2,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    width: 32,
    height: 5,
    borderRadius: 4,
    backgroundColor: appColors.aquaStrong,
  },
  navUserIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
  },
  navUserHead: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 3,
    borderColor: '#000000',
  },
  navUserBody: {
    width: 32,
    height: 20,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    borderWidth: 3,
    borderBottomWidth: 0,
    borderColor: '#000000',
    marginTop: 4,
  },
});


