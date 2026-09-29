"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Filter, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { clientsApi, projectsApi } from "@/lib/api";
import { cn, priorityLabels, statusLabels, taskTypeLabels } from "@/lib/utils";
import { TaskPriority, TaskStatus, TaskType, SpaceType, type Client, type Project } from "@/types";
import { getDomainConfig } from "@/lib/domains";
import { useSpace } from "@/contexts/space-context";

export interface BoardFilters {
  clientId?: string;
  projectId?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  type?: TaskType;
  tags?: string[];
}

interface BoardFiltersProps {
  filters: BoardFilters;
  onChange: (filters: BoardFilters) => void;
  availableTags?: string[];
  isKanbanView?: boolean;
}

export function BoardFiltersBar({
  filters,
  onChange,
  availableTags = [],
  isKanbanView = false,
}: BoardFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { currentSpace } = useSpace();
  const isPersonalSpace = currentSpace?.type === SpaceType.PERSONAL;

  // Fetch clients para el select
  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => clientsApi.getAll(),
  });

  // Fetch projects para el select
  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => projectsApi.getAll(),
  });

  const activeFilterCount =
    (filters.clientId ? 1 : 0) +
    (filters.projectId ? 1 : 0) +
    (filters.priority ? 1 : 0) +
    (filters.status ? 1 : 0) +
    (filters.type ? 1 : 0) +
    (filters.tags?.length || 0);

  const clearFilters = () => {
    onChange({});
  };

  const handleClientChange = (clientId: string) => {
    onChange({
      ...filters,
      clientId: clientId || undefined,
      // Limpiar proyecto si se cambia el cliente
      projectId: clientId !== filters.clientId ? undefined : filters.projectId,
    });
  };

  const handleProjectChange = (projectId: string) => {
    onChange({
      ...filters,
      projectId: projectId || undefined,
    });
  };

  const handlePriorityChange = (priority: string) => {
    onChange({
      ...filters,
      priority: priority ? (priority as TaskPriority) : undefined,
    });
  };

  const handleStatusChange = (status: string) => {
    onChange({
      ...filters,
      status: status ? (status as TaskStatus) : undefined,
    });
  };

  const handleTypeChange = (type: string) => {
    onChange({
      ...filters,
      type: type ? (type as TaskType) : undefined,
    });
  };

  const handleTagToggle = (tag: string) => {
    const currentTags = filters.tags || [];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter((t) => t !== tag)
      : [...currentTags, tag];

    onChange({
      ...filters,
      tags: newTags.length > 0 ? newTags : undefined,
    });
  };

  return (
    <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-3">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(activeFilterCount > 0 && "border-primary text-primary")}
        >
          <Filter className="w-4 h-4 mr-2" />
          Filtros
          {activeFilterCount > 0 && (
            <Badge
              variant="default"
              className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {activeFilterCount}
            </Badge>
          )}
          <ChevronDown
            className={cn(
              "w-4 h-4 ml-2 transition-transform",
              isExpanded && "rotate-180",
            )}
          />
        </Button>

        {/* Active filters badges */}
        {activeFilterCount > 0 && (
          <>
            <div className="flex items-center gap-2 flex-wrap">
              {filters.clientId && !isPersonalSpace && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Cliente:{" "}
                  {clients.find((c: Client) => c.id === filters.clientId)
                    ?.name || "Desconocido"}
                  <button onClick={() => handleClientChange("")}>
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              {filters.priority && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Prioridad: {priorityLabels[filters.priority]}
                  <button onClick={() => handlePriorityChange("")}>
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              {filters.status && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Status: {statusLabels[filters.status]}
                  <button onClick={() => handleStatusChange("")}>
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              {filters.type && !isKanbanView && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Tipo: {taskTypeLabels[filters.type]}
                  <button onClick={() => handleTypeChange("")}>
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              {filters.projectId &&
                (() => {
                  const proj = projects.find(
                    (p: Project) => p.id === filters.projectId,
                  );
                  const domainConfig = proj?.domain
                    ? getDomainConfig(proj.domain)
                    : null;
                  return (
                    <Badge
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {domainConfig && <span>{domainConfig.icon}</span>}
                      {isPersonalSpace ? "Área" : "Proyecto"}: {proj?.name || "Desconocido"}
                      <button onClick={() => handleProjectChange("")}>
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  );
                })()}
              {filters.tags?.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  #{tag}
                  <button onClick={() => handleTagToggle(tag)}>
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Limpiar filtros
            </Button>
          </>
        )}
      </div>

      {/* Expanded filter panel */}
      {isExpanded && (
        <div className={cn(
          "mt-4 pt-4 border-t dark:border-gray-700 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4",
          isPersonalSpace ? "xl:grid-cols-5" : "xl:grid-cols-6"
        )}>
          {/* Cliente filter - Solo en espacio de trabajo */}
          {!isPersonalSpace && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Cliente
              </label>
              <select
                value={filters.clientId || ""}
                onChange={(e) => handleClientChange(e.target.value)}
                className="w-full h-9 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Todos los clientes</option>
                {clients.map((client: Client) => (
                  <option key={client.id} value={client.id}>
                    {client.name} {client.company && `(${client.company})`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Proyecto/Área filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {isPersonalSpace ? "Área" : "Proyecto"}
            </label>
            <select
              value={filters.projectId || ""}
              onChange={(e) => handleProjectChange(e.target.value)}
              className="w-full h-9 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">{isPersonalSpace ? "Todas las áreas" : "Todos los proyectos"}</option>
              {projects
                .filter((p: Project) => {
                  // Filtrar por espacio actual
                  if (isPersonalSpace) {
                    // En espacio personal: solo áreas de este espacio
                    return p.spaceId === currentSpace?.id;
                  } else {
                    // En espacio de trabajo: filtrar por cliente si hay uno seleccionado
                    // o mostrar proyectos que NO son de espacio personal
                    if (filters.clientId) {
                      return p.clientId === filters.clientId;
                    }
                    // Excluir proyectos de espacios personales
                    return !p.spaceId || p.clientId;
                  }
                })
                .map((project: Project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}{" "}
                    {!isPersonalSpace && !filters.clientId &&
                      project.client &&
                      `(${project.client.name})`}
                  </option>
                ))}
            </select>
          </div>

          {/* Priority filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Prioridad
            </label>
            <select
              value={filters.priority || ""}
              onChange={(e) => handlePriorityChange(e.target.value)}
              className="w-full h-9 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">Todas las prioridades</option>
              {Object.entries(priorityLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Status
            </label>
            <select
              value={filters.status || ""}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="w-full h-9 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">Todos los status</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Type filter - Solo en vista lista, no en Kanban */}
          {!isKanbanView && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tipo
              </label>
              <select
                value={filters.type || ""}
                onChange={(e) => handleTypeChange(e.target.value)}
                className="w-full h-9 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Todos los tipos</option>
                {Object.entries(taskTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Tags filter - Dropdown multiselect */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Etiquetas {filters.tags?.length ? `(${filters.tags.length})` : ""}
            </label>
            {availableTags.length > 0 ? (
              <div className="relative">
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      handleTagToggle(e.target.value);
                    }
                  }}
                  className="w-full h-9 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Seleccionar etiqueta...</option>
                  {availableTags
                    .filter((tag) => !filters.tags?.includes(tag))
                    .map((tag) => (
                      <option key={tag} value={tag}>
                        #{tag}
                      </option>
                    ))}
                </select>
                {filters.tags && filters.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {filters.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary border border-primary/20"
                      >
                        #{tag}
                        <button
                          onClick={() => handleTagToggle(tag)}
                          className="hover:text-red-500 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No hay etiquetas disponibles
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
