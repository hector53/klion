import {
  IsString,
  IsUUID,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  IsInt,
  Min,
  Max,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * DTO for indexing a project
 */
export class IndexProjectDto {
  @IsUUID()
  projectId: string;

  @IsString()
  @IsOptional()
  repoPath?: string; // If not provided, uses project's localPath from context

  @IsBoolean()
  @IsOptional()
  forceReindex?: boolean; // If true, deletes existing chunks first
}

/**
 * DTO for searching code
 */
export class SearchCodeDto {
  @IsString()
  query: string;

  @IsUUID()
  @IsOptional()
  projectId?: string; // If not provided, searches all projects

  @IsString()
  @IsOptional()
  fileType?: string; // Filter by file extension

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(50)
  limit?: number = 10;

  @IsBoolean()
  @IsOptional()
  useSemanticSearch?: boolean = true; // Use embeddings if available
}

/**
 * Result from code search
 */
export class CodeSearchResultDto {
  id: string;
  projectId: string;
  projectName?: string;
  filePath: string;
  fileName: string;
  fileType: string;
  content: string;
  startLine: number;
  endLine: number;
  relevance: number;
  matchType: "semantic" | "text";
}

/**
 * Status of project indexing
 */
export class IndexStatusDto {
  projectId: string;
  projectName: string;
  isIndexed: boolean;
  totalChunks: number;
  totalFiles: number;
  lastIndexedAt: Date | null;
  indexingInProgress: boolean;
}

/**
 * Progress update during indexing
 */
export class IndexProgressDto {
  projectId: string;
  status:
    | "scanning"
    | "chunking"
    | "embedding"
    | "storing"
    | "complete"
    | "error";
  progress: number; // 0-100
  currentFile?: string;
  filesProcessed: number;
  totalFiles: number;
  chunksCreated: number;
  error?: string;
}

/**
 * Configuration for chunking
 */
export class ChunkingConfigDto {
  @IsNumber()
  @IsOptional()
  @Min(100)
  @Max(2000)
  maxChunkSize?: number = 500; // Lines per chunk

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  overlapLines?: number = 50; // Overlap between chunks

  @IsArray()
  @IsOptional()
  includeExtensions?: string[]; // Only index these extensions

  @IsArray()
  @IsOptional()
  excludePatterns?: string[]; // Patterns to exclude (e.g., node_modules)
}

/**
 * Single code chunk uploaded from client (MCP/CLI)
 */
export class CodeChunkUploadDto {
  @ApiProperty({ description: "Relative file path within the project" })
  @IsString()
  filePath: string;

  @ApiProperty({ description: "File name" })
  @IsString()
  fileName: string;

  @ApiProperty({ description: "File extension/type (e.g., ts, py, js)" })
  @IsString()
  fileType: string;

  @ApiProperty({ description: "Content of the chunk" })
  @IsString()
  content: string;

  @ApiProperty({ description: "Starting line number (1-indexed)" })
  @IsInt()
  @Min(1)
  startLine: number;

  @ApiProperty({ description: "Ending line number" })
  @IsInt()
  @Min(1)
  endLine: number;

  @ApiProperty({ description: "Index of this chunk within the file" })
  @IsInt()
  @Min(0)
  chunkIndex: number;

  @ApiProperty({ description: "Total number of chunks for this file" })
  @IsInt()
  @Min(1)
  totalChunks: number;

  @ApiProperty({
    description: "Hash of the original file content for change detection",
  })
  @IsString()
  fileHash: string;

  @ApiProperty({
    description: "Detected code features (e.g., class, function, async)",
  })
  @IsArray()
  @IsString({ each: true })
  features: string[];
}

/**
 * DTO for uploading pre-processed chunks from client (MCP/CLI)
 * This enables remote indexing where the client scans locally and sends chunks to the server
 */
export class UploadChunksDto {
  @ApiProperty({ description: "Project UUID to associate chunks with" })
  @IsUUID()
  projectId: string;

  @ApiProperty({
    description: "Array of pre-processed code chunks",
    type: [CodeChunkUploadDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CodeChunkUploadDto)
  chunks: CodeChunkUploadDto[];

  @ApiPropertyOptional({
    description:
      "If true and this is the first batch, deletes existing chunks first",
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  forceReindex?: boolean;

  @ApiPropertyOptional({
    description: "Batch number for progress tracking (1-indexed)",
    default: 1,
  })
  @IsInt()
  @IsOptional()
  @Min(1)
  batchNumber?: number;

  @ApiPropertyOptional({
    description: "Total number of batches being uploaded",
    default: 1,
  })
  @IsInt()
  @IsOptional()
  @Min(1)
  totalBatches?: number;
}

/**
 * Response after uploading chunks
 */
export class UploadChunksResponseDto {
  @ApiProperty({ description: "Whether the operation was successful" })
  success: boolean;

  @ApiProperty({ description: "Number of chunks received in this batch" })
  chunksReceived: number;

  @ApiProperty({ description: "Number of chunks stored (after deduplication)" })
  chunksStored: number;

  @ApiProperty({ description: "Number of embeddings generated" })
  embeddingsGenerated: number;

  @ApiProperty({ description: "Current batch number" })
  batchNumber: number;

  @ApiProperty({ description: "Total batches expected" })
  totalBatches: number;

  @ApiProperty({ description: "Whether all batches have been received" })
  isComplete: boolean;

  @ApiPropertyOptional({ description: "Error message if any" })
  error?: string;
}
