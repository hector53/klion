import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  ManyToMany,
  JoinColumn,
  JoinTable,
  Index,
} from 'typeorm';
import { Client } from '../../clients/entities/client.entity';
import { Project } from '../../projects/entities/project.entity';
import { KnowledgeTag } from './knowledge-tag.entity';

/**
 * Type of knowledge entry
 */
export enum KnowledgeType {
  SNIPPET = 'snippet', // Code snippets
  FLOW = 'flow', // Documented processes/workflows
  DECISION = 'decision', // Architectural decisions
  PATTERN = 'pattern', // Design patterns used
  SOLUTION = 'solution', // Problem solutions
  REFERENCE = 'reference', // External references/links
  OTHER = 'other',
}

/**
 * Knowledge entity for storing reusable knowledge
 *
 * This is the core of Klion's knowledge base system.
 * It stores any type of knowledge that can be searched and reused
 * across projects.
 */
@Entity('knowledge')
export class Knowledge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Title of the knowledge entry
   */
  @Column({ length: 500 })
  @Index()
  title: string;

  /**
   * Main content - can be code, markdown, plain text, etc.
   */
  @Column({ type: 'text' })
  content: string;

  /**
   * Type of knowledge
   */
  @Column({
    type: 'enum',
    enum: KnowledgeType,
    default: KnowledgeType.OTHER,
  })
  @Index()
  type: KnowledgeType;

  /**
   * Optional summary for quick preview
   */
  @Column({ type: 'text', nullable: true })
  summary: string;

  /**
   * Vector embedding for semantic search
   * Using 1536 dimensions (OpenAI text-embedding-3-small compatible)
   *
   * Note: pgvector column type is handled via raw SQL in migrations
   * TypeORM stores it as a string representation
   */
  @Column({ type: 'text', nullable: true })
  embedding: string;

  /**
   * Language/format of the content (for code highlighting)
   * e.g., 'typescript', 'python', 'markdown', 'sql'
   */
  @Column({ length: 50, nullable: true })
  language: string;

  /**
   * Optional source URL or reference
   */
  @Column({ type: 'varchar', length: 1000, nullable: true })
  sourceUrl: string;

  /**
   * Optional client association
   */
  @Column({ name: 'client_id', nullable: true })
  clientId: string;

  /**
   * Optional project association
   */
  @Column({ name: 'project_id', nullable: true })
  projectId: string;

  /**
   * Whether this knowledge is public (visible to all users)
   * or private (only visible to creator)
   */
  @Column({ type: 'boolean', default: false })
  isPublic: boolean;

  /**
   * Whether this knowledge is archived
   */
  @Column({ type: 'boolean', default: false })
  isArchived: boolean;

  /**
   * Number of times this knowledge has been accessed/used
   */
  @Column({ type: 'int', default: 0 })
  usageCount: number;

  /**
   * Last time this knowledge was accessed
   */
  @Column({ type: 'timestamp', nullable: true })
  lastAccessedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Client, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @ManyToOne(() => Project, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @ManyToMany(() => KnowledgeTag, (tag) => tag.knowledge, { cascade: true })
  @JoinTable({
    name: 'knowledge_tags_relation',
    joinColumn: { name: 'knowledge_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tag_id', referencedColumnName: 'id' },
  })
  tags: KnowledgeTag[];
}
