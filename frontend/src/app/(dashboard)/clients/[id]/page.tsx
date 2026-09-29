'use client';

import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Building,
  Edit,
  Sparkles,
  FileText,
  Clock,
  CheckCircle,
  Loader2,
  Plus,
  Link as LinkIcon,
  ExternalLink,
  Trash2,
  DollarSign,
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ClientModal } from '@/components/modals/client-modal';
import { ConfirmModal } from '@/components/modals/confirm-modal';
import { TaskModal } from '@/components/modals/task-modal';
import { WorklogModal } from '@/components/modals/worklog-modal';
import { FileModal } from '@/components/modals/file-modal';
import { ProjectsSection } from '@/components/clients/projects-section';
import { clientsApi, tasksApi, worklogsApi, filesApi, aiApi, projectsApi } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import { priorityColors, priorityLabels, statusLabels } from '@/lib/utils';
import { formatCurrency, getClientCurrency, getClientHourlyRate, getClientLogoUrl } from '@/lib/client-utils';
import { useSpace } from '@/contexts/space-context';
import { SpaceType, type ClientSummaryResponse, type Task } from '@/types';

export default function ClientDetailPage() {
  const params = useParams();
  const clientId = params.id as string;
  const queryClient = useQueryClient();
  const toast = useToast();
  const { currentSpace } = useSpace();

  const [aiSummary, setAiSummary] = useState<ClientSummaryResponse | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  
  // Modal states
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [defaultProjectId, setDefaultProjectId] = useState<string | undefined>();
  const [isWorklogModalOpen, setIsWorklogModalOpen] = useState(false);
  const [isFileModalOpen, setIsFileModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isPermanentDeleteConfirmOpen, setIsPermanentDeleteConfirmOpen] = useState(false);

  const { data: client, isLoading: loadingClient } = useQuery({
    queryKey: ['client', clientId],
    queryFn: () => clientsApi.getOne(clientId),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', clientId],
    queryFn: () => tasksApi.getByClient(clientId),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects', 'client', clientId, 'detail'],
    queryFn: () => projectsApi.getByClient(clientId),
  });

  const { data: worklogs } = useQuery({
    queryKey: ['worklogs', clientId],
    queryFn: () => worklogsApi.getByClient(clientId, 10),
  });

  const { data: files } = useQuery({
    queryKey: ['files', clientId],
    queryFn: () => filesApi.getByClient(clientId),
  });

  const toggleClientStatusMutation = useMutation({
    mutationFn: () =>
      clientsApi.update(clientId, { isActive: !client?.isActive }),
    onSuccess: (updatedClient) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['client', clientId] });
      toast.success(
        updatedClient.isActive ? 'Cliente reactivado' : 'Cliente desactivado',
      );
      setIsDeleteConfirmOpen(false);
    },
    onError: () => {
      toast.error('No se pudo actualizar el estado del cliente');
    },
  });

  const deleteClientMutation = useMutation({
    mutationFn: () => clientsApi.delete(clientId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Cliente desactivado');
      window.location.href = '/clients';
    },
    onError: () => {
      toast.error('No se pudo desactivar el cliente');
    },
  });

  const permanentDeleteClientMutation = useMutation({
    mutationFn: () => clientsApi.deletePermanent(clientId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Cliente eliminado permanentemente');
      window.location.href = '/clients';
    },
    onError: () => {
      toast.error('No se pudo eliminar el cliente');
    },
  });

  const handleGetAiSummary = async () => {
    setIsLoadingAi(true);
    try {
      const summary = await aiApi.getClientSummary(clientId);
      setAiSummary(summary);
    } catch (error) {
      console.error('Error getting AI summary:', error);
      alert('Error al obtener resumen de IA');
    } finally {
      setIsLoadingAi(false);
    }
  };

  if (loadingClient) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-gray-500">Cliente no encontrado</p>
        <Link href="/clients" className="text-primary mt-2">
          Volver a clientes
        </Link>
      </div>
    );
  }

  const isWorkSpace = currentSpace?.type === SpaceType.WORK;

  if (!isWorkSpace) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center">
        <p className="text-gray-500 dark:text-gray-400">
          La ficha de clientes solo está disponible dentro de espacios de trabajo.
        </p>
        <Link href="/clients" className="text-primary mt-2">
          Volver a clientes
        </Link>
      </div>
    );
  }

  if (currentSpace?.id && client.spaceId && client.spaceId !== currentSpace.id) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center">
        <p className="text-gray-500 dark:text-gray-400">
          Este cliente pertenece a otro espacio de trabajo.
        </p>
        <Link href="/clients" className="text-primary mt-2">
          Volver a clientes
        </Link>
      </div>
    );
  }

  const openTasks = tasks.filter((t) => t.status !== 'done') || [];
  const completedTasks = tasks.filter((t) => t.status === 'done') || [];
  const totalTrackedMinutes = (worklogs || []).reduce(
    (total, log) => total + (log.durationMinutes || 0),
    0,
  );
  const totalTrackedHours = Math.round((totalTrackedMinutes / 60) * 10) / 10;
  const totalBudget = projects.reduce(
    (total, project) => total + (project.budget || 0),
    0,
  );
  const hourlyRate = getClientHourlyRate(client);
  const currency = getClientCurrency(client);
  const estimatedBilling = hourlyRate !== undefined
    ? Math.round(totalTrackedHours * hourlyRate * 100) / 100
    : undefined;
  const logoUrl = getClientLogoUrl(client);
  const initials = client.name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setDefaultProjectId(undefined);
    setIsTaskModalOpen(true);
  };

  const handleAddTask = (projectId?: string) => {
    setSelectedTask(null);
    setDefaultProjectId(projectId);
    setIsTaskModalOpen(true);
  };

  return (
    <div className="h-full overflow-auto">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 lg:px-6 py-4 pt-16 lg:pt-4 sticky top-0 z-10">
        <div className="flex items-center gap-3 lg:gap-4">
          <Link href="/clients">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold overflow-hidden ring-1 ring-primary/10 flex-shrink-0">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={client.name} className="w-full h-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 lg:gap-3 flex-wrap">
              <h1 className="text-lg lg:text-2xl font-bold text-gray-900 dark:text-white truncate">{client.name}</h1>
              {!client.isActive && <Badge variant="outline">Inactivo</Badge>}
            </div>
            {client.company && (
              <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1 truncate">
                <Building className="w-4 h-4 flex-shrink-0" />
                {client.company}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/board?clientId=${clientId}`}>
              <Button variant="outline" size="sm">
                <ExternalLink className="w-4 h-4 lg:mr-2" />
                <span className="hidden lg:inline">Ver en Board</span>
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={() => setIsClientModalOpen(true)}>
              <Edit className="w-4 h-4 lg:mr-2" />
              <span className="hidden lg:inline">Editar</span>
            </Button>
            {client.isActive && (
              <Button variant="outline" size="sm" onClick={() => setIsDeleteConfirmOpen(true)}>
                <Trash2 className="w-4 h-4 lg:mr-2" />
                <span className="hidden lg:inline">Desactivar</span>
              </Button>
            )}
            {!client.isActive && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleClientStatusMutation.mutate()}
                disabled={toggleClientStatusMutation.isPending}
              >
                {toggleClientStatusMutation.isPending ? (
                  <Loader2 className="w-4 h-4 lg:mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 lg:mr-2" />
                )}
                <span className="hidden lg:inline">Reactivar</span>
              </Button>
            )}
              {!client.isActive && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPermanentDeleteConfirmOpen(true)}
                  disabled={permanentDeleteClientMutation.isPending}
                >
                  {permanentDeleteClientMutation.isPending ? (
                    <Loader2 className="w-4 h-4 lg:mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 lg:mr-2" />
                  )}
                  <span className="hidden lg:inline">Eliminar</span>
                </Button>
              )}
          </div>
        </div>
      </header>

      <div className="p-4 lg:p-6 space-y-6">
          <div className="grid grid-cols-2 xl:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Abiertas</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{openTasks.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Completadas</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{completedTasks.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Horas</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{totalTrackedHours}h</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Facturación</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                {estimatedBilling !== undefined
                  ? formatCurrency(estimatedBilling, currency)
                  : 'Configura tarifa'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Presupuesto</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                {totalBudget > 0 ? formatCurrency(totalBudget, currency) : 'Sin definir'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Archivos</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{files?.length || 0}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Información de contacto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {client.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <a href={`mailto:${client.email}`} className="text-primary hover:underline">
                    {client.email}
                  </a>
                </div>
              )}
              {client.whatsapp && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <a
                    href={`https://wa.me/${client.whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {client.whatsapp}
                  </a>
                </div>
              )}
              {client.phone && (
                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span>{client.phone}</span>
                </div>
              )}
              {client.address && (
                <div className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                  <span>{client.address}</span>
                </div>
              )}
              {(hourlyRate !== undefined || totalBudget > 0) && (
                <div className="pt-3 border-t space-y-2">
                  {hourlyRate !== undefined && (
                    <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <DollarSign className="w-4 h-4 text-gray-400" />
                      <span>Tarifa por hora: {formatCurrency(hourlyRate, currency)}</span>
                    </div>
                  )}
                  {totalBudget > 0 && (
                    <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <DollarSign className="w-4 h-4 text-gray-400" />
                      <span>Presupuesto total de proyectos: {formatCurrency(totalBudget, currency)}</span>
                    </div>
                  )}
                </div>
              )}
              {client.notes && (
                <div className="pt-3 border-t">
                  <p className="text-sm text-gray-600">{client.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 border-purple-200 dark:border-purple-800">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-500" />
                Asistente IA
              </CardTitle>
            </CardHeader>
            <CardContent>
              {aiSummary ? (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-1">Resumen</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{aiSummary.summary}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-1">Prioridades</h4>
                    <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      {aiSummary.priorities.map((p, i) => (
                        <li key={i}>• {p}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-1">Próximos pasos</h4>
                    <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      {aiSummary.nextSteps.map((s, i) => (
                        <li key={i}>• {s}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <span>Tareas abiertas: {aiSummary.stats.openTasks}</span>
                    <span>Completadas: {aiSummary.stats.completedRecently}</span>
                    <span>Horas: {aiSummary.stats.hoursLoggedThisWeek}h</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Obtén un resumen inteligente del estado de trabajo con este cliente
                  </p>
                  <Button onClick={handleGetAiSummary} disabled={isLoadingAi}>
                    {isLoadingAi ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    {isLoadingAi ? 'Analizando...' : 'Resumir cliente'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sección de Proyectos y Tareas */}
        <ProjectsSection
          clientId={clientId}
          clientName={client.name}
          tasks={tasks}
          onTaskClick={handleTaskClick}
          onAddTask={handleAddTask}
        />

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-green-500" />
                Actividad reciente
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsWorklogModalOpen(true)}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {!worklogs || worklogs.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No hay actividad registrada</p>
              ) : (
                <div className="space-y-3">
                  {worklogs.slice(0, 5).map((log) => (
                    <div key={log.id} className="border-l-2 border-gray-200 dark:border-gray-700 pl-3">
                      <p className="text-sm dark:text-gray-300">{log.note}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {format(new Date(log.loggedAt), "d MMM yyyy", { locale: es })}
                        {log.durationMinutes && ` • ${log.durationMinutes} min`}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {files && files.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Archivos y enlaces</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsFileModalOpen(true)}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {files.map((file) => (
                  <a
                    key={file.id}
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <FileText className="w-4 h-4 text-gray-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate dark:text-white">{file.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{file.type}</p>
                    </div>
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
          )}
        </div>

        {/* Botón para añadir archivos si no hay ninguno */}
        {(!files || files.length === 0) && (
          <Card>
            <CardContent className="p-6 text-center">
              <LinkIcon className="w-8 h-8 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">No hay archivos o enlaces</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFileModalOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Añadir archivo/enlace
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modals */}
      <ClientModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        client={client}
      />

      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setSelectedTask(null);
          setDefaultProjectId(undefined);
        }}
        task={selectedTask}
        defaultClientId={clientId}
        defaultProjectId={defaultProjectId}
      />

      <WorklogModal
        isOpen={isWorklogModalOpen}
        onClose={() => setIsWorklogModalOpen(false)}
        defaultClientId={clientId}
      />

      <FileModal
        isOpen={isFileModalOpen}
        onClose={() => setIsFileModalOpen(false)}
        defaultClientId={clientId}
      />

      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={() => deleteClientMutation.mutate()}
        title="Desactivar cliente"
        message="El cliente se marcará como inactivo y dejará de aparecer en los listados principales."
        confirmText="Desactivar"
        variant="warning"
        isLoading={deleteClientMutation.isPending}
      />

      <ConfirmModal
        isOpen={isPermanentDeleteConfirmOpen}
        onClose={() => setIsPermanentDeleteConfirmOpen(false)}
        onConfirm={() => permanentDeleteClientMutation.mutate()}
        title="Eliminar cliente"
        message="Esta acción eliminará permanentemente el cliente y no se podrá deshacer. Úsala solo si ya no necesitas conservar su historial."
        confirmText="Eliminar para siempre"
        variant="danger"
        isLoading={permanentDeleteClientMutation.isPending}
      />
    </div>
  );
}
