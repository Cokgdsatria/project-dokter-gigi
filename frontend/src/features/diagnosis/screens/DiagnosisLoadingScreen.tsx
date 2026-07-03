import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Alert, Image, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { diagnoseDentalImage } from '../api/diagnosisApi';
import { getAuthSession } from '../../auth/api/authSession';
import { clearDiagnosisDraft, getCompleteDiagnosisDraft } from '../state/diagnosisDraft';
import { setDiagnosisReport } from '../state/diagnosisReport';
import { appColors } from '../../../shared/theme/colors';

const logo = require('../../../../assets/logo/logo_CekGigi.png');

export function DiagnosisLoadingScreen() {
  const { height } = useWindowDimensions();
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, {
        duration: 1100,
        easing: Easing.linear,
      }),
      -1,
      false
    );
  }, [rotation]);

  useEffect(() => {
    let isActive = true;

    async function runDiagnosis() {
      const draft = getCompleteDiagnosisDraft();
      if (!draft) {
        Alert.alert('Data belum lengkap', 'Lengkapi foto rontgen, diagnosa awal, dan data homebase terlebih dahulu.');
        router.back();
        return;
      }

      try {
        const result = await diagnoseDentalImage(draft);
        if (!isActive) {
          return;
        }

        if (!result.success) {
          throw new Error(result.data?.errorMessage || result.message || 'Diagnosis gagal diproses');
        }

        setDiagnosisReport(draft, result, getAuthSession().user);
        clearDiagnosisDraft();
        setTimeout(() => {
          router.replace('/diagnosis-report');
        }, 650);
      } catch (error) {
        if (!isActive) {
          return;
        }

        const message = error instanceof Error ? error.message : 'Diagnosis gagal diproses';
        Alert.alert('Diagnosis gagal', message, [
          {
            text: 'Kembali',
            onPress: () => router.back(),
          },
        ]);
      }
    }

    runDiagnosis();

    return () => {
      isActive = false;
    };
  }, []);

  const spinnerStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right', 'bottom']}>
      <View style={[styles.content, { minHeight: height }]}>
        <Image source={logo} resizeMode="contain" style={styles.logo} />

        <View style={styles.loadingSection}>
          <View style={styles.spinnerWrap}>
            <Animated.View style={[styles.spinner, spinnerStyle]}>
              <View style={styles.spinnerTrack} />
              <View style={styles.spinnerArc} />
            </Animated.View>

            <LinearGradient
              colors={[appColors.aquaStrong, appColors.blue]}
              start={{ x: 0.78, y: 0.04 }}
              end={{ x: 0.22, y: 1 }}
              style={styles.iconCircle}>
              <SearchMedicalIcon />
            </LinearGradient>
          </View>

          <Text style={styles.title}>Mendiagnosa Penyakit</Text>
          <Text style={styles.subtitle}>Mohon tunggu beberapa saat...</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

function SearchMedicalIcon() {
  return (
    <View style={styles.searchIcon}>
      <View style={styles.lens}>
        <View style={styles.plusHorizontal} />
        <View style={styles.plusVertical} />
      </View>
      <View style={styles.handle} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 70,
    paddingBottom: 42,
  },
  logo: {
    width: 224,
    height: 96,
  },
  loadingSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 130,
  },
  spinnerWrap: {
    width: 182,
    height: 182,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    position: 'absolute',
    width: 170,
    height: 170,
  },
  spinnerTrack: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 85,
    borderWidth: 4,
    borderColor: '#9ED5E8',
    opacity: 0.95,
  },
  spinnerArc: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 85,
    borderWidth: 4,
    borderLeftColor: 'transparent',
    borderBottomColor: 'transparent',
    borderTopColor: appColors.aquaStrong,
    borderRightColor: appColors.aquaStrong,
  },
  iconCircle: {
    width: 108,
    height: 108,
    borderRadius: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchIcon: {
    width: 66,
    height: 66,
    position: 'relative',
  },
  lens: {
    position: 'absolute',
    left: 4,
    top: 6,
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  handle: {
    position: 'absolute',
    right: 7,
    bottom: 9,
    width: 30,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '45deg' }],
  },
  plusHorizontal: {
    width: 22,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  plusVertical: {
    position: 'absolute',
    width: 6,
    height: 22,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  title: {
    marginTop: 26,
    color: '#000000',
    fontSize: 27,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 14,
    color: '#9A9A9A',
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
});






