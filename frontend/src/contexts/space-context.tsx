"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { spacesApi } from "@/lib/api";
import type { Space } from "@/types";

const STORAGE_KEY = "klion_current_space";

interface SpaceContextType {
  spaces: Space[];
  currentSpace: Space | null;
  isLoading: boolean;
  error: string | null;
  setCurrentSpace: (space: Space) => void;
  refreshSpaces: () => Promise<void>;
  createDefaultSpaces: () => Promise<void>;
}

const SpaceContext = createContext<SpaceContextType | undefined>(undefined);

export function SpaceProvider({ children }: { children: React.ReactNode }) {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [currentSpace, setCurrentSpaceState] = useState<Space | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initialLoadDone = useRef(false);

  // Cargar espacio guardado desde localStorage
  const getStoredSpaceId = useCallback((): string | null => {
    if (typeof window === "undefined") return null;
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  }, []);

  // Guardar espacio en localStorage
  const setStoredSpaceId = useCallback((spaceId: string) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, spaceId);
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Cargar espacios desde la API
  const refreshSpaces = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await spacesApi.getAll();
      setSpaces(data);

      // Si no hay espacio actual, seleccionar el guardado o el por defecto
      if (data.length > 0) {
        const storedId = getStoredSpaceId();
        const storedSpace = storedId
          ? data.find((s) => s.id === storedId)
          : null;
        // Usar el primero por posición (ya vienen ordenados del backend)
        const defaultSpace = data[0];

        setCurrentSpaceState((prev) => {
          // Si ya hay uno seleccionado y existe en los datos, mantenerlo
          if (prev && data.find((s) => s.id === prev.id)) {
            return prev;
          }
          // Si no, usar el guardado o el por defecto
          const selected = storedSpace || defaultSpace;
          if (selected) {
            setStoredSpaceId(selected.id);
          }
          return selected;
        });
      }
    } catch (err) {
      console.error("Error loading spaces:", err);
      setError("Error al cargar espacios");
    } finally {
      setIsLoading(false);
    }
  }, [getStoredSpaceId, setStoredSpaceId]);

  // Crear espacios por defecto si no existen
  const createDefaultSpaces = useCallback(async () => {
    try {
      setIsLoading(true);
      const newSpaces = await spacesApi.createDefaults();
      setSpaces(newSpaces);
      if (newSpaces.length > 0) {
        const defaultSpace = newSpaces[0];
        setCurrentSpaceState(defaultSpace);
        setStoredSpaceId(defaultSpace.id);
      }
    } catch (err) {
      console.error("Error creating default spaces:", err);
      setError("Error al crear espacios");
    } finally {
      setIsLoading(false);
    }
  }, [setStoredSpaceId]);

  // Cambiar espacio actual
  const setCurrentSpace = useCallback(
    (space: Space) => {
      setCurrentSpaceState(space);
      setStoredSpaceId(space.id);
      // Disparar evento para sincronizar entre componentes
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("spaceChanged", { detail: space }),
        );
      }
    },
    [setStoredSpaceId],
  );

  // Cargar espacios al montar (solo una vez)
  useEffect(() => {
    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
      refreshSpaces();
    }
  }, [refreshSpaces]);

  const value = useMemo(
    () => ({
      spaces,
      currentSpace,
      isLoading,
      error,
      setCurrentSpace,
      refreshSpaces,
      createDefaultSpaces,
    }),
    [
      spaces,
      currentSpace,
      isLoading,
      error,
      setCurrentSpace,
      refreshSpaces,
      createDefaultSpaces,
    ],
  );

  return (
    <SpaceContext.Provider value={value}>{children}</SpaceContext.Provider>
  );
}

export function useSpace() {
  const context = useContext(SpaceContext);
  if (context === undefined) {
    throw new Error("useSpace must be used within a SpaceProvider");
  }
  return context;
}
