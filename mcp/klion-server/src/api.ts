import axios, { AxiosInstance, AxiosError } from "axios";
import { getApiUrl, getAccessToken, getServiceKey } from "./config.js";

// Types matching backend DTOs

// Space types
export type SpaceType = "personal" | "work";

export interface Space {
  id: string;
  userId: string;
  name: string;
  type: SpaceType;
  icon?: string;
  color: string;
  position: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  clients?: Client[];
  projects?: Project[];
}

export interface CreateSpaceDto {
  name: string;
  type?: SpaceType;
  icon?: string;
  color?: string;
  position?: number;
}

export interface UpdateSpaceDto {
  name?: string;
  type?: SpaceType;
  icon?: string;
  color?: string;
  position?: number;
  isArchived?: boolean;
}

export interface SpaceStats {
  space: Space;
  stats: {
    projects: number;
    clients: number;
    tasks: {
      total: number;
      todo: number;
      doing: number;
      done: number;
    };
  };
}

// Project Domain type
export type ProjectDomain =
  | "work"
  | "auto"
  | "health"
  | "home"
  | "finance"
  | "personal";

export interface Client {
  id: string;
  spaceId?: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  notes?: string;
  metadata?: Record<string, any>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  spaceId?: string;
  clientId?: string;
  name: string;
  description?: string;
  status: "active" | "on_hold" | "completed" | "cancelled";
  domain: ProjectDomain;
  color: string;
  icon?: string;
  dueDate?: string;
  budget?: number;
  position: number;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  clientId: string;
  projectId?: string;
  title: string;
  description?: string;
  status: "todo" | "doing" | "blocked" | "done";
  priority: "low" | "medium" | "high";
  dueDate?: string;
  tags?: string[];
  position: number;
  metadata?: Record<string, any>;
  taskNumber?: number;
  taskCode?: string;
  createdAt: string;
  updatedAt: string;
  client?: Client;
  project?: Project;
}

export interface CreateTaskDto {
  clientId: string;
  title: string;
  projectId?: string;
  description?: string;
  status?: "todo" | "doing" | "blocked" | "done";
  priority?: "low" | "medium" | "high";
  dueDate?: string;
  tags?: string[];
  position?: number;
  metadata?: Record<string, any>;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  status?: "todo" | "doing" | "blocked" | "done";
  priority?: "low" | "medium" | "high";
  dueDate?: string;
  tags?: string[];
  projectId?: string;
  clientId?: string;
  metadata?: Record<string, any>;
}

export interface BoardData {
  todo: Task[];
  doing: Task[];
  blocked: Task[];
  done: Task[];
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    avatar?: string;
    role: string;
  };
}

export interface ApiError {
  message: string;
  statusCode: number;
}

function createApiClient(): AxiosInstance {
  const client = axios.create({
    baseURL: getApiUrl(),
    headers: {
      "Content-Type": "application/json",
    },
    timeout: 10000,
  });

  // Attach auth. Prefer the service key (headless, non-expiring); fall back to
  // the JWT from `klion login` when no service key is configured.
  client.interceptors.request.use((config) => {
    const serviceKey = getServiceKey();
    if (serviceKey) {
      config.headers["X-Service-Key"] = serviceKey;
      return config;
    }
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  return client;
}

function handleApiError(error: unknown): never {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ message: string }>;
    const message = axiosError.response?.data?.message || axiosError.message;
    const statusCode = axiosError.response?.status || 500;
    throw new Error(`API Error (${statusCode}): ${message}`);
  }
  throw error;
}

