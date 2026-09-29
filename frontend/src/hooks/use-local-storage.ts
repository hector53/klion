"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((prev: T) => T)) => void, boolean] {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [isHydrated, setIsHydrated] = useState(false);

  // Usar ref para tener siempre el valor actual en el callback
  const storedValueRef = useRef(storedValue);
  storedValueRef.current = storedValue;

  // Efecto para leer del localStorage después de la hidratación
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        const parsed = JSON.parse(item);
        setStoredValue(parsed);
        storedValueRef.current = parsed;
      }
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
    }
    setIsHydrated(true);
  }, [key]);

  // Función para actualizar el estado y localStorage
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        const valueToStore =
          value instanceof Function ? value(storedValueRef.current) : value;
        setStoredValue(valueToStore);
        storedValueRef.current = valueToStore;

        if (typeof window !== "undefined") {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key],
  );

  return [storedValue, setValue, isHydrated];
}

// Hook específico para las preferencias del board
export interface BoardPreferences {
  viewMode: "kanban" | "list";
  selectedClientIds: string[];
  clientColumnOrder: string[]; // Orden de las columnas de clientes
  hasSelectedClientsOnce: boolean; // Flag para saber si ya seleccionó clientes alguna vez
}

const DEFAULT_BOARD_PREFERENCES: BoardPreferences = {
  viewMode: "kanban",
  selectedClientIds: [],
  clientColumnOrder: [],
  hasSelectedClientsOnce: false,
};

export function useBoardPreferences() {
  const [preferences, setPreferences, isHydrated] =
    useLocalStorage<BoardPreferences>(
      "clientboard-preferences",
      DEFAULT_BOARD_PREFERENCES,
    );

  const updatePreference = useCallback(
    <K extends keyof BoardPreferences>(key: K, value: BoardPreferences[K]) => {
      setPreferences((prev) => ({
        ...prev,
        [key]: value,
      }));
    },
    [setPreferences],
  );

  // Actualizar múltiples preferencias a la vez
  const updatePreferences = useCallback(
    (updates: Partial<BoardPreferences>) => {
      setPreferences((prev) => ({
        ...prev,
        ...updates,
      }));
    },
    [setPreferences],
  );

  return {
    preferences,
    setPreferences,
    updatePreference,
    updatePreferences,
    isHydrated,
  };
}

// Hook específico para las preferencias del widget "Tareas Activas" (página de proyecto)
export type ActiveTasksStatusFilter = "active" | "todo" | "doing" | "blocked";
export type ActiveTasksSortBy = "priority" | "dueDate" | "recent" | "title";

export interface ActiveTasksWidgetPreferences {
  statusFilter: ActiveTasksStatusFilter; // "active" = todo+doing (comportamiento original)
  sortBy: ActiveTasksSortBy;
}

const DEFAULT_ACTIVE_TASKS_WIDGET_PREFERENCES: ActiveTasksWidgetPreferences = {
  statusFilter: "active",
  sortBy: "priority",
};

export function useActiveTasksWidgetPreferences() {
  const [preferences, setPreferences, isHydrated] =
    useLocalStorage<ActiveTasksWidgetPreferences>(
      "klion-active-tasks-widget-prefs",
      DEFAULT_ACTIVE_TASKS_WIDGET_PREFERENCES,
    );

  const updatePreference = useCallback(
    <K extends keyof ActiveTasksWidgetPreferences>(
      key: K,
      value: ActiveTasksWidgetPreferences[K],
    ) => {
      setPreferences((prev) => ({
        ...prev,
        [key]: value,
      }));
    },
    [setPreferences],
  );

  return { preferences, updatePreference, isHydrated };
}
