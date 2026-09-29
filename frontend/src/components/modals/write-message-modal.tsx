'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { X, Sparkles, Loader2, Copy, Check, AlertCircle, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { aiApi, clientsApi, tasksApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { MessageType, type Client, type Task, type WriteMessageResponse } from '@/types';

interface WriteMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultClientId?: string;
  defaultTaskId?: string;
}

const messageTypes = [
  { value: MessageType.REQUEST_INFO, label: 'Solicitar información', description: 'Pedir datos o aclaraciones al cliente' },
  { value: MessageType.PROGRESS_UPDATE, label: 'Actualización de progreso', description: 'Informar sobre el avance del trabajo' },
  { value: MessageType.DELIVERABLE, label: 'Entrega', description: 'Enviar un entregable completado' },
  { value: MessageType.FOLLOW_UP, label: 'Seguimiento', description: 'Dar seguimiento a algo pendiente' },
  { value: MessageType.MEETING_REQUEST, label: 'Solicitar reunión', description: 'Agendar una llamada o reunión' },
];

export function WriteMessageModal({
  isOpen,
  onClose,
  defaultClientId,
  defaultTaskId,
}: WriteMessageModalProps) {
  const toast = useToast();
  const [clientId, setClientId] = useState(defaultClientId || '');
  const [taskId, setTaskId] = useState(defaultTaskId || '');
  const [messageType, setMessageType] = useState<MessageType>(MessageType.PROGRESS_UPDATE);
  const [additionalContext, setAdditionalContext] = useState('');
  const [result, setResult] = useState<WriteMessageResponse | null>(null);
  const [copied, setCopied] = useState(false);

  // Fetch clients
  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clientsApi.getAll(),
  });

  // Fetch tasks del cliente seleccionado
  const { data: clientTasks = [] } = useQuery({
    queryKey: ['tasks', 'client', clientId],
    queryFn: () => tasksApi.getByClient(clientId),
    enabled: !!clientId,
  });

  // Reset cuando cambia el cliente
  useEffect(() => {
    if (isOpen) {
      setClientId(defaultClientId || '');
      setTaskId(defaultTaskId || '');
      setResult(null);
      setAdditionalContext('');
    }
  }, [isOpen, defaultClientId, defaultTaskId]);

  // Write message mutation
  const writeMutation = useMutation({
    mutationFn: () => aiApi.writeMessage(clientId, messageType, taskId || undefined, additionalContext || undefined),
    onSuccess: (data) => {
      setResult(data);
    },
  });

  const handleClientChange = (newClientId: string) => {
    setClientId(newClientId);
    setTaskId('');
  };

  const handleGenerate = () => {
    setResult(null);
    writeMutation.mutate();
  };

  const handleCopy = async () => {
    if (result?.message) {
      await navigator.clipboard.writeText(result.message);
      setCopied(true);
      toast.success('Mensaje copiado al portapapeles');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setResult(null);
    setClientId('');
    setTaskId('');
    setAdditionalContext('');
    onClose();
  };

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
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-500" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Redactar mensaje con IA
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
          <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
            {!result ? (
              <>
                {/* Cliente */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Cliente *
                  </label>
                  <select
                    value={clientId}
                    onChange={(e) => handleClientChange(e.target.value)}
                    className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">Seleccionar cliente...</option>
                    {clients.map((client: Client) => (
                      <option key={client.id} value={client.id}>
                        {client.name} {client.company && `(${client.company})`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tarea relacionada */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tarea relacionada (opcional)
                  </label>
                  <select
                    value={taskId}
                    onChange={(e) => setTaskId(e.target.value)}
                    disabled={!clientId}
                    className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
                  >
                    <option value="">Sin tarea específica</option>
                    {clientTasks.map((task: Task) => (
                      <option key={task.id} value={task.id}>
                        {task.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tipo de mensaje */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tipo de mensaje *
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {messageTypes.map(({ value, label, description }) => (
                      <button
                        key={value}
                        onClick={() => setMessageType(value)}
                        className={cn(
                          'flex items-start gap-3 p-3 rounded-lg border text-left transition-colors',
                          messageType === value
                            ? 'bg-primary/5 dark:bg-primary/20 border-primary'
                            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        )}
                      >
                        <div className={cn(
                          'w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5',
                          messageType === value
                            ? 'border-primary bg-primary'
                            : 'border-gray-300 dark:border-gray-600'
                        )}>
                          {messageType === value && (
                            <div className="w-full h-full flex items-center justify-center">
                              <div className="w-1.5 h-1.5 bg-white rounded-full" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm text-gray-900 dark:text-white">{label}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Contexto adicional */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Contexto adicional (opcional)
                  </label>
                  <textarea
                    value={additionalContext}
                    onChange={(e) => setAdditionalContext(e.target.value)}
                    placeholder="Añade información específica que quieras incluir en el mensaje..."
                    rows={3}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                  />
                </div>

                {/* Error */}
                {writeMutation.error && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md">
                    <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Error al generar el mensaje. Inténtalo de nuevo.
                    </p>
                  </div>
                )}
              </>
            ) : (
              /* Result */
              <div className="space-y-4">
                <div className="relative">
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Mensaje generado
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopy}
                        className="h-8"
                      >
                        {copied ? (
                          <>
                            <Check className="w-4 h-4 mr-1 text-green-500" />
                            Copiado
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 mr-1" />
                            Copiar
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-line">
                      {result.message}
                    </p>
                  </div>
                </div>

                {result.suggestions && result.suggestions.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Sugerencias adicionales
                    </h4>
                    <ul className="space-y-1">
                      {result.suggestions.map((suggestion, index) => (
                        <li key={index} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                          <span className="text-primary">•</span>
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-b-lg">
            {result ? (
              <>
                <Button variant="outline" onClick={() => setResult(null)}>
                  Generar otro
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
                  onClick={handleGenerate}
                  disabled={writeMutation.isPending || !clientId}
                >
                  {writeMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generar mensaje
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
