import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsDateString,
  IsInt,
  Min,
} from 'class-validator';

export class CreateWorklogDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  clientId: string;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440001' })
  @IsOptional()
  @IsUUID()
  taskId?: string;

  @ApiProperty({ example: '2025-01-08T14:30:00Z' })
  @IsDateString()
  loggedAt: string;

  @ApiPropertyOptional({ example: 120, description: 'Duración en minutos' })
  @IsOptional()
  @IsInt()
  @Min(1)
  durationMinutes?: number;

  @ApiProperty({ example: 'Reunión de kick-off del proyecto' })
  @IsString()
  note: string;
}

export class UpdateWorklogDto extends PartialType(CreateWorklogDto) {}

export class WorklogResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  clientId: string;

  @ApiPropertyOptional()
  taskId?: string;

  @ApiProperty()
  loggedAt: Date;

  @ApiPropertyOptional()
  durationMinutes?: number;

  @ApiProperty()
  note: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class WorklogFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  taskId?: string;

  @ApiPropertyOptional({ description: 'Fecha desde (ISO)' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'Fecha hasta (ISO)' })
  @IsOptional()
  @IsDateString()
  to?: string;
}
