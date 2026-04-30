import { getTelegramWebApp } from './telegram';

type ImpactStyle = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft';
type NotificationType = 'error' | 'success' | 'warning';

function haptic() {
  try {
    return getTelegramWebApp()?.HapticFeedback ?? null;
  } catch {
    return null;
  }
}

export function hapticImpact(style: ImpactStyle = 'light'): void {
  try {
    haptic()?.impactOccurred?.(style);
  } catch {
    // non-Telegram / старый WebView
  }
}

export function hapticNotification(type: NotificationType): void {
  try {
    haptic()?.notificationOccurred?.(type);
  } catch {
    // ignore
  }
}
