import { Pressable, StyleSheet, Text, View } from 'react-native';

import { appColors } from '@/shared/theme/colors';

type AuthSelectFieldProps = {
  label: string;
  value: string;
  options: string[];
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (value: string) => void;
};

export function AuthSelectField({
  label,
  value,
  options,
  isOpen,
  onToggle,
  onSelect,
}: AuthSelectFieldProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
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
    gap: 8,
  },
  label: {
    color: '#0A0A0A',
    fontSize: 20,
    fontWeight: '700',
  },
  select: {
    height: 48,
    borderWidth: 2,
    borderColor: appColors.aquaStrong,
    borderRadius: 4,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: appColors.white,
  },
  value: {
    color: '#222222',
    fontSize: 20,
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
    gap: 8,
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
    fontSize: 16,
  },
  pressed: {
    opacity: 0.78,
  },
});
