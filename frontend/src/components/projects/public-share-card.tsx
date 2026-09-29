"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Link2, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { projectsApi } from "@/lib/api";
import { cn } from "@/lib/utils";

interface PublicShareCardProps {
  projectId: string;
}

export function buildPublicShareUrl(token: string) {
  return `${window.location.origin}/public/projects/${token}`;
}

/**
 * Controls for the read-only link handed to a client: on/off, copy, rotate.
 * Sharing is off by default; the link only exists while the toggle is on.
 */
export function PublicShareCard({ projectId }: PublicShareCardProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  const { data: sharing, isLoading } = useQuery({
    queryKey: ["project-sharing", projectId],
    queryFn: () => projectsApi.getSharing(projectId),
    enabled: !!projectId,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["project-sharing", projectId] });

  const toggleMutation = useMutation({
    mutationFn: (enabled: boolean) => projectsApi.setSharing(projectId, enabled),
    onSuccess: (data) => {
      invalidate();
      toast.success(
        data.enabled ? "Enlace público activado" : "Enlace público desactivado",
      );
    },
    onError: () => toast.error("No se pudo cambiar el enlace público"),
  });

  const regenerateMutation = useMutation({
    mutationFn: () => projectsApi.regenerateShareToken(projectId),
    onSuccess: () => {
      invalidate();
      toast.success("Enlace regenerado. El anterior dejó de funcionar.");
    },
    onError: () => toast.error("No se pudo regenerar el enlace"),
  });

  const handleRegenerate = () => {
    if (
      confirm(
        "¿Regenerar el enlace? El link que ya compartiste dejará de funcionar.",
      )
    ) {
      regenerateMutation.mutate();
    }
  };

  const handleCopy = async () => {
    if (!sharing?.token) return;
    try {
      await navigator.clipboard.writeText(buildPublicShareUrl(sharing.token));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Link público copiado");
    } catch {
      toast.error("No se pudo copiar el link");
    }
  };

  const isEnabled = !!sharing?.enabled;
  const isBusy = toggleMutation.isPending || regenerateMutation.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Link2 className="h-4 w-4" />
          Enlace público
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Vista de solo lectura del board de este proyecto. Cualquiera con el
            enlace puede verlo, sin iniciar sesión.
          </p>
          <button
            role="switch"
            aria-checked={isEnabled}
            aria-label="Activar enlace público"
            disabled={isLoading || isBusy}
            onClick={() => toggleMutation.mutate(!isEnabled)}
            className={cn(
              "relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50",
              isEnabled ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform",
                isEnabled ? "translate-x-[22px]" : "translate-x-0.5",
              )}
            />
          </button>
        </div>

        {isEnabled && sharing?.token && (
          <>
            <code className="block truncate rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
              /public/projects/{sharing.token}
            </code>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={handleCopy}>
                {copied ? (
                  <Check className="mr-2 h-4 w-4" />
                ) : (
                  <Copy className="mr-2 h-4 w-4" />
                )}
                Copiar link
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={isBusy}
                onClick={handleRegenerate}
              >
                <RefreshCw
                  className={cn(
                    "mr-2 h-4 w-4",
                    regenerateMutation.isPending && "animate-spin",
                  )}
                />
                Regenerar
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
