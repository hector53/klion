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
 * ProjectContext stores additional context information for a project
 * that helps AI assistants understand and work with the project effectively.
 *
 * This includes:
 * - Technical stack (languages, frameworks, databases)
 * - Development rules and guidelines
 * - Repository information
 * - Custom configuration for AI interactions
 */
@Entity('project_contexts')
export class ProjectContext {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'project_id', unique: true })
  projectId: string;

  /**
   * Technical stack description
   * Example: "Next.js 14, NestJS, PostgreSQL, TailwindCSS"
   */
  @Column({ type: 'text', nullable: true })
  stack: string;

  /**
   * Development rules and guidelines as JSON array
   * Example: ["Use DTOs for all endpoints", "Follow dark mode design"]
   */
  @Column({ type: 'jsonb', nullable: true, default: [] })
  rules: string[];

  /**
   * Extended description of the project for AI context
   */
  @Column({ type: 'text', nullable: true })
  aiDescription: string;

  /**
   * Repository URL (GitHub, Bitbucket, etc.)
   */
  @Column({ type: 'varchar', length: 500, nullable: true })
  repositoryUrl: string;

  /**
   * Local path to the repository (for RAG indexing)
   */
  @Column({ type: 'varchar', length: 1000, nullable: true })
  localPath: string;

  /**
   * Default branch name
   */
  @Column({ type: 'varchar', length: 100, nullable: true, default: 'main' })
  defaultBranch: string;

  /**
   * Custom environment variables or configuration (non-sensitive)
   * Stored as JSON object
   */
  @Column({ type: 'jsonb', nullable: true, default: {} })
  customConfig: Record<string, any>;

  /**
   * Tags for categorizing and searching projects
   */
  @Column({ type: 'simple-array', nullable: true })
  tags: string[];

  /**
   * Whether RAG indexing is enabled for this project
   */
  @Column({ type: 'boolean', default: false })
  ragEnabled: boolean;

  /**
   * Last time the RAG index was updated
   */
  @Column({ type: 'timestamp', nullable: true })
  lastIndexedAt: Date;

  /**
   * Number of code chunks indexed
   */
  @Column({ type: 'int', default: 0 })
  indexedChunks: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;
}
