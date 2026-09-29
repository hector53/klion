"use client";

import { useState, useMemo, Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Camera,
  RefreshCw,
  Plus,
  LayoutGrid,
  List,
  FolderPlus,
  Settings2,
  Link2,
} from "lucide-react";
import { KanbanBoard } from "@/components/board/kanban-board";
import { TaskListView } from "@/components/board/task-list-view";
import {
  BoardFiltersBar,
  type BoardFilters,
} from "@/components/board/board-filters";
import { ProjectModal } from "@/components/modals/project-modal";
import { ColumnSettingsModal } from "@/components/modals/column-settings-modal";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { TaskModal } from "@/components/modals/task-modal";
import { useBoardPreferences } from "@/hooks/use-local-storage";
import { useBoardFilters } from "@/hooks/use-board-filters";
import { tasksApi, snapshotsApi, projectsApi } from "@/lib/api";
import { useSpace } from "@/contexts/space-context";
import {
  TaskStatus,
  TaskType,
  SpaceType,
  type Task,
  type BoardData,
  type Project,
} from "@/types";

type ViewMode = "kanban" | "list";

/**
 * Tope de la columna "done" que se le pide al backend. La columna crece sin techo
 * (905 de 1031 tareas en producción) y traerla entera hacía que GET /tasks/board no
 * terminara nunca. Coincide con el default del backend; se manda explícito para que
 * el aviso de la columna y lo que se pide no se desincronicen.
 */
const BOARD_DONE_LIMIT = 50;

