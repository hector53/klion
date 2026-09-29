import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  IsUrl,
  IsObject,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for creating/updating project context
 */
export class CreateProjectContextDto {
  @ApiPropertyOptional({
    description: 'Technical stack description',
    example: 'Next.js 14, NestJS, PostgreSQL, TailwindCSS',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  stack?: string;

  @ApiPropertyOptional({
    description: 'Development rules and guidelines',
    example: ['Use DTOs for all endpoints', 'Follow dark mode design'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  rules?: string[];

  @ApiPropertyOptional({
    description: 'Extended description for AI context',
    example: 'This is a client management system with Kanban board...',
  })
  @IsOptional()
  @IsString()
  aiDescription?: string;

  @ApiPropertyOptional({
    description: 'Repository URL',
    example: 'https://github.com/user/project',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  repositoryUrl?: string;

  @ApiPropertyOptional({
    description: 'Local path to repository for RAG indexing',
    example: '/Users/hector/projects/klion',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  localPath?: string;

  @ApiPropertyOptional({
    description: 'Default branch name',
    example: 'main',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  defaultBranch?: string;

  @ApiPropertyOptional({
    description: 'Custom configuration object',
    example: { port: 3001, environment: 'development' },
  })
  @IsOptional()
  @IsObject()
  customConfig?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Tags for categorization',
    example: ['typescript', 'nestjs', 'react'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Enable RAG indexing for this project',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  ragEnabled?: boolean;
}

export class UpdateProjectContextDto extends CreateProjectContextDto {}

/**
 * Response DTO for full project context (used by get_context MCP tool)
 */
export class FullProjectContextResponseDto {
  @ApiProperty({ description: 'Project basic information' })
  project: {
    id: string;
    name: string;
    description: string;
    status: string;
    color: string;
    dueDate: Date | null;
    budget: number | null;
  };

  @ApiProperty({ description: 'Client information' })
  client: {
    id: string;
    name: string;
    company: string | null;
    email: string | null;
  };

  @ApiProperty({ description: 'Project context and configuration' })
  context: {
    stack: string | null;
    rules: string[];
    aiDescription: string | null;
    repositoryUrl: string | null;
    localPath: string | null;
    defaultBranch: string;
    customConfig: Record<string, any>;
    tags: string[];
    ragEnabled: boolean;
    lastIndexedAt: Date | null;
    indexedChunks: number;
  };

  @ApiProperty({ description: 'Current project state' })
  currentState: {
    totalTasks: number;
    tasksByStatus: {
      todo: number;
      doing: number;
      blocked: number;
      done: number;
    };
    activeTasks: Array<{
      id: string;
      title: string;
      status: string;
      priority: string;
      dueDate: Date | null;
    }>;
    activeTasksTotal: number;
    blockedTasks: Array<{
      id: string;
      title: string;
      description: string | null;
    }>;
    upcomingDeadlines: Array<{
      id: string;
      title: string;
      dueDate: Date;
    }>;
  };

  @ApiPropertyOptional({ description: 'Related knowledge entries (future)' })
  relatedKnowledge?: Array<{
    id: string;
    title: string;
    type: string;
    relevance: number;
  }>;
}
