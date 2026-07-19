import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DiagnosisTextField } from '../components/DiagnosisTextField';
import { ImageUploadBox } from '../components/ImageUploadBox';
import { updateDiagnosisDraft } from '../state/diagnosisDraft';
import { AppButton } from '../../../shared/components/AppButton';
import { appColors } from '../../../shared/theme/colors';

const logo = require('../../../../assets/logo/logo_CekGigi.png');

export function DiagnosisDetailScreen() {
  const { width, height } = useWindowDimensions();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | undefined>();
  const [imageMimeType, setImageMimeType] = useState<string | undefined>();
  const [imageSize, setImageSize] = useState<number | undefined>();
  const [diagnoses, setDiagnoses] = useState<string[]>([]);
  const [doctorNote, setDoctorNote] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [diagnosisInput, setDiagnosisInput] = useState('');

  const horizontalPadding = Math.min(34, Math.max(24, width * 0.04));

  useFocusEffect(
    useCallback(() => {
      setDoctorNote('');
    }, [])
  );

  async function handlePickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Izin diperlukan', 'Berikan izin akses galeri untuk upload foto rontgen.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.85,
    });

    if (!result.canceled) {
      const selectedImage = result.assets[0];
      setImageUri(selectedImage?.uri ?? null);
      setImageName(selectedImage?.fileName ?? undefined);
      setImageMimeType(selectedImage?.mimeType ?? undefined);
    }
  }

  function handleAddDiagnosis() {
    const nextDiagnosis = diagnosisInput.trim();
    if (!nextDiagnosis) {
      return;
    }

    setDiagnoses((current) => [...current, nextDiagnosis]);
    setDiagnosisInput('');
    setIsModalVisible(false);
  }

  function handleRemoveDiagnosis(indexToRemove: number) {
    setDiagnoses((current) => current.filter((_, index) => index !== indexToRemove));
  }

  function handleContinue() {
    if (!imageUri) {
      Alert.alert('Foto belum dipilih', 'Upload foto rontgen terlebih dahulu.');
      return;
    }

    if (diagnoses.length < 1) {
      Alert.alert('Diagnosa belum diisi', 'Tambahkan minimal 1 diagnosa awal.');
      return;
    }

    if (imageMimeType && !['image/jpeg', 'image/png'].includes(imageMimeType)) {
      Alert.alert('Format tidak didukung', 'Gunakan gambar JPG atau PNG.');
      return;
    }

    if (imageSize && imageSize > 10 * 1024 * 1024) {
      Alert.alert('File terlalu besar', 'Ukuran gambar maksimal 10 MB.');
      return;
    }

    updateDiagnosisDraft({
      imageUri,
      imageName,
      imageMimeType,
      imageSize,
      diagnoses,
      doctorNote: doctorNote.trim(),
    });
    router.push('/diagnosis-loading');
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          bounces={false}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.content,
            {
              minHeight: height,
              paddingHorizontal: horizontalPadding,
            },
          ]}>
          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Kembali ke form homebase"
              onPress={() => router.back()}
              style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
              <View style={styles.backChevron} />
            </Pressable>
            <Image source={logo} resizeMode="contain" style={styles.logo} />
          </View>

          <View style={styles.intro}>
            <Text style={styles.title}>Form Diagnosa Awal</Text>
            
          </View>

          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                Foto Rontgen<Text style={styles.required}>*</Text>
              </Text>
              <ImageUploadBox imageUri={imageUri} onPress={handlePickImage} />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                Diagnosa Awal(Min. 1)<Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.diagnosisList}>
                {diagnoses.map((diagnosis, index) => (
                  <View key={`${diagnosis}-${index}`} style={styles.diagnosisItem}>
                    <Text style={styles.diagnosisText}>{diagnosis}</Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Hapus diagnosa ${diagnosis}`}
                      hitSlop={10}
                      onPress={() => handleRemoveDiagnosis(index)}
                      style={({ pressed }) => [styles.deleteDiagnosisButton, pressed && styles.pressed]}>
                      <TrashIcon />
                    </Pressable>
                  </View>
                ))}
                <Pressable
                  style={({ pressed }) => [styles.addDiagnosisButton, pressed && styles.pressed]}
                  onPress={() => setIsModalVisible(true)}>
                  <Text style={styles.addDiagnosisText}>+ Tambah</Text>
                </Pressable>
              </View>
            </View>

            <DiagnosisTextField
              label="Catatan Dokter"
              value={doctorNote}
              onChangeText={setDoctorNote}
              placeholder="Berdasarkan hasil pengamatan klinis, gigi teridentifikasi mengalami....."
              placeholderTextColor="#bbbbbb"
              multiline
              style={styles.noteInput}
            />
          </View>

          <View style={styles.footer}>
            <AppButton title="Lanjut" onPress={handleContinue} />
            <AppButton title="Kembali" variant="secondary" onPress={() => router.back()} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={isModalVisible} transparent animationType="fade" onRequestClose={() => setIsModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Tambah Diagnosa Awal</Text>
            <TextInput
              value={diagnosisInput}
              onChangeText={setDiagnosisInput}
              placeholder="Masukkan keterangan"
              placeholderTextColor="#9A9A9A"
              style={styles.modalInput}
              autoFocus
            />
            <View style={styles.modalActions}>
              <Pressable
                style={({ pressed }) => [styles.modalButtonSecondary, pressed && styles.pressed]}
                onPress={() => {
                  setDiagnosisInput('');
                  setIsModalVisible(false);
                }}>
                <Text style={styles.modalButtonSecondaryText}>Batal</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.modalButtonPrimary, pressed && styles.pressed]}
                onPress={handleAddDiagnosis}>
                <Text style={styles.modalButtonPrimaryText}>Oke</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function TrashIcon() {
  return (
    <View style={styles.trashIcon}>
      <View style={styles.trashHandle} />
      <View style={styles.trashLid} />
      <View style={styles.trashBin}>
        <View style={styles.trashLine} />
        <View style={styles.trashLine} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    paddingTop: 64,
    paddingBottom: 34,
  },
  header: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    left: 0,
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
  logo: {
    width: 215,
    height: 92,
  },
  intro: {
    marginTop: 54,
  },
  title: {
    color: '#000000',
    fontSize: 38,
    fontWeight: '500',
    lineHeight: 46,
  },
  subtitle: {
    color: '#8A8A8A',
    fontSize: 21,
    fontWeight: '500',
    lineHeight: 30,
    marginTop: 26,
  },
  form: {
    marginTop: 52,
    gap: 28,
  },
  fieldGroup: {
    gap: 12,
  },
  label: {
    color: '#0A0A0A',
    fontSize: 19,
    fontWeight: '800',
  },
  required: {
    color: '#E0182D',
  },
  diagnosisList: {
    gap: 12,
  },
  diagnosisItem: {
    minHeight: 60,
    borderWidth: 2,
    borderColor: appColors.blue,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 30,
  },
  diagnosisText: {
    flex: 1,
    color: '#0A0A0A',
    fontSize: 20,
    fontWeight: '500',
  },
  deleteDiagnosisButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trashIcon: {
    width: 24,
    height: 26,
    alignItems: 'center',
  },
  trashHandle: {
    width: 10,
    height: 5,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: '#E0182D',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  trashLid: {
    width: 22,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#E0182D',
    marginTop: 1,
    marginBottom: 2,
  },
  trashBin: {
    width: 18,
    height: 18,
    borderWidth: 2,
    borderTopWidth: 0,
    borderColor: '#E0182D',
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 3,
    paddingTop: 4,
  },
  trashLine: {
    width: 2,
    height: 10,
    borderRadius: 1,
    backgroundColor: '#E0182D',
  },
  addDiagnosisButton: {
    minHeight: 60,
    borderWidth: 2,
    borderColor: appColors.blue,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  addDiagnosisText: {
    color: '#8A8A8A',
    fontSize: 20,
    fontWeight: '500',
  },
  noteInput: {
    minHeight: 120,
  },
  footer: {
    marginTop: 'auto',
    gap: 34,
    paddingTop: 120,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  modalCard: {
    width: '100%',
    maxWidth: 460,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 22,
    gap: 18,
  },
  modalTitle: {
    color: '#0A0A0A',
    fontSize: 20,
    fontWeight: '800',
  },
  modalInput: {
    minHeight: 52,
    borderWidth: 2,
    borderColor: appColors.blue,
    borderRadius: 8,
    paddingHorizontal: 16,
    color: '#0A0A0A',
    fontSize: 18,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButtonSecondary: {
    height: 44,
    minWidth: 84,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: appColors.aquaStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonPrimary: {
    height: 44,
    minWidth: 84,
    borderRadius: 8,
    backgroundColor: appColors.aquaStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonSecondaryText: {
    color: appColors.blue,
    fontSize: 16,
    fontWeight: '800',
  },
  modalButtonPrimaryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }],
  },
});







