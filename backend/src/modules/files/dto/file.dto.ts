import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { FileType } from '../entities/file.entity';

export class CreateFileDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  clientId: string;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440001' })
  @IsOptional()
  @IsUUID()
  taskId?: string;

  @ApiProperty({ enum: FileType, example: FileType.LINK })
  @IsEnum(FileType)
  type: FileType;

  @ApiProperty({ example: 'https://docs.google.com/document/d/...' })
  @IsUrl()
  url: string;

  @ApiProperty({ example: 'Documento de especificaciones' })
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({ example: 'Specs del módulo de pagos' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateFileDto extends PartialType(CreateFileDto) {}

export class FileResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  clientId: string;

  @ApiPropertyOptional()
  taskId?: string;

  @ApiProperty({ enum: FileType })
  type: FileType;

  @ApiProperty()
  url: string;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
