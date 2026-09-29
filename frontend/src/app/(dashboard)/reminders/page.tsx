"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Plus,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { tasksApi } from "@/lib/api";
import { useSpace } from "@/contexts/space-context";
import { SpaceType, TaskType, TaskStatus, type Task } from "@/types";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { TaskModal } from "@/components/modals/task-modal";

type ViewMode = "timeline" | "calendar";

interface GroupedReminders {
  overdue: Task[];
  today: Task[];
  tomorrow: Task[];
  thisWeek: Task[];
  later: Task[];
  completed: Task[];
}

export default function RemindersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { currentSpace } = useSpace();
  const isPersonalSpace = currentSpace?.type === SpaceType.PERSONAL;

  const [viewMode, setViewMode] = useState<ViewMode>("timeline");
  const [selectedReminder, setSelectedReminder] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Redirect if not in personal space
  useEffect(() => {
    if (currentSpace && !isPersonalSpace) {
      router.push("/board");
    }
  }, [currentSpace, isPersonalSpace, router]);

  // Show loading while checking space type
  if (!currentSpace || !isPersonalSpace) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Fetch all tasks and filter for reminders
  const { data: boardData, isLoading } = useQuery({
    queryKey: ["board"],
    queryFn: () => tasksApi.getBoard(),
  });

  // Filter reminders for current space
  const reminders = useMemo(() => {
    if (!boardData || !currentSpace) return [];

    const allTasks = Object.values(boardData).flat();
    return allTasks.filter((task) => {
      // Only reminders
      if (task.type !== TaskType.REMINDER) return false;
      // Only from current space
      if (task.project?.spaceId !== currentSpace.id) return false;
      return true;
    });
  }, [boardData, currentSpace]);

  // Group reminders by date
  const groupedReminders = useMemo((): GroupedReminders => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const endOfWeek = new Date(today);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    const groups: GroupedReminders = {
      overdue: [],
      today: [],
      tomorrow: [],
      thisWeek: [],
      later: [],
      completed: [],
    };

    reminders.forEach((reminder) => {
      if (reminder.status === TaskStatus.DONE) {
        groups.completed.push(reminder);
        return;
      }

      const dueDate = reminder.dueDate ? new Date(reminder.dueDate) : null;
      
      if (!dueDate) {
        groups.later.push(reminder);
        return;
      }

      const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());

      if (dueDateOnly < today) {
        groups.overdue.push(reminder);
      } else if (dueDateOnly.getTime() === today.getTime()) {
        groups.today.push(reminder);
      } else if (dueDateOnly.getTime() === tomorrow.getTime()) {
        groups.tomorrow.push(reminder);
      } else if (dueDateOnly < endOfWeek) {
        groups.thisWeek.push(reminder);
      } else {
        groups.later.push(reminder);
      }
    });

    // Sort each group by dueDate
    const sortByDate = (a: Task, b: Task) => {
      const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      return dateA - dateB;
    };

    Object.keys(groups).forEach((key) => {
      groups[key as keyof GroupedReminders].sort(sortByDate);
    });

    return groups;
  }, [reminders]);

  // Complete reminder mutation
  const completeMutation = useMutation({
    mutationFn: (taskId: string) =>
      tasksApi.update(taskId, { status: TaskStatus.DONE }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board"] });
      toast.success("Recordatorio completado");
    },
  });

  // Delete reminder mutation
  const deleteMutation = useMutation({
    mutationFn: (taskId: string) => tasksApi.delete(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board"] });
      toast.success("Recordatorio eliminado");
    },
  });

  const handleComplete = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    completeMutation.mutate(taskId);
  };

  const handleDelete = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("¿Eliminar este recordatorio?")) {
      deleteMutation.mutate(taskId);
    }
  };

  const handleReminderClick = (reminder: Task) => {
    setSelectedReminder(reminder);
    setIsModalOpen(true);
  };

  const handleCreateNew = () => {
    setSelectedReminder(null);
    setIsModalOpen(true);
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Sin fecha";
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES", { 
      weekday: "short", 
      day: "numeric", 
      month: "short" 
    });
  };

  const ReminderCard = ({ reminder, showDate = false }: { reminder: Task; showDate?: boolean }) => {
    const isOverdue = reminder.dueDate && new Date(reminder.dueDate) < new Date() && reminder.status !== TaskStatus.DONE;
    const isCompleted = reminder.status === TaskStatus.DONE;

    return (
      <div
        onClick={() => handleReminderClick(reminder)}
        className={cn(
          "group flex items-start gap-3 p-4 rounded-xl border transition-all cursor-pointer",
          isCompleted
            ? "bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800 opacity-60"
            : isOverdue
              ? "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/50 hover:border-red-300"
              : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-primary/50 hover:shadow-md"
        )}
      >
        {/* Complete button */}
        <button
          onClick={(e) => handleComplete(reminder.id, e)}
          className={cn(
            "flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors mt-0.5",
            isCompleted
              ? "bg-green-500 border-green-500 text-white"
              : "border-gray-300 dark:border-gray-600 hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20"
          )}
        >
          {isCompleted && <CheckCircle2 className="w-4 h-4" />}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3
            className={cn(
              "font-medium text-gray-900 dark:text-white",
              isCompleted && "line-through text-gray-500"
            )}
          >
            {reminder.title}
          </h3>
          {reminder.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
              {reminder.description}
            </p>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs">
            {reminder.dueDate && (
              <span
                className={cn(
                  "flex items-center gap-1",
                  isOverdue ? "text-red-500" : "text-gray-500 dark:text-gray-400"
                )}
              >
                <Clock className="w-3.5 h-3.5" />
                {showDate ? formatDate(reminder.dueDate) : formatTime(reminder.dueDate)}
              </span>
            )}
            {reminder.project && (
              <span className="text-gray-400 dark:text-gray-500">
                {reminder.project.name}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleReminderClick(reminder);
            }}
            className="p-1.5 text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => handleDelete(reminder.id, e)}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  const TimelineSection = ({ 
    title, 
    reminders, 
    icon: Icon, 
    iconColor,
    showDate = false 
  }: { 
    title: string; 
    reminders: Task[]; 
    icon: typeof Bell;
    iconColor: string;
    showDate?: boolean;
  }) => {
    if (reminders.length === 0) return null;

    return (
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <div className={cn("p-1.5 rounded-lg", iconColor)}>
            <Icon className="w-4 h-4" />
          </div>
          <h2 className="font-semibold text-gray-900 dark:text-white">
            {title}
          </h2>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            ({reminders.length})
          </span>
        </div>
        <div className="space-y-3 pl-8">
          {reminders.map((reminder) => (
            <ReminderCard key={reminder.id} reminder={reminder} showDate={showDate} />
          ))}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const totalReminders = reminders.filter(r => r.status !== TaskStatus.DONE).length;
  const overdueCount = groupedReminders.overdue.length;

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 pt-16 lg:pt-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Bell className="w-7 h-7 text-amber-500" />
              Recordatorios
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {totalReminders} {totalReminders === 1 ? "recordatorio pendiente" : "recordatorios pendientes"}
              {overdueCount > 0 && (
                <span className="text-red-500 ml-2">
                  • {overdueCount} vencido{overdueCount > 1 ? "s" : ""}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* View toggle */}
            <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setViewMode("timeline")}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                  viewMode === "timeline"
                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                )}
              >
                <Clock className="w-4 h-4 inline-block mr-1.5" />
                Timeline
              </button>
              <button
                onClick={() => setViewMode("calendar")}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                  viewMode === "calendar"
                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                )}
              >
                <Calendar className="w-4 h-4 inline-block mr-1.5" />
                Calendario
              </button>
            </div>
            <Button onClick={handleCreateNew} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Nuevo recordatorio
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {viewMode === "timeline" ? (
          <div className="max-w-3xl mx-auto">
            {reminders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <Bell className="w-16 h-16 text-gray-300 dark:text-gray-700 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No tienes recordatorios
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Los recordatorios te ayudan a no olvidar cosas importantes
                </p>
                <Button onClick={handleCreateNew} variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Crear tu primer recordatorio
                </Button>
              </div>
            ) : (
              <>
                <TimelineSection
                  title="Vencidos"
                  reminders={groupedReminders.overdue}
                  icon={AlertTriangle}
                  iconColor="bg-red-100 dark:bg-red-900/30 text-red-500"
                  showDate
                />
                <TimelineSection
                  title="Hoy"
                  reminders={groupedReminders.today}
                  icon={Clock}
                  iconColor="bg-amber-100 dark:bg-amber-900/30 text-amber-500"
                />
                <TimelineSection
                  title="Mañana"
                  reminders={groupedReminders.tomorrow}
                  icon={Calendar}
                  iconColor="bg-blue-100 dark:bg-blue-900/30 text-blue-500"
                />
                <TimelineSection
                  title="Esta semana"
                  reminders={groupedReminders.thisWeek}
                  icon={Calendar}
                  iconColor="bg-purple-100 dark:bg-purple-900/30 text-purple-500"
                  showDate
                />
                <TimelineSection
                  title="Más adelante"
                  reminders={groupedReminders.later}
                  icon={Calendar}
                  iconColor="bg-gray-100 dark:bg-gray-800 text-gray-500"
                  showDate
                />
                <TimelineSection
                  title="Completados"
                  reminders={groupedReminders.completed}
                  icon={CheckCircle2}
                  iconColor="bg-green-100 dark:bg-green-900/30 text-green-500"
                  showDate
                />
              </>
            )}
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            {/* Calendar view - simplified month view */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {currentMonth.toLocaleDateString("es-ES", { month: "long", year: "numeric" })}
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const prev = new Date(currentMonth);
                      prev.setMonth(prev.getMonth() - 1);
                      setCurrentMonth(prev);
                    }}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setCurrentMonth(new Date())}
                    className="px-3 py-1 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                  >
                    Hoy
                  </button>
                  <button
                    onClick={() => {
                      const next = new Date(currentMonth);
                      next.setMonth(next.getMonth() + 1);
                      setCurrentMonth(next);
                    }}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {/* Day headers */}
                {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((day) => (
                  <div
                    key={day}
                    className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-2"
                  >
                    {day}
                  </div>
                ))}

                {/* Calendar days */}
                {(() => {
                  const year = currentMonth.getFullYear();
                  const month = currentMonth.getMonth();
                  const firstDay = new Date(year, month, 1);
                  const lastDay = new Date(year, month + 1, 0);
                  const startDay = (firstDay.getDay() + 6) % 7; // Monday = 0
                  const daysInMonth = lastDay.getDate();
                  const today = new Date();

                  const days = [];

                  // Empty cells before first day
                  for (let i = 0; i < startDay; i++) {
                    days.push(<div key={`empty-${i}`} className="h-24" />);
                  }

                  // Days of month
                  for (let day = 1; day <= daysInMonth; day++) {
                    const date = new Date(year, month, day);
                    const isToday = date.toDateString() === today.toDateString();
                    const dayReminders = reminders.filter((r) => {
                      if (!r.dueDate) return false;
                      const rDate = new Date(r.dueDate);
                      return (
                        rDate.getFullYear() === year &&
                        rDate.getMonth() === month &&
                        rDate.getDate() === day
                      );
                    });

                    days.push(
                      <div
                        key={day}
                        className={cn(
                          "h-24 p-1 border border-gray-100 dark:border-gray-800 rounded-lg",
                          isToday && "bg-primary/5 border-primary/30"
                        )}
                      >
                        <div
                          className={cn(
                            "text-sm font-medium mb-1",
                            isToday
                              ? "text-primary"
                              : "text-gray-700 dark:text-gray-300"
                          )}
                        >
                          {day}
                        </div>
                        <div className="space-y-0.5 overflow-hidden">
                          {dayReminders.slice(0, 2).map((r) => (
                            <div
                              key={r.id}
                              onClick={() => handleReminderClick(r)}
                              className={cn(
                                "text-xs px-1.5 py-0.5 rounded truncate cursor-pointer",
                                r.status === TaskStatus.DONE
                                  ? "bg-gray-100 dark:bg-gray-800 text-gray-500 line-through"
                                  : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/50"
                              )}
                            >
                              {r.title}
                            </div>
                          ))}
                          {dayReminders.length > 2 && (
                            <div className="text-xs text-gray-500 px-1.5">
                              +{dayReminders.length - 2} más
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }

                  return days;
                })()}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Task Modal */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedReminder(null);
        }}
        task={selectedReminder}
        defaultType={TaskType.REMINDER}
      />
    </div>
  );
}
