export type VoiceCommand =
  | 'pause'
  | 'resume'
  | 'restart'
  | 'louder'
  | 'slower'
  | 'faster'
  | 'close';

const COMMAND_MAP: Record<string, VoiceCommand> = {
  'prompter pause': 'pause',
  'prompter resume': 'resume',
  'prompter restart': 'restart',
  'prompter louder': 'louder',
  'prompter slower': 'slower',
  'prompter faster': 'faster',
  'prompter close': 'close',
  // Indonesian aliases
  'teleprompter pause': 'pause',
  'teleprompter resume': 'resume',
  'teleprompter restart': 'restart',
  'prompter berhenti': 'pause',
  'prompter lanjut': 'resume',
  'prompter ulang': 'restart',
  'prompter lambat': 'slower',
  'prompter cepat': 'faster',
  'prompter tutup': 'close',
};

export function detectVoiceCommand(transcript: string): VoiceCommand | null {
  const lower = transcript.toLowerCase().trim();

  for (const [keyword, command] of Object.entries(COMMAND_MAP)) {
    if (lower.includes(keyword)) {
      return command;
    }
  }

  return null;
}
