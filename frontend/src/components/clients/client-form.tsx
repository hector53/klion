"use client";

import { AlertCircle, Building, FileText, Globe, Mail, MapPin, Phone } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { CreateClientDto } from "@/types";

interface ClientFormProps {
  formData: CreateClientDto;
  errors: Record<string, string>;
  onChange: (field: keyof CreateClientDto, value: string | Record<string, unknown> | undefined) => void;
}

function getMetadataString(
  metadata: Record<string, unknown> | undefined,
  key: string,
): string {
  const value = metadata?.[key];
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : "";
}

export function ClientForm({ formData, errors, onChange }: ClientFormProps) {
  const metadata = formData.metadata || {};

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Nombre *
        </label>
        <Input
          value={formData.name}
          onChange={(e) => onChange("name", e.target.value)}
          placeholder="Nombre del cliente"
          className={errors.name ? "border-red-500" : ""}
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {errors.name}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          <Building className="w-4 h-4 inline mr-1" />
          Empresa
        </label>
        <Input
          value={formData.company || ""}
          onChange={(e) => onChange("company", e.target.value)}
          placeholder="Nombre de la empresa"
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            <Mail className="w-4 h-4 inline mr-1" />
            Email
          </label>
          <Input
            type="email"
            value={formData.email || ""}
            onChange={(e) => onChange("email", e.target.value)}
            placeholder="correo@ejemplo.com"
            className={errors.email ? "border-red-500" : ""}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.email}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            <Phone className="w-4 h-4 inline mr-1" />
            Teléfono
          </label>
          <Input
            value={formData.phone || ""}
            onChange={(e) => onChange("phone", e.target.value)}
            placeholder="+58 424 123 4567"
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            <Phone className="w-4 h-4 inline mr-1" />
            WhatsApp
          </label>
          <Input
            value={formData.whatsapp || ""}
            onChange={(e) => onChange("whatsapp", e.target.value)}
            placeholder="+52 555 123 4567"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            <MapPin className="w-4 h-4 inline mr-1" />
            Dirección
          </label>
          <Input
            value={formData.address || ""}
            onChange={(e) => onChange("address", e.target.value)}
            placeholder="Av. Principal 123, Caracas"
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            <Globe className="w-4 h-4 inline mr-1" />
            Logo URL
          </label>
          <Input
            value={getMetadataString(metadata, "logoUrl")}
            onChange={(e) =>
              onChange("metadata", {
                ...metadata,
                logoUrl: e.target.value,
              })
            }
            placeholder="https://.../logo.png"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Tarifa por hora
          </label>
          <div className="grid grid-cols-[1fr_92px] gap-2">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={getMetadataString(metadata, "hourlyRate")}
              onChange={(e) =>
                onChange("metadata", {
                  ...metadata,
                  hourlyRate: e.target.value,
                })
              }
              placeholder="75"
            />
            <Input
              value={getMetadataString(metadata, "currency")}
              onChange={(e) =>
                onChange("metadata", {
                  ...metadata,
                  currency: e.target.value.toUpperCase(),
                })
              }
              placeholder="USD"
              maxLength={3}
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          <FileText className="w-4 h-4 inline mr-1" />
          Notas
        </label>
        <textarea
          value={formData.notes || ""}
          onChange={(e) => onChange("notes", e.target.value)}
          placeholder="Información adicional sobre el cliente..."
          rows={4}
          className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white px-3 py-2 text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
        />
      </div>
    </div>
  );
}
