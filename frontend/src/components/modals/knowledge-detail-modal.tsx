"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  X,
  Edit,
  Archive,
  ArchiveRestore,
  Trash2,
  ExternalLink,
  Code,
  Clock,
  Eye,
  Tag,
  Copy,
  Check,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { sanitizeHtml } from "@/lib/rich-text";
import type { Knowledge, KnowledgeType, KnowledgeTag } from "@/types";

// Helper to extract tag name from string or object
const getTagName = (tag: KnowledgeTag): string =>
  typeof tag === "string" ? tag : tag.name;

interface KnowledgeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  knowledge: Knowledge | null;
  onEdit?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
}

const knowledgeTypeLabels: Record<KnowledgeType, string> = {
  snippet: "Snippet",
  flow: "Flujo",
  decision: "Decisin",
  pattern: "Patrn",
  solution: "Solucin",
  reference: "Referencia",
  other: "Otro",
};

export function KnowledgeDetailModal({
  isOpen,
  onClose,
  knowledge,
  onEdit,
  onArchive,
  onDelete,
}: KnowledgeDetailModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !knowledge) return null;

  const copyContent = async () => {
    try {
      await navigator.clipboard.writeText(knowledge.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const isRichContent =
    !knowledge.language ||
    knowledge.language === "html" ||
    knowledge.language === "rich-text" ||
    /<[a-z][\s\S]*>/i.test(knowledge.content);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b dark:border-gray-700">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline">
                {knowledgeTypeLabels[knowledge.type]}
              </Badge>
              {knowledge.language && (
                <Badge variant="secondary" className="font-mono text-xs">
                  {knowledge.language}
                </Badge>
              )}
            </div>
            <h2 className="text-xl font-semibold dark:text-white truncate">
              {knowledge.title}
            </h2>
            {knowledge.summary && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {knowledge.summary}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onEdit}
                title="Editar"
              >
                <Edit className="w-4 h-4" />
              </Button>
            )}
            {onArchive && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onArchive}
                title={knowledge.isArchived ? "Desarchivar" : "Archivar"}
              >
                {knowledge.isArchived ? (
                  <ArchiveRestore className="w-4 h-4" />
                ) : (
                  <Archive className="w-4 h-4" />
                )}
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onDelete}
                title="Eliminar"
                className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded ml-2"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Code/Content Block */}
          <div className="relative mb-6">
            <div className="absolute top-2 right-2 flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={copyContent}
                className="h-8 px-2 text-xs"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 mr-1 text-green-500" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 mr-1" />
                    Copiar
                  </>
                )}
              </Button>
            </div>
            {isRichContent ? (
              <div
                className="prose prose-invert prose-sm max-w-none p-4 rounded-lg bg-gray-900 text-gray-100 overflow-x-auto [&_table]:border-collapse [&_td]:border [&_td]:border-slate-600 [&_td]:px-3 [&_td]:py-1.5 [&_th]:border [&_th]:border-slate-600 [&_th]:px-3 [&_th]:py-1.5 [&_th]:bg-slate-800 [&_img]:max-w-full [&_img]:rounded-md"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(knowledge.content) }}
              />
            ) : (
              <pre
                className={cn(
                  "p-4 rounded-lg overflow-x-auto text-sm",
                  "bg-gray-900 text-gray-100",
                  knowledge.language && "font-mono",
                )}
              >
                <code>{knowledge.content}</code>
              </pre>
            )}
          </div>

          {/* Tags */}
          {knowledge.tags && knowledge.tags.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Etiquetas
              </h3>
              <div className="flex flex-wrap gap-2">
                {knowledge.tags.map((tag, idx) => {
                  const tagName = getTagName(tag);
                  return (
                    <span
                      key={tagName || idx}
                      className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded text-sm"
                    >
                      {tagName}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Source URL */}
          {knowledge.sourceUrl && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Referencia
              </h3>
              <a
                href={knowledge.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                {knowledge.sourceUrl}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400 pt-4 border-t dark:border-gray-700">
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              Creado{" "}
              {format(new Date(knowledge.createdAt), "d MMM yyyy", {
                locale: es,
              })}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              {knowledge.usageCount}{" "}
              {knowledge.usageCount === 1 ? "vista" : "vistas"}
            </span>
            {knowledge.project && (
              <span>
                Proyecto: <strong>{knowledge.project.name}</strong>
              </span>
            )}
            {knowledge.client && (
              <span>
                Cliente: <strong>{knowledge.client.name}</strong>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
