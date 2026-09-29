import axios from "axios";
import { getSession, signOut } from "next-auth/react";
import type {
  Client,
  Task,
  Project,
  Worklog,
  FileEntity,
  Snapshot,
  Subtask,
  CustomBoardColumn,
  Space,
  SpaceStats,
  CreateClientDto,
  CreateTaskDto,
  CreateProjectDto,
  UpdateProjectDto,
  CreateWorklogDto,
  CreateFileDto,
  CreateSnapshotDto,
  CreateSubtaskDto,
  UpdateSubtaskDto,
  CreateBoardColumnDto,
  UpdateBoardColumnDto,
  CreateSpaceDto,
  UpdateSpaceDto,
  MoveTaskDto,
  BoardData,
  ClientSummaryResponse,
  TodayPlanResponse,
  WriteMessageResponse,
  MessageType,
  SpaceType,
  ProjectNote,
  AnalyzeNotesResponse,
  CreateTasksFromParserDto,
  CreateTasksFromParserResponse,
  RefineProjectNotesDto,
  ProjectSharing,
  PublicProject,
  TaskStatus,
} from "@/types";

const baseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(async (config) => {
  const session = await getSession();
  const token =
    (session?.user as any)?.accessToken || (session as any)?.accessToken;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Si el token expiró o es inválido, cerrar sesión
      // await signOut({ callbackUrl: '/login' });
    }
    return Promise.reject(error);
  },
);

// Spaces
// Note: Backend returns { success, spaces, ... } structure
export const spacesApi = {
  getAll: (includeArchived = false) =>
    api
      .get<{ spaces: Space[] }>(`/spaces?includeArchived=${includeArchived}`)
      .then((r) => r.data.spaces),

  getOne: (id: string) =>
    api.get<{ space: Space }>(`/spaces/${id}`).then((r) => r.data.space),

  getStats: (id: string) =>
    api
      .get<SpaceStats & { success: boolean }>(`/spaces/${id}/stats`)
      .then((r) => r.data),

  create: (data: CreateSpaceDto) =>
    api.post<{ space: Space }>("/spaces", data).then((r) => r.data.space),

  update: (id: string, data: UpdateSpaceDto) =>
    api
      .patch<{ space: Space }>(`/spaces/${id}`, data)
      .then((r) => r.data.space),

  archive: (id: string) =>
    api
      .patch<{ space: Space }>(`/spaces/${id}/archive`)
      .then((r) => r.data.space),

  reorder: (spaceIds: string[]) =>
    api
      .patch<{ spaces: Space[] }>("/spaces/reorder", { spaceIds })
      .then((r) => r.data.spaces),

  delete: (id: string) => api.delete(`/spaces/${id}`).then((r) => r.data),

  createDefaults: () =>
    api
      .post<{ spaces: Space[] }>("/spaces/defaults")
      .then((r) => r.data.spaces),
};

// Clients
export const clientsApi = {
  getAll: (filters?: { includeInactive?: boolean; spaceId?: string }) =>
    api.get<Client[]>("/clients", { params: filters }).then((r) => r.data),

  getOne: (id: string) => api.get<Client>(`/clients/${id}`).then((r) => r.data),

  create: (data: CreateClientDto & { spaceId?: string }) =>
    api.post<Client>("/clients", data).then((r) => r.data),

  update: (
    id: string,
    data: Partial<CreateClientDto> & { spaceId?: string; isActive?: boolean },
  ) =>
    api.patch<Client>(`/clients/${id}`, data).then((r) => r.data),

  delete: (id: string) => api.delete(`/clients/${id}`).then((r) => r.data),

  deletePermanent: (id: string) =>
    api.delete(`/clients/${id}/permanent`).then((r) => r.data),
};

