// Enums
export enum SpaceType {
  PERSONAL = "personal",
  WORK = "work",
}

export enum ProjectDomain {
  WORK = "work",
  AUTO = "auto",
  HEALTH = "health",
  HOME = "home",
  FINANCE = "finance",
  PERSONAL = "personal",
}

export enum TaskStatus {
  TODO = "todo",
  DOING = "doing",
  BLOCKED = "blocked",
  DONE = "done",
}

export enum TaskPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
}

export enum TaskType {
  TASK = "task",
  NOTE = "note",
  REMINDER = "reminder",
}

export enum FileType {
  FILE = "file",
  LINK = "link",
}

export enum SnapshotType {
  MANUAL = "manual",
  AUTO = "auto",
}

export enum MessageType {
  REQUEST_INFO = "request_info",
  PROGRESS_UPDATE = "progress_update",
  DELIVERABLE = "deliverable",
  FOLLOW_UP = "follow_up",
  MEETING_REQUEST = "meeting_request",
}

export enum ProjectStatus {
  ACTIVE = "active",
  ON_HOLD = "on_hold",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

// Entities
export interface Space {
  id: string;
  userId: string;
  name: string;
  type: SpaceType;
  description?: string;
  icon?: string;
  color?: string;
  isArchived: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
  clients?: Client[];
  projects?: Project[];
}

export interface Client {
  id: string;
  spaceId?: string;
  space?: Space;
  name: string;
  company?: string;
  email?: string;
  whatsapp?: string;
  phone?: string;
  address?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  tasks?: Task[];
  projects?: Project[];
  worklogs?: Worklog[];
  files?: FileEntity[];
}

export interface Subtask {
  id: string;
  taskId: string;
  title: string;
  completed: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  clientId?: string;
  client?: Client;
  spaceId?: string;
  space?: Space;
  name: string;
  code?: string;
  description?: string;
  domain?: ProjectDomain;
  icon?: string;
  status: ProjectStatus;
  color: string;
  dueDate?: string;
  budget?: number;
  metadata?: Record<string, unknown>;
  position: number;
  createdAt: string;
  updatedAt: string;
  tasks?: Task[];
}

export interface Task {
  id: string;
  clientId: string;
  projectId?: string;
  client?: Client;
  project?: Project;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  type?: TaskType;
  dueDate?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  position: number;
  taskNumber?: number;
  taskCode?: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  worklogs?: Worklog[];
  files?: FileEntity[];
  subtasks?: Subtask[];
}

export interface Worklog {
  id: string;
  clientId: string;
  taskId?: string;
  client?: Client;
  task?: Task;
  loggedAt: string;
  durationMinutes?: number;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface FileEntity {
  id: string;
  clientId: string;
  taskId?: string;
  client?: Client;
  task?: Task;
  type: FileType;
  url: string;
  title: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SnapshotPayload {
  columns: {
    id: string;
    name: string;
    taskIds: string[];
  }[];
  tasks: Record<
    string,
    {
      id: string;
      clientId: string;
      clientName: string;
      title: string;
      description: string | null;
      status: string;
      priority: string;
      dueDate: string | null;
      tags: string[] | null;
      position: number;
    }
  >;
  metadata: {
    totalTasks: number;
    tasksByStatus: Record<string, number>;
    clientsWithTasks: string[];
  };
}

export interface Snapshot {
  id: string;
  name: string;
  capturedAt: string;
  type: SnapshotType;
  payload?: SnapshotPayload;
  createdAt: string;
}

// DTOs
export interface CreateClientDto {
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  metadata?: Record<string, unknown>;
  notes?: string;
}

export interface CreateTaskDto {
  clientId?: string; // Optional for personal space
  projectId?: string; // Required for personal space (area)
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  type?: TaskType;
  dueDate?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  position?: number;
  isArchived?: boolean;
}

export interface MoveTaskDto {
  status: TaskStatus;
  position: number;
}

export interface CreateWorklogDto {
  clientId: string;
  taskId?: string;
  loggedAt: string;
  durationMinutes?: number;
  note: string;
}

export interface CreateFileDto {
  clientId: string;
  taskId?: string;
  type: FileType;
  url: string;
  title: string;
  description?: string;
}

export interface CreateSnapshotDto {
  name?: string;
}

// AI DTOs
export interface ClientSummaryResponse {
  clientId: string;
  clientName: string;
  summary: string;
  priorities: string[];
  nextSteps: string[];
  stats: {
    openTasks: number;
    completedRecently: number;
    hoursLoggedThisWeek: number;
  };
}

export interface TodayPlanResponse {
  plan: string;
  suggestedTasks: {
    taskId: string;
    taskTitle: string;
    clientName: string;
    estimatedMinutes: number;
    reason: string;
  }[];
  totalEstimatedMinutes: number;
}

export interface WriteMessageResponse {
  message: string;
  suggestions: string[];
  messageType: MessageType;
}

// Project Note (scratchpad) + AI task extraction
export interface ProjectNote {
  id: string;
  projectId: string;
  content: string;
  lastAnalyzedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExtractedTask {
  title: string;
  description?: string;
  priority: "low" | "medium" | "high";
  tags?: string[];
  confidence: number;
  sourceText: string;
}

export interface AnalyzeNotesResponse {
  summary: string;
  tasks: ExtractedTask[];
  decisions?: string[];
  pendingQuestions?: string[];
  taskCount: number;
}

export interface CreateTasksFromParserDto {
  clientId?: string;
  projectId?: string;
  tasks: ExtractedTask[];
}

export interface RefineProjectNotesDto {
  projectId: string;
  previousTasks: ExtractedTask[];
  previousSummary?: string;
  feedback: string;
}

export interface CreateTasksFromParserResponse {
  created: Task[];
  failed: string[];
}

// Space DTOs
export interface CreateSpaceDto {
  name: string;
  type: SpaceType;
  description?: string;
  icon?: string;
  color?: string;
  isDefault?: boolean;
}

export interface UpdateSpaceDto {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  isDefault?: boolean;
  isArchived?: boolean;
  position?: number;
}

export interface SpaceStats {
  totalClients: number;
  totalProjects: number;
  totalTasks: number;
  tasksByStatus: Record<string, number>;
  tasksByPriority: Record<string, number>;
}

// Subtask DTOs
export interface CreateSubtaskDto {
  taskId: string;
  title: string;
  completed?: boolean;
  position?: number;
}

export interface UpdateSubtaskDto {
  title?: string;
  completed?: boolean;
  position?: number;
}

// Project DTOs
export interface CreateProjectDto {
  clientId?: string;
  spaceId?: string;
  name: string;
  description?: string;
  domain?: ProjectDomain;
  status?: ProjectStatus;
  color?: string;
  dueDate?: string;
  budget?: number;
  position?: number;
}

export interface UpdateProjectDto {
  name?: string;
  description?: string;
  domain?: ProjectDomain;
  status?: ProjectStatus;
  color?: string;
  dueDate?: string;
  budget?: number;
  position?: number;
}

// Board types
export interface BoardColumnLegacy {
  id: TaskStatus;
  name: string;
  tasks: Task[];
}

// Custom Board Columns (from backend)
export interface CustomBoardColumn {
  id: string;
  userId: string;
  name: string;
  key: string;
  color: string;
  position: number;
  isHidden: boolean;
  isSystem: boolean;
  icon?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBoardColumnDto {
  name: string;
  key?: string;
  color?: string;
  icon?: string;
  position?: number;
}

export interface UpdateBoardColumnDto {
  name?: string;
  color?: string;
  icon?: string;
  position?: number;
  isHidden?: boolean;
}

export type BoardData = Record<string, Task[]>;

// ============================================================================
// PUBLIC SHARING TYPES
// ============================================================================

/** State of a project's read-only client-facing link */
export interface ProjectSharing {
  enabled: boolean;
  token: string | null;
}

/**
 * Trimmed project shape returned by /public/*.
 * Internal fields (budget, metadata, ids) are withheld by the backend.
 */
export interface PublicProject {
  name: string;
  description?: string;
  status: ProjectStatus;
  color?: string;
  icon?: string;
  dueDate?: string;
  client?: { name: string } | null;
}

// ============================================================================
// KNOWLEDGE BASE TYPES
// ============================================================================

export enum KnowledgeType {
  SNIPPET = "snippet",
  FLOW = "flow",
  DECISION = "decision",
  PATTERN = "pattern",
  SOLUTION = "solution",
  REFERENCE = "reference",
  OTHER = "other",
}

// Tag can come as string or object from backend depending on the endpoint
export type KnowledgeTag =
  | string
  | {
      id: string;
      name: string;
      color: string;
      description?: string;
      usageCount: number;
      createdAt: string;
    };

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
  client?: Client;
  project?: Project;
  tags: KnowledgeTag[];
  isPublic: boolean;
  isArchived: boolean;
  usageCount: number;
  lastAccessedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeSearchResult {
  id: string;
  title: string;
  summary?: string;
  type: KnowledgeType;
  language?: string;
  relevance: number;
  tags: string[];
  projectName?: string;
  clientName?: string;
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

export interface KnowledgeFilterDto {
  type?: KnowledgeType;
  clientId?: string;
  projectId?: string;
  tag?: string;
  includeArchived?: boolean;
  limit?: number;
  offset?: number;
}

export interface SearchKnowledgeDto {
  query: string;
  type?: KnowledgeType;
  projectId?: string;
  clientId?: string;
  limit?: number;
}

// ============================================================================
// PROJECT CONTEXT & RAG TYPES
// ============================================================================

export interface ProjectContext {
  stack?: string;
  rules: string[];
  aiDescription?: string;
  repositoryUrl?: string;
  localPath?: string;
  defaultBranch: string;
  customConfig: Record<string, unknown>;
  tags: string[];
  ragEnabled: boolean;
  lastIndexedAt?: string;
  indexedChunks: number;
}

export interface ProjectWithContext extends Project {
  context?: ProjectContext;
}

export interface ProjectContextResponse {
  success: boolean;
  message: string;
  project: Project;
  client: Client;
  context: ProjectContext;
  currentState: {
    totalTasks: number;
    tasksByStatus: Record<string, number>;
    // Opcionales: no los calcula el fallback local (ver projects/[id]/page.tsx),
    // solo el endpoint de contexto para IA. El widget de tareas activas ya no
    // depende de estos campos (tiene su propia query con filtro/orden propio).
    activeTasks?: Task[];
    activeTasksTotal?: number;
    blockedTasks: Task[];
    upcomingDeadlines: Task[];
  };
  relatedKnowledge: Knowledge[];
}

export interface RagIndexStatus {
  projectId: string;
  projectName: string;
  isIndexed: boolean;
  totalChunks: number;
  totalFiles: number;
  lastIndexedAt?: string;
  indexingInProgress: boolean;
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

// ============================================================================
// TRIGGERS & NOTIFICATIONS TYPES
// ============================================================================

export enum TriggerType {
  TIME = "time",
  RECURRING = "recurring",
  CONDITION = "condition",
}

export enum TriggerAction {
  NOTIFY = "notify",
  CREATE_TASK = "create_task",
}

export enum NotificationType {
  TRIGGER = "trigger",
  SYSTEM = "system",
}

export interface Trigger {
  id: string;
  userId: string;
  name: string;
  type: TriggerType;
  taskId?: string;
  task?: Task;
  condition: Record<string, unknown>;
  action: TriggerAction;
  actionConfig: Record<string, unknown>;
  isActive: boolean;
  lastTriggeredAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message?: string;
  type: NotificationType;
  isRead: boolean;
  triggerId?: string;
  taskId?: string;
  task?: Task;
  createdAt: string;
}

export interface CreateTriggerDto {
  name: string;
  type?: TriggerType;
  taskId?: string;
  condition: Record<string, unknown>;
  action?: TriggerAction;
  actionConfig?: Record<string, unknown>;
  isActive?: boolean;
}

export interface UpdateTriggerDto {
  name?: string;
  type?: TriggerType;
  taskId?: string;
  condition?: Record<string, unknown>;
  action?: TriggerAction;
  actionConfig?: Record<string, unknown>;
  isActive?: boolean;
}
