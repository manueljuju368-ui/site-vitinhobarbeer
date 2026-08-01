'use client';

type EventData = Record<string, string | number | boolean>;
type AnalyticsWindow = Window & {
  gtag?: (...args: unknown[]) => void;
  va?: (...args: unknown[]) => void;
};

export function trackEvent(name: string, data: EventData = {}) {
  if (typeof window === 'undefined') return;
  const analytics = window as AnalyticsWindow;
  analytics.gtag?.('event', name, data);
  analytics.va?.('event', {name, data});
}
