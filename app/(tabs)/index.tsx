import React, { useMemo } from 'react';
import { View, Text, FlatList, Pressable, Alert } from 'react-native';
import { router } from 'expo-router';
import { Plus, FileText, Search, Menu } from 'lucide-react-native';
import { useScriptsStore, type Script } from '@/store/scriptsStore';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen } from '@/ui/components/Screen';
import { Header } from '@/ui/components/Header';
import { Card } from '@/ui/components/Card';
import { IconButton } from '@/ui/components/IconButton';

function formatRelativeDate(ts: number): string {
  const now = new Date();
  const date = new Date(ts);
  const sameDay = date.toDateString() === now.toDateString();
  const diffDays = Math.floor((now.getTime() - ts) / 86400000);
  if (sameDay) return `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function wordCountLabel(text: string): string {
  const count = text.trim().split(/\s+/).filter(Boolean).length;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k words`;
  return `${count} words`;
}

function ScriptListItem({ script }: { script: Script }) {
  const { colors, typography, spacing, radius } = useTheme();
  const deleteScript = useScriptsStore((s) => s.deleteScript);

  const handlePress = () => router.push(`/editor/${script.id}`);

  const handleLongPress = () => {
    Alert.alert('Delete Script', `Delete "${script.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteScript(script.id) },
    ]);
  };

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={handleLongPress}
      style={({ pressed }) => [
        {
          backgroundColor: pressed ? colors.bgSubtle : colors.bgElevated,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          padding: spacing.lg,
          gap: spacing.sm,
        },
      ]}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          backgroundColor: colors.bgSubtle,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <FileText size={18} color={colors.textSecondary} strokeWidth={1.75} />
      </View>
      <Text style={[typography.bodyEmph, { color: colors.text, marginTop: spacing.sm }]} numberOfLines={2}>
        {script.title}
      </Text>
      <Text style={[typography.caption, { color: colors.textSecondary }]} numberOfLines={1}>
        {wordCountLabel(script.content)}  ·  {script.language === 'id-ID' ? 'Indonesian' : 'English'}  ·  {formatRelativeDate(script.updatedAt)}
      </Text>
    </Pressable>
  );
}

function NewScriptHero({ onPress }: { onPress: () => void }) {
  const { colors, typography, spacing, radius } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          backgroundColor: pressed ? colors.bgSubtle : colors.bgElevated,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          padding: spacing.xxl,
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.md,
          minHeight: 200,
        },
      ]}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: radius.pill,
          backgroundColor: colors.accentSubtle,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Plus size={28} color={colors.accent} strokeWidth={2} />
      </View>
      <Text style={[typography.h2, { color: colors.text }]}>New Script</Text>
      <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center' }]}>
        Start from scratch or import
      </Text>
    </Pressable>
  );
}

export default function ScriptsTab() {
  const { colors, typography, spacing } = useTheme();
  const scripts = useScriptsStore((s) => s.scripts);
  const addScript = useScriptsStore((s) => s.addScript);

  const handleNewScript = () => {
    addScript({ title: 'Untitled Script', content: '', language: 'id-ID', estimatedDurationSec: 0 });
    setTimeout(() => {
      const updated = useScriptsStore.getState().scripts;
      if (updated.length > 0) router.push(`/editor/${updated[0].id}`);
    }, 50);
  };

  const data = useMemo(() => scripts, [scripts]);

  return (
    <Screen>
      <Header
        title="Scripts"
        left={<IconButton icon={<Menu size={22} color={colors.text} strokeWidth={1.75} />} onPress={() => {}} />}
        right={<IconButton icon={<Search size={22} color={colors.text} strokeWidth={1.75} />} onPress={() => {}} />}
      />

      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={<NewScriptHero onPress={handleNewScript} />}
        renderItem={({ item }) => <ScriptListItem script={item} />}
        contentContainerStyle={{
          padding: spacing.lg,
          gap: spacing.md,
          paddingBottom: spacing.xxxl,
        }}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
      />
    </Screen>
  );
}
