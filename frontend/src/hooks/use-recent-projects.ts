'use client';

import { useCallback, useMemo } from 'react';

const STORAGE_KEY = 'klion_recent_projects';
const MAX_RECENT_PROJECTS = 5;

export interface RecentProject {
    id: string;
    name: string;
    color?: string;
    lastAccessed: number; // timestamp
}

/**
 * Hook para gestionar proyectos recientes visitados.
 * Guarda en localStorage los últimos 5 proyectos accedidos.
 */
export function useRecentProjects() {
    // Obtener proyectos recientes desde localStorage
    const getStoredProjects = useCallback((): RecentProject[] => {
        if (typeof window === 'undefined') return [];
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    }, []);

    // Guardar proyectos en localStorage
    const setStoredProjects = useCallback((projects: RecentProject[]) => {
        if (typeof window === 'undefined') return;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
        } catch {
            // Ignore storage errors
        }
    }, []);

    // Añadir/actualizar proyecto en la lista de recientes
    const addRecentProject = useCallback(
        (project: { id: string; name: string; color?: string }) => {
            const current = getStoredProjects();

            // Remover si ya existe
            const filtered = current.filter((p) => p.id !== project.id);

            // Añadir al principio
            const updated: RecentProject[] = [
                { ...project, lastAccessed: Date.now() },
                ...filtered,
            ].slice(0, MAX_RECENT_PROJECTS);

            setStoredProjects(updated);

            // Disparar evento para sincronizar entre componentes
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('recentProjectsUpdated'));
            }
        },
        [getStoredProjects, setStoredProjects]
    );

    // Obtener lista ordenada de recientes
    const recentProjects = useMemo(() => {
        return getStoredProjects().sort((a, b) => b.lastAccessed - a.lastAccessed);
    }, [getStoredProjects]);

    return {
        recentProjects,
        addRecentProject,
        getStoredProjects,
    };
}
