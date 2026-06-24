import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { BottomSheet } from './BottomSheet';
import { Input } from './Input';
import { Button } from './Button';
import { Text } from './Text';
import { useTheme } from '@/theme';
import { useSettingsStore } from '@/store/settings-store';

interface RefillSettingsSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function RefillSettingsSheet({ visible, onClose }: RefillSettingsSheetProps) {
  const { spacing } = useTheme();
  const refillWarningDays = useSettingsStore((s) => s.refillWarningDays);
  const lowStockWarningDays = useSettingsStore((s) => s.lowStockWarningDays);
  const update = useSettingsStore((s) => s.update);

  const [refillText, setRefillText] = useState(String(refillWarningDays));
  const [stockText, setStockText] = useState(String(lowStockWarningDays));

  function handleSave(): void {
    const refill = parseInt(refillText, 10);
    const stock = parseInt(stockText, 10);
    if (!isNaN(refill) && refill >= 1 && refill <= 30) {
      update('refill_warning_days', String(refill));
    }
    if (!isNaN(stock) && stock >= 1 && stock <= 30) {
      update('low_stock_warning_days', String(stock));
    }
    onClose();
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Refill alerts" height={320}>
      <View style={styles.form}>
        <Text variant="caption" color="default" style={{ marginBottom: spacing[1] }}>
          Course-ending warning (days before end date)
        </Text>
        <Input
          value={refillText}
          onChangeText={setRefillText}
          keyboardType="number-pad"
          placeholder="3"
          accessibilityLabel="Days before course end to warn"
          maxLength={2}
        />

        <Text
          variant="caption"
          color="default"
          style={{ marginTop: spacing[4], marginBottom: spacing[1] }}
        >
          Low-stock warning (days of supply remaining)
        </Text>
        <Input
          value={stockText}
          onChangeText={setStockText}
          keyboardType="number-pad"
          placeholder="3"
          accessibilityLabel="Days of stock remaining to trigger low-stock warning"
          maxLength={2}
        />

        <Button
          label="Save"
          variant="primary"
          fullWidth
          onPress={handleSave}
          style={{ marginTop: spacing[5] }}
          accessibilityLabel="Save refill alert thresholds"
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  form: { flex: 1 },
});
