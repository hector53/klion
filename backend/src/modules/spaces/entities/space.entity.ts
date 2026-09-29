import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Client } from '../../clients/entities/client.entity';
import { Project } from '../../projects/entities/project.entity';

/**
 * Type of space - determines UI behavior and available features
 */
export enum SpaceType {
  PERSONAL = 'personal', // Personal life: auto, health, home, finance
  WORK = 'work', // Professional: clients, projects, development
}

/**
 * Space entity - Top-level organizer for Akela
 *
 * Spaces separate different contexts of life (Personal vs Work).
 * Each space can contain clients (work only) and projects/areas.
 */
@Entity('spaces')
export class Space {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  /**
   * Display name of the space
   * Examples: "Personal", "Trabajo", "Freelance"
   */
  @Column({ length: 255 })
  name: string;

  /**
   * Type determines behavior:
   * - personal: No clients section, projects are called "Áreas"
   * - work: Has clients section, projects grouped by client
   */
  @Column({
    type: 'enum',
    enum: SpaceType,
    default: SpaceType.PERSONAL,
  })
  type: SpaceType;

  /**
   * Emoji or icon identifier for the space
   * Examples: "🏠", "💼", "home", "briefcase"
   */
  @Column({ length: 50, nullable: true })
  icon: string;

  /**
   * Color for UI theming (hex format)
   */
  @Column({ length: 7, default: '#3B82F6' })
  color: string;

  /**
   * Order in the space selector
   */
  @Column({ type: 'int', default: 0 })
  position: number;

  /**
   * Soft delete / archive
   */
  @Column({ name: 'is_archived', type: 'boolean', default: false })
  isArchived: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => Client, (client) => client.space)
  clients: Client[];

  @OneToMany(() => Project, (project) => project.space)
  projects: Project[];
}
