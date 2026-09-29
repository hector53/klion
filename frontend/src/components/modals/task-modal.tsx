"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  X,
  Calendar,
  Tag,
  AlertCircle,
  Loader2,
  Trash2,
  Archive,
  Plus,
  CheckSquare,
  Square,
  Copy,
  Share2,
  Paperclip,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { QuickAddClient } from "@/components/ui/quick-add-client";
import { QuickAddProject } from "@/components/ui/quick-add-project";
import {
  RichTextEditor,
  type UploadedAttachment,
} from "@/components/ui/rich-text-editor";
import {
  MetadataEditor,
  domainSuggestedFields,
} from "@/components/ui/metadata-editor";
import { ConfirmModal } from "@/components/modals/confirm-modal";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import {
  tasksApi,
  clientsApi,
  subtasksApi,
  projectsApi,
  triggersApi,
  filesApi,
} from "@/lib/api";
import {
  cn,
  priorityLabels,
  statusLabels,
  taskTypeLabels,
  taskTypeIcons,
  taskTypeColors,
} from "@/lib/utils";
import {
  isRichTextEmpty,
  normalizeDescriptionToHtml,
  sanitizeHtml,
} from "@/lib/rich-text";
import { uploadImageToFilesService } from "@/lib/files-upload";
import {
  TaskStatus,
  TaskPriority,
  TaskType,
  TriggerType,
  TriggerAction,
  SpaceType,
  FileType,
  type Task,
  type CreateTaskDto,
  type Client,
  type Subtask,
  type Project,
  type FileEntity,
} from "@/types";
import { useSpace } from "@/contexts/space-context";

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task?: Task | null;
  defaultStatus?: TaskStatus;
  defaultClientId?: string;
  defaultProjectId?: string;
  defaultType?: TaskType;
  onFilterByClient?: (clientId: string) => void;
  onFilterByProject?: (projectId: string) => void;
  readOnly?: boolean;
}

const initialFormData: CreateTaskDto & {
  isArchived?: boolean;
  metadata?: Record<string, unknown>;
} = {
  clientId: "",
  projectId: undefined,
  title: "",
  description: "",
  status: TaskStatus.TODO,
  priority: TaskPriority.MEDIUM,
  type: TaskType.TASK,
  dueDate: undefined,
  tags: [],
  isArchived: false,
  metadata: {},
};

