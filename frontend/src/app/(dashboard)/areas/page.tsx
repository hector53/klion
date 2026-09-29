"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  FolderKanban,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { projectsApi, tasksApi } from "@/lib/api";
import { useSpace } from "@/contexts/space-context";
import { SpaceType, type Project, TaskStatus } from "@/types";
import { cn } from "@/lib/utils";
import { getDomainConfig, domainOptions } from "@/lib/domains";
import { ProjectDomain } from "@/types";
import { useRouter } from "next/navigation";

interface AreaFormData {
  name: string;
  description: string;
  domain: ProjectDomain;
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

export default function AreasPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { currentSpace } = useSpace();
  const isPersonalSpace = currentSpace?.type === SpaceType.PERSONAL;

  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<Project | null>(null);
  const [deleteConfirmArea, setDeleteConfirmArea] = useState<Project | null>(null);
  const [formData, setFormData] = useState<AreaFormData>({
    name: "",
    description: "",
    domain: ProjectDomain.PERSONAL,
    color: defaultColors[0],
  });

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

  // Fetch areas (projects) for current space
  const { data: areas = [], isLoading } = useQuery({
    queryKey: ["projects", "space", currentSpace?.id],
    queryFn: () => projectsApi.getAll({ spaceId: currentSpace?.id }),
    enabled: !!currentSpace?.id,
  });

  // Fetch board data to count tasks per area
  const { data: boardData } = useQuery({
    queryKey: ["board"],
    queryFn: () => tasksApi.getBoard(),
  });

  // Calculate task counts per area
  const areaTaskCounts = useMemo(() => {
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

  // Filter areas by search
  const filteredAreas = useMemo(() => {
    if (!searchQuery) return areas;
    const query = searchQuery.toLowerCase();
    return areas.filter(
      (area: Project) =>
        area.name.toLowerCase().includes(query) ||
        area.description?.toLowerCase().includes(query)
    );
  }, [areas, searchQuery]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: AreaFormData) =>
      projectsApi.create({
        name: data.name,
        description: data.description,
        domain: data.domain,
        color: data.color,
        spaceId: currentSpace?.id,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Área creada exitosamente");
      setIsCreateModalOpen(false);
      resetForm();
    },
    onError: () => {
      toast.error("Error al crear el área");
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AreaFormData> }) =>
      projectsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Área actualizada exitosamente");
      setEditingArea(null);
      resetForm();
    },
    onError: () => {
      toast.error("Error al actualizar el área");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => projectsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["board"] });
      toast.success("Área eliminada exitosamente");
      setDeleteConfirmArea(null);
    },
    onError: () => {
      toast.error("Error al eliminar el área");
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      domain: ProjectDomain.PERSONAL,
      color: defaultColors[0],
    });
  };

  const handleCreate = () => {
    if (!formData.name.trim()) {
      toast.error("El nombre es requerido");
      return;
    }
    createMutation.mutate(formData);
  };

  const handleUpdate = () => {
    if (!editingArea || !formData.name.trim()) {
      toast.error("El nombre es requerido");
      return;
    }
    updateMutation.mutate({ id: editingArea.id, data: formData });
  };

  const handleEdit = (area: Project) => {
    setEditingArea(area);
    setFormData({
      name: area.name,
      description: area.description || "",
      domain: area.domain || ProjectDomain.PERSONAL,
      color: area.color || defaultColors[0],
    });
  };

  const handleDelete = (area: Project) => {
    setDeleteConfirmArea(area);
  };

  const confirmDelete = () => {
    if (deleteConfirmArea) {
      deleteMutation.mutate(deleteConfirmArea.id);
    }
  };

  const openCreateModal = () => {
    resetForm();
    setIsCreateModalOpen(true);
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
              <FolderKanban className="w-7 h-7 text-primary" />
              Áreas
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {areas.length} {areas.length === 1 ? "área" : "áreas"} en tu espacio personal
            </p>
          </div>
          <Button onClick={openCreateModal} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Nueva área
          </Button>
        </div>
      </header>

      {/* Search */}
      <div className="px-6 py-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar áreas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-100 dark:bg-gray-800 border-0 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>

      {/* Areas Grid */}
      <div className="flex-1 overflow-auto p-6">
        {filteredAreas.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <FolderKanban className="w-16 h-16 text-gray-300 dark:text-gray-700 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {searchQuery ? "No se encontraron áreas" : "No tienes áreas aún"}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {searchQuery
                ? "Intenta con otro término de búsqueda"
                : "Las áreas te ayudan a organizar tus tareas por categorías"}
            </p>
            {!searchQuery && (
              <Button onClick={openCreateModal} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Crear tu primera área
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {filteredAreas.map((area: Project) => {
              const domainConfig = area.domain ? getDomainConfig(area.domain) : null;
              const taskCounts = areaTaskCounts[area.id] || { todo: 0, doing: 0, done: 0, blocked: 0, total: 0 };
              
              return (
                <div
                  key={area.id}
                  className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 hover:shadow-lg transition-shadow group"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                        style={{ backgroundColor: `${area.color || defaultColors[0]}20` }}
                      >
                        {domainConfig?.icon || "📁"}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {area.name}
                        </h3>
                        {domainConfig && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {domainConfig.label}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      <button
                        onClick={() => handleEdit(area)}
                        className="p-1.5 text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(area)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Description */}
                  {area.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">
                      {area.description}
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
                    style={{ backgroundColor: area.color || defaultColors[0] }}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(isCreateModalOpen || editingArea) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              setIsCreateModalOpen(false);
              setEditingArea(null);
              resetForm();
            }}
          />
          <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {editingArea ? "Editar área" : "Nueva área"}
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
                  placeholder="Ej: Salud, Hogar, Finanzas..."
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descripción opcional del área..."
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              {/* Domain */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Categoría
                </label>
                <select
                  value={formData.domain}
                  onChange={(e) => setFormData({ ...formData, domain: e.target.value as ProjectDomain })}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {domainOptions.map((domain) => (
                    <option key={domain.value} value={domain.value}>
                      {domain.icon} {domain.label}
                    </option>
                  ))}
                </select>
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
                  setEditingArea(null);
                  resetForm();
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={editingArea ? handleUpdate : handleCreate}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "Guardando..."
                  : editingArea
                    ? "Guardar cambios"
                    : "Crear área"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmArea && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setDeleteConfirmArea(null)}
          />
          <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Eliminar área
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              ¿Estás seguro de que deseas eliminar el área "{deleteConfirmArea.name}"?
              Las tareas asociadas no serán eliminadas, pero quedarán sin área asignada.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeleteConfirmArea(null)}>
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
