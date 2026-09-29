"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { LayoutGrid, List, RefreshCw } from "lucide-react";
import { KanbanBoard } from "@/components/board/kanban-board";
import { PublicTaskDetail } from "@/components/public/public-task-detail";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { publicApi } from "@/lib/api";
import { statusLabels } from "@/lib/utils";
import { TaskStatus, type Task, type BoardData } from "@/types";

type ViewMode = "trello" | "list";

export default function PublicProjectBoardPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const token = Array.isArray(params?.token) ? params.token[0] : params?.token;
  const viewParam = searchParams.get("view");

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [viewModeState, setViewModeState] = useState<ViewMode>(
    (viewParam as ViewMode) || "trello",
  );

  useEffect(() => {
    if (viewParam === "trello" || viewParam === "list") {
      setViewModeState(viewParam);
    }
  }, [viewParam]);

  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode);
    const paramsCopy = new URLSearchParams(searchParams.toString());
    paramsCopy.set("view", mode);
    router.push(`/public/projects/${token}?${paramsCopy.toString()}`);
  };

  const {
    data: project,
    isLoading: isProjectLoading,
    isError: isProjectError,
  } = useQuery({
    queryKey: ["public-project", token],
    queryFn: () => publicApi.getProject(token as string),
    enabled: !!token,
    retry: false,
  });

  const {
    data: boardData,
    isLoading: isBoardLoading,
    refetch,
  } = useQuery({
    queryKey: ["public-board", token],
    queryFn: () => publicApi.getBoard(token as string),
    enabled: !!token && !isProjectError,
    retry: false,
  });

  const normalizedBoardData: BoardData = useMemo(() => {
    const empty = {
      [TaskStatus.TODO]: [],
      [TaskStatus.DOING]: [],
      [TaskStatus.BLOCKED]: [],
      [TaskStatus.DONE]: [],
    };
    if (!boardData) return empty;
    return { ...empty, ...boardData };
  }, [boardData]);

  const allTasks = useMemo(
    () => Object.values(normalizedBoardData).flat(),
    [normalizedBoardData],
  );

  if (!token || isProjectError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 px-4 text-center">
        <p className="text-lg font-medium text-slate-200">
          Este enlace no está disponible
        </p>
        <p className="text-sm text-slate-500">
          Puede haber sido desactivado o reemplazado. Pídele un enlace nuevo a
          quien te lo compartió.
        </p>
      </div>
    );
  }

  const isLoading = isProjectLoading || isBoardLoading;

  return (
    <div className="flex h-screen flex-col">
      <header className="border-b border-white/10 bg-[#0B1220] px-4 py-6 lg:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              Vista publica
            </p>
            <h1 className="mt-1 text-2xl font-bold text-white lg:text-3xl">
              {project?.name || "Proyecto"}
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              {isLoading ? "Cargando tareas..." : `${allTasks.length} tareas`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg border border-white/10 bg-[#111827] p-1">
              <button
                onClick={() => setViewMode("trello")}
                className={`flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium transition-colors lg:px-3 ${
                  viewModeState === "trello"
                    ? "bg-white/10 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <LayoutGrid className="h-4 w-4" />
                <span className="hidden sm:inline">Kanban</span>
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium transition-colors lg:px-3 ${
                  viewModeState === "list"
                    ? "bg-white/10 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <List className="h-4 w-4" />
                <span className="hidden sm:inline">Lista</span>
              </button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
              className="border-white/10 text-slate-200 hover:text-white"
            >
              <RefreshCw
                className={`h-4 w-4 sm:mr-2 ${isLoading ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">Actualizar</span>
            </Button>
          </div>
        </div>
        {project?.client && (
          <div className="mt-4 text-sm text-slate-500">
            Cliente:{" "}
            <span className="text-slate-300">{project.client.name}</span>
          </div>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex h-full items-center justify-center py-16">
            <RefreshCw className="h-8 w-8 animate-spin text-slate-500" />
          </div>
        ) : viewModeState === "trello" ? (
          <KanbanBoard
            data={normalizedBoardData}
            onTaskMove={() => {}}
            onTaskClick={setSelectedTask}
            isSnapshot
          />
        ) : (
          <PublicTaskList tasks={allTasks} onTaskClick={setSelectedTask} />
        )}
      </div>

      <PublicTaskDetail
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
      />
    </div>
  );
}

/**
 * Minimal read-only list. TaskListView can't be reused here: it pulls clients,
 * projects and the full board through authenticated endpoints, and offers bulk
 * actions that must not exist on a shared link.
 */
function PublicTaskList({
  tasks,
  onTaskClick,
}: {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}) {
  if (tasks.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-500">
        Este proyecto todavía no tiene tareas.
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-4 lg:px-6">
      <ul className="space-y-2">
        {tasks.map((task) => (
          <li key={task.id}>
            <button
              onClick={() => onTaskClick(task)}
              className="flex w-full items-center justify-between gap-3 rounded-lg border border-white/10 bg-[#0B1220] p-3 text-left transition-colors hover:border-white/20"
            >
              <div className="min-w-0">
                {task.taskCode && (
                  <span className="font-mono text-xs text-slate-500">
                    {task.taskCode}
                  </span>
                )}
                <p className="truncate text-sm font-medium text-slate-100">
                  {task.title}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {task.dueDate && (
                  <span className="hidden text-xs text-slate-500 sm:inline">
                    {new Date(task.dueDate).toLocaleDateString("es-ES")}
                  </span>
                )}
                <Badge variant="outline">
                  {statusLabels[task.status] ?? task.status}
                </Badge>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
