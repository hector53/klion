"use client";

import { Sidebar } from "@/components/ui/sidebar";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { SpaceProvider } from "@/contexts/space-context";
import { useChat } from "@/hooks/use-chat";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isOpen, setIsOpen, projectId, projectName } = useChat();

  return (
    <SpaceProvider>
      {/* CBK-78: h-dvh (dynamic viewport height) en vez de h-screen (=100vh) —
          en móvil 100vh incluye la barra de direcciones del navegador, lo que
          podía hacer que este contenedor fuera más alto que el área visible
          real y contribuía a que el footer del sidebar quedara fuera de vista
          (ver fix de raíz en components/ui/sidebar.tsx, CBK-79). */}
      <div className="flex h-dvh">
        <Sidebar />
        <main className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-950">
          {children}
        </main>
        <ChatSidebar
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          projectId={projectId}
          projectName={projectName}
        />
      </div>
    </SpaceProvider>
  );
}
