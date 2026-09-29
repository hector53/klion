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
import { Task } from "../../tasks/entities/task.entity";
import { Space } from "../../spaces/entities/space.entity";

export enum ProjectStatus {
  ACTIVE = "active",
  ON_HOLD = "on_hold",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

/**
 * Domain categorizes projects/areas by life context
 * Used for UI theming, icons, and metadata templates
 */
export enum ProjectDomain {
  WORK = "work", // Development, professional projects
  AUTO = "auto", // Vehicle maintenance
  HEALTH = "health", // Medical, fitness
  HOME = "home", // House maintenance, chores
  FINANCE = "finance", // Bills, investments, budgets
  PERSONAL = "personal", // Other personal projects
}

@Entity("projects")
export class Project {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  /**
   * Space this project belongs to
   * Nullable for backwards compatibility during migration
   */
  @Column({ name: "space_id", nullable: true })
  spaceId: string;

  /**
   * Client this project belongs to (optional)
   * Only applicable for work-type spaces
   * Null means it's a personal project or project without client
   */
  @Column({ name: "client_id", nullable: true })
  clientId: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({
    type: "enum",
    enum: ProjectStatus,
    default: ProjectStatus.ACTIVE,
  })
  status: ProjectStatus;

  /**
   * Domain/category of the project
   * Determines icons, colors, and metadata templates in UI
   */
  @Column({
    type: "enum",
    enum: ProjectDomain,
    default: ProjectDomain.WORK,
  })
  domain: ProjectDomain;

  @Column({ length: 7, default: "#3B82F6" }) // Color hex, default blue
  color: string;

  /**
   * Emoji or icon identifier
   * Examples: "🚗", "💼", "🏥"
   */
  @Column({ length: 50, nullable: true })
  icon: string;

  @Column({ type: "date", nullable: true })
  dueDate: Date;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  budget: number;

  @Column({ default: 0 })
  position: number;

  /** Short uppercase code for Jira-style task references (e.g., "BEB") */
  @Column({ length: 10, nullable: true })
  code: string;

  /** Counter for the next task number in this project */
  @Column({ name: "next_task_number", type: "int", default: 1 })
  nextTaskNumber: number;

  /**
   * Flexible metadata for domain-specific fields
   * Examples for auto: { vehicleName: "Honda Civic", licensePlate: "ABC123" }
   */
  @Column({ type: "jsonb", nullable: true, default: {} })
  metadata: Record<string, any>;

  /**
   * Random secret backing the read-only client-facing link (/public/*).
   * Never derived from the project id, so it can be rotated to kill an old link.
   */
  @Column({
    name: "public_share_token",
    length: 64,
    nullable: true,
    unique: true,
  })
  publicShareToken: string;

  /** Master switch for the public link. Off means /public/* answers 404. */
  @Column({ name: "public_sharing_enabled", type: "boolean", default: false })
  publicSharingEnabled: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Space, (space) => space.projects, {
    onDelete: "SET NULL",
    nullable: true,
  })
  @JoinColumn({ name: "space_id" })
  space: Space;

  @ManyToOne(() => Client, (client) => client.projects, {
    onDelete: "SET NULL",
    nullable: true,
  })
  @JoinColumn({ name: "client_id" })
  client: Client;

  @OneToMany(() => Task, (task) => task.project)
  tasks: Task[];
}
