import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import {
  Plus,
  FileText,
  Search,
  X,
  Settings as SettingsIcon,
  Image as ImageIcon,
  Layers,
  Info,
  Video,
  Sparkles,
  HelpCircle,
} from 'lucide-react-native';
import { useScriptsStore, type Script } from '@/store/scriptsStore';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen } from '@/ui/components/Screen';
import { IconButton } from '@/ui/components/IconButton';
import { TintedCard, type TintVariant } from '@/ui/components/TintedCard';

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

interface QuickAction {
  label: string;
  sub: string;
  Icon: React.ComponentType<any>;
  tint: TintVariant;
  onPress: () => void;
}

function QuickActionTile({ action }: { action: QuickAction }) {
  const { colors, typography, spacing, radius } = useTheme();
  const tint = colors.tints[action.tint];
  return (
    <TintedCard tint={action.tint} onPress={action.onPress} style={{ flex: 1, gap: spacing.md, minHeight: 130 }}>
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: radius.md,
          backgroundColor: colors.bgElevated,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <action.Icon size={22} color={tint.icon} strokeWidth={1.75} />
      </View>
      <View style={{ gap: 2 }}>
        <Text style={[typography.bodyEmph, { color: colors.text, fontWeight: '700' }]} numberOfLines={1}>
          {action.label}
        </Text>
        <Text style={[typography.caption, { color: colors.textSecondary }]} numberOfLines={1}>
          {action.sub}
        </Text>
      </View>
    </TintedCard>
  );
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
          backgroundColor: colors.bgElevated,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          padding: spacing.lg,
          flexDirection: 'row',
          gap: spacing.md,
          alignItems: 'center',
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: radius.md,
          backgroundColor: colors.accentSubtle,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <FileText size={20} color={colors.accent} strokeWidth={1.75} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[typography.bodyEmph, { color: colors.text }]} numberOfLines={1}>
          {script.title}
        </Text>
        <Text style={[typography.caption, { color: colors.textSecondary }]} numberOfLines={1}>
          {wordCountLabel(script.content)}  ·  {script.language === 'id-ID' ? 'ID' : 'EN'}  ·  {formatRelativeDate(script.updatedAt)}
        </Text>
      </View>
    </Pressable>
  );
}

function MenuSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { colors, typography, spacing, radius } = useTheme();
  const items = [
    { label: 'Settings', Icon: SettingsIcon, onPress: () => { onClose(); router.push('/settings' as any); } },
    { label: 'Recordings', Icon: ImageIcon, onPress: () => { onClose(); router.push('/gallery' as any); } },
    { label: 'Floating Overlay', Icon: Layers, onPress: () => { onClose(); router.push('/overlay' as any); } },
    {
      label: 'About',
      Icon: Info,
      onPress: () => {
        onClose();
        Alert.alert('Vocal Teleprompter', 'Version 1.0.0\nMade by Zain · UIGM');
      },
    },
  ];
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={onClose}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: 60,
            left: 16,
            backgroundColor: colors.bgElevated,
            borderRadius: radius.xl,
            borderWidth: 1,
            borderColor: colors.border,
            paddingVertical: spacing.sm,
            minWidth: 240,
            shadowColor: '#000',
            shadowOpacity: 0.4,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 8 },
            elevation: 12,
          }}
        >
          {items.map((it, i) => (
            <Pressable
              key={i}
              onPress={it.onPress}
              style={({ pressed }) => [
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.md,
                  paddingHorizontal: spacing.lg,
                  paddingVertical: spacing.md,
                  backgroundColor: pressed ? colors.bgSubtle : 'transparent',
                },
              ]}
            >
              <it.Icon size={18} color={colors.textSecondary} strokeWidth={1.75} />
              <Text style={[typography.body, { color: colors.text }]}>{it.label}</Text>
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function ScriptsTab() {
  const { colors, typography, spacing, radius } = useTheme();
  const scripts = useScriptsStore((s) => s.scripts);
  const addScript = useScriptsStore((s) => s.addScript);

  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  const handleNewScript = () => {
    addScript({ title: 'Untitled Script', content: '', language: 'id-ID', estimatedDurationSec: 0 });
    setTimeout(() => {
      const updated = useScriptsStore.getState().scripts;
      if (updated.length > 0) router.push(`/editor/${updated[0].id}`);
    }, 50);
  };

  const filtered = useMemo(() => {
    if (!query.trim()) return scripts;
    const q = query.toLowerCase();
    return scripts.filter(
      (s) => s.title.toLowerCase().includes(q) || s.content.toLowerCase().includes(q)
    );
  }, [scripts, query]);

  const quickActions: QuickAction[] = [
    { label: 'New Script', sub: 'Start fresh', Icon: Plus, tint: 'blue', onPress: handleNewScript },
    { label: 'Camera Studio', sub: 'Record video', Icon: Video, tint: 'orange', onPress: () => router.push('/studio' as any) },
    { label: 'Floating', sub: 'Over other apps', Icon: Layers, tint: 'green', onPress: () => router.push('/overlay' as any) },
    { label: 'Recordings', sub: 'Saved videos', Icon: Sparkles, tint: 'pink', onPress: () => router.push('/gallery' as any) },
  ];

  const ListHeader = (
    <View style={{ gap: spacing.xl, paddingBottom: spacing.lg }}>
      {/* Top icon row */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Pressable
          onPress={() => setMenuOpen(true)}
          style={({ pressed }) => [
            {
              width: 40,
              height: 40,
              borderRadius: radius.pill,
              backgroundColor: colors.bgElevated,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <HelpCircle size={20} color={colors.text} strokeWidth={1.75} />
        </Pressable>
        <Pressable
          onPress={() => {
            if (searchOpen) {
              setQuery('');
              setSearchOpen(false);
            } else {
              setSearchOpen(true);
            }
          }}
          style={({ pressed }) => [
            {
              width: 40,
              height: 40,
              borderRadius: radius.pill,
              backgroundColor: colors.bgElevated,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          {searchOpen ? (
            <X size={20} color={colors.text} strokeWidth={1.75} />
          ) : (
            <Search size={20} color={colors.text} strokeWidth={1.75} />
          )}
        </Pressable>
      </View>

      {/* Hero */}
      <View style={{ gap: spacing.xs }}>
        <Text style={[typography.displayXL, { color: colors.text }]}>
          Hi,{'\n'}what's on{'\n'}your script today?
        </Text>
      </View>

      {/* Search field (when open) */}
      {searchOpen && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            backgroundColor: colors.bgElevated,
            borderRadius: radius.lg,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.md,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Search size={18} color={colors.textTertiary} strokeWidth={1.75} />
          <TextInput
            autoFocus
            value={query}
            onChangeText={setQuery}
            placeholder="Search scripts"
            placeholderTextColor={colors.textTertiary}
            style={{ flex: 1, color: colors.text, fontSize: 15, padding: 0 }}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <X size={16} color={colors.textTertiary} strokeWidth={1.75} />
            </Pressable>
          )}
        </View>
      )}

      {/* 2x2 quick actions */}
      <View style={{ gap: spacing.md }}>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <QuickActionTile action={quickActions[0]} />
          <QuickActionTile action={quickActions[1]} />
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <QuickActionTile action={quickActions[2]} />
          <QuickActionTile action={quickActions[3]} />
        </View>
      </View>

      {scripts.length > 0 && (
        <Text
          style={[
            typography.micro,
            { color: colors.textSecondary, marginTop: spacing.md, paddingHorizontal: spacing.xs },
          ]}
        >
          YOUR SCRIPTS · {scripts.length}
        </Text>
      )}
    </View>
  );

  return (
    <Screen>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          searchOpen && query.length > 0 ? (
            <View style={{ padding: spacing.xl, alignItems: 'center' }}>
              <Text style={[typography.body, { color: colors.textSecondary }]}>
                No scripts match "{query}"
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => <ScriptListItem script={item} />}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: 120, // space for floating tab bar
          gap: spacing.md,
        }}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
      />

      <MenuSheet visible={menuOpen} onClose={() => setMenuOpen(false)} />
    </Screen>
  );
}
