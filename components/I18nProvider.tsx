'use client';

// Import i18n config to ensure it's initialized before any components use it
import '@/i18n/config';

export function I18nProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