// Componente interno que usa useSearchParams
function BoardPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { preferences, updatePreference, updatePreferences, isHydrated } =
    useBoardPreferences();

  // Usar hook de filtros con URL
  const { filters, setFilters, activeFilterCount } = useBoardFilters();

  // Obtener espacio actual
  const { currentSpace } = useSpace();
  const isPersonalSpace = currentSpace?.type === SpaceType.PERSONAL;

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isColumnSettingsModalOpen, setIsColumnSettingsModalOpen] =
    useState(false);
  const [taskModalDefaultStatus, setTaskModalDefaultStatus] = useState<
    TaskStatus | undefined
  >(undefined);
  const [taskModalDefaultClientId, setTaskModalDefaultClientId] = useState<
    string | undefined
  >(undefined);
  const [taskModalDefaultProjectId, setTaskModalDefaultProjectId] = useState<
    string | undefined
  >(undefined);
  // Eliminado: código relacionado con ClientBoard

  // Open task modal from URL param (?selectedTask=<code> or legacy ?task=<id>)
  const selectedTaskParam = searchParams.get("selectedTask");
  const legacyTaskParam = searchParams.get("task");
  useEffect(() => {
    const taskRef = selectedTaskParam || legacyTaskParam;
    if (!taskRef || isTaskModalOpen) return;

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    const fetchPromise = uuidRegex.test(taskRef)
      ? tasksApi.getOne(taskRef)
      : tasksApi.getByCode(taskRef);

    fetchPromise
      .then((task) => {
        setSelectedTask(task);
        setIsTaskModalOpen(true);
        // If using legacy ?task= param, migrate to ?selectedTask=
        if (legacyTaskParam && !selectedTaskParam) {
          const params = new URLSearchParams(searchParams.toString());
          params.delete("task");
          params.set("selectedTask", task.taskCode || task.id);
          router.replace(`/board?${params.toString()}`);
        }
      })
      .catch(() => {
        // Task not found: clean up invalid param
        const params = new URLSearchParams(searchParams.toString());
        params.delete("selectedTask");
        params.delete("task");
        const newUrl = params.toString()
          ? `/board?${params.toString()}`
          : "/board";
        router.replace(newUrl);
      });
  }, [selectedTaskParam, legacyTaskParam]);

  // View mode from URL or local storage
  const viewParam = searchParams.get("view");
  const [viewModeState, setViewModeState] = useState<ViewMode>(
    (viewParam as ViewMode) || preferences.viewMode || "kanban",
  );

  // Sync view mode with URL
  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode);
    updatePreference("viewMode", mode);

    const params = new URLSearchParams(searchParams.toString());
    params.set("view", mode);
    router.push(`/board?${params.toString()}`);
  };

  // Update view mode if URL changes externally
  useEffect(() => {
    if (viewParam && (viewParam === "kanban" || viewParam === "list")) {
      setViewModeState(viewParam);
    }
  }, [viewParam]);

  const viewMode = viewModeState;
  const hasProjectFilter = Boolean(filters.projectId);

  // Fetch board data
  const {
    data: boardData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["board"],
    queryFn: () => tasksApi.getBoard({ doneLimit: BOARD_DONE_LIMIT }),
  });

  // Fetch projects para obtener clientId cuando hay filtro de proyecto
  const { data: allProjects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => projectsApi.getAll(),
  });

  // Move task mutation
  const moveMutation = useMutation({
    mutationFn: ({
      taskId,
      status,
      position,
    }: {
      taskId: string;
      status: TaskStatus;
      position: number;
    }) => tasksApi.move(taskId, { status, position }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board"] });
    },
  });

  // Create snapshot mutation
  const snapshotMutation = useMutation({
    mutationFn: snapshotsApi.create,
    onSuccess: () => {
      toast.success("Snapshot creado exitosamente");
    },
  });

  const handleTaskMove = (
    taskId: string,
    newStatus: TaskStatus,
    newPosition: number,
  ) => {
    moveMutation.mutate({ taskId, status: newStatus, position: newPosition });
  };

  const handleAddTask = (statusOrClientId: TaskStatus | string) => {
    setSelectedTask(null);
    // Check if it's a status or a clientId
    if (Object.values(TaskStatus).includes(statusOrClientId as TaskStatus)) {
      setTaskModalDefaultStatus(statusOrClientId as TaskStatus);
      setTaskModalDefaultClientId(undefined);
    } else {
      // It's a clientId from client view
      setTaskModalDefaultStatus(TaskStatus.TODO);
      setTaskModalDefaultClientId(statusOrClientId as string);
    }
    setIsTaskModalOpen(true);
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setTaskModalDefaultStatus(undefined);
    setIsTaskModalOpen(true);

    // Push task code into URL
    const params = new URLSearchParams(searchParams.toString());
    const taskIdentifier = task.taskCode || task.id;
    params.set("selectedTask", taskIdentifier);
    router.push(`/board?${params.toString()}`, { scroll: false });
  };

  const handleOpenNewTaskModal = () => {
    setSelectedTask(null);
    setTaskModalDefaultStatus(undefined);
    // Si hay filtro de proyecto activo, pre-seleccionar cliente y proyecto
    if (filters.projectId) {
      setTaskModalDefaultProjectId(filters.projectId);
      const project = allProjects.find((p: Project) => p.id === filters.projectId);
      if (project?.clientId) {
        setTaskModalDefaultClientId(project.clientId);
      }
    } else if (filters.clientId) {
      setTaskModalDefaultClientId(filters.clientId);
      setTaskModalDefaultProjectId(undefined);
    } else {
      setTaskModalDefaultClientId(undefined);
      setTaskModalDefaultProjectId(undefined);
    }
    setIsTaskModalOpen(true);
  };

  const handleCloseTaskModal = () => {
    setIsTaskModalOpen(false);
    setSelectedTask(null);
    setTaskModalDefaultStatus(undefined);
    setTaskModalDefaultClientId(undefined);
    setTaskModalDefaultProjectId(undefined);

    // Remove selectedTask from URL
    const params = new URLSearchParams(searchParams.toString());
    params.delete("selectedTask");
    params.delete("task");
    const newUrl = params.toString()
      ? `/board?${params.toString()}`
      : "/board";
    router.push(newUrl, { scroll: false });
  };

  const handleCreateSnapshot = () => {
    if (confirm("¿Crear un snapshot del estado actual del board?")) {
      snapshotMutation.mutate({});
    }
  };

  const handleCopyPublicLink = async () => {
    if (!filters.projectId) return;
    try {
      const sharing = await projectsApi.getSharing(filters.projectId);
      if (!sharing.enabled || !sharing.token) {
        toast.error(
          "El enlace público está desactivado. Actívalo en la página del proyecto.",
        );
        return;
      }

      const params = new URLSearchParams();
      params.set("view", viewMode);
      const url = `${window.location.origin}/public/projects/${sharing.token}?${params.toString()}`;
      await navigator.clipboard.writeText(url);
      toast.success("Link público copiado");
    } catch {
      toast.error("No se pudo copiar el link");
    }
  };

  // Eliminado: código relacionado con ClientBoard

  const handleSwitchToListView = () => {
    setViewMode("list");
  };

  // El backend recorta "done" a las BOARD_DONE_LIMIT más recientes. Se mide sobre
  // boardData sin filtrar (no sobre el filtrado por espacio/cliente, que puede quedar
  // con menos elementos sin que el recorte haya desaparecido).
  const isDoneCapped =
    (boardData?.[TaskStatus.DONE]?.length ?? 0) >= BOARD_DONE_LIMIT;

  // Extraer todos los tags únicos de las tareas
  const availableTags = useMemo(() => {
    if (!boardData) return [];
    const allTasks = Object.values(boardData).flat();
    const tagsSet = new Set<string>();
    allTasks.forEach((task) => {
      task.tags?.forEach((tag) => tagsSet.add(tag));
    });
    return Array.from(tagsSet).sort();
  }, [boardData]);

  // Filtrar tareas según los filtros activos Y el espacio actual
  const filteredBoardData: BoardData = useMemo(() => {
    if (!boardData) {
      return {
        [TaskStatus.TODO]: [],
        [TaskStatus.DOING]: [],
        [TaskStatus.BLOCKED]: [],
        [TaskStatus.DONE]: [],
      };
    }

    const filterTasks = (tasks: Task[]) =>
      tasks.filter((task) => {
        // Filtrar por espacio actual
        if (currentSpace) {
          const clientSpaceId = task.client?.spaceId;
          const projectSpaceId = task.project?.spaceId;

          if (currentSpace.type === SpaceType.PERSONAL) {
            // En espacio personal: mostrar tareas cuyo proyecto pertenece a este espacio
            if (!projectSpaceId || projectSpaceId !== currentSpace.id) {
              return false;
            }
          } else {
            // En espacio trabajo: mostrar tareas con cliente del espacio, excluir las personales
            if (projectSpaceId && projectSpaceId !== currentSpace.id) {
              return false;
            }
            if (clientSpaceId && clientSpaceId !== currentSpace.id) {
              return false;
            }
            // Excluir tareas sin cliente ni proyecto (huérfanas)
            if (!clientSpaceId && !projectSpaceId && !task.clientId) {
              return false;
            }
          }
        }

        // Filtros adicionales del usuario
        if (filters.clientId && task.clientId !== filters.clientId)
          return false;
        if (filters.projectId && task.projectId !== filters.projectId)
          return false;
        if (filters.priority && task.priority !== filters.priority)
          return false;
        if (filters.status && task.status !== filters.status)
          return false;
        // Normalizar tipo: undefined se considera 'task'
        const taskType = task.type || TaskType.TASK;
        if (filters.type && taskType !== filters.type)
          return false;
        if (filters.tags && filters.tags.length > 0) {
          const taskTags = task.tags || [];
          if (!filters.tags.some((tag) => taskTags.includes(tag))) return false;
        }
        return true;
      });

    return {
      [TaskStatus.TODO]: filterTasks(boardData[TaskStatus.TODO] || []),
      [TaskStatus.DOING]: filterTasks(boardData[TaskStatus.DOING] || []),
      [TaskStatus.BLOCKED]: filterTasks(boardData[TaskStatus.BLOCKED] || []),
      [TaskStatus.DONE]: filterTasks(boardData[TaskStatus.DONE] || []),
    };
  }, [boardData, filters, currentSpace]);

  // Datos filtrados para Kanban (solo tareas, sin notas ni recordatorios)
  const kanbanBoardData = useMemo(() => {
    const filterOnlyTasks = (tasks: Task[]) =>
      tasks.filter((task) => {
        const taskType = task.type || TaskType.TASK;
        return taskType === TaskType.TASK;
      });

    return {
      [TaskStatus.TODO]: filterOnlyTasks(filteredBoardData[TaskStatus.TODO] || []),
      [TaskStatus.DOING]: filterOnlyTasks(filteredBoardData[TaskStatus.DOING] || []),
      [TaskStatus.BLOCKED]: filterOnlyTasks(filteredBoardData[TaskStatus.BLOCKED] || []),
      [TaskStatus.DONE]: filterOnlyTasks(filteredBoardData[TaskStatus.DONE] || []),
    };
  }, [filteredBoardData]);

  // Contar tareas del espacio actual (ya filtradas por espacio)
  const spaceTasks = Object.values(filteredBoardData).flat().length;
  // Contar tareas filtradas por filtros adicionales del usuario
  const hasActiveFilters = filters.clientId || filters.projectId || filters.priority || filters.status || filters.tags?.length;
  const filteredTasksCount = spaceTasks;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 lg:px-6 py-4 pt-16 lg:pt-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
              Board
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {hasActiveFilters
                ? `Mostrando ${filteredTasksCount} tareas`
                : `${spaceTasks} tareas en total`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:gap-3">
            {/* View Toggle */}
            <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setViewMode("kanban")}
                className={`flex items-center gap-1.5 px-2 lg:px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === "kanban"
                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="hidden sm:inline">Kanban</span>
              </button>
              <button
                onClick={handleSwitchToListView}
                className={`flex items-center gap-1.5 px-2 lg:px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === "list"
                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                <List className="w-4 h-4" />
                <span className="hidden sm:inline">Lista</span>
              </button>
            </div>

            <div className="hidden lg:block w-px h-6 bg-gray-200 dark:bg-gray-700" />

            {hasProjectFilter && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyPublicLink}
                className="hidden sm:flex"
              >
                <Link2 className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Link público</span>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
              className="hidden sm:flex"
            >
              <RefreshCw
                className={`w-4 h-4 sm:mr-2 ${isLoading ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">Actualizar</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCreateSnapshot}
              disabled={snapshotMutation.isPending}
              className="hidden lg:flex"
            >
              <Camera className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">
                {snapshotMutation.isPending ? "Guardando..." : "Snapshot"}
              </span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsColumnSettingsModalOpen(true)}
              className="hidden lg:flex"
              title="Configurar columnas"
            >
              <Settings2 className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsProjectModalOpen(true)}
              className="hidden lg:flex"
            >
              <FolderPlus className="w-4 h-4 sm:mr-2" />
              <span className="hidden lg:inline">
                {isPersonalSpace ? "Nueva área" : "Nuevo proyecto"}
              </span>
            </Button>
            <Button size="sm" onClick={handleOpenNewTaskModal}>
              <Plus className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Nueva tarea</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Filters - show in both Kanban and List views */}
      <BoardFiltersBar
        filters={filters}
        onChange={setFilters}
        availableTags={availableTags}
        isKanbanView={viewMode === "kanban"}
      />

      {/* Board */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : viewMode === "kanban" ? (
          <KanbanBoard
            data={kanbanBoardData}
            onTaskMove={handleTaskMove}
            onTaskClick={handleTaskClick}
            onAddTask={handleAddTask}
            doneLimit={BOARD_DONE_LIMIT}
            doneCapped={isDoneCapped}
          />
        ) : (
          <TaskListView
            filters={filters}
            onTaskClick={handleTaskClick}
            onFilterByClient={(clientId) =>
              setFilters({ ...filters, clientId })
            }
            onFilterByProject={(projectId) =>
              setFilters({ ...filters, projectId })
            }
          />
        )}
      </div>

      {/* Task Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={handleCloseTaskModal}
        task={selectedTask}
        defaultStatus={taskModalDefaultStatus}
        defaultClientId={taskModalDefaultClientId}
        defaultProjectId={taskModalDefaultProjectId}
        onFilterByClient={(clientId) => setFilters({ ...filters, clientId })}
        onFilterByProject={(projectId) => setFilters({ ...filters, projectId })}
      />

      {/* Eliminado: Select Clients Modal */}

      {/* Project Modal */}
      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        project={null}
        clientId={undefined}
        clientName={undefined}
      />

      {/* Column Settings Modal */}
      <ColumnSettingsModal
        isOpen={isColumnSettingsModalOpen}
        onClose={() => setIsColumnSettingsModalOpen(false)}
      />
    </div>
  );
}

// Wrapper con Suspense para useSearchParams
export default function BoardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-full">
          <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      }
    >
      <BoardPageContent />
    </Suspense>
  );
}
