import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToMany,
  Index,
} from 'typeorm';
import { Knowledge } from './knowledge.entity';

/**
 * Tags for categorizing knowledge entries
 */
@Entity('knowledge_tags')
export class KnowledgeTag {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Tag name (unique, lowercase)
   */
  @Column({ length: 100, unique: true })
  @Index()
  name: string;

  /**
   * Optional color for UI display (hex)
   */
  @Column({ length: 7, default: '#6B7280' })
  color: string;

  /**
   * Optional description
   */
  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string;

  /**
   * Number of knowledge entries with this tag
   */
  @Column({ type: 'int', default: 0 })
  usageCount: number;

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @ManyToMany(() => Knowledge, (knowledge) => knowledge.tags)
  knowledge: Knowledge[];
}
