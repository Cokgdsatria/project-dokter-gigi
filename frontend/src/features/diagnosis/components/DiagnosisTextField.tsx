import type { TextInputProps } from 'react-native';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { appColors } from '../../../shared/theme/colors';

type DiagnosisTextFieldProps = TextInputProps & {
  label: string;
  required?: boolean;
};

export function DiagnosisTextField({ label, required = false, style, ...props }: DiagnosisTextFieldProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}>*</Text> : null}
      </Text>
      <TextInput {...props} style={[styles.input, props.multiline && styles.multiline, style]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  label: {
    color: '#0A0A0A',
    fontSize: 19,
    fontWeight: '800',
  },
  required: {
    color: '#E0182D',
  },
  input: {
    minHeight: 60,
    borderWidth: 2,
    borderColor: appColors.blue,
    borderRadius: 8,
    paddingHorizontal: 30,
    color: '#0A0A0A',
    fontSize: 20,
    fontWeight: '500',
    backgroundColor: '#FFFFFF',
  },
  multiline: {
    minHeight: 86,
    paddingTop: 16,
    paddingBottom: 16,
    textAlignVertical: 'top',
  },
});

