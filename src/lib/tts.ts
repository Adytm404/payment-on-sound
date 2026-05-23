import type { AppConfig } from "./storage";

export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function getPreferredVoice(
  voices: SpeechSynthesisVoice[],
  voiceURI: string,
): SpeechSynthesisVoice | undefined {
  if (voiceURI) {
    const selected = voices.find((voice) => voice.voiceURI === voiceURI);
    if (selected) return selected;
  }

  return voices.find((voice) => voice.lang.toLowerCase().startsWith("id"));
}

export function formatSpokenRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

export function speakText(text: string, config: AppConfig): boolean {
  if (!config.ttsEnabled || !isSpeechSupported()) return false;

  const utterance = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();
  const voice = getPreferredVoice(voices, config.ttsVoiceURI);

  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  } else {
    utterance.lang = "id-ID";
  }

  utterance.rate = config.ttsRate;
  utterance.pitch = config.ttsPitch;
  utterance.volume = config.ttsVolume;

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
  return true;
}

export function speakPaymentReceived(amount: number, config: AppConfig): boolean {
  return speakText(
    `Pembayaran ${formatSpokenRupiah(amount)} rupiah, diterima`,
    config,
  );
}
