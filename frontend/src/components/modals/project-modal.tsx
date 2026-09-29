"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Calendar, Trash2, Loader2, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { ConfirmModal } from "@/components/modals/confirm-modal";
import { projectsApi, clientsApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  ProjectStatus,
  ProjectDomain,
  SpaceType,
  type Project,
  type CreateProjectDto,
  type Client,
} from "@/types";
import { domainOptions, getDomainConfig } from "@/lib/domains";
import { useSpace } from "@/contexts/space-context";

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project?: Project | null;
  clientId?: string;
  clientName?: string;
}

const initialFormData: Omit<CreateProjectDto, "clientId"> = {
  name: "",
  description: "",
  status: ProjectStatus.ACTIVE,
  color: "#3B82F6",
  dueDate: "",
  budget: undefined,
  domain: ProjectDomain.WORK,
};

const statusOptions = [
  {
    value: ProjectStatus.ACTIVE,
    label: "Activo",
    color: "text-green-600 bg-green-50",
  },
  {
    value: ProjectStatus.ON_HOLD,
    label: "En pausa",
    color: "text-yellow-600 bg-yellow-50",
  },
  {
    value: ProjectStatus.COMPLETED,
    label: "Completado",
    color: "text-blue-600 bg-blue-50",
  },
  {
    value: ProjectStatus.CANCELLED,
    label: "Cancelado",
    color: "text-gray-600 bg-gray-50",
  },
];

const colorOptions = [
  "#3B82F6", // blue
  "#10B981", // green
  "#F59E0B", // amber
  "#EF4444", // red
  "#8B5CF6", // violet
  "#EC4899", // pink
  "#06B6D4", // cyan
  "#84CC16", // lime
  "#F97316", // orange
  "#6366F1", // indigo
];

