"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  Plus,
  ChevronDown,
  ChevronRight,
  Folder,
  Calendar,
  CheckCircle,
  Clock,
  Pencil,
  MoreHorizontal,
  CheckSquare,
  Square,
  ExternalLink,
  LayoutDashboard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProjectModal } from "@/components/modals/project-modal";
import { projectsApi, subtasksApi } from "@/lib/api";
import { cn, priorityColors, priorityLabels, statusLabels } from "@/lib/utils";
import { ProjectStatus, TaskStatus, type Project, type Task } from "@/types";
import { getDomainConfig } from "@/lib/domains";

interface ProjectsSectionProps {
  clientId: string;
  clientName: string;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onAddTask: (projectId?: string) => void;
}

const projectStatusStyles = {
  [ProjectStatus.ACTIVE]: {
    label: "Activo",
    color: "text-green-600 bg-green-50",
  },
  [ProjectStatus.ON_HOLD]: {
    label: "En pausa",
    color: "text-yellow-600 bg-yellow-50",
  },
  [ProjectStatus.COMPLETED]: {
    label: "Completado",
    color: "text-blue-600 bg-blue-50",
  },
  [ProjectStatus.CANCELLED]: {
    label: "Cancelado",
    color: "text-gray-600 bg-gray-50",
  },
};

