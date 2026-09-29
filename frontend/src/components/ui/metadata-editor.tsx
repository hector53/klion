'use client';

import { useState } from 'react';
import { Plus, X, Edit2, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MetadataEditorProps {
  metadata: Record<string, unknown>;
  onChange: (metadata: Record<string, unknown>) => void;
  readOnly?: boolean;
  suggestedFields?: SuggestedField[];
}

interface SuggestedField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date';
  placeholder?: string;
  suffix?: string;
}

// Campos sugeridos según el dominio
export const domainSuggestedFields: Record<string, SuggestedField[]> = {
  auto: [
    { key: 'km_actual', label: 'Km Actual', type: 'number', placeholder: '0', suffix: 'km' },
    { key: 'km_objetivo', label: 'Km Objetivo', type: 'number', placeholder: '0', suffix: 'km' },
    { key: 'costo', label: 'Costo', type: 'number', placeholder: '0.00', suffix: '$' },
    { key: 'taller', label: 'Taller', type: 'text', placeholder: 'Nombre del taller' },
  ],
  health: [
    { key: 'doctor', label: 'Doctor', type: 'text', placeholder: 'Nombre del doctor' },
    { key: 'clinica', label: 'Clínica', type: 'text', placeholder: 'Nombre de la clínica' },
    { key: 'fecha_cita', label: 'Fecha Cita', type: 'date' },
    { key: 'costo', label: 'Costo', type: 'number', placeholder: '0.00', suffix: '$' },
  ],
  finance: [
    { key: 'monto', label: 'Monto', type: 'number', placeholder: '0.00', suffix: '$' },
    { key: 'categoria', label: 'Categoría', type: 'text', placeholder: 'Ej: servicios, comida' },
    { key: 'cuenta', label: 'Cuenta', type: 'text', placeholder: 'Banco/Tarjeta' },
    { key: 'fecha_pago', label: 'Fecha de Pago', type: 'date' },
  ],
  home: [
    { key: 'ubicacion', label: 'Ubicación', type: 'text', placeholder: 'Habitación/Área' },
    { key: 'costo', label: 'Costo', type: 'number', placeholder: '0.00', suffix: '$' },
    { key: 'proveedor', label: 'Proveedor', type: 'text', placeholder: 'Nombre del proveedor' },
  ],
  personal: [
    { key: 'prioridad_personal', label: 'Prioridad Personal', type: 'text', placeholder: '1-5' },
    { key: 'energia_requerida', label: 'Energía Requerida', type: 'text', placeholder: 'baja/media/alta' },
  ],
};

export function MetadataEditor({
  metadata,
  onChange,
  readOnly = false,
  suggestedFields = []
}: MetadataEditorProps) {
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');

  const entries = Object.entries(metadata || {});

  const handleAdd = () => {
    if (!newKey.trim()) return;

    const key = newKey.trim().toLowerCase().replace(/\s+/g, '_');
    onChange({
      ...metadata,
      [key]: newValue.trim() || null,
    });
    setNewKey('');
    setNewValue('');
  };

  const handleRemove = (key: string) => {
    const { [key]: _, ...rest } = metadata;
    onChange(rest);
  };

  const handleEdit = (key: string) => {
    setEditingKey(key);
    setEditingValue(String(metadata[key] || ''));
  };

  const handleSaveEdit = () => {
    if (!editingKey) return;

    onChange({
      ...metadata,
      [editingKey]: editingValue.trim() || null,
    });
    setEditingKey(null);
    setEditingValue('');
  };

  const handleAddSuggested = (field: SuggestedField) => {
    if (metadata[field.key] !== undefined) return;

    onChange({
      ...metadata,
      [field.key]: field.type === 'number' ? 0 : '',
    });
  };

  const formatValue = (key: string, value: unknown): string => {
    if (value === null || value === undefined) return '-';

    const field = suggestedFields.find(f => f.key === key);
    if (field?.suffix) {
      return `${value} ${field.suffix}`;
    }

    return String(value);
  };

  const getInputType = (key: string): string => {
    const field = suggestedFields.find(f => f.key === key);
    return field?.type || 'text';
  };

  // Campos sugeridos que aún no están en metadata
  const unusedSuggestedFields = suggestedFields.filter(
    field => metadata[field.key] === undefined
  );

  if (readOnly && entries.length === 0) {
    return (
      <div className="text-sm text-slate-500 italic">
        Sin datos adicionales
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Existing metadata entries */}
      {entries.length > 0 && (
        <div className="space-y-2">
          {entries.map(([key, value]) => {
            const field = suggestedFields.find(f => f.key === key);
            const label = field?.label || key.replace(/_/g, ' ');

            return (
              <div
                key={key}
                className="group flex items-center gap-2 p-2 rounded-lg bg-slate-800/30 border border-slate-700/50"
              >
                {editingKey === key && !readOnly ? (
                  <>
                    <span className="text-xs text-slate-500 capitalize min-w-[80px]">
                      {label}:
                    </span>
                    <Input
                      type={getInputType(key)}
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      className="flex-1 h-7 text-xs bg-slate-800 border-slate-600"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit();
                        if (e.key === 'Escape') setEditingKey(null);
                      }}
                    />
                    <button
                      onClick={handleSaveEdit}
                      className="p-1 text-green-400 hover:text-green-300"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setEditingKey(null)}
                      className="p-1 text-slate-400 hover:text-slate-300"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-xs text-slate-500 capitalize min-w-[80px]">
                      {label}:
                    </span>
                    <span className="flex-1 text-xs text-slate-300 font-medium">
                      {formatValue(key, value)}
                    </span>
                    {!readOnly && (
                      <>
                        <button
                          onClick={() => handleEdit(key)}
                          className="p-1 text-slate-500 hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleRemove(key)}
                          className="p-1 text-slate-500 hover:text-red-400"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Suggested fields buttons */}
      {!readOnly && unusedSuggestedFields.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {unusedSuggestedFields.map((field) => (
            <button
              key={field.key}
              onClick={() => handleAddSuggested(field)}
              className="px-2 py-1 text-[10px] rounded bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:border-blue-500/50 hover:text-blue-400 transition-colors"
            >
              + {field.label}
            </button>
          ))}
        </div>
      )}

      {/* Add custom field */}
      {!readOnly && (
        <div className="flex gap-2 pt-2 border-t border-slate-700/30">
          <Input
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder="Campo..."
            className="flex-1 h-8 text-xs bg-slate-800/50 border-slate-700"
          />
          <Input
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder="Valor..."
            className="flex-1 h-8 text-xs bg-slate-800/50 border-slate-700"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd();
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAdd}
            disabled={!newKey.trim()}
            className="h-8 px-2 border-slate-700 text-slate-400 hover:text-white"
          >
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
