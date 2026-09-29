"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  History,
  Archive,
  Sparkles,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Menu,
  X,
  BookOpen,
  FolderKanban,
  Folder,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TodayPlanModal } from "@/components/modals/today-plan-modal";
import { WriteMessageModal } from "@/components/modals/write-message-modal";
import { SpaceSelector } from "@/components/ui/space-selector";
import { UserMenu } from "@/components/ui/user-menu";
import { useSidebar } from "@/hooks/use-sidebar";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useChat } from "@/hooks/use-chat";
import { useSpace } from "@/contexts/space-context";
import {
  useRecentProjects,
  type RecentProject,
} from "@/hooks/use-recent-projects";
import { Bot } from "lucide-react";
import { SpaceType } from "@/types";

interface NavItem {
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
  workOnly?: boolean; // Solo mostrar en espacios de trabajo
  personalOnly?: boolean; // Solo mostrar en espacios personales
}

const navigation: NavItem[] = [
  { name: "Board", href: "/board", icon: LayoutDashboard },
  { name: "Clientes", href: "/clients", icon: Users, workOnly: true },
  { name: "Proyectos", href: "/projects", icon: Folder, workOnly: true },
  { name: "Áreas", href: "/areas", icon: FolderKanban, personalOnly: true },
  { name: "Recordatorios", href: "/reminders", icon: Bell, personalOnly: true },
  { name: "Knowledge", href: "/knowledge", icon: BookOpen },
  { name: "Snapshots", href: "/snapshots", icon: History },
  { name: "Archivo", href: "/archive", icon: Archive },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const { isCollapsed, toggleCollapsed, isMobileOpen, setIsMobileOpen } =
    useSidebar();
  const { toggleChat } = useChat();
  const { currentSpace } = useSpace();
  const { getStoredProjects } = useRecentProjects();
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  // CBK-84: "Proyectos recientes" y "Herramientas IA" son secciones
  // secundarias que antes siempre ocupaban espacio fijo debajo de la
  // navegación principal, saturando el sidebar. Se colapsan por defecto
  // (persistido) para priorizar el acceso al menú principal; en modo
  // ícono (isCollapsed) no aplica, ya se veían compactas de por sí.
  const [isRecentExpanded, setIsRecentExpanded] = useLocalStorage<boolean>(
    "klion-sidebar-recent-expanded",
    false,
  );
  const [isAiToolsExpanded, setIsAiToolsExpanded] = useLocalStorage<boolean>(
    "klion-sidebar-ai-tools-expanded",
    false,
  );

  // Filtrar navegación según el tipo de espacio
  const isWorkSpace = currentSpace?.type === SpaceType.WORK;
  const isPersonalSpace = currentSpace?.type === SpaceType.PERSONAL;
  const filteredNavigation = navigation.filter((item) => {
    if (item.workOnly && !isWorkSpace) return false;
    if (item.personalOnly && !isPersonalSpace) return false;
    return true;
  });

  // Cargar proyectos recientes y escuchar actualizaciones
  useEffect(() => {
    setRecentProjects(getStoredProjects());

    const handleUpdate = () => {
      setRecentProjects(getStoredProjects());
    };

    window.addEventListener("recentProjectsUpdated", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener("recentProjectsUpdated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [getStoredProjects]);

  // Cerrar menú móvil al navegar
  const handleNavClick = () => {
    if (isMobileOpen) {
      setIsMobileOpen(false);
    }
  };

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2 bg-white dark:bg-gray-900 rounded-lg shadow-md border border-gray-200 dark:border-gray-700"
        aria-label="Abrir menú"
      >
        <Menu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
      </button>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50 transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col transition-all duration-300 z-50",
          // CBK-79: el <aside> no tenía altura/overflow propios, así que dependía
          // por completo del stretch del flex padre; en pantallas cortas o con
          // muchas secciones visibles (proyectos recientes, atajos IA) el footer
          // y el bloque de usuario se desbordaban del box de 100vh y quedaban
          // sin fondo. h-screen + overflow-hidden fijan el alto del contenedor;
          // el scroll real ocurre dentro de <nav> (ver min-h-0 abajo).
          "h-dvh overflow-hidden",
          // Desktop styles
          "hidden lg:flex",
          isCollapsed ? "lg:w-16" : "lg:w-64",
          // Mobile styles - fixed overlay
          isMobileOpen && "fixed inset-y-0 left-0 flex w-64",
        )}
      >
        {/* Logo */}
        <div
          className={cn(
            "h-16 flex items-center border-b border-gray-200 dark:border-gray-800",
            isCollapsed ? "px-3 justify-center" : "px-6",
          )}
        >
          <Link
            href="/board"
            className="flex items-center gap-2"
            onClick={handleNavClick}
          >
            <Image
              src="/logo.png"
              alt="Klion"
              width={32}
              height={32}
              className="rounded-lg flex-shrink-0"
            />
            {!isCollapsed && (
              <span className="font-semibold text-lg dark:text-white">
                Klion
              </span>
            )}
          </Link>

          {/* Mobile close button */}
          {isMobileOpen && (
            <button
              onClick={() => setIsMobileOpen(false)}
              className="lg:hidden ml-auto p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="Cerrar menú"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Space Selector */}
        <div
          className={cn(
            "py-3 border-b border-gray-200 dark:border-gray-800",
            isCollapsed ? "px-2" : "px-4",
          )}
        >
          <SpaceSelector isCollapsed={isCollapsed} />
        </div>

        {/* Navigation */}
        <nav
          className={cn(
            // min-h-0 permite que este flex-1 se encoja por debajo de la altura
            // de su contenido (comportamiento por defecto de flex es min-height:
            // auto); sin esto, las secciones fijas de abajo (proyectos recientes,
            // atajos IA, footer, usuario) empujaban el box del <aside> más allá
            // de los 100vh en vez de dejar que <nav> hiciera scroll interno.
            "flex-1 min-h-0 overflow-y-auto py-6 space-y-1",
            isCollapsed ? "px-2" : "px-4",
          )}
        >
          {filteredNavigation.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={handleNavClick}
                title={isCollapsed ? item.name : undefined}
                className={cn(
                  "flex items-center rounded-lg text-sm font-medium transition-colors",
                  isCollapsed ? "justify-center p-3" : "gap-3 px-3 py-2",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white",
                )}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && item.name}
              </Link>
            );
          })}
        </nav>

        {/* Recent Projects */}
        {recentProjects.length > 0 && (
          <div
            className={cn(
              "py-3 border-t border-gray-200 dark:border-gray-800",
              isCollapsed ? "px-2" : "px-4",
            )}
          >
            {!isCollapsed && (
              <button
                onClick={() => setIsRecentExpanded((prev) => !prev)}
                className="w-full flex items-center justify-between text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-3 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                aria-expanded={isRecentExpanded}
              >
                <span>Proyectos recientes</span>
                <ChevronDown
                  className={cn(
                    "w-3.5 h-3.5 transition-transform",
                    !isRecentExpanded && "-rotate-90",
                  )}
                />
              </button>
            )}
            {(isCollapsed || isRecentExpanded) && (
              <div className="space-y-0.5">
                {recentProjects.slice(0, 5).map((project) => {
                  const isActive = pathname === `/projects/${project.id}`;
                  return (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      onClick={handleNavClick}
                      title={isCollapsed ? project.name : undefined}
                      className={cn(
                        "flex items-center rounded-lg text-sm transition-colors",
                        isCollapsed ? "justify-center p-3" : "gap-2 px-3 py-1.5",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white",
                      )}
                    >
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: project.color || "#6B7280" }}
                      />
                      {!isCollapsed && (
                        <span className="truncate text-xs">{project.name}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* AI Assistant shortcuts */}
        <div
          className={cn(
            "py-4 border-t border-gray-200 dark:border-gray-800 space-y-2",
            isCollapsed ? "px-2" : "px-4",
          )}
        >
          {!isCollapsed && (
            <button
              onClick={() => setIsAiToolsExpanded((prev) => !prev)}
              className="w-full flex items-center justify-between text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-3 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              aria-expanded={isAiToolsExpanded}
            >
              <span>Herramientas IA</span>
              <ChevronDown
                className={cn(
                  "w-3.5 h-3.5 transition-transform",
                  !isAiToolsExpanded && "-rotate-90",
                )}
              />
            </button>
          )}
          {(isCollapsed || isAiToolsExpanded) && (
            <>
              <button
                onClick={() => setIsPlanModalOpen(true)}
                title={isCollapsed ? "Plan del día con IA" : undefined}
                className={cn(
                  "w-full flex items-center rounded-lg text-sm font-medium bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 transition-all",
                  isCollapsed ? "justify-center p-3" : "gap-3 px-3 py-2",
                )}
              >
                <Sparkles className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && "Plan del día con IA"}
              </button>
              <button
                onClick={() => setIsMessageModalOpen(true)}
                title={isCollapsed ? "Redactar mensaje" : undefined}
                className={cn(
                  "w-full flex items-center rounded-lg text-sm font-medium bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600 transition-all",
                  isCollapsed ? "justify-center p-3" : "gap-3 px-3 py-2",
                )}
              >
                <MessageSquare className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && "Redactar mensaje"}
              </button>
              <button
                onClick={toggleChat}
                title={isCollapsed ? "Chat con IA" : undefined}
                className={cn(
                  "w-full flex items-center rounded-lg text-sm font-medium bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 transition-all",
                  isCollapsed ? "justify-center p-3" : "gap-3 px-3 py-2",
                )}
              >
                <Bot className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && "Chat con IA"}
              </button>
            </>
          )}
        </div>

        {/* Footer: solo el control de colapso del sidebar (no es una acción
            de usuario, es un control de layout — se mantiene fuera del
            menú desplegable de CBK-85). Es una función solo de desktop
            (el sidebar en móvil es un overlay fijo, no colapsable), así
            que todo el contenedor se oculta en mobile en vez de solo el
            botón, para no dejar una fila vacía con borde. */}
        <div
          className={cn(
            "hidden lg:block py-2 border-t border-gray-200 dark:border-gray-800",
            isCollapsed ? "px-2" : "px-4",
          )}
        >
          <button
            onClick={toggleCollapsed}
            className={cn(
              "flex w-full items-center rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800",
              isCollapsed ? "justify-center p-3" : "gap-3 px-3 py-2",
            )}
            title={isCollapsed ? "Expandir menú" : "Colapsar menú"}
          >
            {isCollapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <>
                <ChevronLeft className="w-5 h-5 flex-shrink-0" />
                Colapsar menú
              </>
            )}
          </button>
        </div>

        {/* User menu - CBK-85: avatar+nombre despliega Notificaciones, Tema,
            Configuración y Cerrar sesión en un único menú */}
        <div
          className={cn(
            "py-2 border-t border-gray-200 dark:border-gray-800",
            isCollapsed ? "px-2" : "px-4",
          )}
        >
          <UserMenu isCollapsed={isCollapsed} onNavigate={handleNavClick} />
        </div>
      </aside>

      {/* AI Modals */}
      <TodayPlanModal
        isOpen={isPlanModalOpen}
        onClose={() => setIsPlanModalOpen(false)}
      />
      <WriteMessageModal
        isOpen={isMessageModalOpen}
        onClose={() => setIsMessageModalOpen(false)}
      />
    </>
  );
}

// Mobile header component para usar en las páginas
export function MobileHeader({ title }: { title?: string }) {
  return (
    <div className="lg:hidden h-14 flex items-center px-4 pl-16 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      {title && (
        <h1 className="font-semibold text-lg text-gray-900 dark:text-white truncate">
          {title}
        </h1>
      )}
    </div>
  );
}
