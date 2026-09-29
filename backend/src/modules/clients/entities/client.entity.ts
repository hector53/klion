import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Task } from "../../tasks/entities/task.entity";
import { Project } from "../../projects/entities/project.entity";
import { Worklog } from "../../worklogs/entities/worklog.entity";
import { File } from "../../files/entities/file.entity";
import { Space } from "../../spaces/entities/space.entity";

@Entity("clients")
export class Client {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  /**
   * Space this client belongs to (usually a "work" type space)
   * Nullable for backwards compatibility during migration
   */
  @Column({ name: "space_id", nullable: true })
  spaceId: string;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 255, nullable: true })
  company: string;

  @Column({ length: 255, nullable: true })
  email: string;

  @Column({ length: 50, nullable: true })
  phone: string;

  @Column({ length: 50, nullable: true })
  whatsapp: string;

  @Column({ type: "text", nullable: true })
  address: string;

  @Column({ type: "text", nullable: true })
  notes: string;

  /**
   * Flexible metadata for custom fields
   * Examples: { taxId: "XXX", paymentTerms: "30 days" }
   */
  @Column({ type: "jsonb", nullable: true, default: {} })
  metadata: Record<string, any>;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Space, (space) => space.clients, {
    onDelete: "SET NULL",
    nullable: true,
  })
  @JoinColumn({ name: "space_id" })
  space: Space;

  @OneToMany(() => Task, (task) => task.client)
  tasks: Task[];

  @OneToMany(() => Project, (project) => project.client)
  projects: Project[];

  @OneToMany(() => Worklog, (worklog) => worklog.client)
  worklogs: Worklog[];

  @OneToMany(() => File, (file) => file.client)
  files: File[];
}
