"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Loader2, Plus, Trash2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { projectContextApi } from "@/lib/api";
import type { ProjectContext } from "@/types";

interface ProjectContextModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  context?: ProjectContext | null;
}

export function ProjectContextModal({
  isOpen,
  onClose,
  projectId,
  projectName,
  context,
}: ProjectContextModalProps) {
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    stack: "",
    rules: [] as string[],
    aiDescription: "",
    repositoryUrl: "",
    localPath: "",
    defaultBranch: "main",
    tags: [] as string[],
    ragEnabled: true,
  });

  const [newRule, setNewRule] = useState("");
  const [newTag, setNewTag] = useState("");

  useEffect(() => {
    if (isOpen && context) {
      setFormData({
        stack: context.stack || "",
        rules: context.rules || [],
        aiDescription: context.aiDescription || "",
        repositoryUrl: context.repositoryUrl || "",
        localPath: context.localPath || "",
        defaultBranch: context.defaultBranch || "main",
        tags: context.tags || [],
        ragEnabled: context.ragEnabled ?? true,
      });
    } else if (isOpen) {
      setFormData({
        stack: "",
        rules: [],
        aiDescription: "",
        repositoryUrl: "",
        localPath: "",
        defaultBranch: "main",
        tags: [],
        ragEnabled: true,
      });
    }
  }, [isOpen, context]);

  const updateMutation = useMutation({
    mutationFn: (data: typeof formData) => projectContextApi.updateContext(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-context", projectId] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const addRule = () => {
    const rule = newRule.trim();
    if (rule && !formData.rules.includes(rule)) {
      setFormData((prev) => ({ ...prev, rules: [...prev.rules, rule] }));
      setNewRule("");
    }
  };

  const removeRule = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      rules: prev.rules.filter((_, i) => i !== index),
    }));
  };

  const addTag = () => {
    const tag = newTag.trim().toLowerCase();
    if (tag && !formData.tags.includes(tag)) {
      setFormData((prev) => ({ ...prev, tags: [...prev.tags, tag] }));
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tagToRemove),
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold dark:text-white">Configurar Contexto</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{projectName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="p-6 space-y-5">
            {/* Info Banner */}
            <div className="flex gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm">
              <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="text-blue-700 dark:text-blue-300">
                <p className="font-medium">Contexto para IA</p>
                <p className="text-blue-600 dark:text-blue-400">
                  Esta informacin ayuda al asistente de IA a entender mejor tu proyecto
                  y proporcionar respuestas ms precisas.
                </p>
              </div>
            </div>

            {/* Stack */}
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">
                Stack Tecnolgico
              </label>
              <input
                type="text"
                value={formData.stack}
                onChange={(e) => setFormData((prev) => ({ ...prev, stack: e.target.value }))}
                className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
                placeholder="Ej: Next.js 14, NestJS, PostgreSQL, TailwindCSS"
              />
            </div>

            {/* AI Description */}
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">
                Descripcin para IA
              </label>
              <textarea
                value={formData.aiDescription}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, aiDescription: e.target.value }))
                }
                className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
                placeholder="Describe el proyecto para que la IA entienda su propsito y arquitectura..."
                rows={3}
              />
            </div>

            {/* Rules */}
            <div>
              <label className="block text-sm font-medium mb-2 dark:text-gray-300">
                Reglas de Desarrollo
              </label>
              {formData.rules.length > 0 && (
                <ul className="space-y-2 mb-3">
                  {formData.rules.map((rule, index) => (
                    <li
                      key={index}
                      className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded"
                    >
                      <span className="flex-1 text-sm dark:text-gray-300">{rule}</span>
                      <button
                        type="button"
                        onClick={() => removeRule(index)}
                        className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newRule}
                  onChange={(e) => setNewRule(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addRule();
                    }
                  }}
                  className="flex-1 px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
                  placeholder="Ej: Usar DTOs estrictos para validacin"
                />
                <Button type="button" variant="outline" onClick={addRule}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Repository */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">
                  URL del Repositorio
                </label>
                <input
                  type="url"
                  value={formData.repositoryUrl}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, repositoryUrl: e.target.value }))
                  }
                  className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
                  placeholder="https://github.com/..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">
                  Branch por defecto
                </label>
                <input
                  type="text"
                  value={formData.defaultBranch}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, defaultBranch: e.target.value }))
                  }
                  className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
                  placeholder="main"
                />
              </div>
            </div>

            {/* Local Path */}
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">
                Ruta Local (para RAG)
              </label>
              <input
                type="text"
                value={formData.localPath}
                onChange={(e) => setFormData((prev) => ({ ...prev, localPath: e.target.value }))}
                className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm font-mono"
                placeholder="/Users/tu-usuario/proyectos/mi-proyecto"
              />
              <p className="text-xs text-gray-500 mt-1">
                Ruta absoluta al repositorio en tu mquina local
              </p>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium mb-2 dark:text-gray-300">
                Tags
              </label>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {formData.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded text-sm"
                    >
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  className="flex-1 px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
                  placeholder="typescript, nestjs, react..."
                />
                <Button type="button" variant="outline" onClick={addTag}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* RAG Enabled */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <input
                type="checkbox"
                id="ragEnabled"
                checked={formData.ragEnabled}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, ragEnabled: e.target.checked }))
                }
                className="rounded"
              />
              <label htmlFor="ragEnabled" className="flex-1">
                <p className="text-sm font-medium dark:text-gray-300">Habilitar RAG</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Permite indexar el cdigo para bsquedas semnticas
                </p>
              </label>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 px-6 py-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Guardar cambios
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
