"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, CheckCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { notificationsApi } from "@/lib/api";
import type { AppNotification } from "@/types";

interface NotificationsBellProps {
  isCollapsed?: boolean;
}

export function NotificationsBell({
  isCollapsed = false,
}: NotificationsBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const router = useRouter();

  // Fetch unread count - poll every 30s
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["notifications-unread-count"],
    queryFn: () => notificationsApi.getUnreadCount(),
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  // Fetch notifications when panel is open
  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", isOpen],
    queryFn: () => notificationsApi.getAll({ includeRead: true, limit: 20 }),
    enabled: isOpen,
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({
        queryKey: ["notifications-unread-count"],
      });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({
        queryKey: ["notifications-unread-count"],
      });
    },
  });

  // Close panel on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleNotificationClick = (notification: AppNotification) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }
    if (notification.taskId) {
      setIsOpen(false);
      router.push(`/board?task=${notification.taskId}`);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return "ahora";
    if (diffMin < 60) return `${diffMin}m`;
    if (diffHour < 24) return `${diffHour}h`;
    if (diffDay < 7) return `${diffDay}d`;
    return date.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="Notificaciones"
        className={cn(
          "relative flex items-center rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors",
          isCollapsed ? "justify-center p-3" : "gap-3 px-3 py-2",
        )}
      >
        <Bell className="w-5 h-5 flex-shrink-0" />
        {!isCollapsed && "Notificaciones"}
        {unreadCount > 0 && (
          <span
            className={cn(
              "absolute flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold",
              isCollapsed ? "top-1 right-1" : "top-1 left-4",
            )}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications panel */}
      {isOpen && (
        <div
          className={cn(
            "absolute z-[100] bg-[#1F2937] border border-white/10 rounded-xl shadow-2xl overflow-hidden",
            isCollapsed ? "left-full ml-2 top-0" : "left-0 bottom-full mb-2",
            "w-80",
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <h3 className="text-sm font-semibold text-white">Notificaciones</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsReadMutation.mutate()}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                  title="Marcar todas como leidas"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Leer todas
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notifications list */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No hay notificaciones</p>
              </div>
            ) : (
              notifications.map((notification: AppNotification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer",
                    !notification.isRead && "bg-blue-500/5",
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "mt-1 w-2 h-2 rounded-full flex-shrink-0",
                        notification.isRead
                          ? "bg-gray-600"
                          : "bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.5)]",
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          "text-sm font-medium truncate",
                          notification.isRead ? "text-gray-400" : "text-white",
                        )}
                      >
                        {notification.title}
                      </p>
                      {notification.message && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                          {notification.message}
                        </p>
                      )}
                      <p className="text-[10px] text-gray-600 mt-1">
                        {formatTime(notification.createdAt)}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsReadMutation.mutate(notification.id);
                        }}
                        className="text-gray-500 hover:text-blue-400 transition-colors p-1"
                        title="Marcar como leida"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
