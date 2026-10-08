import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { getItem } from './storage';

export type HapticKind = 'light' | 'medium' | 'heavy' | 'success';

const VIBRATE_MS: Record<HapticKind, number | number[]> = {
  light: 10,
  medium: 20,
  heavy: 40,
  success: [20, 40, 20],
};

let enabled = true;
const native = Capacitor.isNativePlatform();

export function refreshHapticSettings(): void {
  enabled = getItem('ss.settings').haptics;
}

/** Native'de @capacitor/haptics, web'de navigator.vibrate. Ayardan kapatılabilir. */
export function haptic(kind: HapticKind): void {
  if (!enabled) return;
  try {
    if (native) {
      if (kind === 'success') void Haptics.notification({ type: NotificationType.Success });
      else void Haptics.impact({ style: kind === 'light' ? ImpactStyle.Light : kind === 'medium' ? ImpactStyle.Medium : ImpactStyle.Heavy });
    } else if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(VIBRATE_MS[kind]);
    }
  } catch {
    /* titreşim asla oyunu bozmasın */
  }
}
