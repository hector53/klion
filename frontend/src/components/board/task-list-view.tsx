"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUp,
  ArrowDown,
  Minus,
  ChevronLeft,
  ChevronRight,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { cn, taskTypeIcons, taskTypeLabels, taskTypeColors } from "@/lib/utils";
import { tasksApi, clientsApi, projectsApi } from "@/lib/api";
import {
  TaskStatus,
  TaskPriority,
  SpaceType,
  type Task,
  type Client,
  type Project,
} from "@/types";
import { useSpace } from "@/contexts/space-context";
import { useToast } from "@/components/ui/toast";
import { ConfirmModal } from "@/components/modals/confirm-modal";

interface TaskListViewProps {
  filters?: {
    clientId?: string;
    projectId?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    type?: string;
    tags?: string[];
    isArchived?: boolean;
  };
  onTaskClick?: (task: Task) => void;
  onFilterByClient?: (clientId: string) => void;
  onFilterByProject?: (projectId: string) => void;
}

export function TaskListView({
  filters,
  onTaskClick,
  onFilterByClient,
  onFilterByProject,
}: TaskListViewProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const { currentSpace, isLoading: isSpaceLoading } = useSpace();
  const isPersonalSpace = currentSpace?.type === SpaceType.PERSONAL;
  const toast = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    setCurrentPage(1);
  }, [filters, currentSpace?.id, currentSpace?.type]);

  // La selección solo tiene sentido para la página/filtro actualmente visible
  useEffect(() => {
    setSelectedIds(new Set());
  }, [filters, currentSpace?.id, currentSpace?.type, searchQuery, currentPage]);

  // Fetch tasks with server-side pagination and filters
  const { data, isLoading } = useQuery({
    queryKey: [
      "tasks-list",
      currentSpace?.id,
      currentSpace?.type,
      filters,
      searchQuery,
      currentPage,
      pageSize,
    ],
    queryFn: () =>
      tasksApi.getAll({
        spaceId: currentSpace?.id,
        spaceType: currentSpace?.type,
        ...filters,
        search: searchQuery,
        page: currentPage,
        limit: pageSize,
        isArchived: filters?.isArchived,
      }),
    enabled: !isSpaceLoading,
  });

  const {
    tasks: paginatedTasks = [],
    total: totalTasks = 0,
    totalPages = 0,
  } = data || {};

  // Fetch board data para otros usos si es necesario (aunque ya no para la lista principal)
  const { data: boardData } = useQuery({
    queryKey: ["board"],
    queryFn: () => tasksApi.getBoard(),
  });

  // Fetch clients para avatares
  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => clientsApi.getAll(),
  });

  // Fetch projects para badges
  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => projectsApi.getAll(),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => tasksApi.bulkDelete(ids),
    onSuccess: ({ deleted }) => {
      queryClient.invalidateQueries({ queryKey: ["tasks-list"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["board"] });
      queryClient.invalidateQueries({ queryKey: ["project-active-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["project-context"] });
      queryClient.invalidateQueries({ queryKey: ["project-stats"] });
      toast.success(
        deleted === 1
          ? "1 tarea eliminada exitosamente"
          : `${deleted} tareas eliminadas exitosamente`,
      );
      setSelectedIds(new Set());
      setShowBulkDeleteConfirm(false);
    },
    onError: () => {
      toast.error("No se pudieron eliminar las tareas seleccionadas");
    },
  });

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalTasks);

  // Selección múltiple (CBK-73/74/75) — "seleccionar todo" cubre solo la página visible
  const pageTaskIds = paginatedTasks.map((t) => t.id);
  const allOnPageSelected =
    pageTaskIds.length > 0 && pageTaskIds.every((id) => selectedIds.has(id));
  const someOnPageSelected = pageTaskIds.some((id) => selectedIds.has(id));

  const toggleSelectAllOnPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        pageTaskIds.forEach((id) => next.delete(id));
      } else {
        pageTaskIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const toggleSelectTask = (taskId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Función para obtener el color del estado
  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.DOING:
        return "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]";
      case TaskStatus.DONE:
        return "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]";
      case TaskStatus.BLOCKED:
        return "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]";
      case TaskStatus.TODO:
      default:
        return "bg-slate-400 dark:bg-slate-600";
    }
  };

  // Función para obtener el texto del estado
  const getStatusText = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.DOING:
        return "En Progreso";
      case TaskStatus.DONE:
        return "Completado";
      case TaskStatus.BLOCKED:
        return "Bloqueado";
      case TaskStatus.TODO:
      default:
        return "Por hacer";
    }
  };

  // Función para obtener el color de texto del estado
  const getStatusTextColor = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.DOING:
        return "text-blue-400";
      case TaskStatus.DONE:
        return "text-green-400";
      case TaskStatus.BLOCKED:
        return "text-red-400";
      case TaskStatus.TODO:
      default:
        return "text-slate-400";
    }
  };

  // Función para obtener el icono de prioridad
  const getPriorityIcon = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.HIGH:
        return <ArrowUp className="text-sm mr-1" />;
      case TaskPriority.LOW:
        return <ArrowDown className="text-sm mr-1" />;
      case TaskPriority.MEDIUM:
        return <Minus className="text-sm mr-1" />;
      default:
        return <Minus className="text-sm mr-1" />;
    }
  };

  // Función para obtener el color de texto de prioridad
  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.HIGH:
        return "text-red-500 dark:text-red-400";
      case TaskPriority.MEDIUM:
        return "text-yellow-600 dark:text-yellow-500";
      case TaskPriority.LOW:
        return "text-green-600 dark:text-green-400";
      default:
        return "text-slate-600 dark:text-slate-400";
    }
  };

  // Función para obtener el texto de prioridad
  const getPriorityText = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.HIGH:
        return "Alta";
      case TaskPriority.MEDIUM:
        return "Media";
      case TaskPriority.LOW:
        return "Baja";
      default:
        return "Sin prioridad";
    }
  };

  // Función para formatear la fecha con etiqueta de tipo
  const formatDate = (dueDate?: string, createdAt?: string) => {
    const dateString = dueDate || createdAt;
    if (!dateString) return "";

    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let relativeDate = "";
    if (date.toDateString() === today.toDateString()) relativeDate = "Hoy";
    else if (date.toDateString() === yesterday.toDateString())
      relativeDate = "Ayer";
    else if (date.toDateString() === tomorrow.toDateString())
      relativeDate = "Mañana";
    else
      relativeDate = date.toLocaleDateString("es-ES", {
        day: "numeric",
        month: "short",
      });

    return (
      <div className="flex flex-col items-start">
        <span
          className={cn(
            "text-xs",
            dueDate ? "text-blue-400" : "text-slate-500",
          )}
        >
          {relativeDate}
        </span>
        <span className="text-[9px] uppercase tracking-tighter opacity-50">
          {dueDate ? "Vence" : "Creada"}
        </span>
      </div>
    );
  };

  // Función para obtener las iniciales del cliente
  const getClientInitials = (clientName: string) => {
    return clientName
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  // Función para obtener el color del avatar del cliente
  const getClientAvatarColor = (clientName: string) => {
    const colors = [
      "bg-orange-200 text-orange-700",
      "bg-blue-200 text-blue-700",
      "bg-purple-200 text-purple-700",
      "bg-green-200 text-green-700",
      "bg-red-200 text-red-700",
      "bg-yellow-200 text-yellow-700",
      "bg-pink-200 text-pink-700",
      "bg-indigo-200 text-indigo-700",
    ];

    const hash = clientName
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  // Función para manejar clic en fila
  const handleRowClick = (task: Task, event: React.MouseEvent) => {
    // Verificar si el clic fue en un elemento que no debe abrir el modal
    const target = event.target as HTMLElement;
    const isClickableElement =
      target.closest("button") ||
      target.closest("a") ||
      target.closest("[data-filter]");

    if (!isClickableElement && onTaskClick) {
      onTaskClick(task);
    }
  };

  // Función para manejar clic en cliente (filtro rápido)
  const handleClientClick = (clientId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (onFilterByClient) {
      onFilterByClient(clientId);
    }
  };

  // Función para manejar clic en proyecto (filtro rápido)
  const handleProjectClick = (projectId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (onFilterByProject) {
      onFilterByProject(projectId);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#111827] text-slate-200 overflow-hidden">
      {/* Search Bar */}
      <div className="px-6 py-4 border-b border-white/5 bg-[#111827]">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por tarea o ID..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-[#1F2937] border border-white/10 rounded-lg py-2 pl-10 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-600"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                setCurrentPage(1);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Barra de acciones masivas - CBK-74 */}
      {selectedIds.size > 0 && (
        <div className="px-6 py-3 border-b border-white/5 bg-blue-500/10 flex items-center justify-between gap-4">
          <span className="text-sm text-slate-300">
            {selectedIds.size === 1
              ? "1 tarea seleccionada"
              : `${selectedIds.size} tareas seleccionadas`}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-sm text-slate-400 hover:text-slate-200 transition-colors px-3 py-1.5"
            >
              Limpiar selección
            </button>
            <button
              onClick={() => setShowBulkDeleteConfirm(true)}
              className="flex items-center gap-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors px-3 py-1.5 rounded-md"
            >
              <Trash2 className="w-4 h-4" />
              Eliminar
            </button>
          </div>
        </div>
      )}

      {/* Contenedor de tabla con scroll independiente */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#1F2937] sticky top-0 z-10 shadow-sm border-b border-white/10">
              <tr>
                <th className="px-3 lg:px-6 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someOnPageSelected && !allOnPageSelected;
                    }}
                    onChange={toggleSelectAllOnPage}
                    disabled={pageTaskIds.length === 0}
                    aria-label="Seleccionar todas las tareas de esta página"
                    className="w-4 h-4 rounded border-white/20 bg-transparent text-blue-500 focus:ring-blue-500/50 cursor-pointer"
                  />
                </th>
                <th className="px-3 lg:px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-10 lg:w-12">
                  St
                </th>
                <th className="px-3 lg:px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Tarea
                </th>
                {!isPersonalSpace && (
                  <th className="px-3 lg:px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-48 hidden lg:table-cell">
                    Cliente
                  </th>
                )}
                <th className="px-3 lg:px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-48 hidden lg:table-cell">
                  {isPersonalSpace ? "Área" : "Proyecto"}
                </th>
                <th className="px-3 lg:px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-28 hidden lg:table-cell">
                  Tipo
                </th>
                <th className="px-3 lg:px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-24 lg:w-28">
                  Status
                </th>
                <th className="px-3 lg:px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-24 lg:w-28">
                  Prioridad
                </th>
                <th className="px-3 lg:px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-32 hidden lg:table-cell">
                  Fecha
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {paginatedTasks.length === 0 ? (
                <tr>
                  <td
                    colSpan={isPersonalSpace ? 8 : 9}
                    className="px-6 py-12 text-center text-slate-500"
                  >
                    No hay tareas para mostrar
                  </td>
                </tr>
              ) : (
                paginatedTasks.map((task) => {
                  const client = clients.find(
                    (c: Client) => c.id === task.clientId,
                  );
                  const project = task.projectId
                    ? projects.find((p: Project) => p.id === task.projectId)
                    : null;

                  return (
                    <tr
                      key={task.id}
                      onClick={(e) => handleRowClick(task, e)}
                      className="group hover:bg-white/[0.03] transition-colors cursor-pointer"
                    >
                      {/* Checkbox de selección */}
                      <td
                        className="px-3 lg:px-6 py-4 whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.has(task.id)}
                          onChange={() => toggleSelectTask(task.id)}
                          aria-label={`Seleccionar tarea ${task.title}`}
                          className="w-4 h-4 rounded border-white/20 bg-transparent text-blue-500 focus:ring-blue-500/50 cursor-pointer"
                        />
                      </td>

                      {/* Estado */}
                      <td className="px-3 lg:px-6 py-4 whitespace-nowrap">
                        <div
                          className={cn(
                            "w-3 h-3 rounded-full",
                            getStatusColor(task.status),
                          )}
                          title={
                            task.status === TaskStatus.DOING
                              ? "En Progreso"
                              : task.status === TaskStatus.DONE
                                ? "Completado"
                                : task.status === TaskStatus.BLOCKED
                                  ? "Bloqueado"
                                  : "Por hacer"
                          }
                        />
                      </td>

                      {/* Tarea */}
                      <td className="px-3 lg:px-6 py-4">
                        <div className="flex flex-col">
                          <span
                            className={cn(
                              "text-sm font-medium text-slate-200 group-hover:text-blue-400 transition-colors",
                              task.status === TaskStatus.DONE &&
                                "line-through decoration-slate-500 decoration-2 opacity-70",
                            )}
                          >
                            {task.type && task.type !== "task" && (
                              <span
                                className="mr-1.5"
                                title={
                                  task.type === "note" ? "Nota" : "Recordatorio"
                                }
                              >
                                {taskTypeIcons[task.type]}
                              </span>
                            )}
                            {task.title}
                          </span>
                          <span className="text-xs text-slate-500 mt-0.5">
                            <span className="font-mono text-blue-400/60">
                              {task.taskCode || task.id.substring(0, 8).toUpperCase()}
                            </span>
                            {" "}• {task.tags?.[0] || "general"}
                          </span>
                        </div>
                      </td>

                      {/* Cliente - Solo en espacio de trabajo */}
                      {!isPersonalSpace && (
                        <td className="px-3 lg:px-6 py-4 whitespace-nowrap hidden lg:table-cell">
                          {client ? (
                            <div
                              className="flex items-center"
                              onClick={(e) => handleClientClick(client.id, e)}
                              data-filter="client"
                            >
                              <div
                                className={cn(
                                  "h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold mr-2",
                                  getClientAvatarColor(client.name),
                                )}
                              >
                                {getClientInitials(client.name)}
                              </div>
                              <span className="text-sm text-slate-300 hover:text-blue-400 transition-colors">
                                {client.name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-slate-500">
                              Cliente no encontrado
                            </span>
                          )}
                        </td>
                      )}

                      {/* Proyecto/Área */}
                      <td className="px-3 lg:px-6 py-4 whitespace-nowrap hidden lg:table-cell">
                        {project ? (
                          <span
                            className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-slate-800 text-slate-400 border border-slate-700 hover:border-blue-500 hover:text-blue-400 transition-colors cursor-pointer"
                            onClick={(e) => handleProjectClick(project.id, e)}
                            data-filter="project"
                          >
                            {project.name}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500">
                            {isPersonalSpace ? "Sin área" : "Sin proyecto"}
                          </span>
                        )}
                      </td>

                      {/* Tipo */}
                      <td className="px-3 lg:px-6 py-4 whitespace-nowrap hidden lg:table-cell">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border",
                            taskTypeColors[task.type || "task"],
                          )}
                        >
                          <span>{taskTypeIcons[task.type || "task"]}</span>
                          {taskTypeLabels[task.type || "task"]}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-3 lg:px-6 py-4 whitespace-nowrap">
                        <span
                          className={cn(
                            "text-xs font-medium",
                            getStatusTextColor(task.status),
                          )}
                        >
                          {getStatusText(task.status)}
                        </span>
                      </td>

                      {/* Prioridad */}
                      <td className="px-3 lg:px-6 py-4 whitespace-nowrap">
                        <div
                          className={cn(
                            "flex items-center",
                            getPriorityColor(task.priority),
                          )}
                        >
                          {getPriorityIcon(task.priority)}
                          <span className="text-xs font-medium">
                            {getPriorityText(task.priority)}
                          </span>
                        </div>
                      </td>

                      {/* Fecha - oculta en móvil */}
                      <td className="px-3 lg:px-6 py-4 whitespace-nowrap hidden lg:table-cell">
                        {formatDate(task.dueDate, task.createdAt)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer de paginación - siempre visible */}
      {totalTasks > 0 && (
        <div className="border-t border-white/10 bg-[#1F2937] px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 sticky bottom-0 z-10">
          <div className="flex items-center gap-4">
            <div className="text-sm text-slate-500">
              Mostrando {startIndex + 1}-{endIndex} de {totalTasks} tareas
            </div>
            <div className="flex items-center gap-2 border-l border-white/10 pl-4">
              <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                Mostrar:
              </span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-transparent text-sm text-slate-300 focus:outline-none cursor-pointer hover:text-white transition-colors"
              >
                {[10, 20, 50, 100].map((size) => (
                  <option key={size} value={size} className="bg-[#1F2937]">
                    {size}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
              className="p-2 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-md border border-white/10 hover:border-white/20"
              aria-label="Página anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-slate-300 px-3">
              Página {currentPage} de {totalPages}
            </span>
            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className="p-2 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-md border border-white/10 hover:border-white/20"
              aria-label="Página siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showBulkDeleteConfirm}
        onClose={() => setShowBulkDeleteConfirm(false)}
        onConfirm={() => bulkDeleteMutation.mutate(Array.from(selectedIds))}
        title="Eliminar tareas seleccionadas"
        message={`¿Seguro que quieres eliminar ${
          selectedIds.size === 1 ? "1 tarea" : `${selectedIds.size} tareas`
        }? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        variant="danger"
        isLoading={bulkDeleteMutation.isPending}
      />
    </div>
  );
}
