import { View, Text, ScrollView, Switch, TouchableOpacity, StyleSheet } from 'react-native';
import { useSettingsStore } from '@/store/settingsStore';
import { colors } from '@/theme/colors';

function SettingRow({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} disabled={!onPress}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value} {onPress ? '›' : ''}</Text>
    </TouchableOpacity>
  );
}

function ToggleRow({
  label,
  value,
  onValueChange,
}: {
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: colors.primary }}
        thumbColor={colors.text}
      />
    </View>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

export default function SettingsScreen() {
  const settings = useSettingsStore();

  return (
    <ScrollView style={styles.container}>
      <SectionHeader title="PROMPTER" />

      <SettingRow
        label="⚙ Default font size"
        value={`${settings.defaultFontSize}pt`}
      />
      <SettingRow
        label="⚙ Default sensitivitas"
        value={
          settings.defaultSensitivity === 'low'
            ? 'Rendah'
            : settings.defaultSensitivity === 'high'
            ? 'Tinggi'
            : 'Sedang'
        }
      />
      <SettingRow
        label="⚙ Speed multiplier"
        value={`${settings.speedMultiplier.toFixed(1)}×`}
      />

      <SectionHeader title="AUDIO" />

      <ToggleRow
        label="⚙ Bluetooth mic"
        value={settings.bluetoothMicEnabled}
        onValueChange={settings.setBluetoothMicEnabled}
      />
      <ToggleRow
        label="⚙ Voice commands"
        value={settings.voiceCommandsEnabled}
        onValueChange={settings.setVoiceCommandsEnabled}
      />

      <SectionHeader title="OVERLAY" />

      <SettingRow
        label="⚙ Default overlay size"
        value={`${settings.overlayDefaultSize.width}×${settings.overlayDefaultSize.height}`}
      />
      <SettingRow
        label="⚙ Overlay opacity"
        value={`${Math.round(settings.overlayOpacity * 100)}%`}
      />

      <SectionHeader title="ABOUT" />

      <View style={styles.aboutSection}>
        <Text style={styles.aboutText}>Version 1.0.0</Text>
        <Text style={styles.aboutText}>Made by Zain · UIGM</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  sectionHeader: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  rowLabel: { color: colors.text, fontSize: 15 },
  rowValue: { color: colors.textSecondary, fontSize: 15 },
  aboutSection: {
    padding: 16,
    gap: 4,
    marginBottom: 40,
  },
  aboutText: { color: colors.textSecondary, fontSize: 14 },
});
