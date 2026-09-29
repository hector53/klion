"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Folder,
  CheckCircle2,
  Clock,
  AlertCircle,
  Users,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { projectsApi, clientsApi, tasksApi } from "@/lib/api";
import { useSpace } from "@/contexts/space-context";
import { SpaceType, type Project, type Client, TaskStatus } from "@/types";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface ProjectFormData {
  name: string;
  description: string;
  clientId: string;
  color: string;
}

const defaultColors = [
  "#3B82F6", // blue
  "#10B981", // emerald
  "#F59E0B", // amber
  "#EF4444", // red
  "#8B5CF6", // violet
  "#EC4899", // pink
  "#06B6D4", // cyan
  "#84CC16", // lime
];

export default function ProjectsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { currentSpace } = useSpace();
  const isWorkSpace = currentSpace?.type === SpaceType.WORK;

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClientFilter, setSelectedClientFilter] = useState<string>("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deleteConfirmProject, setDeleteConfirmProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState<ProjectFormData>({
    name: "",
    description: "",
    clientId: "",
    color: defaultColors[0],
  });

  // Redirect if not in work space
  useEffect(() => {
    if (currentSpace && !isWorkSpace) {
      router.push("/board");
    }
  }, [currentSpace, isWorkSpace, router]);

  // Show loading while checking space type
  if (!currentSpace || !isWorkSpace) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Fetch clients
  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => clientsApi.getAll(),
  });

  // Fetch all projects (not space-filtered, since work projects have clientId)
  const { data: allProjects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => projectsApi.getAll(),
  });

  // Filter projects that belong to clients (work projects)
  const projects = useMemo(() => {
    return allProjects.filter((p: Project) => p.clientId);
  }, [allProjects]);

  // Fetch board data to count tasks per project
  const { data: boardData } = useQuery({
    queryKey: ["board"],
    queryFn: () => tasksApi.getBoard(),
  });

  // Calculate task counts per project
  const projectTaskCounts = useMemo(() => {
    if (!boardData) return {};
    
    const counts: Record<string, { todo: number; doing: number; done: number; blocked: number; total: number }> = {};
    
    Object.values(boardData).flat().forEach((task) => {
      if (task.projectId) {
        if (!counts[task.projectId]) {
          counts[task.projectId] = { todo: 0, doing: 0, done: 0, blocked: 0, total: 0 };
        }
        counts[task.projectId].total++;
        if (task.status === TaskStatus.TODO) counts[task.projectId].todo++;
        if (task.status === TaskStatus.DOING) counts[task.projectId].doing++;
        if (task.status === TaskStatus.DONE) counts[task.projectId].done++;
        if (task.status === TaskStatus.BLOCKED) counts[task.projectId].blocked++;
      }
    });
    
    return counts;
  }, [boardData]);

  // Filter projects by search and client
  const filteredProjects = useMemo(() => {
    let filtered = projects;
    
    if (selectedClientFilter) {
      filtered = filtered.filter((p: Project) => p.clientId === selectedClientFilter);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (project: Project) =>
          project.name.toLowerCase().includes(query) ||
          project.description?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [projects, searchQuery, selectedClientFilter]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: ProjectFormData) =>
      projectsApi.create({
        name: data.name,
        description: data.description,
        clientId: data.clientId,
        color: data.color,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Proyecto creado exitosamente");
      setIsCreateModalOpen(false);
      resetForm();
    },
    onError: () => {
      toast.error("Error al crear el proyecto");
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ProjectFormData> }) =>
      projectsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Proyecto actualizado exitosamente");
      setEditingProject(null);
      resetForm();
    },
    onError: () => {
      toast.error("Error al actualizar el proyecto");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => projectsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["board"] });
      toast.success("Proyecto eliminado exitosamente");
      setDeleteConfirmProject(null);
    },
    onError: () => {
      toast.error("Error al eliminar el proyecto");
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      clientId: "",
      color: defaultColors[0],
    });
  };

  const handleCreate = () => {
    if (!formData.name.trim()) {
      toast.error("El nombre es requerido");
      return;
    }
    if (!formData.clientId) {
      toast.error("Debes seleccionar un cliente");
      return;
    }
    createMutation.mutate(formData);
  };

  const handleUpdate = () => {
    if (!editingProject || !formData.name.trim()) {
      toast.error("El nombre es requerido");
      return;
    }
    updateMutation.mutate({ id: editingProject.id, data: formData });
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      description: project.description || "",
      clientId: project.clientId || "",
      color: project.color || defaultColors[0],
    });
  };

  const handleDelete = (project: Project) => {
    setDeleteConfirmProject(project);
  };

  const confirmDelete = () => {
    if (deleteConfirmProject) {
      deleteMutation.mutate(deleteConfirmProject.id);
    }
  };

  const openCreateModal = () => {
    resetForm();
    setIsCreateModalOpen(true);
  };

  const getClientName = (clientId?: string) => {
    if (!clientId) return null;
    const client = clients.find((c: Client) => c.id === clientId);
    return client?.name || null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 pt-16 lg:pt-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Folder className="w-7 h-7 text-primary" />
              Proyectos
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {projects.length} {projects.length === 1 ? "proyecto" : "proyectos"} en tu espacio de trabajo
            </p>
          </div>
          <Button onClick={openCreateModal} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Nuevo proyecto
          </Button>
        </div>
      </header>

      {/* Search and Filters */}
      <div className="px-6 py-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar proyectos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-100 dark:bg-gray-800 border-0 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <select
            value={selectedClientFilter}
            onChange={(e) => setSelectedClientFilter(e.target.value)}
            className="h-9 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Todos los clientes</option>
            {clients.map((client: Client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="flex-1 overflow-auto p-6">
        {filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Folder className="w-16 h-16 text-gray-300 dark:text-gray-700 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {searchQuery || selectedClientFilter ? "No se encontraron proyectos" : "No tienes proyectos aún"}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {searchQuery || selectedClientFilter
                ? "Intenta con otros filtros"
                : "Los proyectos te ayudan a organizar el trabajo de tus clientes"}
            </p>
            {!searchQuery && !selectedClientFilter && (
              <Button onClick={openCreateModal} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Crear tu primer proyecto
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {filteredProjects.map((project: Project) => {
              const taskCounts = projectTaskCounts[project.id] || { todo: 0, doing: 0, done: 0, blocked: 0, total: 0 };
              const clientName = getClientName(project.clientId);
              
              return (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 hover:shadow-lg transition-shadow group block"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${project.color || defaultColors[0]}20` }}
                      >
                        <Folder 
                          className="w-5 h-5" 
                          style={{ color: project.color || defaultColors[0] }}
                        />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {project.name}
                        </h3>
                        {clientName && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {clientName}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      <button
                        onClick={(e) => { e.preventDefault(); handleEdit(project); }}
                        className="p-1.5 text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.preventDefault(); handleDelete(project); }}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Description */}
                  {project.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">
                      {project.description}
                    </p>
                  )}

                  {/* Task Stats */}
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{taskCounts.todo} pendientes</span>
                    </div>
                    <div className="flex items-center gap-1 text-blue-500">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{taskCounts.doing} en progreso</span>
                    </div>
                    <div className="flex items-center gap-1 text-green-500">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{taskCounts.done}</span>
                    </div>
                  </div>

                  {/* Color bar */}
                  <div
                    className="h-1 rounded-full mt-4"
                    style={{ backgroundColor: project.color || defaultColors[0] }}
                  />
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(isCreateModalOpen || editingProject) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              setIsCreateModalOpen(false);
              setEditingProject(null);
              resetForm();
            }}
          />
          <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {editingProject ? "Editar proyecto" : "Nuevo proyecto"}
            </h2>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Rediseño web, App móvil..."
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Client */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Cliente *
                </label>
                <select
                  value={formData.clientId}
                  onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Seleccionar cliente...</option>
                  {clients.map((client: Client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descripción opcional del proyecto..."
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              {/* Color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Color
                </label>
                <div className="flex flex-wrap gap-2">
                  {defaultColors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setFormData({ ...formData, color })}
                      className={cn(
                        "w-8 h-8 rounded-full transition-transform hover:scale-110",
                        formData.color === color && "ring-2 ring-offset-2 ring-primary"
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setEditingProject(null);
                  resetForm();
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={editingProject ? handleUpdate : handleCreate}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "Guardando..."
                  : editingProject
                    ? "Guardar cambios"
                    : "Crear proyecto"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setDeleteConfirmProject(null)}
          />
          <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Eliminar proyecto
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              ¿Estás seguro de que deseas eliminar el proyecto "{deleteConfirmProject.name}"?
              Las tareas asociadas no serán eliminadas, pero quedarán sin proyecto asignado.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeleteConfirmProject(null)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Eliminando..." : "Eliminar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
