import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import * as MediaLibrary from 'expo-media-library';
import * as VideoThumbnails from 'expo-video-thumbnails';
import {
  ChevronLeft,
  Settings as SettingsIcon,
  Video as VideoIcon,
  VideoOff,
  Play,
} from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen } from '@/ui/components/Screen';
import { Header } from '@/ui/components/Header';
import { IconButton } from '@/ui/components/IconButton';
import { Button } from '@/ui/components/Button';

const ALBUM_NAME = 'Vocal Teleprompter';

interface RecordingItem {
  id: string;
  uri: string;
  filename: string;
  duration: number; // seconds
  creationTime: number; // ms
}

function formatDuration(sec: number): string {
  const total = Math.floor(sec);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

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

function RecordingTile({
  rec,
  onPress,
  onLongPress,
}: {
  rec: RecordingItem;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const { colors, typography, spacing, radius } = useTheme();
  const [thumbUri, setThumbUri] = useState<string | null>(null);
  const [thumbFailed, setThumbFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Get full asset info to access localUri (file:// path) — content:// URIs
        // sometimes don't work directly with VideoThumbnails on Android
        let sourceUri = rec.uri;
        try {
          const info = await MediaLibrary.getAssetInfoAsync(rec.id);
          if (info.localUri) sourceUri = info.localUri;
        } catch {
          // fallback to rec.uri
        }

        const { uri } = await VideoThumbnails.getThumbnailAsync(sourceUri, {
          time: 1000,
          quality: 0.5,
        });
        if (!cancelled) setThumbUri(uri);
      } catch (e) {
        if (!cancelled) setThumbFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [rec.uri, rec.id]);

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        {
          flex: 1,
          gap: spacing.sm,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <View
        style={{
          aspectRatio: 9 / 16,
          backgroundColor: colors.bgSubtle,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {thumbUri ? (
          <Image
            source={{ uri: thumbUri }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : thumbFailed ? (
          <VideoOff size={28} color={colors.textTertiary} strokeWidth={1.5} />
        ) : (
          <ActivityIndicator color={colors.textTertiary} />
        )}

        {/* Play overlay (always visible) */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: thumbUri ? 'rgba(0,0,0,0.15)' : 'transparent',
          }}
          pointerEvents="none"
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: radius.pill,
              backgroundColor: 'rgba(0,0,0,0.6)',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.2)',
            }}
          >
            <Play
              size={18}
              color="#FFFFFF"
              strokeWidth={1.75}
              fill="#FFFFFF"
              style={{ marginLeft: 2 }}
            />
          </View>
        </View>

        {/* Duration badge */}
        <View
          style={{
            position: 'absolute',
            bottom: spacing.sm,
            right: spacing.sm,
            backgroundColor: 'rgba(0,0,0,0.75)',
            paddingHorizontal: spacing.sm,
            paddingVertical: 2,
            borderRadius: radius.sm,
          }}
        >
          <Text style={[typography.micro, { color: '#FFFFFF' }]}>
            {formatDuration(rec.duration)}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text
            style={[typography.bodyEmph, { color: colors.text, fontSize: 13 }]}
            numberOfLines={1}
          >
            {rec.filename.replace(/\.[^.]+$/, '')}
          </Text>
          <Text
            style={[typography.caption, { color: colors.textSecondary, fontSize: 11 }]}
          >
            {formatRelativeDate(rec.creationTime)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function GalleryScreen() {
  const { colors, typography, spacing, radius } = useTheme();

  const [permStatus, setPermStatus] = useState<'idle' | 'denied' | 'granted'>('idle');
  const [recordings, setRecordings] = useState<RecordingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadRecordings = useCallback(async () => {
    try {
      const perm = await MediaLibrary.getPermissionsAsync();
      let granted = perm.granted;
      if (!granted && perm.canAskAgain) {
        const result = await MediaLibrary.requestPermissionsAsync();
        granted = result.granted;
      }
      if (!granted) {
        setPermStatus('denied');
        setLoading(false);
        return;
      }
      setPermStatus('granted');

      const album = await MediaLibrary.getAlbumAsync(ALBUM_NAME);
      if (!album) {
        setRecordings([]);
        setLoading(false);
        return;
      }

      const result = await MediaLibrary.getAssetsAsync({
        album,
        mediaType: MediaLibrary.MediaType.video,
        sortBy: [[MediaLibrary.SortBy.creationTime, false]],
        first: 100,
      });

      setRecordings(
        result.assets.map((a) => ({
          id: a.id,
          uri: a.uri,
          filename: a.filename,
          duration: a.duration,
          creationTime: a.creationTime,
        }))
      );
    } catch (e: any) {
      console.error('Gallery load error:', e);
      Alert.alert('Error', String(e?.message ?? e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadRecordings();
  }, [loadRecordings]);

  const handleOpenVideo = (rec: RecordingItem) => {
    router.push({
      pathname: '/player' as any,
      params: { id: rec.id, title: rec.filename },
    });
  };

  const handleDeleteVideo = (rec: RecordingItem) => {
    Alert.alert('Hapus Recording', `Hapus "${rec.filename}"?`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          try {
            await MediaLibrary.deleteAssetsAsync([rec.id]);
            setRecordings((prev) => prev.filter((r) => r.id !== rec.id));
          } catch (e: any) {
            Alert.alert('Error', String(e?.message ?? e));
          }
        },
      },
    ]);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadRecordings();
  };

  // 2-col grid
  const pairs: RecordingItem[][] = [];
  for (let i = 0; i < recordings.length; i += 2) {
    pairs.push(recordings.slice(i, i + 2));
  }

  return (
    <Screen>
      <Header
        title="Recordings"
        left={
          <IconButton
            icon={<ChevronLeft size={22} color={colors.text} strokeWidth={1.75} />}
            onPress={() => router.back()}
          />
        }
        right={
          <IconButton
            icon={<SettingsIcon size={20} color={colors.text} strokeWidth={1.75} />}
            onPress={() => router.push('/settings' as any)}
          />
        }
      />

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : permStatus === 'denied' ? (
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: spacing.xl,
            gap: spacing.md,
          }}
        >
          <VideoOff size={36} color={colors.textTertiary} strokeWidth={1.5} />
          <Text style={[typography.h2, { color: colors.text, textAlign: 'center' }]}>
            Akses Gallery Belum Diizinkan
          </Text>
          <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
            Beri izin Photos/Media untuk melihat recordings.
          </Text>
          <Button
            label="Buka Settings"
            variant="secondary"
            onPress={() => Linking.openSettings()}
          />
        </View>
      ) : recordings.length === 0 ? (
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: spacing.xl,
            gap: spacing.md,
          }}
        >
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: radius.pill,
              backgroundColor: colors.bgSubtle,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <VideoIcon size={28} color={colors.textTertiary} strokeWidth={1.5} />
          </View>
          <Text style={[typography.h2, { color: colors.text, textAlign: 'center' }]}>
            Belum Ada Recording
          </Text>
          <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
            Mulai record di Camera Studio. Video akan disimpan di album "Vocal Teleprompter".
          </Text>
          <Button
            label="Ke Camera Studio"
            variant="primary"
            onPress={() => {
              router.back();
              setTimeout(() => router.push('/studio' as any), 100);
            }}
          />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{
            padding: spacing.lg,
            gap: spacing.lg,
            paddingBottom: spacing.xxxl,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accent}
            />
          }
        >
          <Text
            style={[
              typography.caption,
              { color: colors.textSecondary, paddingHorizontal: spacing.xs },
            ]}
          >
            {recordings.length} recording{recordings.length === 1 ? '' : 's'} · long-press untuk hapus
          </Text>
          {pairs.map((pair, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: spacing.md }}>
              {pair.map((rec) => (
                <RecordingTile
                  key={rec.id}
                  rec={rec}
                  onPress={() => handleOpenVideo(rec)}
                  onLongPress={() => handleDeleteVideo(rec)}
                />
              ))}
              {pair.length === 1 && <View style={{ flex: 1 }} />}
            </View>
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}
