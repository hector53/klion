'use client';

import { useState, useCallback } from 'react';
import { spacesApi } from '@/lib/api';
import type { Space, SpaceStats, CreateSpaceDto, UpdateSpaceDto } from '@/types';

/**
 * Hook para operaciones CRUD de espacios.
 * Para el espacio actual y lista de espacios, usar useSpace() del contexto.
 */
export function useSpaces() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getSpace = useCallback(async (id: string): Promise<Space | null> => {
    try {
      setIsLoading(true);
      setError(null);
      return await spacesApi.getOne(id);
    } catch (err) {
      console.error('Error fetching space:', err);
      setError('Error al obtener espacio');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getSpaceStats = useCallback(async (id: string): Promise<SpaceStats | null> => {
    try {
      setIsLoading(true);
      setError(null);
      return await spacesApi.getStats(id);
    } catch (err) {
      console.error('Error fetching space stats:', err);
      setError('Error al obtener estadísticas');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createSpace = useCallback(async (data: CreateSpaceDto): Promise<Space | null> => {
    try {
      setIsLoading(true);
      setError(null);
      return await spacesApi.create(data);
    } catch (err) {
      console.error('Error creating space:', err);
      setError('Error al crear espacio');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateSpace = useCallback(async (id: string, data: UpdateSpaceDto): Promise<Space | null> => {
    try {
      setIsLoading(true);
      setError(null);
      return await spacesApi.update(id, data);
    } catch (err) {
      console.error('Error updating space:', err);
      setError('Error al actualizar espacio');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const archiveSpace = useCallback(async (id: string): Promise<Space | null> => {
    try {
      setIsLoading(true);
      setError(null);
      return await spacesApi.archive(id);
    } catch (err) {
      console.error('Error archiving space:', err);
      setError('Error al archivar espacio');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteSpace = useCallback(async (id: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      await spacesApi.delete(id);
      return true;
    } catch (err) {
      console.error('Error deleting space:', err);
      setError('Error al eliminar espacio');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reorderSpaces = useCallback(async (spaceIds: string[]): Promise<Space[] | null> => {
    try {
      setIsLoading(true);
      setError(null);
      return await spacesApi.reorder(spaceIds);
    } catch (err) {
      console.error('Error reordering spaces:', err);
      setError('Error al reordenar espacios');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    getSpace,
    getSpaceStats,
    createSpace,
    updateSpace,
    archiveSpace,
    deleteSpace,
    reorderSpaces,
  };
}
