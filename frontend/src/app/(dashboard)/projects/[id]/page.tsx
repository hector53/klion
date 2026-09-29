"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Settings,
  ExternalLink,
  GitBranch,
  Database,
  Code,
  BookOpen,
  CheckCircle,
  Clock,
  AlertTriangle,
  ListTodo,
  Loader2,
  Plus,
  Search,
  RefreshCw,
  FolderGit,
  Tag,
  Sparkles,
  Edit,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MobileHeader } from "@/components/ui/sidebar";
import { TaskModal } from "@/components/modals/task-modal";
import { KnowledgeModal } from "@/components/modals/knowledge-modal";
import { ProjectContextModal } from "@/components/modals/project-context-modal";
import { GeneratedTasksModal } from "@/components/modals/generated-tasks-modal";
import { ConfirmModal } from "@/components/modals/confirm-modal";
import { ProjectNotesCard } from "@/components/projects/project-notes-card";
import { PublicShareCard } from "@/components/projects/public-share-card";
import { useToast } from "@/components/ui/toast";
import {
  projectsApi,
  projectContextApi,
  ragApi,
  knowledgeApi,
  tasksApi,
} from "@/lib/api";
import { cn, priorityColors, priorityLabels, statusLabels } from "@/lib/utils";
import { useChat } from "@/hooks/use-chat";
import { useRecentProjects } from "@/hooks/use-recent-projects";
import { useDebounce } from "@/hooks/use-debounce";
import { useActiveTasksWidgetPreferences } from "@/hooks/use-local-storage";
import { CodePreviewModal } from "@/components/modals/code-preview-modal";
import type {
  Task,
  Knowledge,
  ProjectContextResponse,
  RagIndexStatus,
  CodeSearchResult,
  AnalyzeNotesResponse,
} from "@/types";
import { getDomainConfig } from "@/lib/domains";

