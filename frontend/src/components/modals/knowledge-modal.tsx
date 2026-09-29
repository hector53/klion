"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { knowledgeApi, projectsApi, clientsApi } from "@/lib/api";
import { uploadImageToFilesService } from "@/lib/files-upload";
import { cn } from "@/lib/utils";
import type {
  Knowledge,
  KnowledgeType,
  CreateKnowledgeDto,
  Project,
  Client,
  KnowledgeTag,
} from "@/types";

// Helper to extract tag name from string or object
const getTagName = (tag: KnowledgeTag): string =>
  typeof tag === "string" ? tag : tag.name;

interface KnowledgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  knowledge?: Knowledge | null;
}

import { KnowledgeType as KT } from "@/types";

const knowledgeTypes: { value: KnowledgeType; label: string }[] = [
  { value: KT.SNIPPET, label: "Snippet de codigo" },
  { value: KT.FLOW, label: "Flujo/Proceso" },
  { value: KT.DECISION, label: "Decision de arquitectura" },
  { value: KT.PATTERN, label: "Patron de diseno" },
  { value: KT.SOLUTION, label: "Solucion a problema" },
  { value: KT.REFERENCE, label: "Referencia/Documentacion" },
  { value: KT.OTHER, label: "Otro" },
];

const languageOptions = [
  "rich-text",
  "typescript",
  "javascript",
  "python",
  "go",
  "rust",
  "java",
  "sql",
  "bash",
  "markdown",
  "json",
  "yaml",
  "html",
  "css",
  "graphql",
];

export function KnowledgeModal({
  isOpen,
  onClose,
  knowledge,
}: KnowledgeModalProps) {
  const queryClient = useQueryClient();
  const isEditing = !!knowledge;

  const [formData, setFormData] = useState({
    title: "",
    content: "",
    type: KT.SNIPPET as KnowledgeType,
    summary: "",
    language: "",
    sourceUrl: "",
    projectId: "",
    clientId: "",
    tags: [] as string[],
    isPublic: false,
  });
  const [tagInput, setTagInput] = useState("");

  // Fetch projects and clients for selects
  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => projectsApi.getAll(),
    enabled: isOpen,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => clientsApi.getAll(),
    enabled: isOpen,
  });

  // Reset form when modal opens/closes or knowledge changes
  useEffect(() => {
    if (isOpen && knowledge) {
      setFormData({
        title: knowledge.title,
        content: knowledge.content,
        type: knowledge.type,
        summary: knowledge.summary || "",
        language: knowledge.language || "",
        sourceUrl: knowledge.sourceUrl || "",
        projectId: knowledge.projectId || "",
        clientId: knowledge.clientId || "",
        tags: (knowledge.tags || []).map(getTagName),
        isPublic: knowledge.isPublic,
      });
    } else if (isOpen) {
      setFormData({
        title: "",
        content: "",
        type: KT.SNIPPET,
        summary: "",
        language: "",
        sourceUrl: "",
        projectId: "",
        clientId: "",
        tags: [],
        isPublic: false,
      });
    }
    setTagInput("");
  }, [isOpen, knowledge]);

  const createMutation = useMutation({
    mutationFn: (data: CreateKnowledgeDto) => knowledgeApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge"] });
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<CreateKnowledgeDto>;
    }) => knowledgeApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge"] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data: CreateKnowledgeDto = {
      title: formData.title,
      content: formData.content,
      type: formData.type,
      summary: formData.summary || undefined,
      language: formData.language || undefined,
      sourceUrl: formData.sourceUrl || undefined,
      projectId: formData.projectId || undefined,
      clientId: formData.clientId || undefined,
      tags: formData.tags.length > 0 ? formData.tags : undefined,
      isPublic: formData.isPublic,
    };

    if (isEditing && knowledge) {
      updateMutation.mutate({ id: knowledge.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !formData.tags.includes(tag)) {
      setFormData((prev) => ({ ...prev, tags: [...prev.tags, tag] }));
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tagToRemove),
    }));
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b dark:border-gray-700">
          <h2 className="text-lg font-semibold dark:text-white">
            {isEditing ? "Editar conocimiento" : "Nuevo conocimiento"}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="overflow-y-auto max-h-[calc(90vh-140px)]"
        >
          <div className="p-6 space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">
                Ttulo *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
                placeholder="Ej: Autenticacin JWT con refresh tokens"
                required
              />
            </div>

            {/* Type & Language */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">
                  Tipo
                </label>
                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      type: e.target.value as KnowledgeType,
                    }))
                  }
                  className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
                >
                  {knowledgeTypes.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">
                  Lenguaje
                </label>
                <select
                  value={formData.language}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      language: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
                >
                  <option value="">Seleccionar...</option>
                  {languageOptions.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">
                Contenido *
              </label>
              <RichTextEditor
                value={formData.content}
                onChange={(value) =>
                  setFormData((prev) => ({ ...prev, content: value }))
                }
                onImageUpload={uploadImageToFilesService}
                placeholder="Código, documentación o descripción..."
              />
            </div>

            {/* Summary */}
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">
                Resumen (opcional)
              </label>
              <textarea
                value={formData.summary}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, summary: e.target.value }))
                }
                className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
                placeholder="Breve descripcin para bsquedas rpidas..."
                rows={2}
              />
            </div>

            {/* Project & Client */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">
                  Proyecto
                </label>
                <select
                  value={formData.projectId}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      projectId: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
                >
                  <option value="">Sin proyecto</option>
                  {projects.map((p: Project) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">
                  Cliente
                </label>
                <select
                  value={formData.clientId}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      clientId: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
                >
                  <option value="">Sin cliente</option>
                  {clients.map((c: Client) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Source URL */}
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">
                URL de referencia
              </label>
              <input
                type="url"
                value={formData.sourceUrl}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    sourceUrl: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
                placeholder="https://..."
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">
                Etiquetas
              </label>
              <div className="flex gap-2 mb-2 flex-wrap">
                {formData.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded text-sm"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="hover:text-primary/70"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  className="flex-1 px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
                  placeholder="Agregar etiqueta..."
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addTag}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Public checkbox */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPublic"
                checked={formData.isPublic}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    isPublic: e.target.checked,
                  }))
                }
                className="rounded"
              />
              <label htmlFor="isPublic" className="text-sm dark:text-gray-300">
                Hacer pblico (visible para todos)
              </label>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 px-6 py-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditing ? "Guardar cambios" : "Crear conocimiento"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
