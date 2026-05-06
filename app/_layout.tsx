import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';

function ThemedStack() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="editor/[id]" />
      <Stack.Screen
        name="calibrate"
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen name="prompter/[id]" />
      <Stack.Screen name="preflight/[id]" />
      <Stack.Screen name="camera/[id]" />
      <Stack.Screen name="gallery" options={{ presentation: 'modal' }} />
      <Stack.Screen name="player" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <GestureHandlerRootView style={styles.root}>
          <ThemedStack />
        </GestureHandlerRootView>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
