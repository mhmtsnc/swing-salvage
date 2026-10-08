import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';

export type ShareOutcome = 'shared' | 'copied' | 'failed';

/** Native'de @capacitor/share, web'de navigator.share; yoksa panoya kopyala ("Copied!"). */
export async function shareText(text: string): Promise<ShareOutcome> {
  if (Capacitor.isNativePlatform()) {
    try {
      await Share.share({ text });
      return 'shared';
    } catch {
      return 'failed';
    }
  }
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      await navigator.share({ text });
      return 'shared';
    }
  } catch {
    /* kullanıcı iptal etti ya da paylaşım yok: panoya düş */
  }
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'failed';
  }
}
