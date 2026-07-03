import { Pressable, StyleSheet, Text, View } from 'react-native';

import { appColors } from '../../../shared/theme/colors';

type DashboardActionCardProps = {
  title: string;
  description: string;
  actionLabel: string;
  icon: 'checkup' | 'history';
  onPress?: () => void;
};

export function DashboardActionCard({
  title,
  description,
  actionLabel,
  icon,
  onPress,
}: DashboardActionCardProps) {
  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]} onPress={onPress}>
      <View style={styles.iconWrap}>{icon === 'checkup' ? <CheckupIcon /> : <HistoryIcon />}</View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      <View style={styles.actionRow}>
        <Text style={styles.actionLabel}>{actionLabel}</Text>
        <ArrowIcon />
      </View>
    </Pressable>
  );
}

function ArrowIcon() {
  return (
    <View style={styles.arrowIcon}>
      <View style={styles.arrowLine} />
      <View style={styles.arrowHead} />
    </View>
  );
}

function CheckupIcon() {
  return (
    <View style={styles.checkupIcon}>
      <View style={styles.personHead} />
      <View style={styles.personBody} />
      <View style={styles.magnifierCircle}>
        <View style={styles.pulseLine} />
      </View>
      <View style={styles.magnifierHandle} />
    </View>
  );
}

function HistoryIcon() {
  return (
    <View style={styles.historyIcon}>
      <View style={styles.historyCircle} />
      <View style={styles.historyArrow} />
      <View style={styles.clockHandVertical} />
      <View style={styles.clockHandHorizontal} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 210,
    borderWidth: 4,
    borderColor: appColors.aquaStrong,
    borderBottomColor: appColors.blue,
    borderRadius: 22,
    paddingHorizontal: 26,
    paddingTop: 30,
    paddingBottom: 24,
    backgroundColor: appColors.white,
    shadowColor: appColors.blueDeep,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
  },
  pressed: {
    opacity: 0.84,
    transform: [{ scale: 0.99 }],
  },
  iconWrap: {
    width: 64,
    height: 64,
    marginBottom: 10,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: appColors.aquaStrong,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  description: {
    color: '#8D8D8D',
    fontSize: 13,
    fontWeight: '500',
  },
  actionRow: {
    marginTop: 'auto',
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  actionLabel: {
    color: appColors.blue,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 20,
    flexShrink: 1,
  },
  arrowIcon: {
    width: 22,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowLine: {
    width: 20,
    height: 3,
    borderRadius: 2,
    backgroundColor: appColors.blue,
  },
  arrowHead: {
    position: 'absolute',
    right: 1,
    width: 10,
    height: 10,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: appColors.blue,
    transform: [{ rotate: '45deg' }],
  },
  checkupIcon: {
    width: 62,
    height: 62,
  },
  personHead: {
    position: 'absolute',
    top: 4,
    left: 14,
    width: 21,
    height: 21,
    borderRadius: 11,
    borderWidth: 3,
    borderColor: '#31AFCB',
  },
  personBody: {
    position: 'absolute',
    left: 5,
    bottom: 8,
    width: 32,
    height: 26,
    borderLeftWidth: 3,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: '#31AFCB',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  magnifierCircle: {
    position: 'absolute',
    right: 5,
    bottom: 6,
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 3,
    borderColor: '#31AFCB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseLine: {
    width: 14,
    height: 8,
    borderLeftWidth: 3,
    borderBottomWidth: 3,
    borderColor: '#31AFCB',
    transform: [{ rotate: '-35deg' }],
  },
  magnifierHandle: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 14,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#31AFCB',
    transform: [{ rotate: '45deg' }],
  },
  historyIcon: {
    width: 62,
    height: 62,
  },
  historyCircle: {
    position: 'absolute',
    top: 9,
    left: 10,
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 3,
    borderColor: '#31AFCB',
    borderLeftColor: 'transparent',
  },
  historyArrow: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 13,
    height: 13,
    borderLeftWidth: 3,
    borderTopWidth: 3,
    borderColor: '#31AFCB',
  },
  clockHandVertical: {
    position: 'absolute',
    top: 22,
    left: 31,
    width: 3,
    height: 14,
    borderRadius: 2,
    backgroundColor: '#31AFCB',
  },
  clockHandHorizontal: {
    position: 'absolute',
    top: 34,
    left: 32,
    width: 12,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#31AFCB',
    transform: [{ rotate: '35deg' }],
  },
});

