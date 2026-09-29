'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { X, Sparkles, Loader2, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { aiApi, clientsApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Client, TodayPlanResponse } from '@/types';

interface TodayPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TodayPlanModal({ isOpen, onClose }: TodayPlanModalProps) {
  const [availableMinutes, setAvailableMinutes] = useState(480); // 8 horas por defecto
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [plan, setPlan] = useState<TodayPlanResponse | null>(null);

  // Fetch clients
  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clientsApi.getAll(),
  });

  // Plan mutation
  const planMutation = useMutation({
    mutationFn: () => aiApi.getTodayPlan(
      availableMinutes,
      selectedClientIds.length > 0 ? selectedClientIds : undefined
    ),
    onSuccess: (data) => {
      setPlan(data);
    },
  });

  const handleToggleClient = (clientId: string) => {
    setSelectedClientIds((prev) =>
      prev.includes(clientId)
        ? prev.filter((id) => id !== clientId)
        : [...prev, clientId]
    );
  };

  const handleGeneratePlan = () => {
    setPlan(null);
    planMutation.mutate();
  };

  const handleClose = () => {
    setPlan(null);
    setSelectedClientIds([]);
    onClose();
  };

  const presetTimes = [
    { label: '2h', minutes: 120 },
    { label: '4h', minutes: 240 },
    { label: '6h', minutes: 360 },
    { label: '8h', minutes: 480 },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Plan del día con IA
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 space-y-6">
            {!plan ? (
              <>
                {/* Time available */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Clock className="w-4 h-4 inline mr-1" />
                    Tiempo disponible hoy
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-2">
                      {presetTimes.map(({ label, minutes }) => (
                        <button
                          key={minutes}
                          onClick={() => setAvailableMinutes(minutes)}
                          className={cn(
                            'px-3 py-1.5 text-sm rounded-md border transition-colors',
                            availableMinutes === minutes
                              ? 'bg-primary text-white border-primary'
                              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-primary'
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <span className="text-gray-400 dark:text-gray-500">o</span>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="30"
                        max="720"
                        value={availableMinutes}
                        onChange={(e) => setAvailableMinutes(parseInt(e.target.value) || 0)}
                        className="w-24"
                      />
                      <span className="text-sm text-gray-500 dark:text-gray-400">minutos</span>
                    </div>
                  </div>
                </div>

                {/* Client filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Filtrar por clientes (opcional)
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    Selecciona clientes específicos o deja vacío para incluir todos
                  </p>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border border-gray-200 dark:border-gray-700 rounded-md">
                    {clients.map((client: Client) => (
                      <button
                        key={client.id}
                        onClick={() => handleToggleClient(client.id)}
                        className={cn(
                          'px-3 py-1 text-sm rounded-full border transition-colors',
                          selectedClientIds.includes(client.id)
                            ? 'bg-primary text-white border-primary'
                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-primary'
                        )}
                      >
                        {client.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Error */}
                {planMutation.error && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md">
                    <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Error al generar el plan. Inténtalo de nuevo.
                    </p>
                  </div>
                )}
              </>
            ) : (
              /* Plan results */
              <div className="space-y-6">
                {/* Summary */}
                <div className="p-4 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                  <h3 className="font-medium text-purple-900 dark:text-purple-200 mb-2">Tu plan para hoy</h3>
                  <p className="text-sm text-purple-800 dark:text-purple-300 whitespace-pre-line">{plan.plan}</p>
                </div>

                {/* Suggested tasks */}
                {plan.suggestedTasks.length > 0 && (
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Tareas sugeridas ({plan.suggestedTasks.length})
                    </h3>
                    <div className="space-y-3">
                      {plan.suggestedTasks.map((task, index) => (
                        <div
                          key={task.taskId}
                          className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              <span className="flex-shrink-0 w-6 h-6 bg-primary text-white text-sm rounded-full flex items-center justify-center">
                                {index + 1}
                              </span>
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">{task.taskTitle}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{task.clientName}</p>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{task.reason}</p>
                              </div>
                            </div>
                            <Badge variant="outline" className="flex-shrink-0">
                              {task.estimatedMinutes} min
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        <strong>Tiempo total estimado:</strong> {plan.totalEstimatedMinutes} minutos
                        ({Math.round(plan.totalEstimatedMinutes / 60 * 10) / 10} horas)
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-b-lg">
            {plan ? (
              <>
                <Button variant="outline" onClick={() => setPlan(null)}>
                  Generar nuevo plan
                </Button>
                <Button onClick={handleClose}>
                  Cerrar
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleGeneratePlan}
                  disabled={planMutation.isPending || availableMinutes < 30}
                >
                  {planMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generar plan
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
