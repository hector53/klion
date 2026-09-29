import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Project } from './project.entity';

/**
 * ProjectNote is a single scratchpad note per project where the user jots
 * down findings/bugs while testing (rich text + pasted images), later
 * analyzed by AI to propose tasks.
 */
@Entity('project_notes')
export class ProjectNote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'project_id', unique: true })
  projectId: string;

  @Column({ type: 'text', default: '' })
  content: string;

  /**
   * Last time the AI analyzed this note to propose tasks.
   */
  @Column({ type: 'timestamp', nullable: true })
  lastAnalyzedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;
}
