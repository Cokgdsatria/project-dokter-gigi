import type { PressableProps, StyleProp, ViewStyle } from 'react-native';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { appColors } from '@/shared/theme/colors';

type AppButtonProps = PressableProps & {
  title: string;
  variant?: 'primary' | 'secondary';
  style?: StyleProp<ViewStyle>;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function AppButton({
  title,
  variant = 'primary',
  style,
  disabled,
  onPressIn,
  onPressOut,
  ...props
}: AppButtonProps) {
  const isPrimary = variant === 'primary';
  const pressProgress = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: disabled ? 0.62 : interpolate(pressProgress.value, [0, 1], [1, 0.9]),
    transform: [{ scale: interpolate(pressProgress.value, [0, 1], [1, 0.975]) }],
    shadowOpacity: interpolate(pressProgress.value, [0, 1], [isPrimary ? 0.26 : 0.22, 0.12]),
    shadowRadius: interpolate(pressProgress.value, [0, 1], [isPrimary ? 8 : 5, 3]),
    elevation: interpolate(pressProgress.value, [0, 1], [isPrimary ? 8 : 5, 2]),
  }));

  return (
    <AnimatedPressable
      {...props}
      disabled={disabled}
      onPressIn={(event) => {
        pressProgress.value = withTiming(1, { duration: 110 });
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        pressProgress.value = withTiming(0, { duration: 180 });
        onPressOut?.(event);
      }}
      style={[styles.base, isPrimary ? styles.primary : styles.secondary, animatedStyle, style]}>
      <Text style={[styles.label, isPrimary ? styles.primaryLabel : styles.secondaryLabel]}>
        {title}
      </Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 68,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: appColors.aquaStrong,
    shadowColor: appColors.blueDeep,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.26,
    shadowRadius: 8,
    elevation: 8,
  },
  secondary: {
    backgroundColor: appColors.white,
    borderWidth: 2,
    borderColor: appColors.outline,
    shadowColor: appColors.blueDeep,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.22,
    shadowRadius: 5,
    elevation: 5,
  },
  label: {
    fontSize: 20,
    fontWeight: '700',
  },
  primaryLabel: {
    color: appColors.white,
  },
  secondaryLabel: {
    color: '#2398C9',
  },
});
