import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsArray,
  IsBoolean,
} from 'class-validator';

export enum CommitType {
  FEAT = 'feat',
  FIX = 'fix',
  DOCS = 'docs',
  STYLE = 'style',
  REFACTOR = 'refactor',
  TEST = 'test',
  CHORE = 'chore',
}

// ============ Auto-commit ============

export class GenerateCommitMessageDto {
  @ApiProperty({ description: 'Project ID' })
  @IsUUID()
  projectId: string;

  @ApiPropertyOptional({ description: 'Diff or changes description' })
  @IsOptional()
  @IsString()
  changes?: string;

  @ApiPropertyOptional({ description: 'Related task ID' })
  @IsOptional()
  @IsUUID()
  taskId?: string;

  @ApiPropertyOptional({ enum: CommitType, description: 'Commit type' })
  @IsOptional()
  @IsEnum(CommitType)
  type?: CommitType;
}

export class CommitMessageResponseDto {
  @ApiProperty()
  message: string;

  @ApiProperty()
  type: CommitType;

  @ApiPropertyOptional()
  scope?: string;

  @ApiProperty({ type: [String] })
  suggestions: string[];
}

export class CreateCommitDto {
  @ApiProperty({ description: 'Project ID' })
  @IsUUID()
  projectId: string;

  @ApiProperty({ description: 'Commit message' })
  @IsString()
  message: string;

  @ApiPropertyOptional({ description: 'Files to stage (empty = all)' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  files?: string[];

  @ApiPropertyOptional({ description: 'Push after commit' })
  @IsOptional()
  @IsBoolean()
  push?: boolean;
}

export class CommitResultDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  commitHash: string;

  @ApiProperty()
  message: string;

  @ApiPropertyOptional()
  pushed?: boolean;

  @ApiPropertyOptional()
  error?: string;
}

// ============ Changelog ============

export class GenerateChangelogDto {
  @ApiProperty({ description: 'Project ID' })
  @IsUUID()
  projectId: string;

  @ApiPropertyOptional({ description: 'From commit/tag' })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({ description: 'To commit/tag (default: HEAD)' })
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional({ description: 'Version number for the changelog' })
  @IsOptional()
  @IsString()
  version?: string;
}

export class ChangelogResponseDto {
  @ApiProperty()
  changelog: string;

  @ApiProperty()
  version: string;

  @ApiProperty({ type: [Object] })
  commits: Array<{
    hash: string;
    message: string;
    author: string;
    date: string;
    type?: CommitType;
  }>;

  @ApiProperty()
  stats: {
    features: number;
    fixes: number;
    others: number;
  };
}

export class UpdateChangelogDto {
  @ApiProperty({ description: 'Project ID' })
  @IsUUID()
  projectId: string;

  @ApiProperty({ description: 'Changelog content to append' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: 'Changelog file path' })
  @IsOptional()
  @IsString()
  filePath?: string;
}

// ============ Repository Info ============

export class RepoStatusDto {
  @ApiProperty()
  branch: string;

  @ApiProperty()
  isClean: boolean;

  @ApiProperty({ type: [String] })
  staged: string[];

  @ApiProperty({ type: [String] })
  modified: string[];

  @ApiProperty({ type: [String] })
  untracked: string[];

  @ApiProperty()
  ahead: number;

  @ApiProperty()
  behind: number;

  @ApiPropertyOptional()
  lastCommit?: {
    hash: string;
    message: string;
    author: string;
    date: string;
  };
}

export class BranchInfoDto {
  @ApiProperty()
  name: string;

  @ApiProperty()
  current: boolean;

  @ApiProperty()
  remote?: string;

  @ApiProperty()
  lastCommitHash: string;

  @ApiProperty()
  lastCommitMessage: string;
}

// ============ Documentation ============

export class GenerateDocumentationDto {
  @ApiProperty({ description: 'Project ID' })
  @IsUUID()
  projectId: string;

  @ApiProperty({
    enum: ['readme', 'api', 'setup', 'contributing'],
    description: 'Type of documentation to generate',
  })
  @IsEnum(['readme', 'api', 'setup', 'contributing'])
  type: 'readme' | 'api' | 'setup' | 'contributing';

  @ApiPropertyOptional({ description: 'Additional context or instructions' })
  @IsOptional()
  @IsString()
  context?: string;
}

export class DocumentationResponseDto {
  @ApiProperty()
  content: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  suggestedFilename: string;
}

export class SaveDocumentationDto {
  @ApiProperty({ description: 'Project ID' })
  @IsUUID()
  projectId: string;

  @ApiProperty({ description: 'File content' })
  @IsString()
  content: string;

  @ApiProperty({ description: 'File path relative to repo root' })
  @IsString()
  filePath: string;

  @ApiPropertyOptional({ description: 'Commit after saving' })
  @IsOptional()
  @IsBoolean()
  commit?: boolean;

  @ApiPropertyOptional({ description: 'Commit message' })
  @IsOptional()
  @IsString()
  commitMessage?: string;
}
