import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, ILike, IsNull } from "typeorm";
import { randomBytes } from "crypto";
import { Project, ProjectStatus } from "./entities/project.entity";
import { ProjectContext } from "./entities/project-context.entity";
import { ProjectNote } from "./entities/project-note.entity";
import {
  CreateProjectDto,
  UpdateProjectDto,
  ProjectFilterDto,
} from "./dto/project.dto";
import {
  CreateProjectContextDto,
  UpdateProjectContextDto,
  FullProjectContextResponseDto,
} from "./dto/project-context.dto";
import { UpdateProjectNoteDto } from "./dto/project-note.dto";

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(ProjectContext)
    private readonly contextRepository: Repository<ProjectContext>,
    @InjectRepository(ProjectNote)
    private readonly noteRepository: Repository<ProjectNote>,
  ) {}

  async create(createProjectDto: CreateProjectDto): Promise<Project> {
    // Auto-generate project code if not provided
    if (!createProjectDto.code) {
      createProjectDto.code = await this.generateProjectCode(
        createProjectDto.name,
        createProjectDto.spaceId,
      );
    } else {
      createProjectDto.code = createProjectDto.code.toUpperCase();
      const existing = await this.projectRepository.findOne({
        where: {
          code: createProjectDto.code,
          spaceId: createProjectDto.spaceId || IsNull(),
        },
      });
      if (existing) {
        throw new ConflictException(
          `Project code "${createProjectDto.code}" already exists in this space`,
        );
      }
    }

    // Obtener la posición máxima actual para el cliente
    const maxPosition = await this.projectRepository
      .createQueryBuilder("project")
      .select("MAX(project.position)", "max")
      .where("project.clientId = :clientId", {
        clientId: createProjectDto.clientId,
      })
      .getRawOne();

    const project = this.projectRepository.create({
      ...createProjectDto,
      position: createProjectDto.position ?? (maxPosition?.max ?? -1) + 1,
    });

    return this.projectRepository.save(project);
  }

  private async generateProjectCode(
    name: string,
    spaceId?: string,
  ): Promise<string> {
    const words = name
      .replace(/[^a-zA-Z0-9 ]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 0);

    let baseCode: string;
    if (words.length >= 2) {
      baseCode = words
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .substring(0, 5);
    } else {
      baseCode = name
        .replace(/[^a-zA-Z]/g, "")
        .substring(0, 3)
        .toUpperCase();
    }

    if (baseCode.length < 2) baseCode = "PR";

    let finalCode = baseCode;
    let counter = 0;
    while (true) {
      const existing = await this.projectRepository.findOne({
        where: { code: finalCode, spaceId: spaceId || IsNull() },
      });
      if (!existing) break;
      counter++;
      finalCode = baseCode + counter;
    }

    return finalCode;
  }

  /**
   * Listado de proyectos. NO trae `tasks` ni `tasks.subtasks` a propósito.
   *
   * Hasta 2026-09 hacía `leftJoinAndSelect` de ambas relaciones, así que una sola
   * llamada devolvía el producto cartesiano de todas las tareas y subtareas de todos
   * los proyectos: ~1,5 MB y 78-166 s contra producción. Ningún consumidor usaba esos
   * datos — el frontend cuenta tareas por proyecto con su propia query y el MCP
   * `list_projects` solo lee id/name/status/color/clientId. El costo real era que
   * superaba el timeout de los clientes MCP, y los agentes concluían que el servidor
   * estaba caído.
   *
   * Si necesitás las tareas de UN proyecto, usá `findOne()` o `GET /tasks?projectId=`.
   */
  async findAll(filters?: ProjectFilterDto): Promise<Project[]> {
    const query = this.projectRepository
      .createQueryBuilder("project")
      .leftJoinAndSelect("project.client", "client")
      .orderBy("project.position", "ASC");

    if (filters?.spaceId) {
      query.andWhere("project.spaceId = :spaceId", {
        spaceId: filters.spaceId,
      });
    }

    if (filters?.clientId) {
      query.andWhere("project.clientId = :clientId", {
        clientId: filters.clientId,
      });
    }

    if (filters?.status) {
      query.andWhere("project.status = :status", { status: filters.status });
    }

    if (filters?.domain) {
      query.andWhere("project.domain = :domain", { domain: filters.domain });
    }

    return query.getMany();
  }

  async findOne(id: string): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { id },
      relations: ["client", "tasks", "tasks.subtasks"],
    });

    if (!project) {
      throw new NotFoundException(`Proyecto con ID ${id} no encontrado`);
    }

    return project;
  }

  /** Mismo criterio que `findAll`: sin `tasks`/`tasks.subtasks`, que nadie consumía. */
  async findByClient(clientId: string): Promise<Project[]> {
    return this.projectRepository.find({
      where: { clientId },
      order: { position: "ASC" },
    });
  }

  async update(
    id: string,
    updateProjectDto: UpdateProjectDto,
  ): Promise<Project> {
    const project = await this.findOne(id);
    Object.assign(project, updateProjectDto);
    return this.projectRepository.save(project);
  }

  async remove(id: string): Promise<void> {
    const project = await this.findOne(id);
    await this.projectRepository.remove(project);
  }

  async getProjectStats(id: string): Promise<{
    totalTasks: number;
    completedTasks: number;
    progress: number;
  }> {
    const project = await this.findOne(id);
    const totalTasks = project.tasks?.length || 0;
    const completedTasks =
      project.tasks?.filter((t) => t.status === "done").length || 0;
    const progress =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return { totalTasks, completedTasks, progress };
  }

  // ==================== PROJECT CONTEXT METHODS ====================

  /**
   * Find a project by ID or name (for MCP tool flexibility)
   */
  async findByIdOrName(identifier: string): Promise<Project> {
    // First try to find by UUID
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (uuidRegex.test(identifier)) {
      const project = await this.projectRepository.findOne({
        where: { id: identifier },
        relations: ["client", "tasks", "tasks.subtasks"],
      });
      if (project) return project;
    }

    // Then try to find by name (case-insensitive)
    const project = await this.projectRepository.findOne({
      where: { name: ILike(identifier) },
      relations: ["client", "tasks", "tasks.subtasks"],
    });

    if (!project) {
      throw new NotFoundException(
        `Proyecto no encontrado: "${identifier}". Puedes usar el ID o el nombre del proyecto.`,
      );
    }

    return project;
  }

  /**
   * Get or create project context
   */
  async getOrCreateContext(projectId: string): Promise<ProjectContext> {
    let context = await this.contextRepository.findOne({
      where: { projectId },
    });

    if (!context) {
      context = this.contextRepository.create({
        projectId,
        rules: [],
        customConfig: {},
        tags: [],
        ragEnabled: false,
        indexedChunks: 0,
      });
      context = await this.contextRepository.save(context);
    }

    return context;
  }

  /**
   * Update project context
   */
  async updateContext(
    projectId: string,
    updateDto: UpdateProjectContextDto,
  ): Promise<ProjectContext> {
    // Verify project exists
    await this.findOne(projectId);

    const context = await this.getOrCreateContext(projectId);
    Object.assign(context, updateDto);
    return this.contextRepository.save(context);
  }

  /**
   * Get full project context for AI assistants
   * This is the main method used by the MCP get_context tool
   */
  async getFullContext(
    identifier: string,
  ): Promise<FullProjectContextResponseDto> {
    const project = await this.findByIdOrName(identifier);
    const context = await this.getOrCreateContext(project.id);

    // Calculate task statistics
    const tasks = project.tasks || [];
    const tasksByStatus = {
      todo: tasks.filter((t) => t.status === "todo").length,
      doing: tasks.filter((t) => t.status === "doing").length,
      blocked: tasks.filter((t) => t.status === "blocked").length,
      done: tasks.filter((t) => t.status === "done").length,
    };

    // Get active tasks (todo + doing)
    const activeTasksFiltered = tasks.filter(
      (t) => t.status === "todo" || t.status === "doing",
    );
    const activeTasksTotal = activeTasksFiltered.length;
    const activeTasks = activeTasksFiltered
      .sort((a, b) => {
        // Sort by priority (high first), then by due date
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        const priorityDiff =
          priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        if (a.dueDate && b.dueDate) {
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        return a.dueDate ? -1 : 1;
      })
      // Tope de resumen, no el listado completo (ver CBK-69 para filtros/orden reales);
      // activeTasksTotal le dice al frontend cuántas quedan fuera de este resumen.
      .slice(0, 20)
      .map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate,
      }));

    // Get blocked tasks
    const blockedTasks = tasks
      .filter((t) => t.status === "blocked")
      .map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
      }));

    // Get upcoming deadlines (next 7 days)
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const upcomingDeadlines = tasks
      .filter((t) => {
        if (!t.dueDate || t.status === "done") return false;
        const dueDate = new Date(t.dueDate);
        return dueDate >= now && dueDate <= nextWeek;
      })
      .sort(
        (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
      )
      .map((t) => ({
        id: t.id,
        title: t.title,
        dueDate: t.dueDate,
      }));

    return {
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        color: project.color,
        dueDate: project.dueDate,
        budget: project.budget,
      },
      client: {
        id: project.client?.id,
        name: project.client?.name,
        company: project.client?.company,
        email: project.client?.email,
      },
      context: {
        stack: context.stack,
        rules: context.rules || [],
        aiDescription: context.aiDescription,
        repositoryUrl: context.repositoryUrl,
        localPath: context.localPath,
        defaultBranch: context.defaultBranch || "main",
        customConfig: context.customConfig || {},
        tags: context.tags || [],
        ragEnabled: context.ragEnabled,
        lastIndexedAt: context.lastIndexedAt,
        indexedChunks: context.indexedChunks,
      },
      currentState: {
        totalTasks: tasks.length,
        tasksByStatus,
        activeTasks,
        activeTasksTotal,
        blockedTasks,
        upcomingDeadlines,
      },
      // relatedKnowledge will be populated when Knowledge module is implemented
      relatedKnowledge: [],
    };
  }

  // ==================== PROJECT NOTE METHODS ====================

  /**
   * Get or create the project's scratchpad note
   */
  async getOrCreateNote(projectId: string): Promise<ProjectNote> {
    let note = await this.noteRepository.findOne({ where: { projectId } });

    if (!note) {
      note = this.noteRepository.create({ projectId, content: "" });
      note = await this.noteRepository.save(note);
    }

    return note;
  }

  /**
   * Update the project's scratchpad note content
   */
  async updateNote(
    projectId: string,
    updateDto: UpdateProjectNoteDto,
  ): Promise<ProjectNote> {
    // Verify project exists
    await this.findOne(projectId);

    const note = await this.getOrCreateNote(projectId);
    note.content = updateDto.content;
    return this.noteRepository.save(note);
  }

  /**
   * Mark the project note as analyzed by AI just now
   */
  async markNoteAnalyzed(projectId: string): Promise<void> {
    await this.noteRepository.update({ projectId }, { lastAnalyzedAt: new Date() });
  }

  // ==================== PUBLIC SHARING ====================

  /**
   * Read-only lookup backing the /public/* endpoints.
   * Returns null for an unknown token or a project whose sharing is off, so
   * callers can answer 404 without revealing which of the two it was.
   */
  async findByShareToken(token: string): Promise<Project | null> {
    if (!token) return null;

    return this.projectRepository.findOne({
      where: { publicShareToken: token, publicSharingEnabled: true },
      relations: ["client"],
    });
  }

  async getShareSettings(id: string): Promise<{
    enabled: boolean;
    token: string | null;
  }> {
    const project = await this.findShareableOrFail(id);
    return {
      enabled: project.publicSharingEnabled,
      token: project.publicShareToken ?? null,
    };
  }

  /**
   * Issue a fresh token, invalidating any link already handed to a client.
   */
  async regenerateShareToken(id: string): Promise<{
    enabled: boolean;
    token: string;
  }> {
    const project = await this.findShareableOrFail(id);
    const token = randomBytes(32).toString("hex");
    await this.projectRepository.update(id, { publicShareToken: token });

    return { enabled: project.publicSharingEnabled, token };
  }

  /**
   * Enabling sharing on a project that never had a token mints one here, so the
   * caller always gets back a usable link.
   */
  async setSharingEnabled(
    id: string,
    enabled: boolean,
  ): Promise<{ enabled: boolean; token: string | null }> {
    const project = await this.findShareableOrFail(id);
    const token =
      enabled && !project.publicShareToken
        ? randomBytes(32).toString("hex")
        : project.publicShareToken;

    await this.projectRepository.update(id, {
      publicSharingEnabled: enabled,
      publicShareToken: token,
    });

    return { enabled, token: token ?? null };
  }

  /** Loads a project without the heavy task relations findOne() pulls in. */
  private async findShareableOrFail(id: string): Promise<Project> {
    const project = await this.projectRepository.findOne({ where: { id } });
    if (!project) {
      throw new NotFoundException(`Proyecto con ID ${id} no encontrado`);
    }
    return project;
  }
}
