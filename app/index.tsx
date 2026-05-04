import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { useScriptsStore, Script } from '@/store/scriptsStore';
import { colors } from '@/theme/colors';

function formatRelativeTime(ts: number): string {
  const diffMs = Date.now() - ts;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return 'baru saja';
  if (diffMin < 60) return `${diffMin} menit lalu`;
  if (diffHour < 24) return `${diffHour} jam lalu`;
  if (diffDay === 1) return 'kemarin';
  return `${diffDay} hari lalu`;
}

function wordCount(text: string): string {
  const count = text.trim().split(/\s+/).filter(Boolean).length;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k kata`;
  return `${count} kata`;
}

function ScriptCard({ script }: { script: Script }) {
  const deleteScript = useScriptsStore((s) => s.deleteScript);

  const handlePress = () => {
    router.push(`/editor/${script.id}`);
  };

  const handleLongPress = () => {
    Alert.alert('Hapus Script', `Hapus "${script.title}"?`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: () => deleteScript(script.id),
      },
    ]);
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handlePress}
      onLongPress={handleLongPress}
      activeOpacity={0.7}
    >
      <Text style={styles.cardTitle} numberOfLines={1}>
        {script.title}
      </Text>
      <Text style={styles.cardMeta}>
        📄 {wordCount(script.content)} · {script.language} ·{' '}
        {formatRelativeTime(script.updatedAt)}
      </Text>
    </TouchableOpacity>
  );
}

export default function ScriptLibrary() {
  const scripts = useScriptsStore((s) => s.scripts);
  const addScript = useScriptsStore((s) => s.addScript);

  const handleNewScript = () => {
    addScript({
      title: 'Script Baru',
      content: '',
      language: 'id-ID',
      estimatedDurationSec: 0,
    });
    // Navigate to the newly created script — it'll be first in list
    setTimeout(() => {
      const updated = useScriptsStore.getState().scripts;
      if (updated.length > 0) {
        router.push(`/editor/${updated[0].id}`);
      }
    }, 50);
  };

  return (
    <View style={styles.container}>
      {scripts.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📝</Text>
          <Text style={styles.emptyText}>Belum ada script.</Text>
          <Text style={styles.emptySubtext}>Tap + untuk tambah script baru.</Text>
        </View>
      ) : (
        <FlatList
          data={scripts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ScriptCard script={item} />}
          contentContainerStyle={styles.list}
        />
      )}

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.footerBtn}
          onPress={() => router.push('/settings')}
        >
          <Text style={styles.footerBtnText}>Settings</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.addBtn} onPress={handleNewScript}>
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 6,
  },
  cardMeta: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtext: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  footerBtnText: {
    color: colors.textSecondary,
    fontSize: 15,
  },
  addBtn: {
    backgroundColor: colors.primary,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    color: colors.text,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '300',
  },
});