export function ProjectsSection({
  clientId,
  clientName,
  tasks,
  onTaskClick,
  onAddTask,
}: ProjectsSectionProps) {
  const queryClient = useQueryClient();
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(
    new Set(),
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects", "client", clientId],
    queryFn: () => projectsApi.getByClient(clientId),
  });

  // Tareas sin proyecto asignado
  const unassignedTasks = tasks.filter((t) => !t.projectId);

  const toggleProject = (projectId: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  };

  const handleEditProject = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedProject(project);
    setIsModalOpen(true);
  };

  const handleNewProject = () => {
    setSelectedProject(null);
    setIsModalOpen(true);
  };

  const getProjectProgress = (project: Project) => {
    const projectTasks = tasks.filter((t) => t.projectId === project.id);
    const total = projectTasks.length;
    const completed = projectTasks.filter(
      (t) => t.status === TaskStatus.DONE,
    ).length;
    return {
      total,
      completed,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  };

  const toggleSubtaskMutation = useMutation({
    mutationFn: (subtaskId: string) => subtasksApi.toggle(subtaskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Folder className="w-5 h-5" />
            Proyectos
          </CardTitle>
          <Button size="sm" onClick={handleNewProject}>
            <Plus className="w-4 h-4 mr-1" />
            Nuevo Proyecto
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Cargando proyectos...
            </p>
          ) : projects.length === 0 && unassignedTasks.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              No hay proyectos ni tareas. Crea un proyecto para organizar el
              trabajo.
            </p>
          ) : (
            <>
              {/* Proyectos */}
              {projects.map((project) => {
                const isExpanded = expandedProjects.has(project.id);
                const projectTasks = tasks.filter(
                  (t) => t.projectId === project.id,
                );
                const progress = getProjectProgress(project);
                const statusStyle = projectStatusStyles[project.status];

                return (
                  <div
                    key={project.id}
                    className="border dark:border-gray-700 rounded-lg overflow-hidden"
                    style={{
                      borderLeftColor: project.color,
                      borderLeftWidth: "4px",
                    }}
                  >
                    {/* Header del proyecto */}
                    <div
                      onClick={() => toggleProject(project.id)}
                      className="p-3 bg-gray-50 dark:bg-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        )}
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: project.color }}
                        />
                        {project.domain && (
                          <span
                            className="text-base"
                            title={getDomainConfig(project.domain).label}
                          >
                            {getDomainConfig(project.domain).icon}
                          </span>
                        )}
                        <span className="font-medium text-gray-900 dark:text-white flex-1">
                          {project.name}
                        </span>
                        <Badge className={cn("text-xs", statusStyle.color)}>
                          {statusStyle.label}
                        </Badge>
                        <Link
                          href={`/projects/${project.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="p-1 text-gray-400 hover:text-primary transition-colors"
                          title="Ver Dashboard del proyecto"
                        >
                          <LayoutDashboard className="w-4 h-4" />
                        </Link>
                        <Link
                          href={`/board?clientId=${clientId}&projectId=${project.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="p-1 text-gray-400 hover:text-primary transition-colors"
                          title="Ver en Board"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={(e) => handleEditProject(project, e)}
                          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Progress bar y stats */}
                      <div className="mt-2 flex items-center gap-3 ml-6">
                        <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${progress.percentage}%`,
                              backgroundColor: project.color,
                            }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {progress.completed}/{progress.total} tareas
                        </span>
                        {project.dueDate && (
                          <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(project.dueDate).toLocaleDateString(
                              "es-ES",
                            )}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Lista de tareas del proyecto */}
                    {isExpanded && (
                      <div className="p-3 space-y-2 bg-white dark:bg-gray-900">
                        {projectTasks.length === 0 ? (
                          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-2">
                            No hay tareas en este proyecto
                          </p>
                        ) : (
                          projectTasks.map((task) => (
                            <TaskItem
                              key={task.id}
                              task={task}
                              onClick={() => onTaskClick(task)}
                              onToggleSubtask={(subtaskId) =>
                                toggleSubtaskMutation.mutate(subtaskId)
                              }
                            />
                          ))
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-gray-500"
                          onClick={() => onAddTask(project.id)}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Añadir tarea al proyecto
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Tareas sin proyecto */}
              {unassignedTasks.length > 0 && (
                <div className="border dark:border-gray-700 rounded-lg overflow-hidden border-l-4 border-l-gray-300 dark:border-l-gray-600">
                  <div
                    onClick={() => toggleProject("unassigned")}
                    className="p-3 bg-gray-50 dark:bg-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {expandedProjects.has("unassigned") ? (
                        <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      )}
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        Tareas sin proyecto
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {unassignedTasks.length}
                      </Badge>
                    </div>
                  </div>

                  {expandedProjects.has("unassigned") && (
                    <div className="p-3 space-y-2 bg-white dark:bg-gray-900">
                      {unassignedTasks.map((task) => (
                        <TaskItem
                          key={task.id}
                          task={task}
                          onClick={() => onTaskClick(task)}
                          onToggleSubtask={(subtaskId) =>
                            toggleSubtaskMutation.mutate(subtaskId)
                          }
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <ProjectModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedProject(null);
        }}
        project={selectedProject}
        clientId={clientId}
        clientName={clientName}
      />
    </>
  );
}

// Componente interno para items de tarea
interface TaskItemProps {
  task: Task;
  onClick: () => void;
  onToggleSubtask: (subtaskId: string) => void;
}

function TaskItem({ task, onClick, onToggleSubtask }: TaskItemProps) {
  const [showSubtasks, setShowSubtasks] = useState(false);

  const hasSubtasks = task.subtasks && task.subtasks.length > 0;
  const completedSubtasks =
    task.subtasks?.filter((s) => s.completed).length || 0;
  const totalSubtasks = task.subtasks?.length || 0;

  const statusIcon =
    task.status === TaskStatus.DONE ? (
      <CheckCircle className="w-4 h-4 text-green-500" />
    ) : task.status === TaskStatus.DOING ? (
      <Clock className="w-4 h-4 text-blue-500" />
    ) : (
      <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
    );

  return (
    <div className="group">
      <div
        className={cn(
          "flex items-center gap-2 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors",
          task.status === TaskStatus.DONE && "opacity-60",
        )}
      >
        {/* Expandir subtareas */}
        {hasSubtasks ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowSubtasks(!showSubtasks);
            }}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <ChevronRight
              className={cn(
                "w-4 h-4 transition-transform",
                showSubtasks && "rotate-90",
              )}
            />
          </button>
        ) : (
          <div className="w-4" />
        )}

        {statusIcon}

        <div className="flex-1 min-w-0 cursor-pointer" onClick={onClick}>
          <p
            className={cn(
              "text-sm font-medium text-gray-900 dark:text-white truncate",
              task.status === TaskStatus.DONE && "line-through",
            )}
          >
            {task.title}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasSubtasks && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {completedSubtasks}/{totalSubtasks}
            </span>
          )}
          <Badge
            variant="outline"
            className={cn("text-xs", priorityColors[task.priority])}
          >
            {priorityLabels[task.priority]}
          </Badge>
        </div>
      </div>

      {/* Subtareas expandidas */}
      {hasSubtasks && showSubtasks && (
        <div className="ml-10 space-y-1 py-1">
          {task.subtasks?.map((subtask) => (
            <div
              key={subtask.id}
              onClick={() => onToggleSubtask(subtask.id)}
              className={cn(
                "flex items-center gap-2 py-1 px-2 rounded cursor-pointer transition-colors",
                "hover:bg-gray-100 dark:hover:bg-gray-800",
                subtask.completed && "bg-green-50 dark:bg-green-900/20",
              )}
            >
              {subtask.completed ? (
                <CheckSquare className="w-4 h-4 text-green-500" />
              ) : (
                <Square className="w-4 h-4 text-gray-400" />
              )}
              <span
                className={cn(
                  "text-sm dark:text-gray-300",
                  subtask.completed &&
                    "line-through text-gray-400 dark:text-gray-500",
                )}
              >
                {subtask.title}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