export function TaskModal({
  isOpen,
  onClose,
  task,
  defaultStatus,
  defaultClientId,
  defaultProjectId,
  defaultType,
  onFilterByClient,
  onFilterByProject,
  readOnly,
}: TaskModalProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { currentSpace } = useSpace();
  const isEditing = !!task;
  const isReadOnly = readOnly === true;
  const isPersonalSpace = currentSpace?.type === SpaceType.PERSONAL;

  const [formData, setFormData] = useState<CreateTaskDto>(initialFormData);
  const [tagInput, setTagInput] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [reminderTime, setReminderTime] = useState("09:00");
  const [sessionAttachments, setSessionAttachments] = useState<
    UploadedAttachment[]
  >([]);
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  // CBK-80: en móvil el contenido (título/descripción/subtareas) y la
  // configuración (cliente, proyecto, prioridad, etc.) se muestran en
  // pestañas separadas en vez de apiladas verticalmente. En desktop (lg+)
  // ambos paneles siguen mostrándose lado a lado sin usar este estado.
  const [mobileTab, setMobileTab] = useState<"content" | "config">("content");

  // Fetch task attachments from backend
  const { data: savedAttachments = [] } = useQuery({
    queryKey: ["files", "task", task?.id],
    queryFn: () => filesApi.getByTask(task!.id),
    enabled: !!task?.id,
  });

  // Fetch clients para el select (solo en espacio de trabajo)
  const { data: clients = [] } = useQuery({
    queryKey: ["clients", currentSpace?.id],
    queryFn: () => clientsApi.getAll({ spaceId: currentSpace?.id }),
    enabled: !isPersonalSpace && !!currentSpace?.id,
  });

  // Fetch projects del cliente seleccionado (espacio de trabajo)
  const { data: clientProjects = [] } = useQuery({
    queryKey: ["projects", "client", formData.clientId],
    queryFn: () => projectsApi.getByClient(formData.clientId!),
    enabled: !!formData.clientId && !isPersonalSpace,
  });

  // Fetch projects/áreas del espacio (espacio personal)
  const { data: spaceProjects = [] } = useQuery({
    queryKey: ["projects", "space", currentSpace?.id],
    queryFn: () => projectsApi.getAll({ spaceId: currentSpace?.id }),
    enabled: isPersonalSpace && !!currentSpace?.id,
  });

  // Usar proyectos según el espacio
  const projectsForSpace = isPersonalSpace ? spaceProjects : clientProjects;

  // Si la tarea ya tiene un proyecto asignado que no pertenece al espacio/cliente
  // actualmente activo (p.ej. se abrió el modal desde "Proyectos recientes" u
  // otra entrada que no cambia el espacio activo), igual debe verse seleccionado
  // en el selector en vez de en blanco.
  const projects = useMemo(() => {
    if (
      formData.projectId &&
      !projectsForSpace.some((p) => p.id === formData.projectId) &&
      task?.project
    ) {
      return [...projectsForSpace, task.project];
    }
    return projectsForSpace;
  }, [projectsForSpace, formData.projectId, task]);

  // Fetch subtasks cuando estamos editando
  const { data: subtasks = [], refetch: refetchSubtasks } = useQuery({
    queryKey: ["subtasks", task?.id],
    queryFn: () => subtasksApi.getByTask(task!.id),
    enabled: !!task?.id,
  });

  // Reset form cuando cambia el task o se abre/cierra
  useEffect(() => {
    if (isOpen) {
      if (task) {
        // Modo edición: cargar datos del task
        setFormData({
          clientId: task.clientId,
          projectId: task.projectId || undefined,
          title: task.title,
          description: normalizeDescriptionToHtml(task.description || ""),
          status: task.status,
          priority: task.priority,
          type: task.type || TaskType.TASK,
          dueDate: task.dueDate ? task.dueDate.split("T")[0] : "",
          tags: task.tags || [],
          isArchived: task.isArchived,
          metadata: task.metadata || {},
        });
      } else {
        // Modo creación: usar defaults
        setFormData({
          ...initialFormData,
          status: defaultStatus || TaskStatus.TODO,
          clientId: defaultClientId || "",
          projectId: defaultProjectId || undefined,
          type: defaultType || TaskType.TASK,
        });
      }
      setErrors({});
      setTagInput("");
      setNewSubtaskTitle("");
      setIsEditingTitle(false);
      setIsEditingDescription(false);
      setReminderTime((task?.metadata?.reminderTime as string) || "09:00");
      setSessionAttachments([]);
      setMobileTab("content");
    }
  }, [isOpen, task, defaultStatus, defaultClientId, defaultProjectId, defaultType]);

  // Helper to save session attachments as File records
  const saveSessionAttachments = async (taskId: string, clientId?: string) => {
    if (sessionAttachments.length === 0) return;
    // clientId is required by the backend - skip if not available (personal space)
    if (!clientId) return;
    for (const att of sessionAttachments) {
      try {
        await filesApi.create({
          clientId,
          taskId,
          type: FileType.FILE,
          url: att.url,
          title: att.filename,
        });
      } catch {
        // Best-effort - don't block task save
      }
    }
    queryClient.invalidateQueries({ queryKey: ["files", "task", taskId] });
  };

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: CreateTaskDto) => tasksApi.create(data),
    onSuccess: async (createdTask: Task) => {
      queryClient.invalidateQueries({ queryKey: ["board"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks-list"] });
      // Invalidar contexto del proyecto y widget de tareas activas
      if (createdTask.projectId) {
        queryClient.invalidateQueries({ queryKey: ["project-context", createdTask.projectId] });
        queryClient.invalidateQueries({ queryKey: ["project-stats", createdTask.projectId] });
        queryClient.invalidateQueries({ queryKey: ["project-active-tasks", createdTask.projectId] });
      }

      // Save session attachments as File records
      await saveSessionAttachments(createdTask.id, createdTask.clientId);

      // Auto-create trigger for reminder tasks with dueDate
      if (createdTask.type === TaskType.REMINDER && createdTask.dueDate) {
        try {
          // Combine date + time for the trigger datetime
          const dateStr = createdTask.dueDate.split("T")[0];
          const triggerDatetime = `${dateStr}T${reminderTime}:00`;

          await triggersApi.create({
            name: `Recordatorio: ${createdTask.title}`,
            type: TriggerType.TIME,
            taskId: createdTask.id,
            condition: { datetime: triggerDatetime },
            action: TriggerAction.NOTIFY,
            actionConfig: {
              title: `Recordatorio: ${createdTask.title}`,
              message: `Es hora de: ${createdTask.title}`,
            },
          });
        } catch {
          // Silent fail - trigger creation is best-effort
        }
      }

      toast.success("Tarea creada exitosamente");
      onClose();
    },
    onError: () => {
      toast.error("Error al crear la tarea");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: CreateTaskDto) => tasksApi.update(task!.id, data),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["board"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks-list"] });
      // Refrescar el widget de tareas activas del proyecto original y, si la
      // tarea se movió de proyecto, también el del proyecto destino.
      if (task?.projectId) {
        queryClient.invalidateQueries({ queryKey: ["project-active-tasks", task.projectId] });
      }
      if (formData.projectId && formData.projectId !== task?.projectId) {
        queryClient.invalidateQueries({ queryKey: ["project-active-tasks", formData.projectId] });
      }
      // Save session attachments as File records
      await saveSessionAttachments(task!.id, task!.clientId || formData.clientId);
      toast.success("Tarea actualizada exitosamente");
      onClose();
    },
    onError: () => {
      toast.error("Error al actualizar la tarea");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => tasksApi.delete(task!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      if (task?.projectId) {
        queryClient.invalidateQueries({ queryKey: ["project-active-tasks", task.projectId] });
      }
      toast.success("Tarea eliminada exitosamente");
      onClose();
    },
    onError: () => {
      toast.error("Error al eliminar la tarea");
    },
  });

  const createSubtaskMutation = useMutation({
    mutationFn: (title: string) =>
      subtasksApi.create({ taskId: task!.id, title }),
    onMutate: async (title: string) => {
      await queryClient.cancelQueries({ queryKey: ["subtasks", task?.id] });

      const previousSubtasks = queryClient.getQueryData<Subtask[]>([
        "subtasks",
        task?.id,
      ]);

      // Optimistically add
      const optimisticSubtask: Subtask = {
        id: `temp-${Date.now()}`,
        taskId: task!.id,
        title,
        completed: false,
        position: (previousSubtasks?.length || 0) + 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      queryClient.setQueryData<Subtask[]>(["subtasks", task?.id], (old) => [
        ...(old || []),
        optimisticSubtask,
      ]);

      return { previousSubtasks };
    },
    onError: (_err, _title, context) => {
      queryClient.setQueryData(
        ["subtasks", task?.id],
        context?.previousSubtasks,
      );
      toast.error("Error al crear subtarea");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["subtasks", task?.id] });
      setNewSubtaskTitle("");
    },
  });

  const toggleSubtaskMutation = useMutation({
    mutationFn: (subtaskId: string) => subtasksApi.toggle(subtaskId),
    onMutate: async (subtaskId: string) => {
      await queryClient.cancelQueries({ queryKey: ["subtasks", task?.id] });

      const previousSubtasks = queryClient.getQueryData<Subtask[]>([
        "subtasks",
        task?.id,
      ]);

      // Optimistically update
      queryClient.setQueryData<Subtask[]>(
        ["subtasks", task?.id],
        (old) =>
          old?.map((s) =>
            s.id === subtaskId ? { ...s, completed: !s.completed } : s,
          ) || [],
      );

      return { previousSubtasks };
    },
    onError: (_err, _subtaskId, context) => {
      queryClient.setQueryData(
        ["subtasks", task?.id],
        context?.previousSubtasks,
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["subtasks", task?.id] });
      queryClient.invalidateQueries({ queryKey: ["board"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const deleteSubtaskMutation = useMutation({
    mutationFn: (subtaskId: string) => subtasksApi.delete(subtaskId),
    onMutate: async (subtaskId: string) => {
      await queryClient.cancelQueries({ queryKey: ["subtasks", task?.id] });

      const previousSubtasks = queryClient.getQueryData<Subtask[]>([
        "subtasks",
        task?.id,
      ]);

      // Optimistically remove
      queryClient.setQueryData<Subtask[]>(
        ["subtasks", task?.id],
        (old) => old?.filter((s) => s.id !== subtaskId) || [],
      );

      return { previousSubtasks };
    },
    onError: (_err, _subtaskId, context) => {
      queryClient.setQueryData(
        ["subtasks", task?.id],
        context?.previousSubtasks,
      );
      toast.error("Error al eliminar subtarea");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["subtasks", task?.id] });
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  // Validación
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Solo requerir cliente en espacio de trabajo
    if (!isPersonalSpace && !formData.clientId) {
      newErrors.clientId = "Selecciona un cliente";
    }
    // En espacio personal, requerir área (proyecto)
    if (isPersonalSpace && !formData.projectId) {
      newErrors.projectId = "Selecciona un área";
    }
    if (!formData.title.trim()) {
      newErrors.title = "El título es requerido";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handlers
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isReadOnly) return;

    if (!validate()) return;

    const sanitizedDescription = sanitizeHtml(formData.description || "");
    const descriptionToSave = isRichTextEmpty(sanitizedDescription)
      ? undefined
      : sanitizedDescription;

    // Construir objeto sin campos vacíos
    const dataToSubmit: CreateTaskDto = {
      title: formData.title,
      status: formData.status,
      priority: formData.priority,
      type: formData.type || TaskType.TASK,
      isArchived: formData.isArchived,
      // Solo incluir clientId si tiene valor (espacio de trabajo)
      ...(formData.clientId ? { clientId: formData.clientId } : {}),
      // Solo incluir projectId si tiene valor
      ...(formData.projectId ? { projectId: formData.projectId } : {}),
      ...(descriptionToSave ? { description: descriptionToSave } : {}),
      ...(formData.dueDate ? { dueDate: formData.dueDate } : {}),
      ...(formData.tags?.length ? { tags: formData.tags } : {}),
      ...(() => {
        const meta = { ...(formData.metadata || {}) };
        if (formData.type === TaskType.REMINDER) {
          meta.reminderTime = reminderTime;
        }
        // CBK-76: al crear (no al editar) una tarea, adjuntar la URL desde
        // donde se creó — ayuda a ubicar rápido el archivo/pantalla relevante.
        if (!isEditing && typeof window !== "undefined") {
          meta.sourceUrl = window.location.href;
        }
        return Object.keys(meta).length > 0 ? { metadata: meta } : {};
      })(),
    };

    if (isEditing) {
      updateMutation.mutate(dataToSubmit);
    } else {
      createMutation.mutate(dataToSubmit);
    }
  };

  const handleToggleArchive = () => {
    if (!task) return;
    if (isReadOnly) return;
    updateMutation.mutate({
      ...formData,
      isArchived: !formData.isArchived,
    });
  };

  const handleAddTag = () => {
    if (isReadOnly) return;
    const tag = tagInput.trim().toLowerCase();
    if (tag && !formData.tags?.includes(tag)) {
      setFormData({
        ...formData,
        tags: [...(formData.tags || []), tag],
      });
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    if (isReadOnly) return;
    setFormData({
      ...formData,
      tags: formData.tags?.filter((t) => t !== tagToRemove) || [],
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleAddSubtask = () => {
    if (isReadOnly) return;
    const title = newSubtaskTitle.trim();
    if (title && task?.id) {
      createSubtaskMutation.mutate(title);
    }
  };

  const handleSubtaskKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddSubtask();
    }
  };

  const handleToggleSubtask = (subtaskId: string) => {
    if (isReadOnly) return;
    toggleSubtaskMutation.mutate(subtaskId);
  };

  const handleCopyBranch = () => {
    const branchName = task?.tags?.[0] || "feature";
    navigator.clipboard.writeText(branchName);
    toast.success("Nombre de branch copiado al portapapeles");
  };

  const handleShareTask = () => {
    if (isReadOnly) return;
    if (task?.id) {
      const taskIdentifier = task.taskCode || task.id;
      const url = `${window.location.origin}/board?selectedTask=${taskIdentifier}`;
      navigator.clipboard.writeText(url);
      toast.success("Enlace de tarea copiado al portapapeles");
    }
  };

  // Funciones para filtros rápidos
  const handleClientFilter = (clientId: string) => {
    if (isReadOnly) return;
    if (onFilterByClient) {
      onFilterByClient(clientId);
      onClose();
    }
  };

  const handleProjectFilter = (projectId: string) => {
    if (isReadOnly) return;
    if (onFilterByProject) {
      onFilterByProject(projectId);
      onClose();
    }
  };

  // Obtener datos del cliente y proyecto. Si el cliente asignado no está en la
  // lista filtrada por el espacio activo (p.ej. modal abierto desde otro
  // espacio), usar el objeto embebido en la propia tarea como respaldo.
  const currentClient =
    clients.find((c: Client) => c.id === formData.clientId) || task?.client;
  const currentProject = projects.find(
    (p: Project) => p.id === formData.projectId,
  );

  // Calcular progreso de subtareas
  const completedSubtasks = subtasks.filter((s: Subtask) => s.completed).length;
  const totalSubtasks = subtasks.length;
  const progressText =
    totalSubtasks > 0
      ? `${completedSubtasks} / ${totalSubtasks} Completed`
      : "No subtasks";

  // Función para obtener las iniciales del cliente
  const getClientInitials = (clientName: string) => {
    return clientName
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  // Función para obtener el color del avatar del cliente
  const getClientAvatarColor = (clientName: string) => {
    const colors = [
      "bg-orange-200 text-orange-700",
      "bg-blue-200 text-blue-700",
      "bg-purple-200 text-purple-700",
      "bg-green-200 text-green-700",
      "bg-red-200 text-red-700",
      "bg-yellow-200 text-yellow-700",
      "bg-pink-200 text-pink-700",
      "bg-indigo-200 text-indigo-700",
    ];

    const hash = clientName
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  // Función para obtener el color de prioridad
  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.HIGH:
        return "bg-red-500/10 border-red-500/20 text-red-400";
      case TaskPriority.MEDIUM:
        return "bg-yellow-500/10 border-yellow-500/20 text-yellow-400";
      case TaskPriority.LOW:
        return "bg-green-500/10 border-green-500/20 text-green-400";
      default:
        return "bg-slate-500/10 border-slate-500/20 text-slate-400";
    }
  };

  // Función para obtener el icono de prioridad
  const getPriorityIcon = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.HIGH:
        return "priority_high";
      case TaskPriority.MEDIUM:
        return "remove";
      case TaskPriority.LOW:
        return "arrow_downward";
      default:
        return "remove";
    }
  };

  // Función para formatear la fecha
  const formatDate = (dateString?: string) => {
    if (!dateString) return "No date";

    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";

    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const descriptionHtml = normalizeDescriptionToHtml(formData.description);

  // Helper para determinar visibilidad de campos según tipo
  const isTask = formData.type === TaskType.TASK;
  const isNote = formData.type === TaskType.NOTE;
  const isReminder = formData.type === TaskType.REMINDER;
  const showTaskFields = isTask; // subtasks, priority, status, dueDate

  const [descriptionDraft, setDescriptionDraft] = useState("");

  const startEditingDescription = () => {
    setDescriptionDraft(formData.description || "");
    setIsEditingDescription(true);
  };

  const saveDescription = () => {
    setFormData({ ...formData, description: descriptionDraft });
    setIsEditingDescription(false);
  };

  const cancelDescriptionEdit = () => {
    setDescriptionDraft("");
    setIsEditingDescription(false);
  };

  const handleDescriptionImageUpload = async (file: File) => {
    try {
      return await uploadImageToFilesService(file);
    } catch (error) {
      toast.error("Error al subir imagen");
      throw error;
    }
  };

  const handleAttachmentAdded = useCallback(
    (attachment: UploadedAttachment) => {
      setSessionAttachments((prev) => [...prev, attachment]);
    },
    [],
  );

  // Extract image URLs from description HTML
  const descriptionImages = (() => {
    const html = formData.description || "";
    if (!html || typeof window === "undefined") return [];
    const doc = new DOMParser().parseFromString(html, "text/html");
    const imgs = doc.querySelectorAll("img[src]");
    return Array.from(imgs).map((img) => {
      const src = img.getAttribute("src") || "";
      const filename = src.split("/").pop() || "image.png";
      return { url: src, filename };
    });
  })();

  // Combine: images from description + saved File records (deduped by URL)
  const seenUrls = new Set<string>();
  const allAttachments: {
    id: string | null;
    url: string;
    filename: string;
    uploadedAt: string;
    saved: boolean;
  }[] = [];

  // First add saved File records (they have IDs for deletion)
  for (const f of savedAttachments) {
    if (!seenUrls.has(f.url)) {
      seenUrls.add(f.url);
      allAttachments.push({
        id: f.id,
        url: f.url,
        filename: f.title,
        uploadedAt: f.createdAt,
        saved: true,
      });
    }
  }

  // Then add images parsed from description HTML
  for (const img of descriptionImages) {
    if (!seenUrls.has(img.url)) {
      seenUrls.add(img.url);
      allAttachments.push({
        id: null,
        url: img.url,
        filename: img.filename,
        uploadedAt: task?.updatedAt || new Date().toISOString(),
        saved: false,
      });
    }
  }

  const handleDeleteAttachment = async (fileId: string) => {
    try {
      await filesApi.delete(fileId);
      queryClient.invalidateQueries({ queryKey: ["files", "task", task?.id] });
      toast.success("Archivo eliminado");
    } catch {
      toast.error("Error al eliminar archivo");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 lg:p-4 bg-black/60">
      <div className="bg-[#111827] w-full max-w-5xl h-[95vh] lg:h-[85vh] rounded-xl flex flex-col shadow-2xl overflow-hidden border border-white/10">
        {/* Header */}
        <div className="flex items-center justify-between px-3 lg:px-6 py-3 lg:py-4 border-b border-white/10 bg-[#1F2937]">
          <div className="flex items-center gap-2 lg:gap-3 min-w-0">
            <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-xs font-bold font-mono border border-blue-500/20 tracking-wider uppercase flex-shrink-0">
              {task?.taskCode || (task?.id ? task.id.substring(0, 8).toUpperCase() : "NEW")}
            </span>
            <div className="h-4 w-px bg-white/10 hidden lg:block"></div>
            <div className="hidden lg:flex items-center gap-1 text-slate-400 text-xs">
              <span className="material-symbols-outlined text-sm">
                {isPersonalSpace ? "Área" : "Project"}
              </span>
              <span>
                {currentProject?.name ||
                  (isPersonalSpace ? "Sin área" : "No project")}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isReadOnly && (
              <button
                onClick={handleShareTask}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:bg-white/5 rounded-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile Tabs - CBK-80: en desktop ambos paneles se ven lado a lado
            (lg:flex-row más abajo), así que estas pestañas solo existen <lg */}
        <div className="lg:hidden flex border-b border-white/10 bg-[#1F2937] flex-shrink-0">
          <button
            type="button"
            onClick={() => setMobileTab("content")}
            className={cn(
              "flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors",
              mobileTab === "content"
                ? "border-blue-500 text-white"
                : "border-transparent text-slate-500",
            )}
          >
            Contenido
          </button>
          <button
            type="button"
            onClick={() => setMobileTab("config")}
            className={cn(
              "flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors",
              mobileTab === "config"
                ? "border-blue-500 text-white"
                : "border-transparent text-slate-500",
            )}
          >
            Configuración
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
          {/* Left Panel - Description & Subtasks */}
          <div
            className={cn(
              "flex-1 overflow-y-auto p-4 lg:p-8",
              mobileTab !== "content" && "hidden lg:block",
            )}
          >
            {/* Title */}
            <div className="mb-6">
              {isEditingTitle && !isReadOnly ? (
                <Input
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  onBlur={() => setIsEditingTitle(false)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setIsEditingTitle(false);
                    }
                  }}
                  className="text-2xl font-bold text-white bg-transparent border-none p-0 focus:ring-0"
                  autoFocus
                />
              ) : (
                <h2
                  className={`text-2xl font-bold text-white ${isReadOnly ? "" : "cursor-pointer hover:text-slate-300 transition-colors"}`}
                  onClick={() => {
                    if (!isReadOnly) setIsEditingTitle(true);
                  }}
                >
                  {formData.title || (isNote ? "Nueva nota" : isReminder ? "Nuevo recordatorio" : "Nueva tarea")}
                </h2>
              )}
            </div>

            {/* Description */}
            <div className="prose prose-invert prose-sm max-w-none mb-8">
              <h4 className="text-slate-300 font-semibold mb-2">Description</h4>
              {isEditingDescription && !isReadOnly ? (
                <div>
                  <RichTextEditor
                    value={descriptionDraft}
                    onChange={setDescriptionDraft}
                    onImageUpload={handleDescriptionImageUpload}
                    onAttachmentAdded={handleAttachmentAdded}
                    placeholder="Escribe una descripción o pega una imagen..."
                  />
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      type="button"
                      onClick={saveDescription}
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded transition-colors"
                    >
                      Guardar
                    </button>
                    <button
                      type="button"
                      onClick={cancelDescriptionEdit}
                      className="px-4 py-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className={`text-slate-400 leading-relaxed p-3 rounded-lg ${isReadOnly ? "" : "cursor-pointer hover:bg-white/5 transition-colors"}`}
                  onClick={() => {
                    if (!isReadOnly) startEditingDescription();
                  }}
                >
                  <div className="space-y-3">
                    {descriptionHtml ? (
                      <div
                        className="prose prose-invert prose-sm max-w-none [&_img]:max-w-full [&_img]:rounded-md [&_table]:border-collapse [&_td]:border [&_td]:border-slate-600 [&_td]:px-3 [&_td]:py-1.5 [&_th]:border [&_th]:border-slate-600 [&_th]:px-3 [&_th]:py-1.5 [&_th]:bg-slate-800"
                        dangerouslySetInnerHTML={{ __html: descriptionHtml }}
                      />
                    ) : (
                      <span className="italic text-slate-500">
                        Click to add description...
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Attachments */}
            {allAttachments.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                    <Paperclip className="w-4 h-4 text-slate-400" />
                    Archivos adjuntos
                    <span className="ml-1 px-1.5 py-0.5 rounded bg-slate-700 text-[10px] text-slate-400 font-bold">
                      {allAttachments.length}
                    </span>
                  </h4>
                </div>
                <div className="flex flex-wrap gap-3">
                  {allAttachments.map((att, idx) => (
                    <div
                      key={att.id || `session-${idx}`}
                      className="group relative w-[140px] rounded-lg border border-white/10 bg-white/5 overflow-hidden hover:border-white/20 transition-colors cursor-pointer"
                      onClick={() => setLightboxIndex(idx)}
                    >
                      {/* Thumbnail */}
                      <div className="h-[90px] bg-slate-800/50 flex items-center justify-center overflow-hidden">
                        <img
                          src={att.url}
                          alt={att.filename}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      {/* Info */}
                      <div className="px-2 py-1.5">
                        <p
                          className="text-[11px] text-slate-300 truncate"
                          title={att.filename}
                        >
                          {att.filename}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {new Date(att.uploadedAt).toLocaleDateString("es", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      {/* Actions overlay */}
                      <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {att.saved && att.id && !isReadOnly && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAttachment(att.id!);
                            }}
                            className="p-1 bg-slate-900/80 rounded text-slate-300 hover:text-red-400 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Subtasks - Solo para tareas */}
            {showTaskFields && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-blue-400" />
                  Checklist
                </h4>
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">
                  {progressText}
                </span>
              </div>

              <div className="space-y-3">
                {subtasks.map((subtask: Subtask) => {
                  const isOptimistic = subtask.id.startsWith("temp-");
                  return (
                    <label
                      key={subtask.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border border-white/5 bg-white/5 cursor-pointer hover:bg-white/[0.07] transition-colors",
                        isOptimistic && "animate-pulse opacity-70",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={subtask.completed}
                        onChange={() =>
                          !isOptimistic && !isReadOnly
                            ? handleToggleSubtask(subtask.id)
                            : undefined
                        }
                        disabled={isOptimistic || isReadOnly}
                        className="rounded border-slate-700 bg-slate-800 text-blue-500 focus:ring-blue-500/20"
                      />
                      <span
                        className={cn(
                          "text-sm flex-1",
                          subtask.completed
                            ? "text-slate-400 line-through"
                            : "text-slate-300",
                        )}
                      >
                        {subtask.title}
                      </span>
                      {!isOptimistic && !isReadOnly && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSubtaskMutation.mutate(subtask.id);
                          }}
                          className="text-slate-500 hover:text-red-400 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </label>
                  );
                })}

                {/* Add new subtask */}
                {!isReadOnly && (
                  <div className="flex gap-2">
                    <Input
                      value={newSubtaskTitle}
                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                      onKeyDown={handleSubtaskKeyDown}
                      placeholder="Nueva subtarea..."
                      className="flex-1 h-9 bg-slate-800/50 border-slate-700 text-slate-300"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddSubtask}
                      disabled={
                        !newSubtaskTitle.trim() ||
                        createSubtaskMutation.isPending
                      }
                      className="h-9 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
            )}
          </div>

          {/* Right Panel - Metadata */}
          <div
            className={cn(
              "w-full lg:w-80 bg-[#1F2937]/30 flex-col p-4 lg:p-6 overflow-y-auto border-t lg:border-t-0 lg:border-l border-white/10",
              mobileTab === "config" ? "flex" : "hidden lg:flex",
            )}
          >
            <div className="space-y-6">
              {/* Client - Solo en espacio de trabajo */}
              {!isPersonalSpace && (
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">
                    Cliente
                  </label>
                  {currentClient ? (
                    <div
                      className={`flex items-center gap-2 ${isReadOnly ? "" : "cursor-pointer hover:opacity-80 transition-opacity"}`}
                      onClick={() =>
                        !isReadOnly && handleClientFilter(currentClient.id)
                      }
                    >
                      <div
                        className={cn(
                          "h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold",
                          getClientAvatarColor(currentClient.name),
                        )}
                      >
                        {getClientInitials(currentClient.name)}
                      </div>
                      <span className="text-sm text-slate-300">
                        {currentClient.name}
                      </span>
                    </div>
                  ) : isReadOnly ? (
                    <span className="text-sm text-slate-400">
                      Cliente no disponible
                    </span>
                  ) : (
                    <select
                      value={formData.clientId}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          clientId: e.target.value,
                          projectId: undefined,
                        })
                      }
                      className={cn(
                        "w-full h-9 rounded-md border bg-slate-800/50 text-slate-300 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500",
                        errors.clientId ? "border-red-500" : "border-slate-700",
                      )}
                    >
                      <option value="">Seleccionar cliente...</option>
                      {clients.map((client: Client) => (
                        <option key={client.id} value={client.id}>
                          {client.name}{" "}
                          {client.company && `(${client.company})`}
                        </option>
                      ))}
                    </select>
                  )}
                  {errors.clientId && (
                    <p className="mt-1 text-xs text-red-400">
                      {errors.clientId}
                    </p>
                  )}
                </div>
              )}

              {/* Project/Área */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">
                  {isPersonalSpace ? "Área *" : "Proyecto"}
                </label>
                {isReadOnly ? (
                  <span className="text-sm text-slate-400">
                    {currentProject?.name ||
                      (isPersonalSpace
                        ? "Área no disponible"
                        : "Proyecto no disponible")}
                  </span>
                ) : (
                  <>
                    <select
                      value={formData.projectId || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          projectId: e.target.value || undefined,
                        })
                      }
                      className={cn(
                        "w-full h-9 rounded-md border bg-slate-800/50 text-slate-300 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500",
                        errors.projectId ? "border-red-500" : "border-slate-700",
                      )}
                      disabled={!isPersonalSpace && !formData.clientId}
                    >
                      <option value="">
                        {isPersonalSpace ? "Seleccionar área..." : "Sin proyecto"}
                      </option>
                      {projects.map((project: Project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                    {/* Quick add área/proyecto */}
                    {(isPersonalSpace || formData.clientId) && (
                      <div className="mt-2">
                        <QuickAddProject
                          clientId={isPersonalSpace ? undefined : formData.clientId}
                          spaceId={isPersonalSpace ? currentSpace?.id : undefined}
                          label={isPersonalSpace ? "área" : undefined}
                          onProjectCreated={(projectId) =>
                            setFormData({ ...formData, projectId })
                          }
                        />
                      </div>
                    )}
                  </>
                )}
                {errors.projectId && (
                  <p className="mt-1 text-xs text-red-400">
                    {errors.projectId}
                  </p>
                )}
              </div>

              {/* Type */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">
                  Tipo
                </label>
                {isReadOnly ? (
                  <span className="text-sm text-slate-300">
                    {taskTypeIcons[formData.type || TaskType.TASK]}{" "}
                    {taskTypeLabels[formData.type || TaskType.TASK]}
                  </span>
                ) : (
                  <div className="flex gap-1.5">
                    {Object.values(TaskType).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setFormData({ ...formData, type: t })}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all",
                          formData.type === t
                            ? taskTypeColors[t]
                            : "border-slate-700 text-slate-500 hover:border-slate-600 hover:text-slate-400",
                        )}
                      >
                        <span>{taskTypeIcons[t]}</span>
                        <span>{taskTypeLabels[t]}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Priority - Solo para tareas */}
              {showTaskFields && (
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">
                  Priority
                </label>
                {isReadOnly ? (
                  <span className="text-sm text-slate-300">
                    {priorityLabels[formData.priority || TaskPriority.MEDIUM]}
                  </span>
                ) : (
                  <select
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        priority: e.target.value as TaskPriority,
                      })
                    }
                    className={cn(
                      "w-full h-9 rounded-md border px-3 text-sm focus:outline-none focus:ring-1 focus:border-blue-500",
                      getPriorityColor(
                        formData.priority || TaskPriority.MEDIUM,
                      ),
                      "border-transparent",
                    )}
                  >
                    {Object.entries(priorityLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              )}

              {/* Status - Solo para tareas */}
              {showTaskFields && (
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">
                  Status
                </label>
                {isReadOnly ? (
                  <span className="text-sm text-slate-300">
                    {statusLabels[formData.status || TaskStatus.TODO]}
                  </span>
                ) : (
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as TaskStatus,
                      })
                    }
                    className="w-full h-9 rounded-md border border-slate-700 bg-slate-800/50 text-slate-300 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              )}

              {/* Due Date - Solo para tareas y recordatorios */}
              {(isTask || isReminder) && (
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">
                  {formData.type === TaskType.REMINDER
                    ? "Fecha del recordatorio"
                    : "Due Date"}
                </label>
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  {isReadOnly ? (
                    <span className="text-sm text-slate-300">
                      {formatDate(formData.dueDate)}
                    </span>
                  ) : (
                    <Input
                      type="date"
                      value={formData.dueDate || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, dueDate: e.target.value })
                      }
                      className="flex-1 h-9 bg-slate-800/50 border-slate-700 text-slate-300"
                    />
                  )}
                </div>
              </div>
              )}

              {/* Reminder Time - only for reminders */}
              {formData.type === TaskType.REMINDER && (
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">
                    Hora del recordatorio
                  </label>
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <span className="text-base">🔔</span>
                    {isReadOnly ? (
                      <span className="text-sm text-slate-300">
                        {reminderTime}
                      </span>
                    ) : (
                      <Input
                        type="time"
                        value={reminderTime}
                        onChange={(e) => setReminderTime(e.target.value)}
                        className="flex-1 h-9 bg-slate-800/50 border-slate-700 text-slate-300"
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Tags */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">
                  Tags
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {formData.tags?.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 border border-slate-700 flex items-center gap-1"
                    >
                      #{tag}
                      {!isReadOnly && (
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="hover:text-slate-300"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </span>
                  ))}
                </div>
                {!isReadOnly && (
                  <div className="flex gap-2">
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Add tag..."
                      className="flex-1 h-9 bg-slate-800/50 border-slate-700 text-slate-300"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddTag}
                      className="h-9 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600"
                    >
                      Add
                    </Button>
                  </div>
                )}
              </div>

              {/* Metadata / Custom Fields - Para tareas y notas */}
              {(isTask || isNote) && (
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">
                  Datos Adicionales
                </label>
                <MetadataEditor
                  metadata={formData.metadata || {}}
                  onChange={(metadata) =>
                    setFormData({ ...formData, metadata })
                  }
                  readOnly={isReadOnly}
                  suggestedFields={
                    currentProject?.domain
                      ? domainSuggestedFields[currentProject.domain] || []
                      : []
                  }
                />
              </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-3 lg:px-6 py-3 lg:py-4 border-t border-white/10 flex items-center justify-between bg-[#1F2937]">
          <div className="flex items-center gap-2 lg:gap-4">
            {isEditing && !isReadOnly && (
              <div className="flex items-center gap-2 lg:gap-4">
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  {isNote ? "Delete note" : isReminder ? "Delete reminder" : "Delete task"}
                </button>
                <button
                  onClick={handleToggleArchive}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-400 transition-colors"
                >
                  <Archive className="w-4 h-4" />
                  {formData.isArchived
                    ? isNote ? "Restore note" : isReminder ? "Restore reminder" : "Restore task"
                    : isNote ? "Archive note" : isReminder ? "Archive reminder" : "Archive task"}
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
            >
              {isReadOnly ? "Cerrar" : "Cancel"}
            </button>
            {!isReadOnly && (
              <button
                onClick={handleSubmit}
                disabled={isPending}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded shadow-lg shadow-blue-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin inline" />
                )}
                {isEditing
                  ? "Save Changes"
                  : isNote
                    ? "Create Note"
                    : isReminder
                      ? "Create Reminder"
                      : "Create Task"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => deleteMutation.mutate()}
        title={isNote ? "Delete note" : isReminder ? "Delete reminder" : "Delete task"}
        message={`Are you sure you want to delete "${task?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />

      {/* Image Lightbox */}
      <ImageLightbox
        images={allAttachments.map((a) => ({
          url: a.url,
          filename: a.filename,
        }))}
        initialIndex={lightboxIndex}
        isOpen={lightboxIndex >= 0}
        onClose={() => setLightboxIndex(-1)}
      />
    </div>
  );
}
