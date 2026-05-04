import { useKeepAwake as expoKeepAwake } from 'expo-keep-awake';

export function useKeepAwake(active: boolean) {
  // expo-keep-awake: keep screen on while session is active
  expoKeepAwake(active ? 'prompter-session' : undefined);
}
