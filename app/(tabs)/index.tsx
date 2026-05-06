import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, Pressable, Alert, TextInput } from 'react-native';
import { router } from 'expo-router';
import { Plus, FileText, Search, Menu, X, Settings as SettingsIcon, Image as ImageIcon, Layers, Info } from 'lucide-react-native';
import { useScriptsStore, type Script } from '@/store/scriptsStore';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen } from '@/ui/components/Screen';
import { Header } from '@/ui/components/Header';
import { Card } from '@/ui/components/Card';
import { IconButton } from '@/ui/components/IconButton';
import { Modal } from 'react-native';

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

function MenuSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { colors, typography, spacing, radius } = useTheme();
  const items = [
    {
      label: 'Settings',
      Icon: SettingsIcon,
      onPress: () => {
        onClose();
        router.push('/settings' as any);
      },
    },
    {
      label: 'Recordings',
      Icon: ImageIcon,
      onPress: () => {
        onClose();
        router.push('/gallery' as any);
      },
    },
    {
      label: 'Floating Overlay',
      Icon: Layers,
      onPress: () => {
        onClose();
        router.push('/overlay' as any);
      },
    },
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
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: colors.border,
            paddingVertical: spacing.sm,
            minWidth: 220,
            shadowColor: '#000',
            shadowOpacity: 0.4,
            shadowRadius: 14,
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

  return (
    <Screen>
      <Header
        title="Scripts"
        left={
          <IconButton
            icon={<Menu size={22} color={colors.text} strokeWidth={1.75} />}
            onPress={() => setMenuOpen(true)}
          />
        }
        right={
          <IconButton
            icon={
              searchOpen ? (
                <X size={22} color={colors.text} strokeWidth={1.75} />
              ) : (
                <Search size={22} color={colors.text} strokeWidth={1.75} />
              )
            }
            onPress={() => {
              if (searchOpen) {
                setQuery('');
                setSearchOpen(false);
              } else {
                setSearchOpen(true);
              }
            }}
          />
        }
      />

      {searchOpen && (
        <View
          style={{
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.sm,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              backgroundColor: colors.bgSubtle,
              borderRadius: radius.md,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Search size={16} color={colors.textTertiary} strokeWidth={1.75} />
            <TextInput
              autoFocus
              value={query}
              onChangeText={setQuery}
              placeholder="Search scripts by title or content"
              placeholderTextColor={colors.textTertiary}
              style={{
                flex: 1,
                color: colors.text,
                fontSize: 15,
                padding: 0,
              }}
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery('')} hitSlop={8}>
                <X size={16} color={colors.textTertiary} strokeWidth={1.75} />
              </Pressable>
            )}
          </View>
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={!searchOpen ? <NewScriptHero onPress={handleNewScript} /> : null}
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
          padding: spacing.lg,
          gap: spacing.md,
          paddingBottom: spacing.xxxl,
        }}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
      />

      <MenuSheet visible={menuOpen} onClose={() => setMenuOpen(false)} />
    </Screen>
  );
}
