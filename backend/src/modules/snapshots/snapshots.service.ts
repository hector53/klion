import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from "typeorm";
import { Cron, CronExpression } from "@nestjs/schedule";
import { ConfigService } from "@nestjs/config";
import {
  Snapshot,
  SnapshotType,
  SnapshotPayload,
} from "./entities/snapshot.entity";
import { TasksService } from "../tasks/tasks.service";
import { TaskStatus } from "../tasks/entities/task.entity";
import { CreateSnapshotDto, SnapshotFilterDto } from "./dto/snapshot.dto";

@Injectable()
export class SnapshotsService {
  constructor(
    @InjectRepository(Snapshot)
    private readonly snapshotRepository: Repository<Snapshot>,
    private readonly tasksService: TasksService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Crear un snapshot manual del board actual
   */
  async create(createSnapshotDto?: CreateSnapshotDto): Promise<Snapshot> {
    const payload = await this.buildSnapshotPayload();
    const now = new Date();

    const snapshot = this.snapshotRepository.create({
      name:
        createSnapshotDto?.name ||
        `Board ${now.toLocaleDateString("es-ES")} ${now.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`,
      capturedAt: now,
      type: SnapshotType.MANUAL,
      payload,
    });

    return this.snapshotRepository.save(snapshot);
  }

  /**
   * Crear snapshot automático (llamado por cron)
   */
  async createAutoSnapshot(): Promise<Snapshot> {
    const payload = await this.buildSnapshotPayload();
    const now = new Date();

    const snapshot = this.snapshotRepository.create({
      name: `Snapshot diario ${now.toLocaleDateString("es-ES")}`,
      capturedAt: now,
      type: SnapshotType.AUTO,
      payload,
    });

    return this.snapshotRepository.save(snapshot);
  }

  /**
   * Construir el payload del snapshot con el estado actual del board
   */
  private async buildSnapshotPayload(): Promise<SnapshotPayload> {
    const tasksByStatus = await this.tasksService.getTasksGroupedByStatus();

    // Definir columnas estándar
    const columns = [
      { id: TaskStatus.TODO, name: "Por hacer", taskIds: [] as string[] },
      { id: TaskStatus.DOING, name: "En progreso", taskIds: [] as string[] },
      { id: TaskStatus.BLOCKED, name: "Bloqueado", taskIds: [] as string[] },
      { id: TaskStatus.DONE, name: "Completado", taskIds: [] as string[] },
    ];

    // Construir el mapa de tareas y llenar columnas
    const tasks: SnapshotPayload["tasks"] = {};
    const tasksByStatusCount: Record<string, number> = {};
    const clientsWithTasks = new Set<string>();

    for (const column of columns) {
      const columnTasks = tasksByStatus[column.id as TaskStatus] || [];
      tasksByStatusCount[column.id] = columnTasks.length;

      for (const task of columnTasks) {
        column.taskIds.push(task.id);
        clientsWithTasks.add(task.clientId);

        tasks[task.id] = {
          id: task.id,
          clientId: task.clientId,
          clientName: task.client?.name || "Sin cliente",
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          dueDate: task.dueDate ? new Date(task.dueDate).toISOString() : null,
          tags: task.tags,
          position: task.position,
        };
      }
    }

    return {
      columns,
      tasks,
      metadata: {
        totalTasks: Object.keys(tasks).length,
        tasksByStatus: tasksByStatusCount,
        clientsWithTasks: Array.from(clientsWithTasks),
      },
    };
  }

  async findAll(filters?: SnapshotFilterDto): Promise<Snapshot[]> {
    const where: any = {};

    if (filters?.from && filters?.to) {
      where.capturedAt = Between(new Date(filters.from), new Date(filters.to));
    } else if (filters?.from) {
      where.capturedAt = MoreThanOrEqual(new Date(filters.from));
    } else if (filters?.to) {
      where.capturedAt = LessThanOrEqual(new Date(filters.to));
    }

    return this.snapshotRepository.find({
      where,
      select: ["id", "name", "capturedAt", "type", "createdAt"],
      order: { capturedAt: "DESC" },
    });
  }

  async findOne(id: string): Promise<Snapshot> {
    const snapshot = await this.snapshotRepository.findOne({
      where: { id },
    });

    if (!snapshot) {
      throw new NotFoundException(`Snapshot con ID ${id} no encontrado`);
    }

    return snapshot;
  }

  async remove(id: string): Promise<void> {
    const snapshot = await this.findOne(id);
    await this.snapshotRepository.remove(snapshot);
  }

  /**
   * Cron job: crear snapshot automático cada día a las 23:59
   */
  @Cron(CronExpression.EVERY_DAY_AT_11PM)
  async handleDailySnapshot() {
    console.log("🕐 Ejecutando snapshot diario automático...");
    try {
      const snapshot = await this.createAutoSnapshot();
      console.log(`✅ Snapshot diario creado: ${snapshot.id}`);
    } catch (error) {
      console.error("❌ Error al crear snapshot diario:", error);
    }
  }

  /**
   * Cron job: limpiar snapshots antiguos (retención configurable)
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleSnapshotCleanup() {
    const retentionDays = this.configService.get<number>(
      "SNAPSHOT_RETENTION_DAYS",
      90,
    );
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    console.log(
      `🧹 Limpiando snapshots anteriores a ${cutoffDate.toISOString()}...`,
    );

    const result = await this.snapshotRepository
      .createQueryBuilder()
      .delete()
      .where("capturedAt < :cutoffDate", { cutoffDate })
      .andWhere("type = :type", { type: SnapshotType.AUTO })
      .execute();

    console.log(`✅ Eliminados ${result.affected} snapshots antiguos`);
  }

  /**
   * Obtener el snapshot más reciente (útil para comparaciones)
   */
  async getLatest(): Promise<Snapshot | null> {
    return this.snapshotRepository.findOne({
      order: { capturedAt: "DESC" },
    });
  }

  /**
   * Obtener snapshots de hoy
   */
  async getTodaySnapshots(): Promise<Snapshot[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.snapshotRepository.find({
      where: {
        capturedAt: Between(today, tomorrow),
      },
      select: ["id", "name", "capturedAt", "type", "createdAt"],
      order: { capturedAt: "DESC" },
    });
  }
}
