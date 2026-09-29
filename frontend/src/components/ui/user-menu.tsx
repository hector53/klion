"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { Settings, LogOut, User, Moon, Sun, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/use-theme";
import { NotificationsBell } from "@/components/ui/notifications-bell";
import { notificationsApi } from "@/lib/api";

interface UserMenuProps {
  isCollapsed?: boolean;
  onNavigate?: () => void;
}

// CBK-85: antes el sidebar mostraba, siempre expandido, un bloque de
// avatar+nombre+email y por separado una fila de Notificaciones, Tema y
// Configuración en el footer. Se consolidan las 4 acciones (Notificaciones,
// Tema, Configuración, Cerrar sesión) en un único menú desplegable
// disparado por el avatar+nombre, dejando el sidebar con solo esa fila
// compacta en vez de 4 filas fijas.
export function UserMenu({ isCollapsed = false, onNavigate }: UserMenuProps) {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Mismo query key que NotificationsBell — React Query lo comparte,
  // así que esto no dispara un fetch adicional, solo lee el caché.
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["notifications-unread-count"],
    queryFn: () => notificationsApi.getUnreadCount(),
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  if (!session?.user) return null;

  const cycleTheme = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  const ThemeIcon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;
  const themeLabel =
    theme === "dark" ? "Oscuro" : theme === "light" ? "Claro" : "Sistema";

  const handleLogout = () => {
    setIsOpen(false);
    signOut({ callbackUrl: "/login" });
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        title={isCollapsed ? session.user.name || "Usuario" : undefined}
        className={cn(
          "w-full flex items-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors",
          isCollapsed ? "justify-center p-2" : "gap-3 px-3 py-2",
        )}
      >
        <div className="relative flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-4 h-4 text-primary" />
          </div>
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-white dark:border-gray-900" />
          )}
        </div>
        {!isCollapsed && (
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {session.user.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {session.user.email}
            </p>
          </div>
        )}
      </button>

      {isOpen && (
        <div
          className={cn(
            "absolute z-[100] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-2xl p-1 space-y-0.5",
            isCollapsed ? "left-full ml-2 bottom-0 w-56" : "left-0 right-0 bottom-full mb-2",
          )}
        >
          <NotificationsBell isCollapsed={false} />
          <button
            onClick={cycleTheme}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ThemeIcon className="w-5 h-5 flex-shrink-0" />
            {`Tema: ${themeLabel}`}
          </button>
          <Link
            href="/settings"
            onClick={() => {
              setIsOpen(false);
              onNavigate?.();
            }}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <Settings className="w-5 h-5 flex-shrink-0" />
            Configuración
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
