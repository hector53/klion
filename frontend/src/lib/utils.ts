import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const priorityColors: Record<string, string> = {
  low: "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300",
  medium:
    "bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300",
  high: "bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300",
};

export const statusLabels: Record<string, string> = {
  todo: "Por hacer",
  doing: "En progreso",
  blocked: "Bloqueado",
  done: "Completado",
};

export const priorityLabels: Record<string, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
};

export const taskTypeLabels: Record<string, string> = {
  task: "Tarea",
  note: "Nota",
  reminder: "Recordatorio",
};

export const taskTypeIcons: Record<string, string> = {
  task: "✓",
  note: "📝",
  reminder: "🔔",
};

export const taskTypeColors: Record<string, string> = {
  task: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  note: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  reminder: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};
