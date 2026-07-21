import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getHistoryDetail } from '../api/historyApi';
import { DiagnosisReportScreen } from '../../diagnosis/screens/DiagnosisReportScreen';
import { setDiagnosisReportFromHistory } from '../../diagnosis/state/diagnosisReport';
import { getAuthSession } from '../../auth/api/authSession';
import { toFriendlyError } from '../../../shared/api/errorMessages';
import { appColors } from '../../../shared/theme/colors';

const logo = require('../../../../assets/logo/logo_CekGigi.png');

export function HistoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadDetail() {
      if (!id) {
        setErrorMessage('ID riwayat tidak ditemukan.');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setErrorMessage('');
        const item = await getHistoryDetail(id);
        if (!isMounted) {
          return;
        }
        setDiagnosisReportFromHistory(item, getAuthSession().user);
        setIsReady(true);
      } catch (error) {
        if (isMounted) {
          setErrorMessage(toFriendlyError(error, 'Gagal membuka detail riwayat.'));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadDetail();

    return () => {
      isMounted = false;
    };
  }, [id]);

  if (isReady) {
    return <DiagnosisReportScreen backToHistory />;
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Kembali ke riwayat"
          onPress={() => router.replace('/history')}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
          <View style={styles.backChevron} />
        </Pressable>
        <Image source={logo} resizeMode="contain" style={styles.logo} />
      </View>

      <View style={styles.centerState}>
        {isLoading ? (
          <>
            <ActivityIndicator color={appColors.aquaStrong} size="large" />
            <Text style={styles.stateText}>Membuka detail riwayat...</Text>
          </>
        ) : (
          <>
            <Text style={styles.errorText}>{errorMessage}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.replace('/history')}
              style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}>
              <Text style={styles.retryText}>Kembali ke Riwayat</Text>
            </Pressable>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    minHeight: 82,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  backButton: {
    position: 'absolute',
    left: 22,
    zIndex: 10,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
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
  logo: {
    width: 184,
    height: 80,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 14,
  },
  stateText: {
    color: '#8A8A8A',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorText: {
    color: '#C83232',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  retryButton: {
    borderRadius: 10,
    backgroundColor: appColors.aquaStrong,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },
});
