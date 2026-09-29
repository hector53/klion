"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { StickyNote, Sparkles, Loader2, Check } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { useDebounce } from "@/hooks/use-debounce";
import { useToast } from "@/components/ui/toast";
import { projectNotesApi, aiApi } from "@/lib/api";
import { isRichTextEmpty } from "@/lib/rich-text";
import { uploadImageToFilesService } from "@/lib/files-upload";
import type { AnalyzeNotesResponse } from "@/types";

interface ProjectNotesCardProps {
  projectId: string;
  onTasksGenerated: (response: AnalyzeNotesResponse) => void;
}

export function ProjectNotesCard({
  projectId,
  onTasksGenerated,
}: ProjectNotesCardProps) {
  const toast = useToast();
  const [content, setContent] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const hasLoadedRef = useRef(false);

  const { data: note } = useQuery({
    queryKey: ["project-note", projectId],
    queryFn: () => projectNotesApi.get(projectId),
  });

  useEffect(() => {
    if (note && !hasLoadedRef.current) {
      setContent(note.content || "");
      hasLoadedRef.current = true;
    }
  }, [note]);

  const debouncedContent = useDebounce(content, 1500);

  const saveMutation = useMutation({
    mutationFn: (value: string) => projectNotesApi.update(projectId, value),
    onMutate: () => setSaveState("saving"),
    onSuccess: () => setSaveState("saved"),
    onError: () => {
      setSaveState("idle");
      toast.error("No se pudo guardar la nota");
    },
  });

  useEffect(() => {
    if (!hasLoadedRef.current) return;
    if (debouncedContent === (note?.content || "")) return;
    saveMutation.mutate(debouncedContent);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedContent]);

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      if (content !== (note?.content || "")) {
        await projectNotesApi.update(projectId, content);
      }
      return aiApi.analyzeProjectNotes(projectId);
    },
    onSuccess: (data) => {
      onTasksGenerated(data);
    },
    onError: () => {
      toast.error("No se pudieron generar tareas a partir de las notas");
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <StickyNote className="w-4 h-4" />
          Bloc de Notas
        </CardTitle>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground min-w-[70px] text-right">
            {saveState === "saving" && "Guardando…"}
            {saveState === "saved" && (
              <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                <Check className="w-3 h-3" /> Guardado
              </span>
            )}
          </span>
          <Button
            size="sm"
            onClick={() => analyzeMutation.mutate()}
            disabled={isRichTextEmpty(content) || analyzeMutation.isPending}
          >
            {analyzeMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analizando...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generar tareas con IA
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <RichTextEditor
          value={content}
          onChange={setContent}
          onImageUpload={uploadImageToFilesService}
          placeholder="Anota aquí lo que vayas encontrando mientras pruebas el proyecto: bugs, pendientes, ideas... puedes pegar capturas de pantalla."
          height={500}
          minHeight={400}
        />
      </CardContent>
    </Card>
  );
}
