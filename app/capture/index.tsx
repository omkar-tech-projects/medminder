import { View, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Button, Badge } from '@/components';
import { useTheme } from '@/theme';
import { useCaptureStore } from '@/store/capture-store';
import { processAndStore, clearAllPages } from '@/lib/image-pipeline';

export default function CaptureIndexScreen() {
  const { colors, spacing, radii } = useTheme();
  const insets = useSafeAreaInsets();
  const pages = useCaptureStore((s) => s.pages);
  const addPage = useCaptureStore((s) => s.addPage);
  const clear = useCaptureStore((s) => s.clear);

  const dismiss = () => {
    if (pages.length > 0) {
      clearAllPages(pages.map((p) => p.uri));
      clear();
    }
    router.navigate('/');
  };

  const openCamera = () => {
    router.push('/capture/camera');
  };

  const openGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Photo library access needed',
        'To pick photos, allow access in Settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => void import('expo-linking').then(({ default: L }) => L.openSettings()) },
        ],
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.9,
      selectionLimit: 10,
    });

    if (result.canceled || result.assets.length === 0) return;

    for (const asset of result.assets) {
      const uri = await processAndStore(asset.uri);
      addPage(uri);
    }

    router.push('/capture/review');
  };

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top + spacing[2],
          paddingBottom: insets.bottom + spacing[5],
        },
      ]}
    >
      {/* Top bar */}
      <View style={[styles.topBar, { paddingHorizontal: spacing[4] }]}>
        <TouchableOpacity
          onPress={dismiss}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Cancel and go back"
          accessibilityRole="button"
          style={[styles.closeBtn, { backgroundColor: colors.backgroundTertiary, borderRadius: radii.full }]}
        >
          <Ionicons name="close" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <Text variant="headingSmall">Add prescription</Text>

        {pages.length > 0 ? (
          <Badge label={`${pages.length} page${pages.length !== 1 ? 's' : ''}`} variant="primary" size="sm" />
        ) : (
          <View style={{ width: 60 }} accessibilityElementsHidden />
        )}
      </View>

      {/* Source cards */}
      <View style={[styles.cards, { paddingHorizontal: spacing[5] }]}>
        <SourceCard
          icon="camera"
          label="Take a photo"
          hint="Shoot right now with your camera"
          onPress={openCamera}
          colors={colors}
          spacing={spacing}
          radii={radii}
        />
        <SourceCard
          icon="image"
          label="Choose from library"
          hint="Pick existing photos from your phone"
          onPress={() => void openGallery()}
          colors={colors}
          spacing={spacing}
          radii={radii}
        />
      </View>

      <Text
        variant="caption"
        color={colors.textTertiary}
        align="center"
        style={{ paddingHorizontal: spacing[8], marginTop: spacing[4] }}
      >
        Photos are stored privately on your device and never shared.
      </Text>

      {/* Review CTA when pages already captured */}
      {pages.length > 0 && (
        <View style={[styles.reviewBar, { paddingHorizontal: spacing[5] }]}>
          <Button
            label={`Review ${pages.length} page${pages.length !== 1 ? 's' : ''}`}
            onPress={() => router.push('/capture/review')}
            variant="primary"
            fullWidth
            size="lg"
            rightIcon="arrow-forward"
          />
        </View>
      )}
    </View>
  );
}

interface SourceCardProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  hint: string;
  onPress: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
  spacing: ReturnType<typeof useTheme>['spacing'];
  radii: ReturnType<typeof useTheme>['radii'];
}

function SourceCard({ icon, label, hint, onPress, colors, spacing, radii }: SourceCardProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      activeOpacity={0.7}
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radii.xl,
          padding: spacing[5],
        },
      ]}
    >
      <View
        style={[
          styles.cardIcon,
          { backgroundColor: colors.brandPrimaryLight, borderRadius: radii.lg },
        ]}
      >
        <Ionicons name={icon} size={28} color={colors.brandPrimary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="labelLarge">{label}</Text>
        <Text variant="bodySmall" color={colors.textSecondary} style={{ marginTop: 2 }}>
          {hint}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  closeBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  cards: { gap: 12, marginTop: 24 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1 },
  cardIcon: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  reviewBar: { marginTop: 'auto', paddingTop: 16 },
});