// Auth API
export const authApi = {
  async login(data: LoginDto): Promise<AuthResponse> {
    try {
      const client = createApiClient();
      const response = await client.post<AuthResponse>("/auth/login", data);
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  async me(): Promise<AuthResponse["user"]> {
    try {
      const client = createApiClient();
      const response = await client.get<AuthResponse["user"]>("/auth/me");
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },
};

// Clients API
export const clientsApi = {
  async getAll(includeInactive = false): Promise<Client[]> {
    try {
      const client = createApiClient();
      const response = await client.get<Client[]>(
        `/clients?includeInactive=${includeInactive}`,
      );
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  async getOne(id: string): Promise<Client> {
    try {
      const client = createApiClient();
      const response = await client.get<Client>(`/clients/${id}`);
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },
};

// Full Project Context (for AI assistants)
export interface ProjectContext {
  project: {
    id: string;
    name: string;
    description: string;
    status: string;
    color: string;
    dueDate: string | null;
    budget: number | null;
  };
  client: {
    id: string;
    name: string;
    company: string | null;
    email: string | null;
  };
  context: {
    stack: string | null;
    rules: string[];
    aiDescription: string | null;
    repositoryUrl: string | null;
    localPath: string | null;
    defaultBranch: string;
    customConfig: Record<string, any>;
    tags: string[];
    ragEnabled: boolean;
    lastIndexedAt: string | null;
    indexedChunks: number;
  };
  currentState: {
    totalTasks: number;
    tasksByStatus: {
      todo: number;
      doing: number;
      blocked: number;
      done: number;
    };
    activeTasks: Array<{
      id: string;
      title: string;
      status: string;
      priority: string;
      dueDate: string | null;
    }>;
    blockedTasks: Array<{
      id: string;
      title: string;
      description: string | null;
    }>;
    upcomingDeadlines: Array<{
      id: string;
      title: string;
      dueDate: string;
    }>;
  };
  relatedKnowledge: Array<{
    id: string;
    title: string;
    type: string;
    relevance: number;
  }>;
}

export interface UpdateProjectContextDto {
  stack?: string;
  rules?: string[];
  aiDescription?: string;
  repositoryUrl?: string;
  localPath?: string;
  defaultBranch?: string;
  customConfig?: Record<string, any>;
  tags?: string[];
  ragEnabled?: boolean;
}

// Projects API
export const projectsApi = {
  async getAll(clientId?: string): Promise<Project[]> {
    try {
      const client = createApiClient();
      const params = clientId ? { clientId } : {};
      const response = await client.get<Project[]>("/projects", { params });
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  async getOne(id: string): Promise<Project> {
    try {
      const client = createApiClient();
      const response = await client.get<Project>(`/projects/${id}`);
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  /**
   * Get full project context for AI assistants
   * @param identifier - Project ID (UUID) or project name
   */
  async getContext(identifier: string): Promise<ProjectContext> {
    try {
      const client = createApiClient();
      const response = await client.get<ProjectContext>(
        `/projects/context/${encodeURIComponent(identifier)}`,
      );
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  /**
   * Update project context settings
   * @param projectId - Project UUID
   * @param data - Context settings to update
   */
  async updateContext(
    projectId: string,
    data: UpdateProjectContextDto,
  ): Promise<any> {
    try {
      const client = createApiClient();
      const response = await client.patch(
        `/projects/${projectId}/context`,
        data,
      );
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },
};

// Tasks API
export const tasksApi = {
  async getAll(filters?: {
    clientId?: string;
    projectId?: string;
    status?: string;
    priority?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    tasks: Task[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const client = createApiClient();
      const response = await client.get("/tasks", { params: filters });
      const data = response.data;

      if (Array.isArray(data)) {
        return {
          tasks: data,
          total: data.length,
          page: 1,
          limit: data.length,
          totalPages: 1,
        };
      }

      return data;
    } catch (error) {
      handleApiError(error);
    }
  },

  async getBoard(filters?: {
    projectId?: string;
    clientId?: string;
    /** Máximo de tareas completadas (las más recientes). 0 = sin límite. */
    doneLimit?: number;
  }): Promise<BoardData> {
    try {
      const client = createApiClient();
      const response = await client.get<BoardData>("/tasks/board", {
        params: filters,
      });
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  async getByClient(clientId: string): Promise<Task[]> {
    try {
      const client = createApiClient();
      const response = await client.get<Task[]>(`/tasks/client/${clientId}`);
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  async getOne(id: string): Promise<Task> {
    try {
      const client = createApiClient();
      const response = await client.get<Task>(`/tasks/${id}`);
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  async create(data: CreateTaskDto): Promise<Task> {
    try {
      const client = createApiClient();
      const response = await client.post<Task>("/tasks", data);
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  async update(id: string, data: UpdateTaskDto): Promise<Task> {
    try {
      const client = createApiClient();
      const response = await client.patch<Task>(`/tasks/${id}`, data);
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  async delete(id: string): Promise<void> {
    try {
      const client = createApiClient();
      await client.delete(`/tasks/${id}`);
    } catch (error) {
      handleApiError(error);
    }
  },

  async move(id: string, status: string, position: number): Promise<Task> {
    try {
      const client = createApiClient();
      const response = await client.patch<Task>(`/tasks/${id}/move`, {
        status,
        position,
      });
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },
};

// Knowledge types
export type KnowledgeType =
  | "snippet"
  | "flow"
  | "decision"
  | "pattern"
  | "solution"
  | "reference"
  | "other";

export interface Knowledge {
  id: string;
  title: string;
  content: string;
  type: KnowledgeType;
  summary?: string;
  language?: string;
  sourceUrl?: string;
  clientId?: string;
  projectId?: string;
  isPublic: boolean;
  isArchived: boolean;
  usageCount: number;
  tags?: Array<{ id: string; name: string; color: string }>;
  client?: Client;
  project?: Project;
  createdAt: string;
  updatedAt: string;
}

export interface CreateKnowledgeDto {
  title: string;
  content: string;
  type?: KnowledgeType;
  summary?: string;
  language?: string;
  sourceUrl?: string;
  clientId?: string;
  projectId?: string;
  tags?: string[];
  isPublic?: boolean;
}

export interface UpdateKnowledgeDto {
  title?: string;
  content?: string;
  type?: KnowledgeType;
  summary?: string;
  language?: string;
  sourceUrl?: string;
  clientId?: string;
  projectId?: string;
  tags?: string[];
  isPublic?: boolean;
  isArchived?: boolean;
}

export interface KnowledgeSearchResult {
  id: string;
  title: string;
  summary: string;
  type: KnowledgeType;
  language?: string;
  relevance: number;
  tags: string[];
  projectName?: string;
  clientName?: string;
}

// Knowledge API
export const knowledgeApi = {
  async create(data: CreateKnowledgeDto): Promise<Knowledge> {
    try {
      const client = createApiClient();
      const response = await client.post<Knowledge>("/knowledge", data);
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  async getAll(filters?: {
    type?: KnowledgeType;
    clientId?: string;
    projectId?: string;
    tag?: string;
    includeArchived?: boolean;
    limit?: number;
  }): Promise<Knowledge[]> {
    try {
      const client = createApiClient();
      const response = await client.get<Knowledge[]>("/knowledge", {
        params: filters,
      });
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  async getOne(id: string): Promise<Knowledge> {
    try {
      const client = createApiClient();
      const response = await client.get<Knowledge>(`/knowledge/${id}`);
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  async update(id: string, data: UpdateKnowledgeDto): Promise<Knowledge> {
    try {
      const client = createApiClient();
      const response = await client.patch<Knowledge>(`/knowledge/${id}`, data);
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  async delete(id: string): Promise<void> {
    try {
      const client = createApiClient();
      await client.delete(`/knowledge/${id}`);
    } catch (error) {
      handleApiError(error);
    }
  },

  async search(params: {
    query: string;
    type?: KnowledgeType;
    projectId?: string;
    clientId?: string;
    limit?: number;
  }): Promise<KnowledgeSearchResult[]> {
    try {
      const client = createApiClient();
      const response = await client.get<KnowledgeSearchResult[]>(
        "/knowledge/search",
        { params },
      );
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  async getByProject(
    projectId: string,
    limit?: number,
  ): Promise<KnowledgeSearchResult[]> {
    try {
      const client = createApiClient();
      const response = await client.get<KnowledgeSearchResult[]>(
        `/knowledge/project/${projectId}`,
        { params: { limit } },
      );
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  async getTags(): Promise<
    Array<{ id: string; name: string; color: string; usageCount: number }>
  > {
    try {
      const client = createApiClient();
      const response = await client.get("/knowledge/tags");
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },
};

// RAG types
export interface IndexProjectDto {
  projectId: string;
  repoPath?: string;
  forceReindex?: boolean;
}

export interface SearchCodeDto {
  query: string;
  projectId?: string;
  fileType?: string;
  limit?: number;
  useSemanticSearch?: boolean;
}

export interface CodeSearchResult {
  id: string;
  projectId: string;
  projectName?: string;
  filePath: string;
  fileName: string;
  fileType: string;
  content: string;
  startLine: number;
  endLine: number;
  relevance: number;
  matchType: "semantic" | "text";
}

export interface IndexStatus {
  projectId: string;
  projectName: string;
  isIndexed: boolean;
  totalChunks: number;
  totalFiles: number;
  lastIndexedAt: string | null;
  indexingInProgress: boolean;
}

export interface IndexProgress {
  projectId: string;
  status:
    | "scanning"
    | "chunking"
    | "embedding"
    | "storing"
    | "complete"
    | "error";
  progress: number;
  currentFile?: string;
  filesProcessed: number;
  totalFiles: number;
  chunksCreated: number;
  error?: string;
}

// Upload chunks types (for remote indexing)
export interface CodeChunkUpload {
  filePath: string;
  fileName: string;
  fileType: string;
  content: string;
  startLine: number;
  endLine: number;
  chunkIndex: number;
  totalChunks: number;
  fileHash: string;
  features: string[];
}

export interface UploadChunksDto {
  projectId: string;
  chunks: CodeChunkUpload[];
  forceReindex?: boolean;
  batchNumber?: number;
  totalBatches?: number;
}

export interface UploadChunksResponse {
  success: boolean;
  chunksReceived: number;
  chunksStored: number;
  embeddingsGenerated: number;
  batchNumber: number;
  totalBatches: number;
  isComplete: boolean;
  error?: string;
}

// RAG API
export const ragApi = {
  async indexProject(data: IndexProjectDto): Promise<IndexProgress> {
    try {
      const client = createApiClient();
      const response = await client.post<IndexProgress>("/rag/index", data);
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  async searchCode(params: SearchCodeDto): Promise<CodeSearchResult[]> {
    try {
      const client = createApiClient();
      const response = await client.get<CodeSearchResult[]>("/rag/search", {
        params,
      });
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  async getStatus(projectId: string): Promise<IndexStatus> {
    try {
      const client = createApiClient();
      const response = await client.get<IndexStatus>(
        `/rag/status/${projectId}`,
      );
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  async getProgress(projectId: string): Promise<IndexProgress | null> {
    try {
      const client = createApiClient();
      const response = await client.get(`/rag/progress/${projectId}`);
      if (response.data.message) {
        return null;
      }
      return response.data as IndexProgress;
    } catch (error) {
      handleApiError(error);
    }
  },

  async deleteIndex(projectId: string): Promise<void> {
    try {
      const client = createApiClient();
      await client.delete(`/rag/${projectId}`);
    } catch (error) {
      handleApiError(error);
    }
  },

  /**
   * Upload pre-processed chunks from client (for remote indexing)
   * This is the key method that enables indexing local projects to a remote server
   */
  async uploadChunks(data: UploadChunksDto): Promise<UploadChunksResponse> {
    try {
      const client = createApiClient();
      const response = await client.post<UploadChunksResponse>(
        "/rag/chunks",
        data,
      );
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },
};

// Git types
export type CommitType =
  | "feat"
  | "fix"
  | "docs"
  | "style"
  | "refactor"
  | "test"
  | "chore";

export interface RepoStatus {
  branch: string;
  isClean: boolean;
  staged: string[];
  modified: string[];
  untracked: string[];
  ahead: number;
  behind: number;
  lastCommit?: {
    hash: string;
    message: string;
    author: string;
    date: string;
  };
}

export interface BranchInfo {
  name: string;
  current: boolean;
  remote?: string;
  lastCommitHash: string;
  lastCommitMessage: string;
}

export interface CommitMessageResponse {
  message: string;
  type: CommitType;
  scope?: string;
  suggestions: string[];
}

export interface CommitResult {
  success: boolean;
  commitHash: string;
  message: string;
  pushed?: boolean;
  error?: string;
}

export interface ChangelogResponse {
  changelog: string;
  version: string;
  commits: Array<{
    hash: string;
    message: string;
    author: string;
    date: string;
    type?: CommitType;
  }>;
  stats: {
    features: number;
    fixes: number;
    others: number;
  };
}

export interface DocumentationResponse {
  content: string;
  type: string;
  suggestedFilename: string;
}

// Git API
export const gitApi = {
  async getStatus(projectId: string): Promise<RepoStatus> {
    try {
      const client = createApiClient();
      const response = await client.get<RepoStatus>(`/git/status/${projectId}`);
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  async getBranches(projectId: string): Promise<BranchInfo[]> {
    try {
      const client = createApiClient();
      const response = await client.get<BranchInfo[]>(
        `/git/branches/${projectId}`,
      );
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  async getDiff(projectId: string, staged = false): Promise<string> {
    try {
      const client = createApiClient();
      const response = await client.get<string>(`/git/diff/${projectId}`, {
        params: { staged },
      });
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  async generateCommitMessage(data: {
    projectId: string;
    changes?: string;
    taskId?: string;
    type?: CommitType;
  }): Promise<CommitMessageResponse> {
    try {
      const client = createApiClient();
      const response = await client.post<CommitMessageResponse>(
        "/git/commit/generate-message",
        data,
      );
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  async createCommit(data: {
    projectId: string;
    message: string;
    files?: string[];
    push?: boolean;
  }): Promise<CommitResult> {
    try {
      const client = createApiClient();
      const response = await client.post<CommitResult>("/git/commit", data);
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  async generateChangelog(data: {
    projectId: string;
    from?: string;
    to?: string;
    version?: string;
  }): Promise<ChangelogResponse> {
    try {
      const client = createApiClient();
      const response = await client.post<ChangelogResponse>(
        "/git/changelog/generate",
        data,
      );
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  async updateChangelog(data: {
    projectId: string;
    content: string;
    filePath?: string;
  }): Promise<{ success: boolean; path: string }> {
    try {
      const client = createApiClient();
      const response = await client.post("/git/changelog/update", data);
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  async generateDocumentation(data: {
    projectId: string;
    type: "readme" | "api" | "setup" | "contributing";
    context?: string;
  }): Promise<DocumentationResponse> {
    try {
      const client = createApiClient();
      const response = await client.post<DocumentationResponse>(
        "/git/docs/generate",
        data,
      );
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  async saveDocumentation(data: {
    projectId: string;
    content: string;
    filePath: string;
    commit?: boolean;
    commitMessage?: string;
  }): Promise<{ success: boolean; path: string; committed?: boolean }> {
    try {
      const client = createApiClient();
      const response = await client.post("/git/docs/save", data);
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },
};

// Conversation Parser types
export interface ExtractedTask {
  title: string;
  description?: string;
  priority: "low" | "medium" | "high";
  tags?: string[];
  confidence: number;
  sourceText: string;
}

export interface ParseConversationResponse {
  summary: string;
  tasks: ExtractedTask[];
  decisions?: string[];
  pendingQuestions?: string[];
  taskCount: number;
}

export interface CreateTasksFromParserResponse {
  created: Task[];
  failed: string[];
}

// Conversation Parser API
export const parserApi = {
  async parseConversation(data: {
    conversation: string;
    clientId?: string;
    projectId?: string;
    context?: string;
  }): Promise<ParseConversationResponse> {
    try {
      const client = createApiClient();
      const response = await client.post<ParseConversationResponse>(
        "/ai/parse-conversation",
        data,
      );
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  async createTasksFromParser(data: {
    clientId: string;
    projectId?: string;
    tasks: ExtractedTask[];
  }): Promise<CreateTasksFromParserResponse> {
    try {
      const client = createApiClient();
      const response = await client.post<CreateTasksFromParserResponse>(
        "/ai/create-tasks-from-parser",
        data,
      );
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },
};

// Spaces API
export const spacesApi = {
  async getAll(includeArchived = false): Promise<Space[]> {
    try {
      const client = createApiClient();
      const response = await client.get<{ spaces: Space[] }>("/spaces", {
        params: { includeArchived: includeArchived ? "true" : "false" },
      });
      return response.data.spaces;
    } catch (error) {
      handleApiError(error);
    }
  },

  async getOne(id: string): Promise<Space> {
    try {
      const client = createApiClient();
      const response = await client.get<{ space: Space }>(`/spaces/${id}`);
      return response.data.space;
    } catch (error) {
      handleApiError(error);
    }
  },

  async create(data: CreateSpaceDto): Promise<Space> {
    try {
      const client = createApiClient();
      const response = await client.post<{ space: Space }>("/spaces", data);
      return response.data.space;
    } catch (error) {
      handleApiError(error);
    }
  },

  async update(id: string, data: UpdateSpaceDto): Promise<Space> {
    try {
      const client = createApiClient();
      const response = await client.patch<{ space: Space }>(
        `/spaces/${id}`,
        data,
      );
      return response.data.space;
    } catch (error) {
      handleApiError(error);
    }
  },

  async delete(id: string): Promise<void> {
    try {
      const client = createApiClient();
      await client.delete(`/spaces/${id}`);
    } catch (error) {
      handleApiError(error);
    }
  },

  async archive(id: string): Promise<Space> {
    try {
      const client = createApiClient();
      const response = await client.patch<{ space: Space }>(
        `/spaces/${id}/archive`,
      );
      return response.data.space;
    } catch (error) {
      handleApiError(error);
    }
  },

  async unarchive(id: string): Promise<Space> {
    try {
      const client = createApiClient();
      const response = await client.patch<{ space: Space }>(
        `/spaces/${id}/unarchive`,
      );
      return response.data.space;
    } catch (error) {
      handleApiError(error);
    }
  },

  async getStats(id: string): Promise<SpaceStats> {
    try {
      const client = createApiClient();
      const response = await client.get<SpaceStats>(`/spaces/${id}/stats`);
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  async createDefaults(): Promise<Space[]> {
    try {
      const client = createApiClient();
      const response = await client.post<{ spaces: Space[] }>(
        "/spaces/defaults",
      );
      return response.data.spaces;
    } catch (error) {
      handleApiError(error);
    }
  },

  async reorder(spaceIds: string[]): Promise<Space[]> {
    try {
      const client = createApiClient();
      const response = await client.patch<{ spaces: Space[] }>(
        "/spaces/reorder",
        {
          spaceIds,
        },
      );
      return response.data.spaces;
    } catch (error) {
      handleApiError(error);
    }
  },
};
