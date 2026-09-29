"use client";

"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, FileCode, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { CodeSearchResult } from "@/types";

interface CodePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: CodeSearchResult | null;
}

export function CodePreviewModal({
  isOpen,
  onClose,
  result,
}: CodePreviewModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !result) return null;

  const copyContent = async () => {
    try {
      await navigator.clipboard.writeText(result.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b dark:border-gray-700">
          <div>
            <div className="flex items-center gap-2 text-lg font-semibold dark:text-white">
              <FileCode className="w-5 h-5 text-primary" />
              <span className="truncate">{result.filePath.split('/').pop()}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mt-1">
              <span className="truncate max-w-md">{result.filePath}</span>
              <Badge variant="outline" className="text-xs">
                L{result.startLine}-{result.endLine}
              </Badge>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
          >
           <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden relative bg-gray-950 p-4">
          <div className="absolute top-4 right-4 z-10">
            <Button
              variant="ghost"
              size="sm"
              onClick={copyContent}
              className="h-8 px-2 text-xs text-gray-400 hover:text-white hover:bg-gray-800"
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
          <div className="h-full overflow-auto custom-scrollbar">
            <pre className="text-sm font-mono text-gray-300">
              <code>{result.content}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
