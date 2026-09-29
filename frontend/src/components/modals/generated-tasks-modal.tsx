"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Sparkles, Loader2, CheckCircle, AlertCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { aiApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { AnalyzeNotesResponse, ExtractedTask } from "@/types";

interface GeneratedTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  clientId?: string;
  response: AnalyzeNotesResponse | null;
}

interface DraftTask extends ExtractedTask {
  selected: boolean;
}

interface RefineHistoryEntry {
  feedback: string;
  summary: string;
}

const priorityLabels: Record<ExtractedTask["priority"], string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
};

export function GeneratedTasksModal({
  isOpen,
  onClose,
  projectId,
  clientId,
  response,
}: GeneratedTasksModalProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [drafts, setDrafts] = useState<DraftTask[]>([]);
  const [summary, setSummary] = useState("");
  const [pendingQuestions, setPendingQuestions] = useState<string[]>([]);
  const [feedbackInput, setFeedbackInput] = useState("");
  const [refineHistory, setRefineHistory] = useState<RefineHistoryEntry[]>([]);

  useEffect(() => {
    if (response) {
      setDrafts(response.tasks.map((task) => ({ ...task, selected: true })));
      setSummary(response.summary);
      setPendingQuestions(response.pendingQuestions || []);
      setFeedbackInput("");
      setRefineHistory([]);
    }
  }, [response]);

  // El componente permanece montado mientras isOpen es false (solo deja de
  // renderizar), así que sin esto el estado de la propuesta anterior seguiría
  // vivo en memoria hasta que llegue una respuesta nueva. Limpiarlo al cerrar
  // evita depender de eso y garantiza que nunca queden restos de una
  // generación anterior antes de mostrar la siguiente.
  useEffect(() => {
    if (!isOpen) {
      setDrafts([]);
      setSummary("");
      setPendingQuestions([]);
      setFeedbackInput("");
      setRefineHistory([]);
    }
  }, [isOpen]);

  const refineMutation = useMutation({
    mutationFn: (feedback: string) =>
      aiApi.refineProjectNotes({
        projectId,
        previousTasks: drafts.map(
          ({ selected: _selected, ...task }) => task,
        ),
        previousSummary: summary,
        feedback,
      }),
    onSuccess: (result, feedback) => {
      setDrafts(result.tasks.map((task) => ({ ...task, selected: true })));
      setRefineHistory((prev) => [...prev, { feedback, summary: result.summary }]);
      setSummary(result.summary);
      setPendingQuestions(result.pendingQuestions || []);
      setFeedbackInput("");
    },
    onError: () => {
      toast.error("No se pudo refinar la propuesta");
    },
  });

  const handleRefine = () => {
    const feedback = feedbackInput.trim();
    if (!feedback || refineMutation.isPending) return;
    refineMutation.mutate(feedback);
  };

  const createMutation = useMutation({
    mutationFn: (tasks: ExtractedTask[]) =>
      aiApi.createTasksFromParser({ projectId, clientId, tasks }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["board"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["project-stats", projectId] });
      queryClient.invalidateQueries({
        queryKey: ["project-context", projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ["project-active-tasks", projectId],
      });

      if (result.failed.length > 0) {
        toast.warning(
          `Se crearon ${result.created.length} tareas. Fallaron: ${result.failed.join(", ")}`,
        );
      } else {
        toast.success(`Se crearon ${result.created.length} tareas`);
      }
      onClose();
    },
    onError: () => {
      toast.error("No se pudieron crear las tareas");
    },
  });

  const updateDraft = (index: number, patch: Partial<DraftTask>) => {
    setDrafts((prev) =>
      prev.map((draft, i) => (i === index ? { ...draft, ...patch } : draft)),
    );
  };

  const selectedCount = drafts.filter((d) => d.selected).length;

  const handleCreate = () => {
    const tasks = drafts
      .filter((d) => d.selected)
      .map(({ selected: _selected, ...task }) => task);
    if (tasks.length === 0) return;
    createMutation.mutate(tasks);
  };

  if (!isOpen || !response) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-3xl bg-white dark:bg-gray-900 rounded-lg shadow-xl max-h-[90vh] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Tareas propuestas a partir de tus notas
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 space-y-4 overflow-y-auto overflow-x-hidden">
            <div className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
              <p className="text-sm text-purple-800 dark:text-purple-300 break-words">
                {summary}
              </p>
            </div>

            {drafts.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                No se detectaron tareas en las notas.
              </div>
            ) : (
              <div className="space-y-3">
                {drafts.map((draft, index) => (
                  <div
                    key={index}
                    className={cn(
                      "p-3 border rounded-lg transition-colors",
                      draft.selected
                        ? "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                        : "border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 opacity-60",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={draft.selected}
                        onChange={(e) =>
                          updateDraft(index, { selected: e.target.checked })
                        }
                        className="mt-2 w-4 h-4"
                      />
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={draft.title}
                            onChange={(e) =>
                              updateDraft(index, { title: e.target.value })
                            }
                            className="flex-1 min-w-0 h-9 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                          <select
                            value={draft.priority}
                            onChange={(e) =>
                              updateDraft(index, {
                                priority: e.target.value as ExtractedTask["priority"],
                              })
                            }
                            className="h-9 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary"
                          >
                            {Object.entries(priorityLabels).map(
                              ([value, label]) => (
                                <option key={value} value={value}>
                                  {label}
                                </option>
                              ),
                            )}
                          </select>
                          <Badge variant="outline" className="flex-shrink-0">
                            {Math.round(draft.confidence * 100)}%
                          </Badge>
                        </div>
                        <textarea
                          value={draft.description || ""}
                          onChange={(e) =>
                            updateDraft(index, { description: e.target.value })
                          }
                          placeholder="Descripción..."
                          rows={2}
                          className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                        />
                        {draft.sourceText && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 italic line-clamp-2 break-words">
                            &ldquo;{draft.sourceText}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {pendingQuestions.length > 0 && (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <h4 className="text-xs font-medium text-amber-800 dark:text-amber-300 mb-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Puntos pendientes
                </h4>
                <ul className="text-xs text-amber-700 dark:text-amber-400 list-disc list-inside space-y-0.5">
                  {pendingQuestions.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Refinamiento con feedback */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-3">
              {refineHistory.length > 0 && (
                <div className="space-y-2">
                  {refineHistory.map((entry, i) => (
                    <div key={i} className="text-xs space-y-1">
                      <p className="text-gray-500 dark:text-gray-400 break-words">
                        <span className="font-medium">Tú:</span> {entry.feedback}
                      </p>
                      <p className="text-purple-700 dark:text-purple-400 break-words">
                        <span className="font-medium">IA:</span> {entry.summary}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-end gap-2">
                <textarea
                  value={feedbackInput}
                  onChange={(e) => setFeedbackInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleRefine();
                    }
                  }}
                  placeholder="Pide cambios, ej: combina las dos primeras en una sola tarea de alta prioridad..."
                  rows={2}
                  disabled={refineMutation.isPending}
                  className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary resize-none disabled:opacity-60"
                />
                <Button
                  variant="outline"
                  onClick={handleRefine}
                  disabled={!feedbackInput.trim() || refineMutation.isPending}
                  className="h-fit"
                >
                  {refineMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-b-lg">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={selectedCount === 0 || createMutation.isPending}
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Crear {selectedCount} {selectedCount === 1 ? "tarea" : "tareas"}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
