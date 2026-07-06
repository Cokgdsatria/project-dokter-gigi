import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { appColors } from '../theme/colors';

type AuthTextFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  placeholderTextColor?: string;
  keyboardType?: 'default' |  'email-address' | 'phone-pad';
  secureTextEntry?: boolean;
  onToggleSecure?: () => void;
  showSecureToggle?: boolean;
};

function EyeIcon({ isHidden }: { isHidden: boolean }) {
  return (
    <View style={styles.eyeIcon}>
      <View style={styles.eyeShape}>
        <View style={styles.eyePupil} />
      </View>
      {isHidden ? <View style={styles.eyeSlash} /> : null}
    </View>
  );
}

export function AuthTextField({
  label,
  value,
  onChangeText,
  placeholder,
  placeholderTextColor = '#9A9A9A',
  keyboardType = 'default',
  secureTextEntry = false,
  onToggleSecure,
  showSecureToggle = false,
}: AuthTextFieldProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={placeholderTextColor}
          keyboardType={keyboardType}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry={secureTextEntry}
          style={styles.input}
        />
        {showSecureToggle ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={secureTextEntry ? 'Tampilkan password' : 'Sembunyikan password'}
            onPress={onToggleSecure}
            hitSlop={12}
            style={styles.eyeButton}>
            <EyeIcon isHidden={secureTextEntry} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  label: {
    color: '#0A0A0A',
    fontSize: 20,
    fontWeight: '700',
  },
  inputRow: {
    minHeight: 40,
    borderBottomWidth: 2,
    borderBottomColor: appColors.aquaStrong,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    color: '#0D0D0D',
    fontSize: 20,
    padding: 0,
    paddingBottom: 8,
  },
  eyeButton: {
    width: 44,
    height: 38,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingBottom: 8,
  },
  eyeIcon: {
    width: 26,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyeShape: {
    width: 24,
    height: 14,
    borderWidth: 2,
    borderColor: '#9B9B9B',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  eyePupil: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#9B9B9B',
  },
  eyeSlash: {
    position: 'absolute',
    width: 28,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#9B9B9B',
    transform: [{ rotate: '-35deg' }],
  },
});