const statusConfig = {
  active: { label: "Activo", color: "bg-green-500" },
  on_hold: { label: "En pausa", color: "bg-yellow-500" },
  completed: { label: "Completado", color: "bg-blue-500" },
  cancelled: { label: "Cancelado", color: "bg-gray-500" },
};

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;
  const queryClient = useQueryClient();
  const toast = useToast();
  const { openChat } = useChat();
  const { addRecentProject } = useRecentProjects();

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isKnowledgeModalOpen, setIsKnowledgeModalOpen] = useState(false);
  const [isContextModalOpen, setIsContextModalOpen] = useState(false);
  const [codeSearchQuery, setCodeSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(codeSearchQuery, 500);
  const [selectedCodeResult, setSelectedCodeResult] =
    useState<CodeSearchResult | null>(null);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [showIndexedChunks, setShowIndexedChunks] = useState(false);
  const [generatedTasks, setGeneratedTasks] =
    useState<AnalyzeNotesResponse | null>(null);
  const [isGeneratedTasksModalOpen, setIsGeneratedTasksModalOpen] =
    useState(false);

  // Fetch project with context
  const { data: contextData, isLoading: loadingContext } = useQuery({
    queryKey: ["project-context", projectId],
    queryFn: async () => {
      try {
        // Try the full context endpoint
        return await projectContextApi.getContext(projectId);
      } catch {
        // Fallback to regular project + separate calls
        // Nota: el widget "Tareas Activas" ya no lee currentState.activeTasks
        // (usa su propia query, ver project-active-tasks más abajo), así que
        // este fallback no necesita calcularlo.
        const project = await projectsApi.getOne(projectId);
        const tasks = await tasksApi.getAll({ projectId, limit: 100 });

        return {
          project,
          context: undefined,
          currentState: {
            totalTasks: tasks.total,
            tasksByStatus: {},
            blockedTasks: tasks.tasks.filter(
              (t: Task) => t.status === "blocked",
            ),
            upcomingDeadlines: [],
          },
          relatedKnowledge: [],
        } as Partial<ProjectContextResponse>;
      }
    },
  });

  // Fetch project details
  const { data: project, isLoading: loadingProject } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => projectsApi.getOne(projectId),
  });

  // Fetch project stats
  const { data: stats } = useQuery({
    queryKey: ["project-stats", projectId],
    queryFn: () => projectsApi.getStats(projectId),
  });

  // Fetch RAG index status
  const { data: ragStatus } = useQuery({
    queryKey: ["rag-status", projectId],
    queryFn: () => ragApi.getIndexStatus(projectId),
    retry: false,
  });

  // Tareas activas del widget: query propia (independiente del resumen de IA
  // en contextData), para poder filtrar/ordenar del lado del cliente.
  const { data: activeTasksData } = useQuery({
    queryKey: ["project-active-tasks", projectId],
    queryFn: () => tasksApi.getAll({ projectId, limit: 100 }),
  });

  const { preferences: activeTasksPrefs, updatePreference: updateActiveTasksPref } =
    useActiveTasksWidgetPreferences();

  const ACTIVE_TASKS_DISPLAY_CAP = 20;

  const filteredSortedActiveTasks = useMemo(() => {
    const notDone = (activeTasksData?.tasks || []).filter(
      (t: Task) => t.status !== "done",
    );
    const filtered =
      activeTasksPrefs.statusFilter === "active"
        ? notDone.filter((t: Task) => t.status === "todo" || t.status === "doing")
        : notDone.filter((t: Task) => t.status === activeTasksPrefs.statusFilter);

    const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };

    return [...filtered].sort((a: Task, b: Task) => {
      switch (activeTasksPrefs.sortBy) {
        case "priority": {
          const diff = priorityOrder[a.priority] - priorityOrder[b.priority];
          if (diff !== 0) return diff;
          if (a.dueDate && b.dueDate) {
            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          }
          return a.dueDate ? -1 : b.dueDate ? 1 : 0;
        }
        case "dueDate": {
          if (a.dueDate && b.dueDate) {
            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          }
          return a.dueDate ? -1 : b.dueDate ? 1 : 0;
        }
        case "recent":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "title":
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });
  }, [activeTasksData, activeTasksPrefs]);

  const visibleActiveTasks = filteredSortedActiveTasks.slice(
    0,
    ACTIVE_TASKS_DISPLAY_CAP,
  );

  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: string) => tasksApi.delete(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["project-active-tasks", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project-context", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project-stats", projectId] });
      toast.success("Tarea eliminada exitosamente");
      setTaskToDelete(null);
    },
    onError: () => {
      toast.error("No se pudo eliminar la tarea");
    },
  });

  // Fetch related knowledge
  const { data: knowledge = [] } = useQuery({
    queryKey: ["knowledge-project", projectId],
    queryFn: () => knowledgeApi.getByProject(projectId, 10),
  });

  // Code search
  const { data: codeResults = [], isLoading: isSearchingCode } = useQuery({
    queryKey: ["code-search", projectId, debouncedSearchQuery],
    queryFn: () =>
      ragApi.searchCode({
        query: debouncedSearchQuery,
        projectId,
        limit: 5,
        useSemanticSearch: true,
      }),
    enabled: debouncedSearchQuery.length >= 3 && !!ragStatus?.isIndexed,
  });

  // Indexed chunks (for visualization)
  const { data: chunksData, isLoading: isLoadingChunks } = useQuery({
    queryKey: ["rag-chunks", projectId],
    queryFn: () => ragApi.getChunks(projectId, 20, 0),
    enabled: showIndexedChunks && !!ragStatus?.isIndexed,
  });

  const handleCodeResultClick = (result: CodeSearchResult) => {
    setSelectedCodeResult(result);
    setIsCodeModalOpen(true);
  };

  // Register recent project
  useEffect(() => {
    if (project) {
      addRecentProject({
        id: project.id,
        name: project.name,
        color: project.color,
      });
    }
  }, [project, addRecentProject]);

  const handleOpenChat = () => {
    if (project) {
      openChat(projectId, project.name);
    }
  };

  if (loadingProject || loadingContext) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-gray-500 dark:text-gray-400">
          Proyecto no encontrado
        </p>
        <Link href="/clients" className="text-primary mt-2">
          Volver a clientes
        </Link>
      </div>
    );
  }

  const context = contextData?.context;
  const currentState = contextData?.currentState;
  const projectStatus = statusConfig[project.status] || statusConfig.active;

  return (
    <div className="h-full overflow-auto">
      <MobileHeader title={project.name} />

      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 lg:px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-3 lg:gap-4">
          <Link
            href={
              project.clientId ? `/clients/${project.clientId}` : "/clients"
            }
          >
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: project.color }}
          />
          {project.domain && (
            <span
              className="text-xl"
              title={getDomainConfig(project.domain).label}
            >
              {getDomainConfig(project.domain).icon}
            </span>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg lg:text-2xl font-bold text-gray-900 dark:text-white truncate">
                {project.name}
              </h1>
              <Badge className={cn("text-white", projectStatus.color)}>
                {projectStatus.label}
              </Badge>
            </div>
            {project.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                {project.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleOpenChat}>
              <Sparkles className="w-4 h-4 lg:mr-2" />
              <span className="hidden lg:inline">Chat IA</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsContextModalOpen(true)}
            >
              <Settings className="w-4 h-4 lg:mr-2" />
              <span className="hidden lg:inline">Configurar</span>
            </Button>
            <Link href={`/board?projectId=${projectId}`}>
              <Button size="sm">
                <ExternalLink className="w-4 h-4 lg:mr-2" />
                <span className="hidden lg:inline">Ver Board</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="p-4 lg:p-6 space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <ListTodo className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.totalTasks || 0}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Tareas totales
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {stats?.completedTasks || 0}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Completadas
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Database className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {ragStatus?.totalChunks || 0}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Chunks RAG
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <BookOpen className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{knowledge.length}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Knowledge
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Context Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="w-5 h-5 text-gray-500" />
                Contexto del Proyecto
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsContextModalOpen(true)}
              >
                <Edit className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Stack */}
              {context?.stack && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Stack Tecnolgico
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {context.stack}
                  </p>
                </div>
              )}

              {/* Rules */}
              {context?.rules && context.rules.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Reglas de Desarrollo
                  </h4>
                  <ul className="space-y-1">
                    {context.rules.slice(0, 4).map((rule, i) => (
                      <li
                        key={i}
                        className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2"
                      >
                        <span className="text-primary mt-1"></span>
                        {rule}
                      </li>
                    ))}
                    {context.rules.length > 4 && (
                      <li className="text-sm text-gray-500">
                        +{context.rules.length - 4} reglas ms
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {/* Repository */}
              {context?.repositoryUrl && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Repositorio
                  </h4>
                  <a
                    href={context.repositoryUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    <FolderGit className="w-4 h-4" />
                    {context.repositoryUrl}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              {/* Tags */}
              {context?.tags && context.tags.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tags
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {context.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {!context?.stack && !context?.rules?.length && (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                    Configura el contexto del proyecto para mejor asistencia IA
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsContextModalOpen(true)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Configurar contexto
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* RAG Status Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Database className="w-5 h-5 text-purple-500" />
                ndice RAG
              </CardTitle>
              {ragStatus?.isIndexed && (
                <Badge variant="outline" className="text-green-600">
                  Indexado
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              {ragStatus?.isIndexed ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">
                        Archivos
                      </p>
                      <p className="font-medium">{ragStatus.totalFiles}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Chunks</p>
                      <p className="font-medium">{ragStatus.totalChunks}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-gray-500 dark:text-gray-400">
                        ltima indexacin
                      </p>
                      <p className="font-medium">
                        {ragStatus.lastIndexedAt
                          ? format(
                              new Date(ragStatus.lastIndexedAt),
                              "d MMM yyyy HH:mm",
                              {
                                locale: es,
                              },
                            )
                          : "Nunca"}
                      </p>
                    </div>
                  </div>

                  {/* Code Search */}
                  <div className="pt-3 border-t dark:border-gray-700">
                    <h4 className="text-sm font-medium mb-2">
                      Buscar en cdigo
                    </h4>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Buscar funciones, clases..."
                        value={codeSearchQuery}
                        onChange={(e) => setCodeSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
                      />
                    </div>
                    {isSearchingCode && (
                      <div className="absolute right-3 top-10 w-4 h-4">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      </div>
                    )}
                    {codeResults.length > 0 && (
                      <div className="mt-2 space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                        {codeResults.map((result) => (
                          <div
                            key={result.id}
                            className="p-2.5 bg-gray-50 dark:bg-gray-800 rounded-lg text-xs hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-600 group"
                            onClick={() => handleCodeResultClick(result)}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <p
                                className="font-mono text-primary font-medium truncate flex-1"
                                title={result.filePath}
                              >
                                {result.filePath.split("/").pop()}
                              </p>
                              <Badge
                                variant="secondary"
                                className="text-[10px] h-4 px-1"
                              >
                                {Math.round(result.relevance * 100)}%
                              </Badge>
                            </div>
                            <p className="text-gray-500 dark:text-gray-400 mb-1.5 truncate text-[10px]">
                              {result.filePath}
                            </p>
                            <div className="text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-900/50 p-1.5 rounded border border-gray-100 dark:border-gray-800 font-mono text-[10px] line-clamp-2 break-all group-hover:border-gray-200 dark:group-hover:border-gray-700">
                              {result.content
                                .slice(0, 100)
                                .replace(/\s+/g, " ")}
                              ...
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {debouncedSearchQuery.length >= 3 &&
                      !isSearchingCode &&
                      codeResults.length === 0 && (
                        <p className="text-xs text-center text-gray-400 mt-2">
                          No se encontraron resultados
                        </p>
                      )}
                  </div>

                  {/* View Indexed Chunks */}
                  <div className="pt-3 border-t dark:border-gray-700">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setShowIndexedChunks(!showIndexedChunks)}
                    >
                      <Database className="w-4 h-4 mr-2" />
                      {showIndexedChunks ? "Ocultar" : "Ver"} chunks indexados
                    </Button>

                    {showIndexedChunks && (
                      <div className="mt-3 space-y-2">
                        {isLoadingChunks ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                          </div>
                        ) : chunksData && chunksData.chunks.length > 0 ? (
                          <>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                              Mostrando {chunksData.chunks.length} de{" "}
                              {chunksData.total} chunks
                            </p>
                            <div className="max-h-80 overflow-y-auto pr-1 custom-scrollbar space-y-2">
                              {chunksData.chunks.map((chunk: any) => (
                                <div
                                  key={chunk.id}
                                  className="p-2.5 bg-gray-50 dark:bg-gray-800 rounded-lg text-xs border border-gray-200 dark:border-gray-700"
                                >
                                  <div className="flex items-center justify-between gap-2 mb-1">
                                    <p
                                      className="font-mono text-primary font-medium truncate flex-1"
                                      title={chunk.filePath}
                                    >
                                      {chunk.fileName}
                                    </p>
                                    <Badge
                                      variant="secondary"
                                      className="text-[10px] h-4 px-1"
                                    >
                                      {chunk.fileType}
                                    </Badge>
                                  </div>
                                  <p className="text-gray-500 dark:text-gray-400 mb-1.5 truncate text-[10px]">
                                    {chunk.filePath} (líneas {chunk.startLine}-
                                    {chunk.endLine})
                                  </p>
                                  <div className="text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-900/50 p-1.5 rounded border border-gray-100 dark:border-gray-800 font-mono text-[10px] line-clamp-3">
                                    {chunk.content}...
                                  </div>
                                  {chunk.features &&
                                    chunk.features.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-1.5">
                                        {chunk.features
                                          .slice(0, 3)
                                          .map((feature: string) => (
                                            <span
                                              key={feature}
                                              className="px-1.5 py-0.5 text-[9px] bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded"
                                            >
                                              {feature}
                                            </span>
                                          ))}
                                      </div>
                                    )}
                                </div>
                              ))}
                            </div>
                          </>
                        ) : (
                          <p className="text-xs text-center text-gray-400 py-4">
                            No hay chunks indexados
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <Database className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                    {ragStatus?.indexingInProgress
                      ? "Indexacin en progreso..."
                      : "El proyecto no est indexado"}
                  </p>
                  <p className="text-xs text-gray-400 mb-3">
                    Usa el CLI:{" "}
                    <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">
                      klion rag index --project {projectId.slice(0, 8)}...
                    </code>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Active Tasks */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <ListTodo className="w-5 h-5 text-blue-500" />
              Tareas Activas
            </CardTitle>
            <div className="flex items-center gap-2">
              <Link href={`/board?projectId=${projectId}&view=list`}>
                <Button variant="ghost" size="sm" className="hidden sm:flex">
                  <ExternalLink className="w-4 h-4 mr-1" />
                  Ver board
                </Button>
              </Link>
              <Button size="sm" onClick={() => setIsTaskModalOpen(true)}>
                <Plus className="w-4 h-4 mr-1" />
                Nueva tarea
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-3">
              <select
                value={activeTasksPrefs.statusFilter}
                onChange={(e) =>
                  updateActiveTasksPref(
                    "statusFilter",
                    e.target.value as typeof activeTasksPrefs.statusFilter,
                  )
                }
                className="h-8 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white px-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="active">Activas</option>
                <option value="todo">{statusLabels.todo}</option>
                <option value="doing">{statusLabels.doing}</option>
                <option value="blocked">{statusLabels.blocked}</option>
              </select>
              <select
                value={activeTasksPrefs.sortBy}
                onChange={(e) =>
                  updateActiveTasksPref(
                    "sortBy",
                    e.target.value as typeof activeTasksPrefs.sortBy,
                  )
                }
                className="h-8 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white px-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="priority">Ordenar por prioridad</option>
                <option value="dueDate">Ordenar por fecha límite</option>
                <option value="recent">Más recientes</option>
                <option value="title">Alfabético</option>
              </select>
            </div>
            {visibleActiveTasks.length > 0 ? (
              <div className="space-y-2">
                {visibleActiveTasks.map((task: Task) => (
                  <div
                    key={task.id}
                    className="group flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                    onClick={() => {
                      setSelectedTask(task);
                      setIsTaskModalOpen(true);
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          "w-2 h-2 rounded-full flex-shrink-0",
                          task.status === "doing" && "bg-blue-500",
                          task.status === "blocked" && "bg-red-500",
                          task.status === "todo" && "bg-gray-400",
                        )}
                      />
                      <span className="text-sm truncate dark:text-white">
                        {task.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs flex-shrink-0",
                          priorityColors[task.priority],
                        )}
                      >
                        {priorityLabels[task.priority]}
                      </Badge>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setTaskToDelete(task);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-opacity p-1 -m-1"
                        title="Eliminar tarea"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                No hay tareas activas
              </p>
            )}
            {filteredSortedActiveTasks.length > visibleActiveTasks.length && (
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center pt-3">
                Mostrando {visibleActiveTasks.length} de{" "}
                {filteredSortedActiveTasks.length} tareas ·{" "}
                <Link
                  href={`/board?projectId=${projectId}&view=list`}
                  className="text-primary hover:underline"
                >
                  Ver todas en el board
                </Link>
              </p>
            )}
          </CardContent>
        </Card>

        {/* Enlace público de solo lectura para el cliente */}
        <PublicShareCard projectId={projectId} />

        {/* Scratchpad de notas */}
        <ProjectNotesCard
          projectId={projectId}
          onTasksGenerated={(response) => {
            setGeneratedTasks(response);
            setIsGeneratedTasksModalOpen(true);
          }}
        />

        {/* Knowledge */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-amber-500" />
              Knowledge Base
            </CardTitle>
            <Button size="sm" onClick={() => setIsKnowledgeModalOpen(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Nuevo
            </Button>
          </CardHeader>
          <CardContent>
            {knowledge.length > 0 ? (
              <div className="grid lg:grid-cols-2 gap-3">
                {knowledge.slice(0, 6).map((item: Knowledge) => (
                  <Link
                    key={item.id}
                    href={`/knowledge?projectId=${projectId}&id=${item.id}`}
                    className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Code className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium truncate dark:text-white">
                        {item.title}
                      </span>
                    </div>
                    {item.summary && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                        {item.summary}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <BookOpen className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Sin conocimiento guardado para este proyecto
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setSelectedTask(null);
        }}
        task={selectedTask}
        defaultProjectId={projectId}
        defaultClientId={project.clientId}
      />

      <KnowledgeModal
        isOpen={isKnowledgeModalOpen}
        onClose={() => setIsKnowledgeModalOpen(false)}
      />

      <GeneratedTasksModal
        isOpen={isGeneratedTasksModalOpen}
        onClose={() => {
          setIsGeneratedTasksModalOpen(false);
          setGeneratedTasks(null);
        }}
        projectId={projectId}
        clientId={project.clientId}
        response={generatedTasks}
      />

      <ConfirmModal
        isOpen={!!taskToDelete}
        onClose={() => setTaskToDelete(null)}
        onConfirm={() => {
          if (taskToDelete) deleteTaskMutation.mutate(taskToDelete.id);
        }}
        title="Eliminar tarea"
        message={`¿Estás seguro de que quieres eliminar "${taskToDelete?.title}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        variant="danger"
        isLoading={deleteTaskMutation.isPending}
      />

      {isContextModalOpen && (
        <ProjectContextModal
          isOpen={isContextModalOpen}
          onClose={() => setIsContextModalOpen(false)}
          projectId={projectId}
          projectName={project.name}
          context={context}
        />
      )}

      <CodePreviewModal
        isOpen={isCodeModalOpen}
        onClose={() => setIsCodeModalOpen(false)}
        result={selectedCodeResult}
      />
    </div>
  );
}
