import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum AIProvider {
  OPENAI = 'openai',
  GEMINI = 'gemini',
}

export enum OpenAIModel {
  GPT_4O = 'gpt-4o',
  GPT_4O_MINI = 'gpt-4o-mini',
  GPT_4_TURBO = 'gpt-4-turbo',
  GPT_3_5_TURBO = 'gpt-3.5-turbo',
}

@Entity('ai_settings')
export class AISettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  userId: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  // Provider Settings
  @Column({
    type: 'enum',
    enum: AIProvider,
    default: AIProvider.GEMINI,
  })
  defaultProvider: AIProvider;

  // OpenAI Settings
  @Column({
    type: 'enum',
    enum: OpenAIModel,
    default: OpenAIModel.GPT_4O_MINI,
  })
  openaiDefaultModel: OpenAIModel;

  // Gemini Settings
  // Free-form model id (not a Postgres enum) — Google adds/retires Gemini
  // models over time, so the valid set is fetched live via
  // GeminiService.listModels() / GET /ai/models instead of being hardcoded.
  @Column({ type: 'varchar', length: 100, default: 'gemini-2.5-flash' })
  geminiDefaultModel: string;

  // Feature Toggles
  @Column({ type: 'boolean', default: true })
  enableSuggestions: boolean;

  @Column({ type: 'boolean', default: true })
  enableAutoSummary: boolean;

  @Column({ type: 'boolean', default: true })
  enableChat: boolean;

  @Column({ type: 'boolean', default: true })
  enableRAG: boolean;

  // Advanced Settings
  @Column({ type: 'float', default: 0.7 })
  temperature: number;

  @Column({ type: 'int', default: 8192 })
  maxTokens: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
