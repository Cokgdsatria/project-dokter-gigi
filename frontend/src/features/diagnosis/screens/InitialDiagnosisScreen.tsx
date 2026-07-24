import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
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

import { DiagnosisSelectField } from '../components/DiagnosisSelectField';
import { DiagnosisTextField } from '../components/DiagnosisTextField';
import { updateDiagnosisDraft, type BackendHomebaseType, type PatientGender } from '../state/diagnosisDraft';
import { AppButton } from '../../../shared/components/AppButton';
import { appColors } from '../../../shared/theme/colors';

const logo = require('../../../../assets/logo/logo_CekGigi.png');
const HOMEBASE_OPTIONS = ['Universitas', 'Rumah Sakit', 'Mandiri'];
const GENDER_OPTIONS: PatientGender[] = ['Laki-laki', 'Perempuan'];

function toBackendHomebaseType(homebase: string): BackendHomebaseType {
  if (homebase === 'Rumah Sakit') {
    return 'RUMAH_SAKIT';
  }

  return 'LAINNYA';
}

export function InitialDiagnosisScreen() {
  const { width, height } = useWindowDimensions();
  const [homebase, setHomebase] = useState('Rumah Sakit');
  const [homebaseName, setHomebaseName] = useState('');
  const [homebaseAddress, setHomebaseAddress] = useState('');
  const [isHomebaseOpen, setIsHomebaseOpen] = useState(false);
  const [patientMedicalId, setPatientMedicalId] = useState('');
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientGender, setPatientGender] = useState<PatientGender>('Laki-laki');
  const [isGenderOpen, setIsGenderOpen] = useState(false);

  const horizontalPadding = Math.min(34, Math.max(24, width * 0.04));

  useFocusEffect(
    useCallback(() => {
      setHomebaseName('');
      setHomebaseAddress('');
      setPatientMedicalId('');
      setPatientName('');
      setPatientAge('');
      setPatientGender('Laki-laki');
      setIsHomebaseOpen(false);
      setIsGenderOpen(false);
    }, [])
  );

  function handleContinue() {
    const nextHomebaseName = homebaseName.trim();
    const nextHomebaseAddress = homebaseAddress.trim();
    const nextPatientMedicalId = patientMedicalId.trim();
    const nextPatientName = patientName.trim();
    const nextPatientAge = patientAge.trim();

    if (!nextHomebaseName || !nextHomebaseAddress || !nextPatientMedicalId || !nextPatientName) {
      Alert.alert('Data belum lengkap', 'Homebase, ID pasien, dan Nama pasien wajib diisi.');
      return;
    }

    const parsedPatientAge = nextPatientAge ? Number(nextPatientAge) : undefined;
    if (parsedPatientAge !== undefined && (!Number.isInteger(parsedPatientAge) || parsedPatientAge <= 0)) {
      Alert.alert('Umur tidak valid', 'Umur pasien harus berupa angka lebih dari 0.');
      return;
    }

    updateDiagnosisDraft({
      homebaseType: toBackendHomebaseType(homebase),
      homebaseName: nextHomebaseName,
      homebaseAddress: nextHomebaseAddress,
      patientMedicalId: nextPatientMedicalId,
      patientName: nextPatientName,
      patientAge: parsedPatientAge,
      patientGender,
    });
    router.push('/diagnosis-detail');
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
              accessibilityLabel="Kembali ke dashboard"
              onPress={() => router.back()}
              style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
              <View style={styles.backChevron} />
            </Pressable>
            <Image source={logo} resizeMode="contain" style={styles.logo} />
          </View>

          <View style={styles.intro}>
            <Text style={styles.title}>Form Diagnosa Awal</Text>
            <Text style={styles.subtitle}>
              Mencatat data dokter, diagnosa awal dan catatan dokter sebagai dasar penilaian awal
              sebelum dilakukan diagnosis machine learning.
            </Text>
          </View>

          <View style={styles.form}>
            <DiagnosisSelectField
              label="Homebase"
              required
              value={homebase}
              options={HOMEBASE_OPTIONS}
              isOpen={isHomebaseOpen}
              onToggle={() => setIsHomebaseOpen((current) => !current)}
              onSelect={(selectedHomebase) => {
                setHomebase(selectedHomebase);
                setIsHomebaseOpen(false);
              }}
            />
            <DiagnosisTextField
              label="Nama Homebase"
              required
              value={homebaseName}
              onChangeText={setHomebaseName}
              placeholder="RS. Fatmawati"
              placeholderTextColor="#bbbbbb"
            />
            <DiagnosisTextField
              label="Alamat Homebase"
              required
              value={homebaseAddress}
              onChangeText={setHomebaseAddress}
              placeholder="Jl. RS. Fatmawati Raya, Cilandak Bar., Kec. Cilandak, Kota Jakarta Selatan, Daerah Khusus Ibukota Jakarta 12430"
              placeholderTextColor="#bbbbbb"
              multiline
            />
            <DiagnosisTextField
              label="No. Rekam Medis / ID Pasien"
              value={patientMedicalId}
              onChangeText={setPatientMedicalId}
              required
            />
            <DiagnosisTextField
              label="Nama Pasien"
              value={patientName}
              onChangeText={setPatientName}
              required
            />
            <DiagnosisTextField
            label="Umur"
            value={patientAge}
            onChangeText={setPatientAge}
            keyboardType="numeric"
          />
          <DiagnosisSelectField
            label="Jenis Kelamin"
            value={patientGender}
            options={GENDER_OPTIONS}
            isOpen={isGenderOpen}
            onToggle={() => setIsGenderOpen((value) => !value)}
            onSelect={(value) => {
              setPatientGender(value as PatientGender);
              setIsGenderOpen(false);
            }}
          />
          </View>

          <View style={styles.footer}>
            <AppButton title="Lanjut" onPress={handleContinue} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
    marginTop: 72,
    gap: 24,
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 80,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }],
  },
});







