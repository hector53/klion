'use client';

import { useEffect } from 'react';
import { useTheme } from '@/hooks/use-theme';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    // Apply theme class to html element
    if (resolvedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [resolvedTheme]);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {children}
    </div>
  );
}
