import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  EntityManager,
  In,
  IsNull,
  Not,
  QueryFailedError,
  Repository,
} from "typeorm";
import { Task, TaskStatus } from "./entities/task.entity";
import {
  CreateTaskDto,
  UpdateTaskDto,
  MoveTaskDto,
  ReorderTasksDto,
  TaskFilterDto,
  BoardFilterDto,
} from "./dto/task.dto";
import { SpaceType } from "../spaces/entities/space.entity";

@Injectable()
export class TasksService {
  private static readonly TASK_NUMBER_RETRY_LIMIT = 3;

  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
  ) {}

  private isTaskNumberConflict(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) {
      return false;
    }

    const driverError = error.driverError as
      | { code?: string; constraint?: string }
      | undefined;

    return (
      driverError?.code === "23505" &&
      driverError?.constraint === "uq_tasks_project_task_number"
    );
  }

  private async getNextProjectTaskNumber(
    manager: EntityManager,
    projectId: string,
  ): Promise<number> {
    const result = await manager.query(
      `UPDATE projects
       SET next_task_number = GREATEST(
         next_task_number,
         COALESCE((SELECT MAX(task_number) + 1 FROM tasks WHERE project_id = $1), 1)
       ) + 1
       WHERE id = $1
       RETURNING next_task_number - 1 AS current_number`,
      [projectId],
    );

    if (!result?.length) {
      throw new NotFoundException(`Proyecto con ID ${projectId} no encontrado`);
    }

    const rawCurrentNumber =
      result[0]?.current_number ??
      result[0]?.currentNumber ??
      Object.values(result[0] ?? {})[0];

    const parsedCurrentNumber = Number.parseInt(
      String(rawCurrentNumber),
      10,
    );

    if (Number.isInteger(parsedCurrentNumber) && parsedCurrentNumber > 0) {
      return parsedCurrentNumber;
    }

    // Fallback defensivo para entornos con retorno inesperado del driver
    const fallback = await manager.query(
      `SELECT COALESCE(MAX(task_number) + 1, 1) AS next_number
       FROM tasks
       WHERE project_id = $1`,
      [projectId],
    );

    const fallbackNumber = Number.parseInt(
      String(
        fallback?.[0]?.next_number ??
          fallback?.[0]?.nextNumber ??
          Object.values(fallback?.[0] ?? {})[0],
      ),
      10,
    );

    if (!Number.isInteger(fallbackNumber) || fallbackNumber <= 0) {
      throw new ConflictException(
        "No se pudo determinar un número de tarea válido para el proyecto.",
      );
    }

    // Re-sincroniza contador para próximos inserts
    await manager.query(
      `UPDATE projects
       SET next_task_number = GREATEST(next_task_number, $2)
       WHERE id = $1`,
      [projectId, fallbackNumber + 1],
    );

    return fallbackNumber;
  }

  private async getNextGlobalTaskNumber(manager: EntityManager): Promise<number> {
    const result = await manager.query(
      "SELECT nextval('global_task_number_seq') AS num",
    );

    const parsedNumber = Number.parseInt(
      String(result?.[0]?.num ?? Object.values(result?.[0] ?? {})[0]),
      10,
    );

    if (Number.isInteger(parsedNumber) && parsedNumber > 0) {
      return parsedNumber;
    }

    const fallback = await manager.query(
      `SELECT COALESCE(MAX(task_number) + 1, 1) AS next_number
       FROM tasks
       WHERE project_id IS NULL`,
    );

    const fallbackNumber = Number.parseInt(
      String(
        fallback?.[0]?.next_number ??
          fallback?.[0]?.nextNumber ??
          Object.values(fallback?.[0] ?? {})[0],
      ),
      10,
    );

    if (!Number.isInteger(fallbackNumber) || fallbackNumber <= 0) {
      throw new ConflictException(
        "No se pudo determinar un número global de tarea válido.",
      );
    }

    return fallbackNumber;
  }

  /** Attach computed taskCode to a single task */
  private attachTaskCode(task: Task): Task {
    if (task.project?.code && task.taskNumber != null) {
      task.taskCode = `${task.project.code}-${task.taskNumber}`;
    } else if (task.taskNumber != null) {
      task.taskCode = `#${task.taskNumber}`;
    }
    return task;
  }

  /** Attach computed taskCode to multiple tasks */
  private attachTaskCodes(tasks: Task[]): Task[] {
    return tasks.map((t) => this.attachTaskCode(t));
  }

  async create(createTaskDto: CreateTaskDto): Promise<Task> {
    const maxAttempts = createTaskDto.projectId
      ? TasksService.TASK_NUMBER_RETRY_LIMIT
      : 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await this.taskRepository.manager.transaction(async (manager) => {
          const taskNumber = createTaskDto.projectId
            ? await this.getNextProjectTaskNumber(manager, createTaskDto.projectId)
            : await this.getNextGlobalTaskNumber(manager);

          // Obtener la posición máxima actual en la columna
          const maxPosition = await manager
            .createQueryBuilder(Task, "task")
            .select("MAX(task.position)", "max")
            .where("task.status = :status", {
              status: createTaskDto.status || TaskStatus.TODO,
            })
            .getRawOne();

          const task = manager.create(Task, {
            ...createTaskDto,
            taskNumber,
            position: createTaskDto.position ?? (maxPosition?.max ?? -1) + 1,
          });

          if (!Number.isInteger(task.taskNumber) || task.taskNumber <= 0) {
            throw new ConflictException(
              "No se pudo asignar un número válido a la tarea.",
            );
          }

          const savedTask = await manager.save(Task, task);

          // Devolver la tarea con relaciones cargadas
          const fullTask = await manager.findOne(Task, {
            where: { id: savedTask.id },
            relations: ["client", "project"],
          });

          return this.attachTaskCode(fullTask!);
        });
      } catch (error) {
        const isRetryable =
          this.isTaskNumberConflict(error) && attempt < maxAttempts;
        if (isRetryable) {
          continue;
        }

        if (this.isTaskNumberConflict(error)) {
          throw new ConflictException(
            "No se pudo asignar un número único a la tarea. Intenta nuevamente.",
          );
        }

        throw error;
      }
    }

    throw new ConflictException(
      "No se pudo crear la tarea por conflicto de numeración.",
    );
  }

  async findAll(filters?: TaskFilterDto): Promise<{
    tasks: Task[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      spaceId,
      spaceType,
      clientId,
      projectId,
      status,
      priority,
      type,
      tags,
      search,
      isArchived,
      dateFrom,
      dateTo,
      page = 1,
      limit = 10,
    } = filters || {};

    const query = this.taskRepository
      .createQueryBuilder("task")
      .leftJoinAndSelect("task.client", "client")
      .leftJoinAndSelect("task.project", "project")
      .leftJoinAndSelect("task.subtasks", "subtasks");

    if (isArchived !== undefined) {
      query.andWhere("task.isArchived = :isArchived", { isArchived });
    }

    if (clientId) {
      query.andWhere("task.clientId = :clientId", { clientId });
    }

    if (projectId) {
      query.andWhere("task.projectId = :projectId", { projectId });
    }

    if (status) {
      query.andWhere("task.status = :status", { status });
    }

    if (priority) {
      query.andWhere("task.priority = :priority", { priority });
    }

    if (type) {
      query.andWhere("task.type = :type", { type });
    }

    if (spaceId && spaceType === SpaceType.PERSONAL) {
      query.andWhere("project.spaceId = :spaceId", { spaceId });
    }

    if (spaceId && spaceType === SpaceType.WORK) {
      query.andWhere(
        "((project.spaceId IS NOT NULL AND project.spaceId = :spaceId) OR (project.spaceId IS NULL AND client.spaceId = :spaceId))",
        { spaceId },
      );
    }

    if (tags?.length) {
      query.andWhere("task.tags && :tags", { tags });
    }

    if (search) {
      query.andWhere(
        "(LOWER(task.title) LIKE LOWER(:search) OR LOWER(task.description) LIKE LOWER(:search) OR task.id::text LIKE :searchId)",
        {
          search: `%${search}%`,
          searchId: `%${search}%`,
        },
      );
    }

    if (dateFrom) {
      query.andWhere("task.createdAt >= :dateFrom", { dateFrom });
    }

    if (dateTo) {
      // Fecha sin hora (YYYY-MM-DD) debe abarcar el día completo, no cortar a medianoche.
      const dateToEnd =
        dateTo.length === 10 ? `${dateTo}T23:59:59.999` : dateTo;
      query.andWhere("task.createdAt <= :dateTo", { dateTo: dateToEnd });
    }

    // Ordenar: primero los más recientes por creación
    query
      .orderBy("task.createdAt", "DESC")
      .addOrderBy("subtasks.position", "ASC");

    const skip = (Number(page) - 1) * Number(limit);
    query.skip(skip).take(Number(limit));

    const [tasks, total] = await query.getManyAndCount();

    const currentPage = Number(page);
    const currentLimit = Number(limit);

    return {
      tasks: this.attachTaskCodes(tasks),
      total,
      page: currentPage,
      limit: currentLimit,
      totalPages: Math.ceil(total / currentLimit),
    };
  }

  async findOne(id: string): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: ["client", "project", "worklogs", "files", "subtasks"],
    });

    if (!task) {
      throw new NotFoundException(`Tarea con ID ${id} no encontrada`);
    }

    return this.attachTaskCode(task);
  }

  async findByCode(code: string): Promise<Task> {
    let task: Task | null = null;

    if (code.startsWith("#")) {
      // Global task number (no project)
      const num = parseInt(code.substring(1), 10);
      if (isNaN(num))
        throw new NotFoundException(`Invalid task code: ${code}`);

      task = await this.taskRepository.findOne({
        where: { taskNumber: num, projectId: IsNull() },
        relations: ["client", "project", "worklogs", "files", "subtasks"],
      });
    } else {
      // Project-scoped code like "BEB-162"
      const dashIndex = code.lastIndexOf("-");
      if (dashIndex < 1)
        throw new NotFoundException(`Invalid task code format: ${code}`);

      const projectCode = code.substring(0, dashIndex).toUpperCase();
      const taskNumber = parseInt(code.substring(dashIndex + 1), 10);
      if (isNaN(taskNumber))
        throw new NotFoundException(`Invalid task number in code: ${code}`);

      task = await this.taskRepository
        .createQueryBuilder("task")
        .leftJoinAndSelect("task.client", "client")
        .leftJoinAndSelect("task.project", "project")
        .leftJoinAndSelect("task.worklogs", "worklogs")
        .leftJoinAndSelect("task.files", "files")
        .leftJoinAndSelect("task.subtasks", "subtasks")
        .where("project.code = :projectCode", { projectCode })
        .andWhere("task.taskNumber = :taskNumber", { taskNumber })
        .getOne();
    }

    if (!task) {
      throw new NotFoundException(`Task with code ${code} not found`);
    }

    return this.attachTaskCode(task);
  }

  async findByClient(clientId: string): Promise<Task[]> {
    const tasks = await this.taskRepository.find({
      where: { clientId },
      relations: ["project"],
      order: { status: "ASC", position: "ASC" },
    });
    return this.attachTaskCodes(tasks);
  }

  async update(id: string, updateTaskDto: UpdateTaskDto): Promise<Task> {
    for (let attempt = 1; attempt <= TasksService.TASK_NUMBER_RETRY_LIMIT; attempt++) {
      try {
        const savedTaskId = await this.taskRepository.manager.transaction(
          async (manager) => {
            const task = await manager.findOne(Task, {
              where: { id },
            });

            if (!task) {
              throw new NotFoundException(`Tarea con ID ${id} no encontrada`);
            }

            const oldProjectId = task.projectId;
            const newProjectId = updateTaskDto.projectId;

            // If projectId is changing, assign a new task_number in the target project
            if (newProjectId !== undefined && newProjectId !== oldProjectId) {
              task.taskNumber = newProjectId
                ? await this.getNextProjectTaskNumber(manager, newProjectId)
                : await this.getNextGlobalTaskNumber(manager);

              if (!Number.isInteger(task.taskNumber) || task.taskNumber <= 0) {
                throw new ConflictException(
                  "No se pudo asignar un número válido al mover la tarea.",
                );
              }
            }

            Object.assign(task, updateTaskDto);
            const saved = await manager.save(Task, task);
            return saved.id;
          },
        );

        // Re-fetch with relations for taskCode
        return this.findOne(savedTaskId);
      } catch (error) {
        const isRetryable =
          this.isTaskNumberConflict(error) &&
          attempt < TasksService.TASK_NUMBER_RETRY_LIMIT;

        if (isRetryable) {
          continue;
        }

        if (this.isTaskNumberConflict(error)) {
          throw new ConflictException(
            "No se pudo actualizar la tarea por conflicto de numeración.",
          );
        }

        throw error;
      }
    }

    throw new ConflictException(
      "No se pudo actualizar la tarea por conflicto de numeración.",
    );
  }

  async move(id: string, moveDto: MoveTaskDto): Promise<Task> {
    const task = await this.findOne(id);
    const oldStatus = task.status;
    const newStatus = moveDto.status;
    const newPosition = moveDto.position;

    // Si cambia de columna
    if (oldStatus !== newStatus) {
      // Actualizar posiciones en la columna origen (decrementar las que estaban después)
      await this.taskRepository
        .createQueryBuilder()
        .update(Task)
        .set({ position: () => "position - 1" })
        .where("status = :status", { status: oldStatus })
        .andWhere("position > :position", { position: task.position })
        .execute();

      // Hacer espacio en la columna destino
      await this.taskRepository
        .createQueryBuilder()
        .update(Task)
        .set({ position: () => "position + 1" })
        .where("status = :status", { status: newStatus })
        .andWhere("position >= :position", { position: newPosition })
        .execute();
    } else {
      // Misma columna, reordenar
      if (newPosition > task.position) {
        await this.taskRepository
          .createQueryBuilder()
          .update(Task)
          .set({ position: () => "position - 1" })
          .where("status = :status", { status: oldStatus })
          .andWhere("position > :oldPos", { oldPos: task.position })
          .andWhere("position <= :newPos", { newPos: newPosition })
          .execute();
      } else if (newPosition < task.position) {
        await this.taskRepository
          .createQueryBuilder()
          .update(Task)
          .set({ position: () => "position + 1" })
          .where("status = :status", { status: oldStatus })
          .andWhere("position >= :newPos", { newPos: newPosition })
          .andWhere("position < :oldPos", { oldPos: task.position })
          .execute();
      }
    }

    task.status = newStatus;
    task.position = newPosition;
    await this.taskRepository.save(task);
    return this.findOne(task.id);
  }

  async reorder(reorderDto: ReorderTasksDto): Promise<void> {
    const { taskIds, status } = reorderDto;

    // Actualizar posiciones en batch
    await Promise.all(
      taskIds.map((taskId, index) =>
        this.taskRepository.update(taskId, { position: index, status }),
      ),
    );
  }

  async remove(id: string): Promise<void> {
    const task = await this.findOne(id);

    // Actualizar posiciones de las tareas posteriores
    await this.taskRepository
      .createQueryBuilder()
      .update(Task)
      .set({ position: () => "position - 1" })
      .where("status = :status", { status: task.status })
      .andWhere("position > :position", { position: task.position })
      .execute();

    await this.taskRepository.remove(task);
  }

  async removeCompleted(): Promise<void> {
    await this.taskRepository
      .createQueryBuilder()
      .update(Task)
      .set({ isArchived: true })
      .where("status = :status", { status: TaskStatus.DONE })
      .andWhere("isArchived = :isArchived", { isArchived: false })
      .execute();
  }

  /**
   * Elimina permanentemente varias tareas por ID. IDs inexistentes se
   * ignoran en vez de fallar todo el lote (borrado masivo desde la UI,
   * donde la selección puede desactualizarse levemente entre el click y
   * el submit). Se procesa secuencialmente porque remove() recalcula
   * `position` por status y hacerlo en paralelo podría generar carreras.
   */
  async bulkRemove(ids: string[]): Promise<{ deleted: number }> {
    let deleted = 0;
    for (const id of ids) {
      try {
        await this.remove(id);
        deleted++;
      } catch (error) {
        if (!(error instanceof NotFoundException)) {
          throw error;
        }
      }
    }
    return { deleted };
  }

  // Métodos para snapshots y AI
  /**
   * Board agrupado por estado.
   *
   * La columna `done` crece sin techo (en producción, 905 de 1031 tareas estaban
   * completadas), así que devolverla entera hacía una respuesta de ~2,5 MB que el proxy
   * cortaba a los ~97 s: el endpoint directamente fallaba. Con `doneLimit` se devuelven
   * solo las N completadas más recientes (por `updatedAt`); las columnas activas
   * (`todo`/`doing`/`blocked`) se devuelven siempre completas, porque son las que el
   * frontend filtra en cliente por espacio y por eso no puede recortar el backend.
   *
   * `doneLimit` undefined o 0 = sin límite. Los llamadores internos que necesitan el
   * estado completo del board (snapshots) no lo pasan y siguen viendo todo; el default
   * lo aplica el controller, que es la superficie HTTP.
   */
  async getTasksGroupedByStatus(
    filters?: BoardFilterDto,
  ): Promise<Record<TaskStatus, Task[]>> {
    const whereClause: {
      isArchived: boolean;
      projectId?: string;
      clientId?: string;
    } = {
      isArchived: false,
    };

    if (filters?.projectId) {
      whereClause.projectId = filters.projectId;
    }

    if (filters?.clientId) {
      whereClause.clientId = filters.clientId;
    }

    const relations = ["client", "project", "subtasks"];
    const doneLimit = filters?.doneLimit;
    const capDone = typeof doneLimit === "number" && doneLimit > 0;

    if (!capDone) {
      const tasks = await this.taskRepository.find({
        where: whereClause,
        relations,
        order: { status: "ASC", position: "ASC" },
      });
      return this.groupByStatus(tasks);
    }

    const [activeTasks, doneTasks] = await Promise.all([
      this.taskRepository.find({
        where: {
          ...whereClause,
          status: Not(TaskStatus.DONE),
        },
        relations,
        order: { status: "ASC", position: "ASC" },
      }),
      this.taskRepository.find({
        where: {
          ...whereClause,
          status: TaskStatus.DONE,
        },
        relations,
        // Las más recientes primero: si hay que recortar, que sobrevivan las que
        // el usuario acaba de completar, no las de hace un año.
        order: { updatedAt: "DESC" },
        take: doneLimit,
      }),
    ]);

    return this.groupByStatus([...activeTasks, ...doneTasks]);
  }

  private groupByStatus(tasks: Task[]): Record<TaskStatus, Task[]> {
    return this.attachTaskCodes(tasks).reduce(
      (acc, task) => {
        if (!acc[task.status]) {
          acc[task.status] = [];
        }
        acc[task.status].push(task);
        return acc;
      },
      {} as Record<TaskStatus, Task[]>,
    );
  }

  async getOpenTasksByClient(clientId: string): Promise<Task[]> {
    const tasks = await this.taskRepository.find({
      where: {
        clientId,
        status: In([TaskStatus.TODO, TaskStatus.DOING, TaskStatus.BLOCKED]),
        isArchived: false,
      },
      relations: ["project"],
      order: { priority: "DESC", position: "ASC" },
    });
    return this.attachTaskCodes(tasks);
  }

  async getRecentlyCompletedByClient(
    clientId: string,
    days = 7,
  ): Promise<Task[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const tasks = await this.taskRepository
      .createQueryBuilder("task")
      .leftJoinAndSelect("task.project", "project")
      .where("task.clientId = :clientId", { clientId })
      .andWhere("task.status = :status", { status: TaskStatus.DONE })
      .andWhere("task.updatedAt >= :since", { since })
      .orderBy("task.updatedAt", "DESC")
      .getMany();
    return this.attachTaskCodes(tasks);
  }
}
