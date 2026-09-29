import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsDateString,
  IsArray,
  IsInt,
  IsObject,
  Min,
  MaxLength,
  IsBoolean,
} from "class-validator";
import { TaskStatus, TaskPriority, TaskType } from "../entities/task.entity";
import { SpaceType } from "../../spaces/entities/space.entity";
import { BooleanQuery } from "../../../common";

export class CreateTaskDto {
  @ApiPropertyOptional({
    example: "550e8400-e29b-41d4-a716-446655440000",
    description: "Required for work space, optional for personal space",
  })
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiPropertyOptional({
    example: "550e8400-e29b-41d4-a716-446655440001",
    description: "Required for personal space (area), optional for work space",
  })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiProperty({ example: "Implementar autenticación" })
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({ example: "Implementar login con OAuth2" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: TaskStatus, default: TaskStatus.TODO })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({ enum: TaskPriority, default: TaskPriority.MEDIUM })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({ enum: TaskType, default: TaskType.TASK })
  @IsOptional()
  @IsEnum(TaskType)
  type?: TaskType;

  @ApiPropertyOptional({ example: "2025-01-15" })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ example: ["feature", "auth"], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;

  @ApiPropertyOptional({
    example: { km_actual: 45000, km_objetivo: 50000 },
    description: "Custom metadata fields for domain-specific data",
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateTaskDto extends PartialType(CreateTaskDto) {}

export class MoveTaskDto {
  @ApiProperty({ enum: TaskStatus })
  @IsEnum(TaskStatus)
  status: TaskStatus;

  @ApiProperty({ example: 0, description: "Nueva posición en la columna" })
  @IsInt()
  @Min(0)
  position: number;
}

export class ReorderTasksDto {
  @ApiProperty({
    description: "Array de IDs de tareas en el nuevo orden",
    type: [String],
  })
  @IsArray()
  @IsUUID("4", { each: true })
  taskIds: string[];

  @ApiProperty({ enum: TaskStatus })
  @IsEnum(TaskStatus)
  status: TaskStatus;
}

export class TaskResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  clientId: string;

  @ApiPropertyOptional()
  projectId?: string;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty({ enum: TaskStatus })
  status: TaskStatus;

  @ApiProperty({ enum: TaskPriority })
  priority: TaskPriority;

  @ApiProperty({ enum: TaskType })
  type: TaskType;

  @ApiPropertyOptional()
  dueDate?: Date;

  @ApiPropertyOptional({ type: [String] })
  tags?: string[];

  @ApiProperty()
  position: number;

  @ApiProperty()
  isArchived: boolean;

  @ApiPropertyOptional({ description: "Custom metadata fields" })
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: "Sequential task number" })
  taskNumber?: number;

  @ApiPropertyOptional({
    description: "Human-readable task code (e.g., BEB-162 or #123)",
  })
  taskCode?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class PaginatedTaskResponseDto {
  @ApiProperty({ type: [TaskResponseDto] })
  tasks: TaskResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}

export class TaskFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  spaceId?: string;

  @ApiPropertyOptional({ enum: SpaceType })
  @IsOptional()
  @IsEnum(SpaceType)
  spaceType?: SpaceType;

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
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: TaskStatus })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({ enum: TaskPriority })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({ enum: TaskType })
  @IsOptional()
  @IsEnum(TaskType)
  type?: TaskType;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @BooleanQuery()
  @IsBoolean()
  isArchived?: boolean;

  @ApiPropertyOptional({
    example: "2026-07-06",
    description: "Filtra tareas creadas a partir de esta fecha (inclusive)",
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    example: "2026-07-06",
    description: "Filtra tareas creadas hasta esta fecha (inclusive)",
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;
}

export class BulkDeleteTasksDto {
  @ApiProperty({
    description: "Array de IDs de tareas a eliminar",
    type: [String],
  })
  @IsArray()
  @IsUUID("4", { each: true })
  ids: string[];
}

export class BoardFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiPropertyOptional({
    example: 50,
    description:
      "Máximo de tareas completadas a devolver (las más recientes por updatedAt). " +
      "0 = sin límite. El board de un tablero real acumula cientos de 'done' que " +
      "nadie mira, y devolverlas todas hacía que la respuesta no terminara nunca.",
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  doneLimit?: number;
}

/**
 * DTO for updating task metadata
 * Useful for partial updates to metadata without replacing the entire object
 */
export class UpdateTaskMetadataDto {
  @ApiProperty({
    example: { km_actual: 46000 },
    description: "Metadata fields to update (merged with existing)",
  })
  @IsObject()
  metadata: Record<string, any>;
}
