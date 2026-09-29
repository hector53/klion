"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { useState, type ReactNode } from "react";
import { ToastProvider } from "@/components/ui/toast";
import { useThemeProvider, ThemeContext } from "@/hooks/use-theme";
import { SidebarProvider } from "@/hooks/use-sidebar";
import { ChatProvider } from "@/hooks/use-chat";

function ThemeProvider({ children }: { children: ReactNode }) {
  const {
    theme,
    resolvedTheme,
    setTheme,
    ThemeContext: Context,
  } = useThemeProvider();

  return (
    <Context.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </Context.Provider>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60, // 1 minuto
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <SidebarProvider>
            <ChatProvider>
              <ToastProvider>{children}</ToastProvider>
            </ChatProvider>
          </SidebarProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
