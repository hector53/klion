"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  sortableKeyboardCoordinates,
  SortableContext,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Settings2 } from "lucide-react";
import { BoardColumn } from "./board-column";
import { TaskCard } from "./task-card";
import { Button } from "@/components/ui/button";
import { boardColumnsApi } from "@/lib/api";
import { statusLabels } from "@/lib/utils";
import { TaskStatus, type Task, type BoardData } from "@/types";

interface KanbanBoardProps {
  data: BoardData;
  onTaskMove: (
    taskId: string,
    newStatus: TaskStatus,
    newPosition: number,
  ) => void;
  onTaskClick?: (task: Task) => void;
  onAddTask?: (status: TaskStatus) => void;
  onOpenColumnSettings?: () => void;
  isSnapshot?: boolean;
  /**
   * El backend recorta la columna "done" a las N más recientes (ver `doneLimit` en
   * `GET /tasks/board`). Cuando eso pasa, la columna lo avisa en vez de mentir con
   * un contador parcial.
   */
  doneLimit?: number;
  doneCapped?: boolean;
}

type BoardColumnItem = {
  id: TaskStatus;
  title: string;
  key: string;
  color?: string;
  backendId?: string;
};

// Columnas por defecto (fallback si no hay backend disponible)
const defaultColumns: BoardColumnItem[] = [
  { id: TaskStatus.TODO, title: statusLabels.todo, key: "todo" },
  { id: TaskStatus.DOING, title: statusLabels.doing, key: "doing" },
  { id: TaskStatus.BLOCKED, title: statusLabels.blocked, key: "blocked" },
  { id: TaskStatus.DONE, title: statusLabels.done, key: "done" },
];

