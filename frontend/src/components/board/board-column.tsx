"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Archive } from "lucide-react";
import { useState } from "react";
import { TaskCard } from "./task-card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { ConfirmModal } from "@/components/modals/confirm-modal";
import { tasksApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { TaskStatus, type Task } from "@/types";

interface BoardColumnProps {
  id: TaskStatus;
  title: string;
  tasks: Task[];
  onAddTask?: () => void;
  onTaskClick?: (task: Task) => void;
  isSnapshot?: boolean;
  /** Aviso bajo el header, p.ej. cuando la columna viene recortada por el backend. */
  footnote?: string;
}

export function BoardColumn({
  id,
  title,
  tasks,
  onAddTask,
  onTaskClick,
  isSnapshot = false,
  footnote,
}: BoardColumnProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const clearCompletedMutation = useMutation({
    mutationFn: () => tasksApi.clearCompleted(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Tareas completadas archivadas");
      setShowClearConfirm(false);
    },
    onError: () => {
      toast.error("Error al archivar tareas completadas");
    },
  });

  const handleClearCompleted = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowClearConfirm(true);
  };

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    disabled: isSnapshot,
    data: {
      type: "Column",
    },
  });

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id,
    disabled: isSnapshot,
    data: {
      type: "Column",
    },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex flex-col w-80 min-w-[320px] rounded-lg border-2 transition-shadow bg-[#111827] border-gray-800/50",
        isOver && "ring-2 ring-primary ring-offset-2 dark:ring-offset-gray-900",
        isDragging && "opacity-50 border-primary/50 ring-2 ring-primary/20",
      )}
    >
      {/* Header */}
      <div
        {...attributes}
        {...listeners}
        className="flex items-center justify-between p-3 border-b border-gray-800 cursor-grab active:cursor-grabbing hover:bg-gray-800/30 transition-colors rounded-t-lg"
      >
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-100">{title}</h3>
          <span className="px-2 py-0.5 bg-gray-800 rounded-full text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            {tasks.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {!isSnapshot && id === TaskStatus.DONE && tasks.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-500 hover:text-blue-400 hover:bg-gray-800"
              onClick={handleClearCompleted}
              title="Archivar completadas"
              disabled={clearCompletedMutation.isPending}
            >
              <Archive className="w-3.5 h-3.5" />
            </Button>
          )}
          {!isSnapshot && onAddTask && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-400 hover:text-gray-100 hover:bg-gray-800"
              onClick={onAddTask}
            >
              <Plus className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {footnote && (
        <p className="px-3 py-1.5 text-[11px] text-gray-500 border-b border-gray-800/60">
          {footnote}
        </p>
      )}

      {/* Tasks */}
      <div
        ref={setDroppableRef}
        className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[200px] max-h-[calc(100vh-250px)]"
      >
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => onTaskClick?.(task)}
              isSnapshot={isSnapshot}
            />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className="flex items-center justify-center h-24 text-gray-400 dark:text-gray-500 text-sm">
            No hay tareas
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={() => clearCompletedMutation.mutate()}
        title="Archivar tareas completadas"
        message="¿Estás seguro de que quieres archivar todas las tareas completadas? Se ocultarán del tablero pero se mantendrán en el historial."
        confirmText="Archivar todas"
        variant="info"
        isLoading={clearCompletedMutation.isPending}
      />
    </div>
  );
}