// Tasks
export const tasksApi = {
  getAll: (filters?: {
    spaceId?: string;
    spaceType?: SpaceType;
    clientId?: string;
    projectId?: string;
    status?: string;
    priority?: string;
    type?: string;
    tags?: string[];
    search?: string;
    isArchived?: boolean;
    page?: number;
    limit?: number;
  }) =>
    api
      .get<{
        tasks: Task[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }>("/tasks", { params: filters })
      .then((r) => r.data),

  getBoard: (filters?: {
    projectId?: string;
    clientId?: string;
    /** Máximo de tareas completadas (las más recientes). 0 = sin límite. */
    doneLimit?: number;
  }) =>
    api.get<BoardData>("/tasks/board", { params: filters }).then((r) => r.data),

  getByClient: (clientId: string) =>
    api.get<Task[]>(`/tasks/client/${clientId}`).then((r) => r.data),

  getOne: (id: string) => api.get<Task>(`/tasks/${id}`).then((r) => r.data),

  getByCode: (code: string) =>
    api
      .get<Task>(`/tasks/by-code/${encodeURIComponent(code)}`)
      .then((r) => r.data),

  create: (data: CreateTaskDto) =>
    api.post<Task>("/tasks", data).then((r) => r.data),

  update: (id: string, data: Partial<CreateTaskDto>) =>
    api.patch<Task>(`/tasks/${id}`, data).then((r) => r.data),

  move: (id: string, data: MoveTaskDto) =>
    api.patch<Task>(`/tasks/${id}/move`, data).then((r) => r.data),

  reorder: (taskIds: string[], status: string) =>
    api.post("/tasks/reorder", { taskIds, status }),

  clearCompleted: () => api.delete("/tasks/completed"),

  delete: (id: string) => api.delete(`/tasks/${id}`),

  bulkDelete: (ids: string[]) =>
    api
      .post<{ deleted: number }>("/tasks/bulk-delete", { ids })
      .then((r) => r.data),
};

// Projects
export const projectsApi = {
  getAll: (filters?: {
    clientId?: string;
    status?: string;
    spaceId?: string;
  }) =>
    api.get<Project[]>("/projects", { params: filters }).then((r) => r.data),

  getByClient: (clientId: string) =>
    api.get<Project[]>(`/projects/client/${clientId}`).then((r) => r.data),

  getOne: (id: string) =>
    api.get<Project>(`/projects/${id}`).then((r) => r.data),

  getStats: (id: string) =>
    api
      .get<{
        totalTasks: number;
        completedTasks: number;
        progress: number;
      }>(`/projects/${id}/stats`)
      .then((r) => r.data),

  create: (data: CreateProjectDto) =>
    api.post<Project>("/projects", data).then((r) => r.data),

  update: (id: string, data: UpdateProjectDto) =>
    api.put<Project>(`/projects/${id}`, data).then((r) => r.data),

  delete: (id: string) => api.delete(`/projects/${id}`),

  getSharing: (id: string) =>
    api.get<ProjectSharing>(`/projects/${id}/share`).then((r) => r.data),

  setSharing: (id: string, enabled: boolean) =>
    api
      .patch<ProjectSharing>(`/projects/${id}/share`, { enabled })
      .then((r) => r.data),

  regenerateShareToken: (id: string) =>
    api
      .post<ProjectSharing>(`/projects/${id}/share/regenerate`)
      .then((r) => r.data),
};

// Worklogs
export const worklogsApi = {
  getAll: (filters?: {
    clientId?: string;
    taskId?: string;
    from?: string;
    to?: string;
  }) =>
    api.get<Worklog[]>("/worklogs", { params: filters }).then((r) => r.data),

  getByClient: (clientId: string, limit?: number) =>
    api
      .get<Worklog[]>(`/worklogs/client/${clientId}`, { params: { limit } })
      .then((r) => r.data),

  getOne: (id: string) =>
    api.get<Worklog>(`/worklogs/${id}`).then((r) => r.data),

  create: (data: CreateWorklogDto) =>
    api.post<Worklog>("/worklogs", data).then((r) => r.data),

  update: (id: string, data: Partial<CreateWorklogDto>) =>
    api.patch<Worklog>(`/worklogs/${id}`, data).then((r) => r.data),

  delete: (id: string) => api.delete(`/worklogs/${id}`),
};

// Files
export const filesApi = {
  getAll: (clientId?: string) =>
    api
      .get<FileEntity[]>("/files", { params: { clientId } })
      .then((r) => r.data),

  getByClient: (clientId: string) =>
    api.get<FileEntity[]>(`/files/client/${clientId}`).then((r) => r.data),

  getByTask: (taskId: string) =>
    api.get<FileEntity[]>(`/files/task/${taskId}`).then((r) => r.data),

  getOne: (id: string) =>
    api.get<FileEntity>(`/files/${id}`).then((r) => r.data),

  create: (data: CreateFileDto) =>
    api.post<FileEntity>("/files", data).then((r) => r.data),

  update: (id: string, data: Partial<CreateFileDto>) =>
    api.patch<FileEntity>(`/files/${id}`, data).then((r) => r.data),

  delete: (id: string) => api.delete(`/files/${id}`),
};

// Snapshots
export const snapshotsApi = {
  getAll: (filters?: { from?: string; to?: string }) =>
    api.get<Snapshot[]>("/snapshots", { params: filters }).then((r) => r.data),

  getToday: () => api.get<Snapshot[]>("/snapshots/today").then((r) => r.data),

  getLatest: () => api.get<Snapshot>("/snapshots/latest").then((r) => r.data),

  getOne: (id: string) =>
    api.get<Snapshot>(`/snapshots/${id}`).then((r) => r.data),

  create: (data?: CreateSnapshotDto) =>
    api.post<Snapshot>("/snapshots", data || {}).then((r) => r.data),

  delete: (id: string) => api.delete(`/snapshots/${id}`),
};

// Subtasks
export const subtasksApi = {
  getByTask: (taskId: string) =>
    api.get<Subtask[]>(`/subtasks/task/${taskId}`).then((r) => r.data),

  getOne: (id: string) =>
    api.get<Subtask>(`/subtasks/${id}`).then((r) => r.data),

  create: (data: CreateSubtaskDto) =>
    api.post<Subtask>("/subtasks", data).then((r) => r.data),

  update: (id: string, data: UpdateSubtaskDto) =>
    api.put<Subtask>(`/subtasks/${id}`, data).then((r) => r.data),

  toggle: (id: string) =>
    api.patch<Subtask>(`/subtasks/${id}/toggle`).then((r) => r.data),

  delete: (id: string) => api.delete(`/subtasks/${id}`),

  reorder: (taskId: string, subtaskIds: string[]) =>
    api
      .post<Subtask[]>(`/subtasks/task/${taskId}/reorder`, { subtaskIds })
      .then((r) => r.data),
};

// AI
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
}

