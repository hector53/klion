"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn, priorityLabels, statusLabels } from "@/lib/utils";
import { TaskPriority, type Task } from "@/types";

const PRIORITY_VARIANTS: Record<string, "info" | "warning" | "destructive"> = {
  [TaskPriority.LOW]: "info",
  [TaskPriority.MEDIUM]: "warning",
  [TaskPriority.HIGH]: "destructive",
};

interface PublicTaskDetailProps {
  task: Task | null;
  onClose: () => void;
}

/**
 * Read-only task detail for the client-facing share link.
 *
 * Deliberately not TaskModal: that one reads the space context and fetches
 * files/subtasks through authenticated endpoints, neither of which exists for
 * an anonymous visitor. Everything shown here comes from the public payload.
 */
export function PublicTaskDetail({ task, onClose }: PublicTaskDetailProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  if (!task) return null;

  const subtasks = task.subtasks ?? [];
  const completedSubtasks = subtasks.filter((s) => s.completed).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-xl border border-white/10 bg-[#111827] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 border-b border-white/10 p-5">
          <div className="min-w-0">
            {task.taskCode && (
              <span className="text-xs font-mono text-slate-500">
                {task.taskCode}
              </span>
            )}
            <h2 className="text-xl font-semibold text-white break-words">
              {task.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="space-y-5 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">
              {statusLabels[task.status] ?? task.status}
            </Badge>
            {task.priority && (
              <Badge variant={PRIORITY_VARIANTS[task.priority] ?? "info"}>
                {priorityLabels[task.priority] ?? task.priority}
              </Badge>
            )}
            {task.dueDate && (
              <span className="text-xs text-slate-400">
                Vence: {new Date(task.dueDate).toLocaleDateString("es-ES")}
              </span>
            )}
          </div>

          {task.description ? (
            <div
              className="prose prose-invert prose-sm max-w-none break-words [&_img]:max-w-full [&_img]:h-auto"
              dangerouslySetInnerHTML={{ __html: task.description }}
            />
          ) : (
            <p className="text-sm text-slate-500">Sin descripción.</p>
          )}

          {subtasks.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium text-slate-300">
                Subtareas ({completedSubtasks}/{subtasks.length})
              </h3>
              <ul className="space-y-1.5">
                {subtasks.map((subtask) => (
                  <li
                    key={subtask.id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <span
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px]",
                        subtask.completed
                          ? "border-green-500 bg-green-500/20 text-green-400"
                          : "border-white/20",
                      )}
                    >
                      {subtask.completed ? "✓" : ""}
                    </span>
                    <span
                      className={cn(
                        "break-words",
                        subtask.completed
                          ? "text-slate-500 line-through"
                          : "text-slate-200",
                      )}
                    >
                      {subtask.title}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {task.tags && task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {task.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
