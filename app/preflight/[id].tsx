import { useEffect } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { View } from 'react-native';
import { Screen } from '@/ui/components/Screen';

/**
 * Pre-flight has been merged into the Editor screen.
 * This route now just forwards any incoming traffic to /editor/[id].
 */
export default function PreflightRedirect() {
  const { id } = useLocalSearchParams<{ id: string }>();

  useEffect(() => {
    if (id) {
      router.replace(`/editor/${id}` as any);
    } else {
      router.back();
    }
  }, [id]);

  return (
    <Screen>
      <View style={{ flex: 1 }} />
    </Screen>
  );
}
