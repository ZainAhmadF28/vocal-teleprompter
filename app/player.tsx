import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  Pressable,
  StatusBar,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { VideoView, useVideoPlayer } from 'expo-video';
import * as MediaLibrary from 'expo-media-library';
import { X, Trash2 } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';

export default function PlayerScreen() {
  const { id, title } = useLocalSearchParams<{ id: string; title?: string }>();
  const { colors, typography, spacing, radius } = useTheme();

  const [sourceUri, setSourceUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Resolve content:// → file:// via getAssetInfoAsync (more reliable for player)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const info = await MediaLibrary.getAssetInfoAsync(id);
        if (cancelled) return;
        // Prefer localUri (file://) over uri (content://)
        const finalUri = info.localUri || info.uri;
        setSourceUri(finalUri);
      } catch (e: any) {
        if (!cancelled) setError(String(e?.message ?? e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const player = useVideoPlayer(sourceUri ?? null, (p) => {
    p.loop = false;
    p.play();
  });

  const handleClose = () => {
    try {
      player?.pause();
    } catch {}
    router.back();
  };

  const handleDelete = () => {
    Alert.alert('Hapus Recording', `Hapus "${title ?? 'recording ini'}"?`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          try {
            await MediaLibrary.deleteAssetsAsync([id]);
            router.back();
          } catch (e: any) {
            Alert.alert('Error', String(e?.message ?? e));
          }
        },
      },
    ]);
  };

  if (error) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#000000',
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing.xl,
          gap: spacing.md,
        }}
      >
        <Text style={[typography.body, { color: colors.danger, textAlign: 'center' }]}>
          {error}
        </Text>
        <Pressable
          onPress={handleClose}
          style={{
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.md,
            backgroundColor: colors.bgSubtle,
            borderRadius: radius.md,
          }}
        >
          <Text style={[typography.bodyEmph, { color: colors.text }]}>Close</Text>
        </Pressable>
      </View>
    );
  }

  if (!sourceUri) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#000000',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator color="#FFFFFF" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      <StatusBar hidden />

      <VideoView
        player={player}
        style={{ flex: 1 }}
        contentFit="contain"
        nativeControls
      />

      {/* Top bar — close + delete */}
      <View
        style={{
          position: 'absolute',
          top: 48,
          left: spacing.lg,
          right: spacing.lg,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Pressable
          onPress={handleClose}
          hitSlop={10}
          style={({ pressed }) => [
            {
              width: 40,
              height: 40,
              borderRadius: radius.pill,
              backgroundColor: 'rgba(0,0,0,0.55)',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <X size={20} color="#FFFFFF" strokeWidth={1.75} />
        </Pressable>

        {title && (
          <View
            style={{
              flex: 1,
              marginHorizontal: spacing.md,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.xs,
              backgroundColor: 'rgba(0,0,0,0.55)',
              borderRadius: radius.pill,
            }}
          >
            <Text
              style={[typography.caption, { color: '#FFFFFF', textAlign: 'center' }]}
              numberOfLines={1}
            >
              {String(title).replace(/\.[^.]+$/, '')}
            </Text>
          </View>
        )}

        <Pressable
          onPress={handleDelete}
          hitSlop={10}
          style={({ pressed }) => [
            {
              width: 40,
              height: 40,
              borderRadius: radius.pill,
              backgroundColor: 'rgba(0,0,0,0.55)',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Trash2 size={18} color={colors.danger} strokeWidth={1.75} />
        </Pressable>
      </View>
    </View>
  );
}
