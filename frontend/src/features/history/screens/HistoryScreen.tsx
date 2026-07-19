import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getHistory, type HistoryItem } from '../api/historyApi';
import { toFriendlyError } from '../../../shared/api/errorMessages';
import { appColors } from '../../../shared/theme/colors';

const logo = require('../../../../assets/logo/logo_CekGigi.png');

function formatDate(value?: string | null) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatConfidence(value?: number | null) {
  if (typeof value !== 'number') {
    return '-';
  }

  return `${Math.round(value * 100)}%`;
}

function getStatusColor(status: string) {
  if (status === 'DONE') {
    return '#198754';
  }
  if (status === 'FAILED') {
    return '#C83232';
  }
  return appColors.blue;
}

export function HistoryScreen() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      setItems(await getHistory());
    } catch (error) {
      setErrorMessage(toFriendlyError(error, 'Gagal mengambil riwayat diagnosis.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Kembali ke dashboard"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
          <View style={styles.backChevron} />
        </Pressable>
        <Image source={logo} resizeMode="contain" style={styles.logo} />
      </View>

      <View style={styles.titleWrap}>
        <Text style={styles.title}>Riwayat Diagnosis</Text>
        <Text style={styles.subtitle}>Daftar hasil diagnosis yang sudah tersimpan.</Text>
      </View>

      {isLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={appColors.aquaStrong} size="large" />
          <Text style={styles.stateText}>Mengambil riwayat...</Text>
        </View>
      ) : errorMessage ? (
        <View style={styles.centerState}>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <Pressable style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]} onPress={loadHistory}>
            <Text style={styles.retryText}>Coba Lagi</Text>
          </Pressable>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.centerState}>
          <Text style={styles.stateTitle}>Belum ada riwayat</Text>
          <Text style={styles.stateText}>Hasil diagnosis akan tampil setelah kamu melakukan check-up.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {items.map((item) => (
            <View key={item.id} style={styles.card}>
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} resizeMode="cover" style={styles.thumbnail} />
              ) : (
                <View style={styles.thumbnailPlaceholder}>
                  <Text style={styles.thumbnailPlaceholderText}>No Image</Text>
                </View>
              )}

              <View style={styles.cardBody}>
                <View style={styles.cardHeader}>
                  <Text style={styles.resultNumber}>No. {item.resultNumber || item.id.slice(0, 8)}</Text>
                  <Text style={[styles.status, { color: getStatusColor(item.status) }]}>{item.status}</Text>
                </View>
                <Text style={styles.resultLabel}>{item.resultLabel || 'Belum ada hasil'}</Text>
                <Text style={styles.meta}>Confidence: {formatConfidence(item.resultConfidence)}</Text>
                <Text style={styles.meta}>Homebase: {item.homebaseName || '-'}</Text>
                <Text style={styles.meta}>Tanggal: {formatDate(item.processedAt || item.createdAt)}</Text>
                {item.errorMessage ? <Text style={styles.errorSmall}>{item.errorMessage}</Text> : null}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
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
  titleWrap: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 18,
  },
  title: {
    color: '#0A0A0A',
    fontSize: 30,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 6,
    color: '#8A8A8A',
    fontSize: 15,
    fontWeight: '600',
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 14,
  },
  stateTitle: {
    color: '#0A0A0A',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
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
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 14,
  },
  card: {
    flexDirection: 'row',
    gap: 14,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    padding: 14,
    shadowColor: appColors.blueDeep,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  thumbnail: {
    width: 86,
    height: 86,
    borderRadius: 12,
    backgroundColor: '#D9F2F5',
  },
  thumbnailPlaceholder: {
    width: 86,
    height: 86,
    borderRadius: 12,
    backgroundColor: '#EAF5F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailPlaceholderText: {
    color: '#8A8A8A',
    fontSize: 11,
    fontWeight: '700',
  },
  cardBody: {
    flex: 1,
    gap: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  resultNumber: {
    flex: 1,
    color: '#111111',
    fontSize: 13,
    fontWeight: '800',
  },
  status: {
    fontSize: 12,
    fontWeight: '900',
  },
  resultLabel: {
    color: appColors.blue,
    fontSize: 19,
    fontWeight: '900',
    textTransform: 'capitalize',
  },
  meta: {
    color: '#5F5F5F',
    fontSize: 12,
    fontWeight: '600',
  },
  errorSmall: {
    marginTop: 4,
    color: '#C83232',
    fontSize: 12,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },
});
