"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  History,
  Calendar,
  Camera,
  Clock,
  Eye,
  Trash2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KanbanBoard } from "@/components/board/kanban-board";
import { snapshotsApi } from "@/lib/api";
import { TaskStatus, type Snapshot, type BoardData } from "@/types";

export default function SnapshotsPage() {
  const [selectedSnapshot, setSelectedSnapshot] = useState<Snapshot | null>(
    null,
  );
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const { data: snapshots, isLoading } = useQuery({
    queryKey: ["snapshots"],
    queryFn: () => snapshotsApi.getAll(),
  });

  const handleViewSnapshot = async (snapshot: Snapshot) => {
    setIsLoadingDetail(true);
    try {
      const detail = await snapshotsApi.getOne(snapshot.id);
      setSelectedSnapshot(detail);
    } catch (error) {
      console.error("Error loading snapshot:", error);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleCloseSnapshot = () => {
    setSelectedSnapshot(null);
  };

  // Convert snapshot payload to BoardData format
  const snapshotToBoardData = (snapshot: Snapshot): BoardData => {
    if (!snapshot.payload) {
      return {
        [TaskStatus.TODO]: [],
        [TaskStatus.DOING]: [],
        [TaskStatus.BLOCKED]: [],
        [TaskStatus.DONE]: [],
      };
    }

    const boardData: BoardData = {
      [TaskStatus.TODO]: [],
      [TaskStatus.DOING]: [],
      [TaskStatus.BLOCKED]: [],
      [TaskStatus.DONE]: [],
    };

    for (const column of snapshot.payload.columns) {
      const status = column.id as TaskStatus;
      boardData[status] = column.taskIds.map((taskId) => {
        const taskData = snapshot.payload!.tasks[taskId];
        return {
          id: taskData.id,
          clientId: taskData.clientId,
          client: { name: taskData.clientName } as any,
          title: taskData.title,
          description: taskData.description || undefined,
          status: taskData.status as TaskStatus,
          priority: taskData.priority as any,
          dueDate: taskData.dueDate || undefined,
          tags: taskData.tags || undefined,
          position: taskData.position,
          isArchived: false,
          createdAt: "",
          updatedAt: "",
        };
      });
    }

    return boardData;
  };

  if (selectedSnapshot) {
    return (
      <div className="h-full flex flex-col">
        <header className="bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800 px-4 lg:px-6 py-4 pt-16 lg:pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <div>
                <h1 className="text-base lg:text-lg font-bold text-amber-800 dark:text-amber-200">
                  Snapshot: {selectedSnapshot.name}
                </h1>
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  {format(
                    new Date(selectedSnapshot.capturedAt),
                    "d 'de' MMMM yyyy 'a las' HH:mm",
                    {
                      locale: es,
                    },
                  )}
                  {" • "}
                  <span className="font-medium">Solo lectura</span>
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={handleCloseSnapshot}>
              Cerrar
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-hidden">
          <KanbanBoard
            data={snapshotToBoardData(selectedSnapshot)}
            onTaskMove={() => {}}
            isSnapshot
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 lg:px-6 py-4 pt-16 lg:pt-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
              Snapshots
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Historial de estados del board
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-4 lg:p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : !snapshots || snapshots.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <History className="w-12 h-12 mb-4" />
            <p>No hay snapshots guardados</p>
            <p className="text-sm mt-2">
              Usa el botón "Guardar snapshot" en el Board para crear uno
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Group by date */}
            {groupSnapshotsByDate(snapshots).map(({ date, items }) => (
              <div key={date}>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {date}
                </h3>
                <div className="space-y-2">
                  {items.map((snapshot) => (
                    <Card
                      key={snapshot.id}
                      className="hover:shadow-md transition-shadow dark:bg-gray-800 dark:border-gray-700"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                              <Camera className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900 dark:text-white">
                                {snapshot.name}
                              </h4>
                              <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                <Clock className="w-3 h-3" />
                                {format(
                                  new Date(snapshot.capturedAt),
                                  "HH:mm",
                                  {
                                    locale: es,
                                  },
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge
                              variant={
                                snapshot.type === "auto"
                                  ? "secondary"
                                  : "outline"
                              }
                            >
                              {snapshot.type === "auto"
                                ? "Automático"
                                : "Manual"}
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewSnapshot(snapshot)}
                              disabled={isLoadingDetail}
                            >
                              {isLoadingDetail ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <Eye className="w-4 h-4 mr-2" />
                                  Ver
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function groupSnapshotsByDate(snapshots: Snapshot[]) {
  const groups: Record<string, Snapshot[]> = {};

  for (const snapshot of snapshots) {
    const date = format(new Date(snapshot.capturedAt), "d 'de' MMMM yyyy", {
      locale: es,
    });
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(snapshot);
  }

  return Object.entries(groups).map(([date, items]) => ({
    date,
    items: items.sort(
      (a, b) =>
        new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime(),
    ),
  }));
}
