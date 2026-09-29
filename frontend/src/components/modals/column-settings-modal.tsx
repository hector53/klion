'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Plus,
  Trash2,
  Eye,
  EyeOff,
  GripVertical,
  Pencil,
  Check,
  X,
  Loader2,
} from 'lucide-react';
import { boardColumnsApi } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import type { CustomBoardColumn, CreateBoardColumnDto } from '@/types';
import { cn } from '@/lib/utils';

interface ColumnSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ColumnSettingsModal({ isOpen, onClose }: ColumnSettingsModalProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [newColumnName, setNewColumnName] = useState('');
  const [isAddingColumn, setIsAddingColumn] = useState(false);

  const { data: columns = [], isLoading } = useQuery({
    queryKey: ['board-columns'],
    queryFn: () => boardColumnsApi.getAll(),
    enabled: isOpen,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; isHidden?: boolean } }) =>
      boardColumnsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board-columns'] });
      toast.success('Columna actualizada');
      setEditingColumnId(null);
    },
    onError: () => {
      toast.error('Error al actualizar columna');
    },
  });

  const toggleVisibilityMutation = useMutation({
    mutationFn: (id: string) => boardColumnsApi.toggleVisibility(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board-columns'] });
      toast.success('Visibilidad actualizada');
    },
    onError: () => {
      toast.error('Error al cambiar visibilidad');
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateBoardColumnDto) => boardColumnsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board-columns'] });
      toast.success('Columna creada');
      setNewColumnName('');
      setIsAddingColumn(false);
    },
    onError: () => {
      toast.error('Error al crear columna');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => boardColumnsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board-columns'] });
      toast.success('Columna eliminada');
    },
    onError: () => {
      toast.error('Error al eliminar columna. Las columnas del sistema no se pueden eliminar.');
    },
  });

  if (!isOpen) return null;

  const handleStartEdit = (column: CustomBoardColumn) => {
    setEditingColumnId(column.id);
    setEditingName(column.name);
  };

  const handleSaveEdit = () => {
    if (!editingColumnId || !editingName.trim()) return;
    updateMutation.mutate({ id: editingColumnId, data: { name: editingName.trim() } });
  };

  const handleCancelEdit = () => {
    setEditingColumnId(null);
    setEditingName('');
  };

  const handleCreateColumn = () => {
    if (!newColumnName.trim()) return;
    createMutation.mutate({ name: newColumnName.trim() });
  };

  const handleToggleVisibility = (column: CustomBoardColumn) => {
    toggleVisibilityMutation.mutate(column.id);
  };

  const handleDeleteColumn = (column: CustomBoardColumn) => {
    if (column.isSystem) {
      toast.error('Las columnas del sistema no se pueden eliminar, solo ocultar.');
      return;
    }
    if (confirm(`¿Estás seguro de eliminar la columna "${column.name}"?`)) {
      deleteMutation.mutate(column.id);
    }
  };

  const sortedColumns = [...columns].sort((a, b) => a.position - b.position);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Configurar columnas
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 space-y-4 max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="space-y-2">
                {sortedColumns.map((column) => (
                  <div
                    key={column.id}
                    className={cn(
                      'flex items-center gap-2 p-2 rounded-lg border',
                      column.isHidden
                        ? 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-60'
                        : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700'
                    )}
                  >
                    <GripVertical className="w-4 h-4 text-gray-400 cursor-grab flex-shrink-0" />

                    {editingColumnId === column.id ? (
                      <>
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="flex-1 h-8"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit();
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={handleSaveEdit}
                          disabled={updateMutation.isPending}
                        >
                          <Check className="w-4 h-4 text-green-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={handleCancelEdit}
                        >
                          <X className="w-4 h-4 text-gray-500" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white truncate">
                          {column.name}
                        </span>
                        {column.isSystem && (
                          <span className="text-xs text-gray-400 px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded flex-shrink-0">
                            Sistema
                          </span>
                        )}
                        <button
                          onClick={() => handleStartEdit(column)}
                          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"
                          title="Editar nombre"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleVisibility(column)}
                          disabled={toggleVisibilityMutation.isPending}
                          className={cn(
                            "p-1 flex-shrink-0 transition-colors",
                            column.isHidden 
                              ? "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" 
                              : "text-gray-400 hover:text-blue-500 dark:hover:text-blue-400"
                          )}
                          title={column.isHidden ? "Mostrar columna" : "Ocultar columna"}
                        >
                          {column.isHidden ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                        {!column.isSystem && (
                          <button
                            onClick={() => handleDeleteColumn(column)}
                            disabled={deleteMutation.isPending}
                            className="p-1 text-gray-400 hover:text-red-500 flex-shrink-0"
                            title="Eliminar columna"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Añadir nueva columna */}
            {isAddingColumn ? (
              <div className="flex items-center gap-2 p-2 rounded-lg border border-primary bg-primary/5">
                <Input
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  placeholder="Nombre de la columna"
                  className="flex-1 h-8"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateColumn();
                    if (e.key === 'Escape') setIsAddingColumn(false);
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleCreateColumn}
                  disabled={createMutation.isPending || !newColumnName.trim()}
                >
                  <Check className="w-4 h-4 text-green-500" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    setIsAddingColumn(false);
                    setNewColumnName('');
                  }}
                >
                  <X className="w-4 h-4 text-gray-500" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setIsAddingColumn(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Añadir columna
              </Button>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 rounded-b-lg">
            <Button onClick={onClose}>Cerrar</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
