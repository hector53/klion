'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import { TaskPriority, TaskStatus, TaskType } from '@/types';

export interface BoardFilters {
  clientId?: string;
  projectId?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  type?: TaskType;
  tags?: string[];
}

/**
 * Hook para sincronizar filtros del board con la URL (query params).
 * Permite linkear directamente a una vista filtrada del board.
 */
export function useBoardFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Leer filtros desde URL
  const filters: BoardFilters = useMemo(() => {
    const clientId = searchParams.get('clientId') || undefined;
    const projectId = searchParams.get('projectId') || undefined;
    const priority = searchParams.get('priority') as TaskPriority | undefined;
    const status = searchParams.get('status') as TaskStatus | undefined;
    const type = searchParams.get('type') as TaskType | undefined;
    const tagsParam = searchParams.get('tags');
    const tags = tagsParam ? tagsParam.split(',').filter(Boolean) : undefined;

    return {
      clientId,
      projectId,
      priority: priority && Object.values(TaskPriority).includes(priority) ? priority : undefined,
      status: status && Object.values(TaskStatus).includes(status) ? status : undefined,
      type: type && Object.values(TaskType).includes(type) ? type : undefined,
      tags: tags && tags.length > 0 ? tags : undefined,
    };
  }, [searchParams]);

  // Filter-specific param keys (everything else is preserved)
  const FILTER_KEYS = ['clientId', 'projectId', 'priority', 'status', 'type', 'tags'];

  // Actualizar filtros en URL (preserves non-filter params like view, selectedTask)
  const setFilters = useCallback(
    (newFilters: BoardFilters) => {
      const params = new URLSearchParams(searchParams.toString());

      // Clear all filter params first
      FILTER_KEYS.forEach((key) => params.delete(key));

      // Set new filter values
      if (newFilters.clientId) params.set('clientId', newFilters.clientId);
      if (newFilters.projectId) params.set('projectId', newFilters.projectId);
      if (newFilters.priority) params.set('priority', newFilters.priority);
      if (newFilters.status) params.set('status', newFilters.status);
      if (newFilters.type) params.set('type', newFilters.type);
      if (newFilters.tags && newFilters.tags.length > 0) {
        params.set('tags', newFilters.tags.join(','));
      }

      const queryString = params.toString();
      const newUrl = queryString ? `${pathname}?${queryString}` : pathname;

      router.push(newUrl, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  // Actualizar un solo filtro
  const updateFilter = useCallback(
    <K extends keyof BoardFilters>(key: K, value: BoardFilters[K]) => {
      setFilters({
        ...filters,
        [key]: value,
      });
    },
    [filters, setFilters]
  );

  // Limpiar todos los filtros (preserves non-filter params)
  const clearFilters = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    FILTER_KEYS.forEach((key) => params.delete(key));
    const queryString = params.toString();
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
    router.push(newUrl, { scroll: false });
  }, [pathname, router, searchParams]);

  // Contar filtros activos
  const activeFilterCount = useMemo(() => {
    return (
      (filters.clientId ? 1 : 0) +
      (filters.projectId ? 1 : 0) +
      (filters.priority ? 1 : 0) +
      (filters.status ? 1 : 0) +
      (filters.type ? 1 : 0) +
      (filters.tags?.length || 0)
    );
  }, [filters]);

  // Generar URL con filtros (para links desde otras páginas)
  const getBoardUrlWithFilters = useCallback(
    (customFilters: Partial<BoardFilters>) => {
      const params = new URLSearchParams();

      if (customFilters.clientId) {
        params.set('clientId', customFilters.clientId);
      }
      if (customFilters.projectId) {
        params.set('projectId', customFilters.projectId);
      }
      if (customFilters.priority) {
        params.set('priority', customFilters.priority);
      }
      if (customFilters.status) {
        params.set('status', customFilters.status);
      }
      if (customFilters.type) {
        params.set('type', customFilters.type);
      }
      if (customFilters.tags && customFilters.tags.length > 0) {
        params.set('tags', customFilters.tags.join(','));
      }

      const queryString = params.toString();
      return queryString ? `/board?${queryString}` : '/board';
    },
    []
  );

  return {
    filters,
    setFilters,
    updateFilter,
    clearFilters,
    activeFilterCount,
    getBoardUrlWithFilters,
  };
}
