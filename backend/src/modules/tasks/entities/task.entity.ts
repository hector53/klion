import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from "typeorm";
import { Client } from "../../clients/entities/client.entity";
import { Project } from "../../projects/entities/project.entity";
import { Worklog } from "../../worklogs/entities/worklog.entity";
import { File } from "../../files/entities/file.entity";
import { Subtask } from "../../subtasks/entities/subtask.entity";

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

@Entity("tasks")
export class Task {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "client_id", nullable: true })
  clientId: string;

  @Column({ name: "project_id", nullable: true })
  projectId: string;

  @Column({ length: 255 })
  title: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({
    type: "enum",
    enum: TaskStatus,
    default: TaskStatus.TODO,
  })
  status: TaskStatus;

  @Column({
    type: "enum",
    enum: TaskPriority,
    default: TaskPriority.MEDIUM,
  })
  priority: TaskPriority;

  @Column({
    type: "enum",
    enum: TaskType,
    default: TaskType.TASK,
  })
  type: TaskType;

  @Column({ type: "date", nullable: true })
  dueDate: Date;

  @Column({ type: "simple-array", nullable: true })
  tags: string[];

  @Column({ type: "int", default: 0 })
  position: number;

  @Column({ name: "task_number", type: "int", nullable: true })
  taskNumber: number;

  /** Computed task code (e.g., "BEB-162" or "#123"). Set by service layer, not persisted. */
  taskCode?: string;

  @Column({ type: "boolean", default: false })
  isArchived: boolean;

  /**
   * Flexible metadata for domain-specific data
   *
   * Examples by domain:
   * - auto: { km_actual: 45000, km_objetivo: 50000, fecha_servicio: "2026-01-15" }
   * - health: { doctor: "Dr. García", especialidad: "Dentista", clinica: "..." }
   * - finance: { monto: 500, categoria: "servicios", banco: "BBVA" }
   * - home: { ubicacion: "cocina", prioridad_reparacion: "alta" }
   *
   * This enables tracking arbitrary data per task without schema changes
   */
  @Column({ type: "jsonb", nullable: true, default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Client, (client) => client.tasks, {
    onDelete: "CASCADE",
    nullable: true,
  })
  @JoinColumn({ name: "client_id" })
  client: Client;

  @ManyToOne(() => Project, (project) => project.tasks, {
    onDelete: "SET NULL",
    nullable: true,
  })
  @JoinColumn({ name: "project_id" })
  project: Project;

  @OneToMany(() => Worklog, (worklog) => worklog.task)
  worklogs: Worklog[];

  @OneToMany(() => File, (file) => file.task)
  files: File[];

  @OneToMany(() => Subtask, (subtask) => subtask.task)
  subtasks: Subtask[];
}
