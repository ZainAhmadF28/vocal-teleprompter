import { franc } from 'franc-min';

const ISO_TO_BCP47: Record<string, string> = {
  ind: 'id-ID',
  eng: 'en-US',
  jpn: 'ja-JP',
  kor: 'ko-KR',
  cmn: 'zh-CN',
  arb: 'ar-SA',
  spa: 'es-ES',
  fra: 'fr-FR',
  deu: 'de-DE',
  por: 'pt-BR',
};

export function detectLanguageFromScript(text: string): {
  lang: string;
  confidence: number;
} {
  const langCode = franc(text, { minLength: 10 });
  const bcp47 = ISO_TO_BCP47[langCode] ?? 'id-ID';
  const confidence = Math.min(0.99, text.length / 200);

  return { lang: bcp47, confidence };
}

export function getLanguageLabel(bcp47: string): string {
  const labels: Record<string, string> = {
    'id-ID': 'Indonesian',
    'en-US': 'English',
    'ja-JP': 'Japanese',
    'ko-KR': 'Korean',
    'zh-CN': 'Mandarin',
    'ar-SA': 'Arabic',
    'es-ES': 'Spanish',
    'fr-FR': 'French',
    'de-DE': 'German',
    'pt-BR': 'Portuguese',
  };
  return labels[bcp47] ?? bcp47;
}
