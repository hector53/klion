"use client";

import { useState, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { Archive, RefreshCw, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { TaskListView } from "@/components/board/task-list-view";
import { TaskModal } from "@/components/modals/task-modal";
import { Button } from "@/components/ui/button";
import { tasksApi } from "@/lib/api";
import { type Task } from "@/types";

function ArchivePageContent() {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  const {
    data: archivedData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["tasks", "archived-count"],
    queryFn: () => tasksApi.getAll({ isArchived: true, limit: 1 }),
  });

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsTaskModalOpen(true);
  };

  const handleCloseTaskModal = () => {
    setIsTaskModalOpen(false);
    setSelectedTask(null);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 lg:px-6 py-4 pt-16 lg:pt-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/board">
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <Archive className="w-5 h-5 text-gray-500" />
                <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
                  Archivo de Tareas
                </h1>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {isLoading ? "Cargando..." : `${archivedData?.total || 0} tareas archivadas en total`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Actualizar
            </Button>
          </div>
        </div>
      </header>

      {/* List View with Archive filter */}
      <div className="flex-1 overflow-hidden">
        <TaskListView
          filters={{ isArchived: true }}
          onTaskClick={handleTaskClick}
        />
      </div>

      {/* Task Modal for viewing/editing archived tasks */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={handleCloseTaskModal}
        task={selectedTask}
      />
    </div>
  );
}

export default function ArchivePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-full">
          <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      }
    >
      <ArchivePageContent />
    </Suspense>
  );
}
