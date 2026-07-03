import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { appColors } from '../../../shared/theme/colors';

type ImageUploadBoxProps = {
  imageUri?: string | null;
  onPress: () => void;
};

export function ImageUploadBox({ imageUri, onPress }: ImageUploadBoxProps) {
  return (
    <Pressable style={({ pressed }) => [styles.container, pressed && styles.pressed]} onPress={onPress}>
      {imageUri ? (
        <Image source={{ uri: imageUri }} resizeMode="cover" style={styles.preview} />
      ) : (
        <View style={styles.placeholder}>
          <UploadIcon />
          <Text style={styles.title}>Upload image</Text>
          <Text style={styles.subtitle}>Png/Jpeg Max. 2Mb</Text>
        </View>
      )}
    </Pressable>
  );
}

function UploadIcon() {
  return (
    <View style={styles.iconWrap}>
      <View style={styles.imageFrame}>
        <View style={styles.mountainLeft} />
        <View style={styles.mountainRight} />
      </View>
      <View style={styles.uploadLine} />
      <View style={styles.uploadHeadLeft} />
      <View style={styles.uploadHeadRight} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 286,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: appColors.aquaStrong,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.75,
  },
  preview: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    alignItems: 'center',
  },
  title: {
    color: '#0A0A0A',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 12,
  },
  subtitle: {
    color: '#B7B7B7',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  iconWrap: {
    width: 70,
    height: 70,
  },
  imageFrame: {
    position: 'absolute',
    left: 10,
    bottom: 6,
    width: 46,
    height: 46,
    borderWidth: 5,
    borderColor: '#31AFCB',
    borderRadius: 6,
    overflow: 'hidden',
  },
  mountainLeft: {
    position: 'absolute',
    left: 2,
    bottom: 1,
    width: 28,
    height: 28,
    borderLeftWidth: 5,
    borderTopWidth: 5,
    borderColor: '#31AFCB',
    transform: [{ rotate: '45deg' }],
  },
  mountainRight: {
    position: 'absolute',
    right: 0,
    bottom: -2,
    width: 22,
    height: 22,
    borderLeftWidth: 5,
    borderTopWidth: 5,
    borderColor: '#31AFCB',
    transform: [{ rotate: '45deg' }],
  },
  uploadLine: {
    position: 'absolute',
    right: 15,
    top: 4,
    width: 5,
    height: 30,
    borderRadius: 3,
    backgroundColor: '#31AFCB',
  },
  uploadHeadLeft: {
    position: 'absolute',
    right: 28,
    top: 5,
    width: 18,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#31AFCB',
    transform: [{ rotate: '-45deg' }],
  },
  uploadHeadRight: {
    position: 'absolute',
    right: 8,
    top: 5,
    width: 18,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#31AFCB',
    transform: [{ rotate: '45deg' }],
  },
});

