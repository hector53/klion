"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  GripVertical,
  Calendar,
  Tag,
  CheckSquare,
  Square,
  ChevronRight,
  Pencil,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import {
  cn,
  priorityColors,
  priorityLabels,
  taskTypeIcons,
  taskTypeColors,
} from "@/lib/utils";
import { stripHtml } from "@/lib/rich-text";
import { subtasksApi } from "@/lib/api";
import type { Task } from "@/types";

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
  isSnapshot?: boolean;
}

export function TaskCard({ task, onClick, isSnapshot = false }: TaskCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const queryClient = useQueryClient();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    disabled: isSnapshot,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const hasSubtasks = task.subtasks && task.subtasks.length > 0;
  const completedSubtasks =
    task.subtasks?.filter((s) => s.completed).length || 0;
  const totalSubtasks = task.subtasks?.length || 0;

  const toggleSubtaskMutation = useMutation({
    mutationFn: (subtaskId: string) => subtasksApi.toggle(subtaskId),
    onMutate: async (subtaskId: string) => {
      await queryClient.cancelQueries({ queryKey: ["board"] });
      const previousBoard = queryClient.getQueryData(["board"]);

      // Optimistic update para el board
      queryClient.setQueryData(
        ["board"],
        (old: Record<string, Task[]> | undefined) => {
          if (!old) return old;
          const newBoard: Record<string, Task[]> = {};
          for (const [status, tasks] of Object.entries(old)) {
            newBoard[status] = tasks.map((t) =>
              t.id === task.id
                ? {
                    ...t,
                    subtasks: t.subtasks?.map((s) =>
                      s.id === subtaskId
                        ? { ...s, completed: !s.completed }
                        : s,
                    ),
                  }
                : t,
            );
          }
          return newBoard;
        },
      );

      return { previousBoard };
    },
    onError: (_err, _subtaskId, context) => {
      queryClient.setQueryData(["board"], context?.previousBoard);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["board"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const handleToggleSubtask = (e: React.MouseEvent, subtaskId: string) => {
    e.stopPropagation();
    if (isSnapshot) return;
    toggleSubtaskMutation.mutate(subtaskId);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick?.();
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group bg-[#1f2937] rounded-lg border border-gray-800 shadow-sm transition-all hover:shadow-md hover:border-gray-700",
        isDragging && "opacity-50 rotate-2 shadow-lg scale-105 z-50",
        isSnapshot && "cursor-default",
      )}
    >
      {/* Header de la card */}
      <div className="p-3">
        <div className="flex items-start gap-2">
          {!isSnapshot && (
            <button
              className="mt-0.5 text-gray-500 hover:text-gray-300 cursor-grab active:cursor-grabbing transition-colors"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="w-4 h-4" />
            </button>
          )}

          {/* Botón expandir subtareas */}
          {hasSubtasks ? (
            <button
              onClick={handleToggleExpand}
              className="mt-0.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <ChevronRight
                className={cn(
                  "w-4 h-4 transition-transform",
                  isExpanded && "rotate-90",
                )}
              />
            </button>
          ) : (
            <div className="w-4" />
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              {task.type && task.type !== "task" && (
                <span
                  className={cn(
                    "inline-flex items-center justify-center w-5 h-5 rounded text-[11px] border flex-shrink-0",
                    taskTypeColors[task.type],
                  )}
                  title={task.type === "note" ? "Nota" : "Recordatorio"}
                >
                  {taskTypeIcons[task.type]}
                </span>
              )}
              <h4 className="font-medium text-sm text-gray-100 truncate">
                {task.title}
              </h4>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              {task.taskCode && (
                <span className="text-[10px] font-mono text-blue-400/70 flex-shrink-0">
                  {task.taskCode}
                </span>
              )}
              {task.taskCode && task.client && (
                <span className="text-[10px] text-gray-500">•</span>
              )}
              {task.client && (
                <span className="text-xs text-gray-400 truncate">{task.client.name}</span>
              )}
            </div>
          </div>

          {/* Botón editar */}
          {!isSnapshot && (
            <button
              onClick={handleEditClick}
              className="text-gray-400 dark:text-gray-500 hover:text-blue-500 transition-colors p-1"
              title="Editar tarea"
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Description preview */}
        {task.description && (
          <p className="text-xs text-gray-400 mt-2 line-clamp-2 ml-6">
            {stripHtml(task.description)}
          </p>
        )}

        {/* Footer con metadata */}
        <div className="mt-3 flex items-center justify-between gap-2 ml-6">
          <Badge
            className={cn(
              "text-[10px] uppercase tracking-wider font-bold h-5 px-1.5",
              priorityColors[task.priority],
            )}
            variant="outline"
          >
            {priorityLabels[task.priority]}
          </Badge>

          <div className="flex items-center gap-3 text-gray-500">
            {task.dueDate && (
              <div className="flex items-center gap-1 text-[11px] font-medium">
                <Calendar className="w-3 h-3" />
                {format(new Date(task.dueDate), "d MMM", { locale: es })}
              </div>
            )}
            {hasSubtasks && (
              <div className="flex items-center gap-1 text-[11px] font-medium">
                <CheckSquare className="w-3 h-3" />
                {completedSubtasks}/{totalSubtasks}
              </div>
            )}
          </div>
        </div>

        {/* Subtasks counter / progress (solo cuando está colapsado) */}
        {hasSubtasks && !isExpanded && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-400 ml-6">
            <CheckSquare className="w-3.5 h-3.5" />
            <span
              className={cn(
                completedSubtasks === totalSubtasks &&
                  "text-green-400 font-medium",
              )}
            >
              {completedSubtasks}/{totalSubtasks}
            </span>
            <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  completedSubtasks === totalSubtasks
                    ? "bg-green-500"
                    : "bg-blue-500",
                )}
                style={{
                  width: `${(completedSubtasks / totalSubtasks) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Tags */}
        {task.tags && task.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5 ml-6">
            {task.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 bg-gray-800 text-gray-400 rounded-md text-[10px] font-medium border border-gray-700/50 transition-colors group-hover:border-gray-600"
              >
                {tag}
              </span>
            ))}
            {task.tags.length > 4 && (
              <span className="px-1.5 py-0.5 text-gray-600 text-[10px] font-bold">
                +{task.tags.length - 4}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Lista de subtareas expandible */}
      {hasSubtasks && isExpanded && (
        <div className="px-3 pb-3 border-t border-gray-700">
          <div className="space-y-1 pt-2 ml-6">
            {task.subtasks?.map((subtask) => (
              <div
                key={subtask.id}
                onClick={(e) =>
                  isSnapshot ? undefined : handleToggleSubtask(e, subtask.id)
                }
                className={cn(
                  "flex items-center gap-2 py-1.5 px-2 rounded transition-colors",
                  isSnapshot ? "cursor-default" : "cursor-pointer",
                  "hover:bg-gray-700",
                  subtask.completed && "bg-green-900/30 hover:bg-green-900/50",
                )}
              >
                {subtask.completed ? (
                  <CheckSquare className="w-4 h-4 text-green-500 flex-shrink-0" />
                ) : (
                  <Square className="w-4 h-4 text-gray-500 flex-shrink-0" />
                )}
                <span
                  className={cn(
                    "text-sm text-gray-200",
                    subtask.completed && "line-through text-gray-500",
                  )}
                >
                  {subtask.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