export interface ChatResponse {
  message: string;
  suggestedActions?: Array<{
    type: "create_task" | "save_knowledge" | "search_code";
    label: string;
    data: any;
  }>;
  sources?: Array<{
    type: "context" | "knowledge" | "code";
    title: string;
    reference?: string;
  }>;
  model: string;
}

export interface ChatRequest {
  message: string;
  projectId?: string;
  history?: ChatMessage[];
  includeContext?: boolean;
  includeCodeSearch?: boolean;
  imageUrl?: string;
  imageMimeType?: string;
}

// AI Settings Types
export enum AIProvider {
  OPENAI = "openai",
  GEMINI = "gemini",
}

export enum OpenAIModel {
  GPT_4O = "gpt-4o",
  GPT_4O_MINI = "gpt-4o-mini",
  GPT_4_TURBO = "gpt-4-turbo",
  GPT_3_5_TURBO = "gpt-3.5-turbo",
}

export interface AISettings {
  id: string;
  userId: string;
  defaultProvider: AIProvider;
  openaiDefaultModel: OpenAIModel;
  /** Free-form Gemini model id — see GET /ai/models for the live valid list. */
  geminiDefaultModel: string;
  enableSuggestions: boolean;
  enableAutoSummary: boolean;
  enableChat: boolean;
  enableRAG: boolean;
  temperature: number;
  maxTokens: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateAISettingsDto {
  defaultProvider?: AIProvider;
  openaiDefaultModel?: OpenAIModel;
  geminiDefaultModel?: string;
  enableSuggestions?: boolean;
  enableAutoSummary?: boolean;
  enableChat?: boolean;
  enableRAG?: boolean;
  temperature?: number;
  maxTokens?: number;
}

export interface ModelInfo {
  id: string;
  name: string;
  description: string;
  contextWindow: number;
  costPer1kTokens?: number;
  free?: boolean;
}

export interface AvailableModels {
  openai: ModelInfo[];
  gemini: ModelInfo[];
}

export const aiApi = {
  // AI Settings
  getSettings: () => api.get<AISettings>("/ai/settings").then((r) => r.data),

  updateSettings: (data: UpdateAISettingsDto) =>
    api.patch<AISettings>("/ai/settings", data).then((r) => r.data),

  getAvailableModels: () =>
    api.get<AvailableModels>("/ai/models").then((r) => r.data),

  // AI Features
  getClientSummary: (clientId: string) =>
    api
      .post<ClientSummaryResponse>("/ai/client-summary", { clientId })
      .then((r) => r.data),

  getTodayPlan: (availableMinutes: number, clientIds?: string[]) =>
    api
      .post<TodayPlanResponse>("/ai/today-plan", {
        availableMinutes,
        clientIds,
      })
      .then((r) => r.data),

  writeMessage: (
    clientId: string,
    messageType: MessageType,
    taskId?: string,
    additionalContext?: string,
  ) =>
    api
      .post<WriteMessageResponse>("/ai/write-message", {
        clientId,
        messageType,
        taskId,
        additionalContext,
      })
      .then((r) => r.data),

  chat: (params: ChatRequest) =>
    api.post<ChatResponse>("/ai/chat", params).then((r) => r.data),

  analyzeProjectNotes: (projectId: string) =>
    api
      .post<AnalyzeNotesResponse>("/ai/analyze-project-notes", { projectId })
      .then((r) => r.data),

  refineProjectNotes: (data: RefineProjectNotesDto) =>
    api
      .post<AnalyzeNotesResponse>("/ai/analyze-project-notes/refine", data)
      .then((r) => r.data),

  createTasksFromParser: (data: CreateTasksFromParserDto) =>
    api
      .post<CreateTasksFromParserResponse>(
        "/ai/create-tasks-from-parser",
        data,
      )
      .then((r) => r.data),
};

// Users
export const usersApi = {
  changePassword: (
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) =>
    api
      .patch(`/users/${userId}/password`, { currentPassword, newPassword })
      .then((r) => r.data),
};

// Board Columns
export const boardColumnsApi = {
  getAll: () =>
    api.get<CustomBoardColumn[]>("/board-columns").then((r) => r.data),

  getVisible: () =>
    api.get<CustomBoardColumn[]>("/board-columns/visible").then((r) => r.data),

  getOne: (id: string) =>
    api.get<CustomBoardColumn>(`/board-columns/${id}`).then((r) => r.data),

  create: (data: CreateBoardColumnDto) =>
    api.post<CustomBoardColumn>("/board-columns", data).then((r) => r.data),

  update: (id: string, data: UpdateBoardColumnDto) =>
    api
      .patch<CustomBoardColumn>(`/board-columns/${id}`, data)
      .then((r) => r.data),

  toggleVisibility: (id: string) =>
    api
      .patch<CustomBoardColumn>(`/board-columns/${id}/toggle-visibility`)
      .then((r) => r.data),

  reorder: (columnIds: string[]) =>
    api
      .post<CustomBoardColumn[]>("/board-columns/reorder", { columnIds })
      .then((r) => r.data),

  delete: (id: string) => api.delete(`/board-columns/${id}`),
};

// ============================================================================
// KNOWLEDGE API
// ============================================================================

import type {
  Knowledge,
  KnowledgeSearchResult,
  CreateKnowledgeDto,
  UpdateKnowledgeDto,
  KnowledgeFilterDto,
  SearchKnowledgeDto,
  ProjectContextResponse,
  RagIndexStatus,
  CodeSearchResult,
} from "@/types";

export const knowledgeApi = {
  getAll: (filters?: KnowledgeFilterDto) =>
    api.get<Knowledge[]>("/knowledge", { params: filters }).then((r) => r.data),

  getOne: (id: string) =>
    api.get<Knowledge>(`/knowledge/${id}`).then((r) => r.data),

  search: (params: SearchKnowledgeDto) =>
    api
      .get<KnowledgeSearchResult[]>("/knowledge/search", { params })
      .then((r) => r.data),

  getByProject: (projectId: string, limit?: number) =>
    api
      .get<
        Knowledge[]
      >(`/knowledge/project/${projectId}`, { params: { limit } })
      .then((r) => r.data),

  getTags: () =>
    api
      .get<{ name: string; count: number }[]>("/knowledge/tags")
      .then((r) => r.data),

  getPopularTags: (limit?: number) =>
    api
      .get<{ name: string; count: number }[]>("/knowledge/tags/popular", {
        params: { limit },
      })
      .then((r) => r.data),

  create: (data: CreateKnowledgeDto) =>
    api.post<Knowledge>("/knowledge", data).then((r) => r.data),

  update: (id: string, data: UpdateKnowledgeDto) =>
    api.patch<Knowledge>(`/knowledge/${id}`, data).then((r) => r.data),

  archive: (id: string) =>
    api.patch<Knowledge>(`/knowledge/${id}/archive`).then((r) => r.data),

  delete: (id: string) => api.delete(`/knowledge/${id}`),
};

// ============================================================================
// PROJECT CONTEXT & RAG API
// ============================================================================

export const projectContextApi = {
  getContext: (identifier: string) =>
    api
      .get<ProjectContextResponse>(`/projects/context/${identifier}`)
      .then((r) => r.data),

  getContextSettings: (projectId: string) =>
    api.get(`/projects/${projectId}/context/settings`).then((r) => r.data),

  updateContext: (
    projectId: string,
    data: {
      stack?: string;
      rules?: string[];
      aiDescription?: string;
      repositoryUrl?: string;
      localPath?: string;
      defaultBranch?: string;
      tags?: string[];
      ragEnabled?: boolean;
    },
  ) => api.patch(`/projects/${projectId}/context`, data).then((r) => r.data),
};

// ============================================================================
// PROJECT NOTES (SCRATCHPAD) API
// ============================================================================

export const projectNotesApi = {
  get: (projectId: string) =>
    api.get<ProjectNote>(`/projects/${projectId}/note`).then((r) => r.data),

  update: (projectId: string, content: string) =>
    api
      .patch<ProjectNote>(`/projects/${projectId}/note`, { content })
      .then((r) => r.data),
};

export const ragApi = {
  getIndexStatus: (projectId: string) =>
    api.get<RagIndexStatus>(`/rag/status/${projectId}`).then((r) => r.data),

  searchCode: (params: {
    query: string;
    projectId?: string;
    fileType?: string;
    limit?: number;
    useSemanticSearch?: boolean;
  }) =>
    api.get<CodeSearchResult[]>("/rag/search", { params }).then((r) => r.data),

  getChunks: (projectId: string, limit?: number, offset?: number) =>
    api
      .get<{ chunks: any[]; total: number }>(`/rag/chunks/${projectId}`, {
        params: { limit, offset },
      })
      .then((r) => r.data),

  deleteIndex: (projectId: string) =>
    api.delete(`/rag/index/${projectId}`).then((r) => r.data),
};

// ============================================================================
// NOTIFICATIONS & TRIGGERS API
// ============================================================================

import type {
  AppNotification,
  Trigger,
  CreateTriggerDto,
  UpdateTriggerDto,
} from "@/types";

export const notificationsApi = {
  getAll: (options?: { includeRead?: boolean; limit?: number }) =>
    api
      .get<{ notifications: AppNotification[] }>("/notifications", {
        params: {
          includeRead: options?.includeRead?.toString(),
          limit: options?.limit?.toString(),
        },
      })
      .then((r) => r.data.notifications),

  getUnreadCount: () =>
    api
      .get<{ count: number }>("/notifications/unread-count")
      .then((r) => r.data.count),

  markAsRead: (id: string) =>
    api
      .patch<{ notification: AppNotification }>(`/notifications/${id}/read`)
      .then((r) => r.data.notification),

  markAllAsRead: () => api.patch("/notifications/read-all").then((r) => r.data),
};

export const triggersApi = {
  getAll: () =>
    api.get<{ triggers: Trigger[] }>("/triggers").then((r) => r.data.triggers),

  getOne: (id: string) =>
    api
      .get<{ trigger: Trigger }>(`/triggers/${id}`)
      .then((r) => r.data.trigger),

  create: (data: CreateTriggerDto) =>
    api
      .post<{ trigger: Trigger }>("/triggers", data)
      .then((r) => r.data.trigger),

  update: (id: string, data: UpdateTriggerDto) =>
    api
      .patch<{ trigger: Trigger }>(`/triggers/${id}`, data)
      .then((r) => r.data.trigger),

  toggle: (id: string) =>
    api
      .patch<{ trigger: Trigger }>(`/triggers/${id}/toggle`)
      .then((r) => r.data.trigger),

  delete: (id: string) => api.delete(`/triggers/${id}`),
};

// Public share links
// Separate instance on purpose: these endpoints are read by clients who have no
// session, so they must never carry the auth interceptor's Authorization header.
const publicHttp = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const publicApi = {
  getProject: (token: string) =>
    publicHttp
      .get<PublicProject>(`/public/project/${token}`)
      .then((r) => r.data),

  getBoard: (token: string) =>
    publicHttp.get<BoardData>(`/public/board/${token}`).then((r) => r.data),

  getTasks: (
    token: string,
    filters?: { search?: string; status?: TaskStatus; page?: number; limit?: number },
  ) =>
    publicHttp
      .get<{
        tasks: Task[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }>(`/public/tasks/${token}`, { params: filters })
      .then((r) => r.data),
};

export default api;
