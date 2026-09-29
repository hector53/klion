'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, AlertCircle, Loader2, Clock, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { worklogsApi, clientsApi, tasksApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Worklog, CreateWorklogDto, Client, Task } from '@/types';

interface WorklogModalProps {
  isOpen: boolean;
  onClose: () => void;
  worklog?: Worklog | null; // Si se pasa, es edición
  defaultClientId?: string; // Para preseleccionar cliente
  defaultTaskId?: string; // Para preseleccionar tarea
}

const initialFormData: CreateWorklogDto = {
  clientId: '',
  taskId: undefined,
  loggedAt: new Date().toISOString().split('T')[0],
  durationMinutes: undefined,
  note: '',
};

export function WorklogModal({
  isOpen,
  onClose,
  worklog,
  defaultClientId,
  defaultTaskId,
}: WorklogModalProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const isEditing = !!worklog;

  const [formData, setFormData] = useState<CreateWorklogDto>(initialFormData);
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

  // Reset form cuando cambia el worklog o se abre/cierra
  useEffect(() => {
    if (isOpen) {
      if (worklog) {
        // Modo edición: cargar datos del worklog
        setFormData({
          clientId: worklog.clientId,
          taskId: worklog.taskId || undefined,
          loggedAt: worklog.loggedAt.split('T')[0],
          durationMinutes: worklog.durationMinutes || undefined,
          note: worklog.note,
        });
      } else {
        // Modo creación: usar defaults
        setFormData({
          ...initialFormData,
          clientId: defaultClientId || '',
          taskId: defaultTaskId || undefined,
          loggedAt: new Date().toISOString().split('T')[0],
        });
      }
      setErrors({});
    }
  }, [isOpen, worklog, defaultClientId, defaultTaskId]);

  // Mutaciones
  const createMutation = useMutation({
    mutationFn: (data: CreateWorklogDto) => worklogsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worklogs'] });
      toast.success('Registro de trabajo creado');
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<CreateWorklogDto>) =>
      worklogsApi.update(worklog!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worklogs'] });
      toast.success('Registro actualizado');
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
    if (!formData.note.trim()) {
      newErrors.note = 'La descripción es requerida';
    }
    if (!formData.loggedAt) {
      newErrors.loggedAt = 'La fecha es requerida';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handlers
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    const dataToSubmit: CreateWorklogDto = {
      clientId: formData.clientId,
      taskId: formData.taskId || undefined,
      loggedAt: formData.loggedAt,
      durationMinutes: formData.durationMinutes || undefined,
      note: formData.note.trim(),
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
              {isEditing ? 'Editar registro de trabajo' : 'Nuevo registro de trabajo'}
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

            {/* Fecha y Duración */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Fecha *
                </label>
                <Input
                  type="date"
                  value={formData.loggedAt}
                  onChange={(e) =>
                    setFormData({ ...formData, loggedAt: e.target.value })
                  }
                  className={errors.loggedAt ? 'border-red-500' : ''}
                />
                {errors.loggedAt && (
                  <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.loggedAt}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Duración (minutos)
                </label>
                <Input
                  type="number"
                  min="0"
                  step="5"
                  value={formData.durationMinutes || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      durationMinutes: e.target.value ? parseInt(e.target.value) : undefined,
                    })
                  }
                  placeholder="Ej: 30"
                />
              </div>
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <FileText className="w-4 h-4 inline mr-1" />
                Descripción *
              </label>
              <textarea
                value={formData.note}
                onChange={(e) =>
                  setFormData({ ...formData, note: e.target.value })
                }
                placeholder="¿Qué se hizo en esta sesión de trabajo?"
                rows={4}
                className={cn(
                  'w-full rounded-md border bg-white dark:bg-gray-800 dark:text-white px-3 py-2 text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none',
                  errors.note ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                )}
              />
              {errors.note && (
                <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.note}
                </p>
              )}
            </div>

            {/* Error de mutación */}
            {(createMutation.error || updateMutation.error) && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Error al guardar el registro. Inténtalo de nuevo.
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
              {isEditing ? 'Guardar cambios' : 'Registrar trabajo'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
