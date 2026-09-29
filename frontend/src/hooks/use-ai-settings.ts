"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { aiApi, AISettings, UpdateAISettingsDto } from "@/lib/api";
import { useToast } from "@/components/ui/toast";

export function useAISettings() {
  const queryClient = useQueryClient();
  const toast = useToast();

  // Query para obtener la configuración
  const {
    data: settings,
    isLoading,
    error,
  } = useQuery<AISettings>({
    queryKey: ["ai-settings"],
    queryFn: aiApi.getSettings,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  // Mutation para actualizar la configuración
  const updateMutation = useMutation({
    mutationFn: (data: UpdateAISettingsDto) => aiApi.updateSettings(data),
    onSuccess: (updatedSettings) => {
      queryClient.setQueryData(["ai-settings"], updatedSettings);
      toast.success("Configuración de IA guardada exitosamente");
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message ||
        "Error al guardar la configuración de IA";
      toast.error(message);
    },
  });

  // Query para obtener modelos disponibles
  const { data: availableModels } = useQuery({
    queryKey: ["ai-models"],
    queryFn: aiApi.getAvailableModels,
    staleTime: 60 * 60 * 1000, // 1 hora (los modelos no cambian frecuentemente)
  });

  const updateSettings = (data: UpdateAISettingsDto) => {
    return updateMutation.mutate(data);
  };

  const isSaving = updateMutation.isPending;

  return {
    settings,
    isLoading,
    error,
    availableModels,
    updateSettings,
    isSaving,
  };
}
