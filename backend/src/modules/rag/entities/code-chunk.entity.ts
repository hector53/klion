import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';

/**
 * CodeChunk entity for storing indexed code fragments
 *
 * Each chunk represents a portion of a file that can be
 * searched semantically using vector embeddings.
 */
@Entity('code_chunks')
@Index(['projectId', 'filePath']) // For quick lookups by project and file
export class CodeChunk {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Project this chunk belongs to
   */
  @Column({ name: 'project_id' })
  @Index()
  projectId: string;

  /**
   * Relative path of the file within the repository
   * e.g., "src/modules/auth/auth.service.ts"
   */
  @Column({ length: 1000 })
  @Index()
  filePath: string;

  /**
   * File name only (for quick display)
   * e.g., "auth.service.ts"
   */
  @Column({ length: 255 })
  fileName: string;

  /**
   * File extension/type
   * e.g., "ts", "py", "js"
   */
  @Column({ length: 20 })
  fileType: string;

  /**
   * The actual code content of this chunk
   */
  @Column({ type: 'text' })
  content: string;

  /**
   * Vector embedding for semantic search
   * Using 1536 dimensions (OpenAI text-embedding-3-small compatible)
   * Stored as text, converted to vector in queries
   */
  @Column({ type: 'text', nullable: true })
  embedding: string;

  /**
   * Starting line number in the original file
   */
  @Column({ type: 'int' })
  startLine: number;

  /**
   * Ending line number in the original file
   */
  @Column({ type: 'int' })
  endLine: number;

  /**
   * Index of this chunk within the file (0-based)
   */
  @Column({ type: 'int', default: 0 })
  chunkIndex: number;

  /**
   * Total number of chunks for this file
   */
  @Column({ type: 'int', default: 1 })
  totalChunks: number;

  /**
   * Optional: detected language/framework features
   * e.g., ["class", "async", "decorator"]
   */
  @Column({ type: 'jsonb', nullable: true, default: [] })
  features: string[];

  /**
   * File hash for change detection
   */
  @Column({ length: 64, nullable: true })
  fileHash: string;

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;
}
