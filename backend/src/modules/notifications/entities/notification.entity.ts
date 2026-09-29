import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "../../users/entities/user.entity";
import { Task } from "../../tasks/entities/task.entity";

export enum NotificationType {
  TRIGGER = "trigger",
  SYSTEM = "system",
}

@Entity("notifications")
export class Notification {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "user_id" })
  userId: string;

  @Column({ length: 255 })
  title: string;

  @Column({ type: "text", nullable: true })
  message: string;

  @Column({
    type: "enum",
    enum: NotificationType,
    default: NotificationType.TRIGGER,
  })
  type: NotificationType;

  @Column({ type: "boolean", default: false, name: "is_read" })
  isRead: boolean;

  @Column({ name: "trigger_id", nullable: true })
  triggerId: string;

  @Column({ name: "task_id", nullable: true })
  taskId: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  // Relations
  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;

  @ManyToOne(() => Task, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "task_id" })
  task: Task;
}