export function KanbanBoard({
  data,
  onTaskMove,
  onTaskClick,
  onAddTask,
  onOpenColumnSettings,
  isSnapshot = false,
  doneLimit,
  doneCapped = false,
}: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [activeColumn, setActiveColumn] = useState<any | null>(null);
  const [activeTaskOriginalStatus, setActiveTaskOriginalStatus] =
    useState<TaskStatus | null>(null);
  const [localData, setLocalData] = useState<BoardData>(data);
  const queryClient = useQueryClient();

  // Mutation for reordering columns
  const reorderColumnsMutation = useMutation({
    mutationFn: (columnIds: string[]) => boardColumnsApi.reorder(columnIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board-columns"] });
    },
  });

  // Fetch columnas del backend (solo si no es snapshot)
  const { data: backendColumns } = useQuery({
    queryKey: ["board-columns"],
    queryFn: () => boardColumnsApi.getVisible(),
    enabled: !isSnapshot,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  // Procesar columnas: usar backend si disponible, si no usar default
  const columns = useMemo(() => {
    if (backendColumns && backendColumns.length > 0) {
      return backendColumns
        .filter((col) => !col.isHidden)
        .sort((a, b) => a.position - b.position)
        .map((col) => ({
          id: col.key as TaskStatus,
          title: col.name,
          key: col.key,
          color: col.color,
          backendId: col.id,
        }));
    }
    return defaultColumns;
  }, [backendColumns]);

  // Update local data when props change (from server)
  useEffect(() => {
    setLocalData(data);
  }, [data]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const findTask = useCallback(
    (id: string): Task | undefined => {
      // Buscar en todas las columnas disponibles en localData
      for (const status of Object.keys(localData)) {
        const task = localData[status]?.find((t) => t.id === id);
        if (task) return task;
      }
      return undefined;
    },
    [localData],
  );

  const findContainerInData = (
    id: string,
    boardData: BoardData,
  ): string | undefined => {
    // Check if id is a column (key)
    if (Object.keys(boardData).includes(id)) {
      return id;
    }

    // Find which column contains this task
    for (const status of Object.keys(boardData)) {
      if (boardData[status]?.some((t) => t.id === id)) {
        return status;
      }
    }
    return undefined;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;

    if (active.data.current?.type === "Column") {
      const column = columns.find((c) => c.id === active.id);
      if (column) setActiveColumn(column);
      return;
    }

    const task = findTask(active.id as string);
    if (task) {
      setActiveTask(task);
      setActiveTaskOriginalStatus(task.status);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    // We don't need handleDragOver for columns as they are in a single context
    if (active.data.current?.type === "Column") return;

    const activeId = active.id as string;
    const overId = over.id as string;

    setLocalData((currentData) => {
      const activeContainer = findContainerInData(activeId, currentData);
      const overContainer = findContainerInData(overId, currentData);

      // Only handle cross-column moves
      if (
        !activeContainer ||
        !overContainer ||
        activeContainer === overContainer
      ) {
        return currentData;
      }

      const activeItems = [...(currentData[activeContainer] || [])];
      const overItems = [...(currentData[overContainer] || [])];
      const activeIndex = activeItems.findIndex((t) => t.id === activeId);

      if (activeIndex === -1) return currentData;

      const overIndex = overItems.findIndex((t) => t.id === overId);

      let newIndex: number;
      if (Object.keys(currentData).includes(overId)) {
        newIndex = overItems.length;
      } else {
        newIndex = overIndex >= 0 ? overIndex : overItems.length;
      }

      const [movedTask] = activeItems.splice(activeIndex, 1);
      // Actualizar status temporalmente para la UI
      movedTask.status = overContainer as TaskStatus;
      overItems.splice(newIndex, 0, movedTask);

      return {
        ...currentData,
        [activeContainer]: activeItems,
        [overContainer]: overItems,
      };
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    const originalStatus = activeTaskOriginalStatus;
    setActiveTask(null);
    setActiveTaskOriginalStatus(null);
    setActiveColumn(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Handle Column Reordering
    if (active.data.current?.type === "Column") {
      if (activeId !== overId) {
        const oldIndex = columns.findIndex((c) => c.id === activeId);
        const newIndex = columns.findIndex((c) => c.id === overId);
        const newColumns = arrayMove(columns, oldIndex, newIndex);

        const backendIds = newColumns
          .map((c) => c.backendId)
          .filter(Boolean) as string[];
        if (backendIds.length > 0) {
          reorderColumnsMutation.mutate(backendIds);
        }
      }
      return;
    }

    if (!originalStatus) return;

    setLocalData((currentData) => {
      // Find where the task currently is (might have been moved by dragOver)
      const currentContainer = findContainerInData(activeId, currentData);
      if (!currentContainer) return currentData;

      const currentItems = currentData[currentContainer] || [];
      const currentIndex = currentItems.findIndex((t) => t.id === activeId);

      if (currentContainer === originalStatus) {
        // Same column as original - just reordering within the column
        const overIndex = currentItems.findIndex((t) => t.id === overId);

        if (
          currentIndex !== -1 &&
          overIndex !== -1 &&
          currentIndex !== overIndex
        ) {
          const newItems = arrayMove(
            [...currentItems],
            currentIndex,
            overIndex,
          );

          // Call API to persist
          onTaskMove(activeId, currentContainer as TaskStatus, overIndex);

          return {
            ...currentData,
            [currentContainer]: newItems,
          };
        } else {
          // No change needed
          return currentData;
        }
      } else {
        // Cross-column move (already done in dragOver, just need to persist)
        onTaskMove(activeId, currentContainer as TaskStatus, currentIndex);
        return currentData;
      }
    });
  };

  const columnFootnote = (columnId: TaskStatus) =>
    columnId === TaskStatus.DONE && doneCapped && doneLimit
      ? `Mostrando las ${doneLimit} completadas más recientes`
      : undefined;

  if (isSnapshot) {
    return (
      <div className="flex gap-4 p-4 overflow-x-auto">
        {columns.map((column) => (
          <BoardColumn
            key={column.id}
            id={column.id}
            title={column.title}
            tasks={localData[column.id] || []}
            onTaskClick={onTaskClick}
            isSnapshot
          />
        ))}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 p-4 overflow-x-auto">
        <SortableContext
          items={columns.map((c) => c.id)}
          strategy={horizontalListSortingStrategy}
        >
          {columns.map((column) => (
            <BoardColumn
              key={column.id}
              id={column.id}
              title={column.title}
              tasks={localData[column.id] || []}
              onAddTask={() => onAddTask?.(column.id)}
              onTaskClick={onTaskClick}
              footnote={columnFootnote(column.id)}
            />
          ))}
        </SortableContext>
      </div>

      <DragOverlay>
        {activeTask && <TaskCard task={activeTask} />}
        {activeColumn && (
          <BoardColumn
            id={activeColumn.id}
            title={activeColumn.title}
            tasks={localData[activeColumn.id] || []}
            isSnapshot
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}
