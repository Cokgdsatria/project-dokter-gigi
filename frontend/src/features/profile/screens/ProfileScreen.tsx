import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getProfile, updateProfile } from '../api/profileApi';
import { AuthTextField } from '../../../shared/components/AuthTextField';
import { AppButton } from '../../../shared/components/AppButton';
import { AuthSelectField } from '@/shared/components/AuthSelectField';
import { appColors } from '../../../shared/theme/colors';
import {
    getAuthSession,
    logoutAuthSession,
    setAuthSession,
} from '../../auth/api/authSession';

const POSITIONS = ['Dokter Gigi', 'Dokter Spesialis', 'Medical Student'];

export function ProfileScreen() {
    const [email, setEmail] = useState('');
    const [fullname, setFullname] = useState('');
    const [phone, setPhone]=useState('');
    const [position, setPosition] = useState('Dokter Gigi');
    const [isPositionOpen, setIsPositionOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        getProfile()
            .then((user) => {
                setEmail(user.email);
                setFullname(user.fullname);
                setPhone(user.phone ?? '');
                setPosition(user.position ?? 'Dokter Gigi');
        })
        .catch((error) => Alert.alert('Gagal mengambil profil', error.message))
        .finally(() => setIsLoading(false));
    }, []);

    async function handleSave() {
        if (!fullname.trim()) {
            Alert.alert('Data belum lengkap', 'Nama dokter wajib diisi.');
            return;
        }

        try {
            setIsSaving(true);
            const user = await updateProfile({
                fullname: fullname.trim(),
                phone: phone.trim(),
                position,
             });

             const session = getAuthSession();
             await setAuthSession({
                accessToken: session.accessToken!,
                refreshToken: session.refreshToken!,
                tokenType: session.tokenType ?? 'bearer',
                user,
            });
             Alert.alert('Berhasil', 'Profile berhasil diperbarui.');
        } catch (error) {
            Alert.alert('Gagal', error instanceof Error ? error.message : 'Gagal memperbarui profil');
        } finally {
            setIsSaving(false);
        }
    }

    async function handleLogout() {
        await logoutAuthSession();
        router.replace('/login');
    }

    return (
        <SafeAreaView style={styles.screen}>
            <ScrollView contentContainerStyle={styles.content}>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Kembali ke dashboard"
                    onPress={() => router.back()}
                    style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
                    <View style={styles.backChevron} />
                </Pressable>

                <Text style={styles.title}>Profile Dokter</Text>

                {isLoading ? (
                    <ActivityIndicator size="large" />
                ) : (
                    <View style={styles.form}>
                        <View>
                            <Text style={styles.label}>Email</Text>
                            <Text style={styles.email}>{email}</Text>
                        </View>

                        <AuthTextField label="Nama Lengkap" value={fullname} onChangeText={setFullname}/>
                        <AuthTextField label="Nomer Telepon" value={phone} onChangeText={setPhone} keyboardType="phone-pad"/>
                        <AuthSelectField 
                            label="Posisi"
                            value={position}
                            options={POSITIONS}
                            isOpen={isPositionOpen}
                            onToggle={() => setIsPositionOpen((value) => !value)}
                            onSelect={(value) => {
                                setPosition(value);
                                setIsPositionOpen(false);
                            }}
                        />

                        <AppButton 
                            title={isSaving ? 'Menyimpan..' : 'Simpan perubahan'}
                            disabled={isSaving}
                            onPress={handleSave}
                        />

                        <AppButton 
                            title="Logout"
                            variant="secondary"
                            disabled={isSaving}
                            onPress={handleLogout}
                        />
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles=StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#FAFAFA' },
  content: { padding: 24, paddingBottom: 48 },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: appColors.white,
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
  pressed: {
    opacity: 0.68,
  },
  title: { marginTop: 26, marginBottom: 36, fontSize: 32, fontWeight: '800' },
  form: { gap: 28 },
  label: { fontSize: 20, fontWeight: '700', marginBottom: 10 },
  email: { fontSize: 18, color: '#666666', borderBottomWidth: 2, borderBottomColor: appColors.aquaStrong, paddingBottom: 10 },
})
