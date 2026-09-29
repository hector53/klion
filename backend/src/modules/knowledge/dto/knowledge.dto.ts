import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  IsUrl,
  MaxLength,
  MinLength,
  IsUUID,
} from 'class-validator';
import { BooleanQuery } from '../../../common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { KnowledgeType } from '../entities/knowledge.entity';

/**
 * DTO for creating a new knowledge entry
 */
export class CreateKnowledgeDto {
  @ApiProperty({
    description: 'Title of the knowledge entry',
    example: 'JWT Authentication with Refresh Tokens',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  title: string;

  @ApiProperty({
    description: 'Main content (code, markdown, text)',
    example: '```typescript\nconst jwt = require("jsonwebtoken");\n...\n```',
  })
  @IsString()
  @MinLength(10)
  content: string;

  @ApiPropertyOptional({
    description: 'Type of knowledge',
    enum: KnowledgeType,
    example: KnowledgeType.SNIPPET,
  })
  @IsOptional()
  @IsEnum(KnowledgeType)
  type?: KnowledgeType;

  @ApiPropertyOptional({
    description: 'Short summary for quick preview',
    example: 'Implementation of JWT auth with access and refresh token rotation',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  summary?: string;

  @ApiPropertyOptional({
    description: 'Language/format for syntax highlighting',
    example: 'typescript',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  language?: string;

  @ApiPropertyOptional({
    description: 'Source URL or reference',
    example: 'https://github.com/user/repo/blob/main/auth.ts',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  sourceUrl?: string;

  @ApiPropertyOptional({
    description: 'Associated client ID',
  })
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiPropertyOptional({
    description: 'Associated project ID',
  })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({
    description: 'Tags for categorization',
    example: ['authentication', 'jwt', 'security'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Whether this knowledge is public',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

/**
 * DTO for updating a knowledge entry
 */
export class UpdateKnowledgeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(10)
  content?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(KnowledgeType)
  type?: KnowledgeType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  summary?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  language?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  sourceUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;
}

/**
 * DTO for filtering knowledge list
 */
export class KnowledgeFilterDto {
  @ApiPropertyOptional({
    description: 'Filter by type',
    enum: KnowledgeType,
  })
  @IsOptional()
  @IsEnum(KnowledgeType)
  type?: KnowledgeType;

  @ApiPropertyOptional({
    description: 'Filter by client ID',
  })
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiPropertyOptional({
    description: 'Filter by project ID',
  })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({
    description: 'Filter by tag name',
  })
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional({
    description: 'Include archived entries',
    default: false,
  })
  @IsOptional()
  @BooleanQuery()
  @IsBoolean()
  includeArchived?: boolean;

  @ApiPropertyOptional({
    description: 'Limit results',
    default: 50,
  })
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({
    description: 'Offset for pagination',
    default: 0,
  })
  @IsOptional()
  offset?: number;
}

/**
 * DTO for semantic search
 */
export class SearchKnowledgeDto {
  @ApiProperty({
    description: 'Search query',
    example: 'how to handle webhooks',
  })
  @IsString()
  @MinLength(2)
  query: string;

  @ApiPropertyOptional({
    description: 'Filter by type',
    enum: KnowledgeType,
  })
  @IsOptional()
  @IsEnum(KnowledgeType)
  type?: KnowledgeType;

  @ApiPropertyOptional({
    description: 'Filter by project ID',
  })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({
    description: 'Filter by client ID',
  })
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiPropertyOptional({
    description: 'Maximum results to return',
    default: 10,
  })
  @IsOptional()
  limit?: number;
}

/**
 * Response DTO for knowledge with relevance score
 */
export class KnowledgeSearchResultDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  summary: string;

  @ApiProperty()
  type: KnowledgeType;

  @ApiProperty()
  language: string;

  @ApiProperty({ description: 'Relevance score (0-1, higher is better)' })
  relevance: number;

  @ApiProperty()
  tags: string[];

  @ApiPropertyOptional()
  projectName?: string;

  @ApiPropertyOptional()
  clientName?: string;
}
