"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Plus,
  Filter,
  Code,
  FileText,
  Lightbulb,
  GitBranch,
  Puzzle,
  BookOpen,
  MoreHorizontal,
  Loader2,
  Tag,
  ExternalLink,
  Clock,
  Eye,
  Archive,
  Trash2,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MobileHeader } from "@/components/ui/sidebar";
import { KnowledgeModal } from "@/components/modals/knowledge-modal";
import { KnowledgeDetailModal } from "@/components/modals/knowledge-detail-modal";
import { ConfirmModal } from "@/components/modals/confirm-modal";
import { knowledgeApi, projectsApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import type {
  Knowledge,
  KnowledgeType,
  KnowledgeSearchResult,
  Project,
  KnowledgeTag,
} from "@/types";

// Helper to extract tag name from string or object
const getTagName = (tag: KnowledgeTag): string =>
  typeof tag === "string" ? tag : tag.name;

const knowledgeTypeConfig: Record<
  KnowledgeType,
  { label: string; icon: typeof Code; color: string }
> = {
  snippet: {
    label: "Snippet",
    icon: Code,
    color: "text-blue-500 bg-blue-500/10",
  },
  flow: {
    label: "Flujo",
    icon: GitBranch,
    color: "text-purple-500 bg-purple-500/10",
  },
  decision: {
    label: "Decisin",
    icon: Lightbulb,
    color: "text-amber-500 bg-amber-500/10",
  },
  pattern: {
    label: "Patrn",
    icon: Puzzle,
    color: "text-emerald-500 bg-emerald-500/10",
  },
  solution: {
    label: "Solucin",
    icon: FileText,
    color: "text-rose-500 bg-rose-500/10",
  },
  reference: {
    label: "Referencia",
    icon: BookOpen,
    color: "text-cyan-500 bg-cyan-500/10",
  },
  other: {
    label: "Otro",
    icon: MoreHorizontal,
    color: "text-gray-500 bg-gray-500/10",
  },
};

export default function KnowledgePage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Initialize from URL
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [selectedType, setSelectedType] = useState<KnowledgeType | "">((searchParams.get("type") as KnowledgeType) || "");
  const [selectedProjectId, setSelectedProjectId] = useState<string>(searchParams.get("projectId") || "");
  const [selectedTag, setSelectedTag] = useState<string>(searchParams.get("tag") || "");
  
  const [showArchived, setShowArchived] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingKnowledge, setEditingKnowledge] = useState<Knowledge | null>(null);
  const [selectedKnowledge, setSelectedKnowledge] = useState<Knowledge | null>(
    null,
  );
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [knowledgeToDelete, setKnowledgeToDelete] = useState<Knowledge | null>(null);

  // Sync state to URL helper
  const updateUrl = (params: Record<string, string | null>) => {
    const newParams = new URLSearchParams(searchParams.toString());
    
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        newParams.set(key, value);
      } else {
        newParams.delete(key);
      }
    });

    router.push(`${pathname}?${newParams.toString()}`);
  };

  // Check for ID in URL to open modal
  useEffect(() => {
    const id = searchParams.get("id");
    if (id && !selectedKnowledge && !isDetailModalOpen) {
      knowledgeApi.getOne(id).then((item) => {
        setSelectedKnowledge(item);
        setIsDetailModalOpen(true);
      }).catch(() => {
        // If not found, remove from URL
        updateUrl({ id: null });
      });
    } else if (!id && isDetailModalOpen) {
      setIsDetailModalOpen(false);
      setSelectedKnowledge(null);
    }
  }, [searchParams]);

  // Fetch all knowledge
  const { data: knowledgeList = [], isLoading } = useQuery({
    queryKey: ["knowledge", selectedType, selectedProjectId, selectedTag, showArchived],
    queryFn: () =>
      knowledgeApi.getAll({
        type: selectedType || undefined,
        projectId: selectedProjectId || undefined,
        tag: selectedTag || undefined,
        includeArchived: showArchived || undefined,
        limit: 100,
      }),
  });

  // Search results (separate query for semantic search)
  const { data: searchResults = [], isLoading: isSearching } = useQuery({
    queryKey: ["knowledge-search", searchQuery],
    queryFn: () => knowledgeApi.search({ query: searchQuery, limit: 20 }),
    enabled: searchQuery.length >= 2,
  });

  // Fetch projects for filter
  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => projectsApi.getAll(),
  });

  // Fetch popular tags
  const { data: popularTags = [] } = useQuery({
    queryKey: ["knowledge-tags"],
    queryFn: () => knowledgeApi.getPopularTags(10),
  });

  // Archive mutation
  const archiveMutation = useMutation({
    mutationFn: knowledgeApi.archive,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge"] });
      setIsDetailModalOpen(false);
      setSelectedKnowledge(null);
      updateUrl({ id: null });
    },
  });

  // Unarchive mutation (set isArchived: false via update)
  const unarchiveMutation = useMutation({
    mutationFn: (id: string) => knowledgeApi.update(id, { isArchived: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge"] });
      setIsDetailModalOpen(false);
      setSelectedKnowledge(null);
      updateUrl({ id: null });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: knowledgeApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge"] });
      setIsDeleteModalOpen(false);
      setKnowledgeToDelete(null);
      setIsDetailModalOpen(false);
      setSelectedKnowledge(null);
      updateUrl({ id: null });
    },
  });

  // Use search results if searching, otherwise filtered list
  const displayedItems = useMemo(() => {
    if (searchQuery.length >= 2) {
      return searchResults;
    }
    return knowledgeList;
  }, [searchQuery, searchResults, knowledgeList]);

  const handleViewKnowledge = (item: Knowledge | KnowledgeSearchResult) => {
    updateUrl({ id: item.id });
    // Fetch details is handled by useEffect when URL changes
    // But for immediate feedback/optimistic UI if we have data:
    if (!("relevance" in item)) {
       setSelectedKnowledge(item as Knowledge);
       setIsDetailModalOpen(true);
    }
  };

  const clearFilters = () => {
    setSelectedType("");
    setSelectedProjectId("");
    setSelectedTag("");
    setSearchQuery("");
    setShowArchived(false);
    router.push(pathname);
  };

  const hasActiveFilters =
    selectedType || selectedProjectId || selectedTag || searchQuery || showArchived;

  return (
    <div className="h-full overflow-auto">
      <MobileHeader title="Knowledge Base" />

      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 lg:px-6 py-4 sticky top-0 z-10">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex-1">
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
              Knowledge Base
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Snippets, decisiones, patrones y soluciones reutilizables
            </p>
          </div>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo conocimiento
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="mt-4 flex flex-col lg:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar conocimiento (semntico)..."
              value={searchQuery}
              onChange={(e) => {
                const val = e.target.value;
                setSearchQuery(val);
                // Debounce URL update could be better, but simple for now
                if (!val) updateUrl({ q: null });
              }}
              onBlur={() => updateUrl({ q: searchQuery })}
              onKeyDown={(e) => e.key === 'Enter' && updateUrl({ q: searchQuery })}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
            )}
          </div>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => {
                const val = e.target.value as KnowledgeType | "";
                setSelectedType(val);
                updateUrl({ type: val });
              }
            }
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
          >
            <option value="">Todos los tipos</option>
            {Object.entries(knowledgeTypeConfig).map(([key, { label }]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>

          {/* Project Filter */}
          <select
            value={selectedProjectId}
            onChange={(e) => {
                const val = e.target.value;
                setSelectedProjectId(val);
                updateUrl({ projectId: val });
              }
            }
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
          >
            <option value="">Todos los proyectos</option>
            {projects.map((p: Project) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Archived toggle */}
          <Button
            variant={showArchived ? "default" : "outline"}
            size="sm"
            onClick={() => setShowArchived(!showArchived)}
            className="flex items-center gap-1"
          >
            <Archive className="w-4 h-4" />
            Archivados
          </Button>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="w-4 h-4 mr-1" />
              Limpiar
            </Button>
          )}
        </div>

        {/* Popular Tags */}
        {popularTags.length > 0 && !searchQuery && (
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <Tag className="w-4 h-4 text-gray-400" />
            {popularTags.map((tag: { name: string; count: number }) => (
              <button
                key={tag.name}
                onClick={() => {
                  const newVal = selectedTag === tag.name ? "" : tag.name;
                  setSelectedTag(newVal);
                  updateUrl({ tag: newVal });
                }}
                className={cn(
                  "px-2 py-1 text-xs rounded-full transition-colors",
                  selectedTag === tag.name
                    ? "bg-primary text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700",
                )}
              >
                {tag.name} ({tag.count})
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Content */}
      <div className="p-4 lg:p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : displayedItems.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {searchQuery ? "Sin resultados" : "Sin conocimiento guardado"}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {searchQuery
                ? "Intenta con otros trminos de bsqueda"
                : "Comienza guardando snippets, decisiones o patrones"}
            </p>
            {!searchQuery && (
              <Button onClick={() => setIsCreateModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Crear primer conocimiento
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {displayedItems.map((item) => {
              const typeConfig =
                knowledgeTypeConfig[item.type] || knowledgeTypeConfig.other;
              const TypeIcon = typeConfig.icon;
              const isSearchResult = "relevance" in item;

              const isArchived = "isArchived" in item && item.isArchived;

              return (
                <Card
                  key={item.id}
                  className={cn(
                    "hover:shadow-md transition-shadow cursor-pointer group",
                    isArchived && "opacity-60",
                  )}
                  onClick={() => handleViewKnowledge(item)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={cn("p-1.5 rounded", typeConfig.color)}>
                          <TypeIcon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <CardTitle className="text-base truncate">
                            {isArchived && (
                              <Archive className="w-3.5 h-3.5 inline mr-1 text-gray-400" />
                            )}
                            {item.title}
                          </CardTitle>
                          {isSearchResult && (
                            <span className="text-xs text-emerald-600 dark:text-emerald-400">
                              {Math.round(
                                (item as KnowledgeSearchResult).relevance * 100,
                              )}
                              % relevante
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-xs flex-shrink-0"
                      >
                        {typeConfig.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {(item.summary || ("content" in item && item.content)) && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                        {item.summary ||
                          ("content" in item ? item.content.slice(0, 150) : "")}
                      </p>
                    )}

                    {/* Tags */}
                    {item.tags && item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {item.tags.slice(0, 4).map((tag, idx) => {
                          const tagName = getTagName(tag as KnowledgeTag);
                          return (
                            <span
                              key={tagName || idx}
                              className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded"
                            >
                              {tagName}
                            </span>
                          );
                        })}
                        {item.tags.length > 4 && (
                          <span className="text-xs text-gray-500">
                            +{item.tags.length - 4}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Meta info */}
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-3">
                        {item.language && (
                          <span className="flex items-center gap-1">
                            <Code className="w-3 h-3" />
                            {item.language}
                          </span>
                        )}
                        {"usageCount" in item && (
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {item.usageCount}
                          </span>
                        )}
                      </div>
                      {"projectName" in item && item.projectName && (
                        <span className="truncate max-w-[120px]">
                          {item.projectName}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      <KnowledgeModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingKnowledge(null);
        }}
        knowledge={editingKnowledge}
      />

      <KnowledgeDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedKnowledge(null);
          updateUrl({ id: null });
        }}
        knowledge={selectedKnowledge}
        onEdit={() => {
          setEditingKnowledge(selectedKnowledge);
          setIsDetailModalOpen(false);
          setIsCreateModalOpen(true);
        }}
        onArchive={() => {
          if (selectedKnowledge) {
            if (selectedKnowledge.isArchived) {
              unarchiveMutation.mutate(selectedKnowledge.id);
            } else {
              archiveMutation.mutate(selectedKnowledge.id);
            }
          }
        }}
        onDelete={() => {
          if (selectedKnowledge) {
            setKnowledgeToDelete(selectedKnowledge);
            setIsDeleteModalOpen(true);
          }
        }}
      />

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setKnowledgeToDelete(null);
        }}
        onConfirm={() => {
          if (knowledgeToDelete) {
            deleteMutation.mutate(knowledgeToDelete.id);
          }
        }}
        title="Eliminar conocimiento"
        message={`¿Estás seguro de eliminar "${knowledgeToDelete?.title}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
