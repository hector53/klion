import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "../../users/entities/user.entity";
import { Task } from "../../tasks/entities/task.entity";

export enum TriggerType {
  TIME = "time",
  RECURRING = "recurring",
  CONDITION = "condition",
}

export enum TriggerAction {
  NOTIFY = "notify",
  CREATE_TASK = "create_task",
}

@Entity("triggers")
export class Trigger {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "user_id" })
  userId: string;

  @Column({ length: 255 })
  name: string;

  @Column({
    type: "enum",
    enum: TriggerType,
    default: TriggerType.TIME,
  })
  type: TriggerType;

  @Column({ name: "task_id", nullable: true })
  taskId: string;

  /**
   * Condition configuration (JSONB):
   * - time: { datetime: "2026-02-15T09:00:00" }
   * - recurring: { cron: "0 9 * * 1", description: "Cada lunes a las 9am" }
   * - condition: { field: "metadata.km_actual", operator: ">=", value: 50000 }
   */
  @Column({ type: "jsonb", default: {} })
  condition: Record<string, any>;

  @Column({
    type: "enum",
    enum: TriggerAction,
    default: TriggerAction.NOTIFY,
  })
  action: TriggerAction;

  /**
   * Action configuration (JSONB):
   * - notify: { title: "Recordatorio", message: "Cambiar aceite" }
   * - create_task: { title: "Cambiar aceite", projectId: "...", priority: "high" }
   */
  @Column({ type: "jsonb", name: "action_config", default: {} })
  actionConfig: Record<string, any>;

  @Column({ type: "boolean", default: true, name: "is_active" })
  isActive: boolean;

  @Column({ name: "last_triggered_at", nullable: true })
  lastTriggeredAt: Date;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;

  @ManyToOne(() => Task, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "task_id" })
  task: Task;
}
