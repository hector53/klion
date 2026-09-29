"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  X,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { clientsApi } from "@/lib/api";
import { useSpace } from "@/contexts/space-context";
import { ClientForm } from "@/components/clients/client-form";
import type { Client, CreateClientDto } from "@/types";

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  client?: Client | null; // Si se pasa, es edición; si no, es creación
}

const initialFormData: CreateClientDto = {
  name: "",
  company: "",
  email: "",
  phone: "",
  whatsapp: "",
  address: "",
  notes: "",
};

export function ClientModal({ isOpen, onClose, client }: ClientModalProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { currentSpace } = useSpace();
  const isEditing = !!client;

  const [formData, setFormData] = useState<CreateClientDto>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const sanitizeMetadata = (
    metadata?: Record<string, unknown>,
  ): Record<string, unknown> | undefined => {
    if (!metadata) {
      return undefined;
    }

    const nextMetadata: Record<string, unknown> = { ...metadata };

    const logoUrl =
      typeof nextMetadata.logoUrl === "string"
        ? nextMetadata.logoUrl.trim()
        : undefined;
    if (logoUrl) {
      nextMetadata.logoUrl = logoUrl;
    } else {
      delete nextMetadata.logoUrl;
    }

    const currency =
      typeof nextMetadata.currency === "string"
        ? nextMetadata.currency.trim().toUpperCase()
        : undefined;
    if (currency) {
      nextMetadata.currency = currency;
    } else {
      delete nextMetadata.currency;
    }

    const rawHourlyRate = nextMetadata.hourlyRate;
    const hourlyRate =
      typeof rawHourlyRate === "number"
        ? rawHourlyRate
        : typeof rawHourlyRate === "string" && rawHourlyRate.trim() !== ""
          ? Number(rawHourlyRate)
          : undefined;

    if (hourlyRate !== undefined && Number.isFinite(hourlyRate) && hourlyRate >= 0) {
      nextMetadata.hourlyRate = hourlyRate;
    } else {
      delete nextMetadata.hourlyRate;
    }

    return Object.keys(nextMetadata).length > 0 ? nextMetadata : undefined;
  };

  const handleFieldChange = (
    field: keyof CreateClientDto,
    value: string | Record<string, unknown> | undefined,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Reset form cuando cambia el client o se abre/cierra
  useEffect(() => {
    if (isOpen) {
      if (client) {
        // Modo edición: cargar datos del cliente
        setFormData({
          name: client.name,
          company: client.company || "",
          email: client.email || "",
          phone: client.phone || "",
          whatsapp: client.whatsapp || "",
          address: client.address || "",
          notes: client.notes || "",
          metadata: client.metadata || {},
        });
      } else {
        // Modo creación: resetear form
        setFormData(initialFormData);
      }
      setErrors({});
    }
  }, [isOpen, client]);

  // Mutaciones
  const createMutation = useMutation({
    mutationFn: (data: CreateClientDto) => clientsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Cliente creado exitosamente");
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<CreateClientDto>) =>
      clientsApi.update(client!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["client", client!.id] });
      toast.success("Cliente actualizado exitosamente");
      onClose();
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  // Validación
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "El nombre es requerido";
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "El email no es válido";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handlers
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    const dataToSubmit: CreateClientDto & { spaceId?: string } = {
      name: formData.name.trim(),
      company: formData.company?.trim() || undefined,
      email: formData.email?.trim() || undefined,
      phone: formData.phone?.trim() || undefined,
      whatsapp: formData.whatsapp?.trim() || undefined,
      address: formData.address?.trim() || undefined,
      notes: formData.notes?.trim() || undefined,
      metadata: sanitizeMetadata(formData.metadata),
      // Asignar al espacio actual solo en creación
      ...(!isEditing && currentSpace ? { spaceId: currentSpace.id } : {}),
    };

    if (isEditing) {
      updateMutation.mutate(dataToSubmit);
    } else {
      createMutation.mutate(dataToSubmit);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {isEditing ? "Editar cliente" : "Nuevo cliente"}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
            <ClientForm
              formData={formData}
              errors={errors}
              onChange={handleFieldChange}
            />

            {/* Error de mutación */}
            {(createMutation.error || updateMutation.error) && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Error al guardar el cliente. Inténtalo de nuevo.
                </p>
              </div>
            )}
          </form>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-b-lg">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending} onClick={handleSubmit}>
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditing ? "Guardar cambios" : "Crear cliente"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
