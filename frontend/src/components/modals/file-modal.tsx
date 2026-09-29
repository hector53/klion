'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, AlertCircle, Loader2, Link as LinkIcon, FileText, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { filesApi, clientsApi, tasksApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { FileType, type FileEntity, type CreateFileDto, type Client, type Task } from '@/types';

interface FileModalProps {
  isOpen: boolean;
  onClose: () => void;
  file?: FileEntity | null; // Si se pasa, es edición
  defaultClientId?: string; // Para preseleccionar cliente
  defaultTaskId?: string; // Para preseleccionar tarea
}

const initialFormData: CreateFileDto = {
  clientId: '',
  taskId: undefined,
  type: FileType.LINK,
  url: '',
  title: '',
  description: '',
};

export function FileModal({
  isOpen,
  onClose,
  file,
  defaultClientId,
  defaultTaskId,
}: FileModalProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const isEditing = !!file;

  const [formData, setFormData] = useState<CreateFileDto>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch clients para el select
  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clientsApi.getAll(),
  });

  // Fetch tasks del cliente seleccionado
  const { data: clientTasks = [] } = useQuery({
    queryKey: ['tasks', 'client', formData.clientId],
    queryFn: () => tasksApi.getByClient(formData.clientId),
    enabled: !!formData.clientId,
  });

  // Reset form cuando cambia el file o se abre/cierra
  useEffect(() => {
    if (isOpen) {
      if (file) {
        // Modo edición: cargar datos del archivo
        setFormData({
          clientId: file.clientId,
          taskId: file.taskId || undefined,
          type: file.type,
          url: file.url,
          title: file.title,
          description: file.description || '',
        });
      } else {
        // Modo creación: usar defaults
        setFormData({
          ...initialFormData,
          clientId: defaultClientId || '',
          taskId: defaultTaskId || undefined,
        });
      }
      setErrors({});
    }
  }, [isOpen, file, defaultClientId, defaultTaskId]);

  // Mutaciones
  const createMutation = useMutation({
    mutationFn: (data: CreateFileDto) => filesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      toast.success('Archivo/enlace añadido');
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<CreateFileDto>) =>
      filesApi.update(file!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      toast.success('Archivo/enlace actualizado');
      onClose();
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  // Validación
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.clientId) {
      newErrors.clientId = 'Selecciona un cliente';
    }
    if (!formData.url.trim()) {
      newErrors.url = 'La URL es requerida';
    } else if (!isValidUrl(formData.url)) {
      newErrors.url = 'La URL no es válida';
    }
    if (!formData.title.trim()) {
      newErrors.title = 'El título es requerido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (string: string) => {
    try {
      new URL(string);
      return true;
    } catch {
      return false;
    }
  };

  // Handlers
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    const dataToSubmit: CreateFileDto = {
      clientId: formData.clientId,
      taskId: formData.taskId || undefined,
      type: formData.type,
      url: formData.url.trim(),
      title: formData.title.trim(),
      description: formData.description?.trim() || undefined,
    };

    if (isEditing) {
      updateMutation.mutate(dataToSubmit);
    } else {
      createMutation.mutate(dataToSubmit);
    }
  };

  // Cuando cambia el cliente, resetear la tarea
  const handleClientChange = (clientId: string) => {
    setFormData({
      ...formData,
      clientId,
      taskId: undefined,
    });
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
              {isEditing ? 'Editar archivo/enlace' : 'Añadir archivo/enlace'}
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
            {/* Tipo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tipo
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="type"
                    value={FileType.LINK}
                    checked={formData.type === FileType.LINK}
                    onChange={() => setFormData({ ...formData, type: FileType.LINK })}
                    className="text-primary focus:ring-primary"
                  />
                  <LinkIcon className="w-4 h-4 text-blue-500" />
                  <span className="text-sm dark:text-gray-300">Enlace</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="type"
                    value={FileType.FILE}
                    checked={formData.type === FileType.FILE}
                    onChange={() => setFormData({ ...formData, type: FileType.FILE })}
                    className="text-primary focus:ring-primary"
                  />
                  <FileText className="w-4 h-4 text-green-500" />
                  <span className="text-sm dark:text-gray-300">Archivo</span>
                </label>
              </div>
            </div>

            {/* Cliente */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Cliente *
              </label>
              <select
                value={formData.clientId}
                onChange={(e) => handleClientChange(e.target.value)}
                className={cn(
                  'w-full h-10 rounded-md border bg-white dark:bg-gray-800 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
                  errors.clientId ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                )}
              >
                <option value="">Seleccionar cliente...</option>
                {clients.map((client: Client) => (
                  <option key={client.id} value={client.id}>
                    {client.name} {client.company && `(${client.company})`}
                  </option>
                ))}
              </select>
              {errors.clientId && (
                <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.clientId}
                </p>
              )}
            </div>

            {/* Tarea (opcional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tarea relacionada (opcional)
              </label>
              <select
                value={formData.taskId || ''}
                onChange={(e) =>
                  setFormData({ ...formData, taskId: e.target.value || undefined })
                }
                disabled={!formData.clientId}
                className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">Sin tarea específica</option>
                {clientTasks.map((task: Task) => (
                  <option key={task.id} value={task.id}>
                    {task.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Título */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Título *
              </label>
              <Input
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="Ej: Diseño de landing page"
                className={errors.title ? 'border-red-500' : ''}
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.title}
                </p>
              )}
            </div>

            {/* URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <ExternalLink className="w-4 h-4 inline mr-1" />
                URL *
              </label>
              <Input
                type="url"
                value={formData.url}
                onChange={(e) =>
                  setFormData({ ...formData, url: e.target.value })
                }
                placeholder="https://..."
                className={errors.url ? 'border-red-500' : ''}
              />
              {errors.url && (
                <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.url}
                </p>
              )}
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Descripción (opcional)
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Breve descripción del archivo o enlace..."
                rows={2}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white px-3 py-2 text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              />
            </div>

            {/* Error de mutación */}
            {(createMutation.error || updateMutation.error) && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Error al guardar. Inténtalo de nuevo.
                </p>
              </div>
            )}
          </form>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-b-lg">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              onClick={handleSubmit}
            >
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditing ? 'Guardar cambios' : 'Añadir'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
