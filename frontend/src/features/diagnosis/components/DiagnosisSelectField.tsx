import { Pressable, StyleSheet, Text, View } from 'react-native';

import { appColors } from '../../../shared/theme/colors';

type DiagnosisSelectFieldProps = {
  label: string;
  value: string;
  options: string[];
  required?: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (value: string) => void;
};

export function DiagnosisSelectField({
  label,
  value,
  options,
  required = false,
  isOpen,
  onToggle,
  onSelect,
}: DiagnosisSelectFieldProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}>*</Text> : null}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
        onPress={onToggle}
        style={({ pressed }) => [styles.select, pressed && styles.pressed]}>
        <Text style={styles.value}>{value}</Text>
        <View style={[styles.chevron, isOpen && styles.chevronOpen]} />
      </Pressable>
      {isOpen ? (
        <View style={styles.dropdown}>
          {options.map((option) => (
            <Pressable
              key={option}
              accessibilityRole="button"
              onPress={() => onSelect(option)}
              style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}>
              <Text style={styles.optionText}>{option}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
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
  select: {
    minHeight: 60,
    borderWidth: 2,
    borderColor: appColors.blue,
    borderRadius: 8,
    paddingHorizontal: 30,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  value: {
    color: '#0A0A0A',
    fontSize: 20,
    fontWeight: '500',
  },
  chevron: {
    width: 18,
    height: 18,
    borderRightWidth: 4,
    borderBottomWidth: 4,
    borderColor: '#0A0A0A',
    transform: [{ rotate: '45deg' }],
    marginTop: -8,
  },
  chevronOpen: {
    transform: [{ rotate: '225deg' }],
    marginTop: 8,
  },
  dropdown: {
    paddingTop: 2,
    gap: 14,
  },
  option: {
    paddingVertical: 2,
    paddingHorizontal: 16,
  },
  optionPressed: {
    opacity: 0.62,
  },
  optionText: {
    color: '#0A0A0A',
    fontSize: 18,
    fontWeight: '500',
  },
  pressed: {
    opacity: 0.78,
  },
});

