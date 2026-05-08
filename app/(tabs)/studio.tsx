import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Video, FileText, Image as ImageIcon, ChevronRight } from 'lucide-react-native';
import { useScriptsStore } from '@/store/scriptsStore';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen } from '@/ui/components/Screen';
import { Button } from '@/ui/components/Button';
import { TintedCard } from '@/ui/components/TintedCard';

function wordCountLabel(text: string): string {
  const count = text.trim().split(/\s+/).filter(Boolean).length;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k words`;
  return `${count} words`;
}

export default function StudioTab() {
  const { colors, typography, spacing, radius } = useTheme();
  const scripts = useScriptsStore((s) => s.scripts);
  const orangeTint = colors.tints.orange;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.lg,
          paddingBottom: 120,
          gap: spacing.xl,
        }}
      >
        {/* Top icon row */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'flex-end',
          }}
        >
          <Pressable
            onPress={() => router.push('/gallery' as any)}
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
            <ImageIcon size={20} color={colors.text} strokeWidth={1.75} />
          </Pressable>
        </View>

        {/* Hero */}
        <View style={{ gap: spacing.sm }}>
          <Text style={[typography.displayXL, { color: colors.text }]}>
            Camera{'\n'}Studio
          </Text>
          <Text style={[typography.body, { color: colors.textSecondary, maxWidth: 320 }]}>
            Record video sambil baca naskah dengan prompter overlay yang
            ngikutin suara kamu.
          </Text>
        </View>

        {/* Big tinted hero card */}
        <TintedCard tint="orange" style={{ minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: spacing.md }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: radius.pill,
              backgroundColor: colors.bgElevated,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Video size={32} color={orangeTint.icon} strokeWidth={1.75} />
          </View>
          <Text style={[typography.h2, { color: colors.text, textAlign: 'center' }]}>
            Pilih script di bawah ini
          </Text>
          <Text
            style={[
              typography.caption,
              { color: colors.textSecondary, textAlign: 'center' },
            ]}
          >
            Tap salah satu untuk mulai record
          </Text>
        </TintedCard>

        {/* Section heading */}
        <Text
          style={[
            typography.micro,
            { color: colors.textSecondary, paddingHorizontal: spacing.xs },
          ]}
        >
          YOUR SCRIPTS · {scripts.length}
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
          <View style={{ gap: spacing.md }}>
            {scripts.map((script) => (
              <Pressable
                key={script.id}
                onPress={() => router.push(`/camera/${script.id}` as any)}
                style={({ pressed }) => [
                  {
                    backgroundColor: colors.bgElevated,
                    borderRadius: radius.lg,
                    borderWidth: 1,
                    borderColor: colors.border,
                    padding: spacing.lg,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.md,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: radius.md,
                    backgroundColor: orangeTint.bg,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <FileText size={18} color={orangeTint.icon} strokeWidth={1.75} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[typography.bodyEmph, { color: colors.text }]} numberOfLines={1}>
                    {script.title}
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]} numberOfLines={1}>
                    {wordCountLabel(script.content)}  ·  {script.language === 'id-ID' ? 'Indonesian' : 'English'}
                  </Text>
                </View>
                <ChevronRight size={18} color={colors.textTertiary} strokeWidth={1.75} />
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