export function ProjectModal({
  isOpen,
  onClose,
  project,
  clientId,
  clientName,
}: ProjectModalProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { currentSpace } = useSpace();
  const isEditing = !!project;

  // En espacio personal no hay clientes, se llama "Área" en vez de "Proyecto"
  const isPersonalSpace = currentSpace?.type === SpaceType.PERSONAL;

  const [formData, setFormData] = useState(initialFormData);
  const [selectedClientId, setSelectedClientId] = useState<string>(
    clientId || "",
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  // Fetch clients si no hay clientId preseleccionado y estamos en espacio de trabajo
  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => clientsApi.getAll(),
    enabled: !clientId && !isPersonalSpace,
  });

  // Reset form cuando cambia el proyecto o se abre/cierra
  useEffect(() => {
    if (isOpen) {
      if (project) {
        setFormData({
          name: project.name,
          description: project.description || "",
          status: project.status,
          color: project.color,
          dueDate: project.dueDate ? project.dueDate.split("T")[0] : "",
          budget: project.budget,
          domain:
            project.domain ||
            (isPersonalSpace ? ProjectDomain.PERSONAL : ProjectDomain.WORK),
        });
        setSelectedClientId(project.clientId || "");
      } else {
        // En espacio personal, el domain por defecto es PERSONAL
        setFormData({
          ...initialFormData,
          domain: isPersonalSpace ? ProjectDomain.PERSONAL : ProjectDomain.WORK,
        });
        setSelectedClientId(clientId || "");
      }
      setErrors({});
      setShowColorPicker(false);
    }
  }, [isOpen, project, clientId, isPersonalSpace]);

  // Mutaciones
  const createMutation = useMutation({
    mutationFn: (data: CreateProjectDto) => projectsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      if (selectedClientId) {
        queryClient.invalidateQueries({
          queryKey: ["projects", "client", selectedClientId],
        });
      }
      toast.success(
        isPersonalSpace
          ? "Área creada exitosamente"
          : "Proyecto creado exitosamente",
      );
      onClose();
    },
    onError: () => {
      toast.error(
        isPersonalSpace
          ? "Error al crear el área"
          : "Error al crear el proyecto",
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<CreateProjectDto>) =>
      projectsApi.update(project!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      if (selectedClientId) {
        queryClient.invalidateQueries({
          queryKey: ["projects", "client", selectedClientId],
        });
      }
      toast.success(
        isPersonalSpace
          ? "Área actualizada exitosamente"
          : "Proyecto actualizado exitosamente",
      );
      onClose();
    },
    onError: () => {
      toast.error(
        isPersonalSpace
          ? "Error al actualizar el área"
          : "Error al actualizar el proyecto",
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => projectsApi.delete(project!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      if (selectedClientId) {
        queryClient.invalidateQueries({
          queryKey: ["projects", "client", selectedClientId],
        });
      }
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success(isPersonalSpace ? "Área eliminada" : "Proyecto eliminado");
      setShowDeleteConfirm(false);
      onClose();
    },
    onError: () => {
      toast.error(
        isPersonalSpace
          ? "Error al eliminar el área"
          : "Error al eliminar el proyecto",
      );
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  // Validación
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Solo requerir cliente en espacio de trabajo
    if (!isPersonalSpace && !selectedClientId) {
      newErrors.clientId = "Selecciona un cliente";
    }
    if (!formData.name.trim()) {
      newErrors.name = "El nombre es requerido";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handlers
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    const data: CreateProjectDto = {
      // En espacio personal no hay cliente
      clientId: isPersonalSpace ? undefined : selectedClientId,
      // Asociar al espacio actual
      spaceId: currentSpace?.id,
      name: formData.name.trim(),
      description: formData.description?.trim() || undefined,
      status: formData.status,
      color: formData.color,
      dueDate: formData.dueDate || undefined,
      budget: formData.budget || undefined,
      domain: formData.domain,
    };

    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />

        {/* Modal */}
        <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: formData.color }}
              />
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {isEditing
                    ? isPersonalSpace
                      ? "Editar Área"
                      : "Editar Proyecto"
                    : isPersonalSpace
                      ? "Nueva Área"
                      : "Nuevo Proyecto"}
                </h2>
                {isPersonalSpace ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Espacio Personal
                  </p>
                ) : clientName ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Cliente: {clientName}
                  </p>
                ) : selectedClientId ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Cliente:{" "}
                    {clients.find((c: Client) => c.id === selectedClientId)
                      ?.name || "Seleccionar..."}
                  </p>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Selecciona un cliente
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <form
            onSubmit={handleSubmit}
            className="p-4 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]"
          >
            {/* Cliente selector - solo mostrar en espacio de trabajo y si no hay clientId preseleccionado */}
            {!isPersonalSpace && !clientId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Cliente *
                </label>
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className={cn(
                    "w-full h-10 rounded-md border bg-white dark:bg-gray-800 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
                    errors.clientId
                      ? "border-red-500"
                      : "border-gray-300 dark:border-gray-600",
                  )}
                >
                  <option value="">Seleccionar cliente...</option>
                  {clients.map((client: Client) => (
                    <option key={client.id} value={client.id}>
                      {client.name} {client.company && `(${client.company})`}
                    </option>
                  ))}
                </select>
                {errors.clientId && (
                  <p className="mt-1 text-sm text-red-500">{errors.clientId}</p>
                )}
              </div>
            )}

            {/* Nombre */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isPersonalSpace
                  ? "Nombre del Área *"
                  : "Nombre del Proyecto *"}
              </label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder={
                  isPersonalSpace
                    ? "Ej: Auto, Salud, Casa..."
                    : "Ej: Rediseño web, App móvil..."
                }
                className={cn(errors.name && "border-red-500")}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-500">{errors.name}</p>
              )}
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Descripción
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder={
                  isPersonalSpace
                    ? "Describe el área..."
                    : "Describe el proyecto..."
                }
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Color */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Color
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-800"
                >
                  <div
                    className="w-5 h-5 rounded-full border dark:border-gray-500"
                    style={{ backgroundColor: formData.color }}
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    {formData.color}
                  </span>
                  <Palette className="w-4 h-4 text-gray-400" />
                </button>

                {showColorPicker && (
                  <div className="absolute top-full left-0 mt-1 p-2 bg-white dark:bg-gray-800 border dark:border-gray-600 rounded-lg shadow-lg z-10">
                    <div className="grid grid-cols-5 gap-2">
                      {colorOptions.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, color });
                            setShowColorPicker(false);
                          }}
                          className={cn(
                            "w-8 h-8 rounded-full border-2 transition-transform hover:scale-110",
                            formData.color === color
                              ? "border-gray-900"
                              : "border-transparent",
                          )}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Estado */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Estado
              </label>
              <div className="flex flex-wrap gap-2">
                {statusOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, status: option.value })
                    }
                    className={cn(
                      "px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                      formData.status === option.value
                        ? option.color +
                            " ring-2 ring-offset-1 ring-current dark:ring-offset-gray-900"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Domain */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Categoría
              </label>
              <div className="flex flex-wrap gap-2">
                {domainOptions
                  // En espacio personal, filtrar "Trabajo" ya que no tiene sentido
                  .filter(
                    (domain) =>
                      !isPersonalSpace || domain.value !== ProjectDomain.WORK,
                  )
                  .map((domain) => (
                    <button
                      key={domain.value}
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, domain: domain.value })
                      }
                      className={cn(
                        "px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5",
                        formData.domain === domain.value
                          ? `${domain.bgColor} ${domain.color} ring-2 ring-offset-1 ring-current dark:ring-offset-gray-900`
                          : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600",
                      )}
                      title={domain.description}
                    >
                      <span>{domain.icon}</span>
                      <span>{domain.label}</span>
                    </button>
                  ))}
              </div>
            </div>

            {/* Fecha límite */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <Calendar className="w-4 h-4 inline mr-1" />
                Fecha límite
              </label>
              <Input
                type="date"
                value={formData.dueDate}
                onChange={(e) =>
                  setFormData({ ...formData, dueDate: e.target.value })
                }
              />
            </div>

            {/* Presupuesto - solo en espacio de trabajo */}
            {!isPersonalSpace && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Presupuesto (opcional)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                    $
                  </span>
                  <Input
                    type="number"
                    value={formData.budget || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        budget: e.target.value
                          ? Number(e.target.value)
                          : undefined,
                      })
                    }
                    placeholder="0.00"
                    className="pl-7"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
            )}
          </form>

          {/* Footer */}
          <div className="flex items-center justify-between p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            {isEditing ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Eliminar
              </Button>
            ) : (
              <div />
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={isPending}>
                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isEditing
                  ? "Guardar"
                  : isPersonalSpace
                    ? "Crear Área"
                    : "Crear Proyecto"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => deleteMutation.mutate()}
        title={isPersonalSpace ? "Eliminar Área" : "Eliminar Proyecto"}
        message={
          isPersonalSpace
            ? "¿Estás seguro de que deseas eliminar esta área? Las tareas asociadas NO serán eliminadas, solo se desvinculan del área."
            : "¿Estás seguro de que deseas eliminar este proyecto? Las tareas asociadas NO serán eliminadas, solo se desvinculan del proyecto."
        }
        confirmText="Eliminar"
        isLoading={deleteMutation.isPending}
        variant="danger"
      />
    </>
  );
}
