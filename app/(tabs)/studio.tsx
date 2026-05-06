import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Video, FileText, Image as ImageIcon, ChevronRight } from 'lucide-react-native';
import { useScriptsStore } from '@/store/scriptsStore';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen } from '@/ui/components/Screen';
import { Header } from '@/ui/components/Header';
import { Button } from '@/ui/components/Button';
import { IconButton } from '@/ui/components/IconButton';

function wordCountLabel(text: string): string {
  const count = text.trim().split(/\s+/).filter(Boolean).length;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k words`;
  return `${count} words`;
}

export default function StudioTab() {
  const { colors, typography, spacing, radius } = useTheme();
  const scripts = useScriptsStore((s) => s.scripts);

  return (
    <Screen>
      <Header
        title="Studio"
        right={
          <IconButton
            icon={<ImageIcon size={20} color={colors.text} strokeWidth={1.75} />}
            onPress={() => router.push('/gallery' as any)}
          />
        }
      />

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxxl }}>
        {/* Hero */}
        <View
          style={{
            backgroundColor: colors.bgElevated,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: colors.border,
            padding: spacing.xl,
            alignItems: 'center',
            gap: spacing.md,
          }}
        >
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: radius.pill,
              backgroundColor: colors.accentSubtle,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Video size={28} color={colors.accent} strokeWidth={1.75} />
          </View>
          <Text style={[typography.h1, { color: colors.text, textAlign: 'center' }]}>
            Camera Studio
          </Text>
          <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
            Pilih script di bawah untuk mulai record video dengan teleprompter overlay.
          </Text>
        </View>

        {/* Script picker */}
        <Text style={[typography.micro, { color: colors.textSecondary, marginTop: spacing.sm }]}>
          PILIH SCRIPT
        </Text>

        {scripts.length === 0 ? (
          <View
            style={{
              backgroundColor: colors.bgElevated,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: colors.border,
              padding: spacing.xl,
              alignItems: 'center',
              gap: spacing.md,
            }}
          >
            <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
              Belum ada script. Bikin dulu di tab Scripts.
            </Text>
            <Button
              label="Ke Scripts"
              variant="secondary"
              onPress={() => router.push('/' as any)}
            />
          </View>
        ) : (
          scripts.map((script) => (
            <Pressable
              key={script.id}
              onPress={() => router.push(`/camera/${script.id}` as any)}
              style={({ pressed }) => [
                {
                  backgroundColor: pressed ? colors.bgSubtle : colors.bgElevated,
                  borderRadius: radius.lg,
                  borderWidth: 1,
                  borderColor: colors.border,
                  padding: spacing.lg,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.md,
                },
              ]}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: radius.md,
                  backgroundColor: colors.bgSubtle,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FileText size={18} color={colors.textSecondary} strokeWidth={1.75} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text
                  style={[typography.bodyEmph, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {script.title}
                </Text>
                <Text
                  style={[typography.caption, { color: colors.textSecondary }]}
                  numberOfLines={1}
                >
                  {wordCountLabel(script.content)}  ·  {script.language === 'id-ID' ? 'Indonesian' : 'English'}
                </Text>
              </View>
              <ChevronRight size={18} color={colors.textTertiary} strokeWidth={1.75} />
            </Pressable>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}
