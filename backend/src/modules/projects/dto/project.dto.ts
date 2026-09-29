import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsNumber,
  IsUUID,
  IsObject,
  Min,
  MaxLength,
  Matches,
} from "class-validator";
import { ProjectStatus, ProjectDomain } from "../entities/project.entity";

export class CreateProjectDto {
  @IsOptional()
  @IsUUID()
  spaceId?: string;

  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  code?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @IsOptional()
  @IsEnum(ProjectDomain)
  domain?: ProjectDomain;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: "Color must be a valid hex color (e.g., #3B82F6)",
  })
  color?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  budget?: number;

  @IsOptional()
  @IsNumber()
  position?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateProjectDto {
  @IsOptional()
  @IsUUID()
  spaceId?: string;

  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  code?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @IsOptional()
  @IsEnum(ProjectDomain)
  domain?: ProjectDomain;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: "Color must be a valid hex color (e.g., #3B82F6)",
  })
  color?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  budget?: number;

  @IsOptional()
  @IsNumber()
  position?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class ProjectFilterDto {
  @IsOptional()
  @IsUUID()
  spaceId?: string;

  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @IsOptional()
  @IsEnum(ProjectDomain)
  domain?: ProjectDomain;
}
