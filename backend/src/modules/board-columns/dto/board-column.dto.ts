import { IsString, IsOptional, IsBoolean, IsInt, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBoardColumnDto {
  @ApiProperty({ description: 'Nombre de la columna', example: 'En Revisión' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ description: 'Clave única de la columna', example: 'review' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  key?: string;

  @ApiPropertyOptional({ description: 'Color de la columna', default: 'bg-gray-100' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  color?: string;

  @ApiPropertyOptional({ description: 'Icono de lucide-react', example: 'eye' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  icon?: string;

  @ApiPropertyOptional({ description: 'Posición de la columna', example: 5 })
  @IsInt()
  @IsOptional()
  position?: number;
}

export class UpdateBoardColumnDto {
  @ApiPropertyOptional({ description: 'Nombre de la columna' })
  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: 'Color de la columna' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  color?: string;

  @ApiPropertyOptional({ description: 'Icono de lucide-react' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  icon?: string;

  @ApiPropertyOptional({ description: 'Posición de la columna' })
  @IsInt()
  @IsOptional()
  position?: number;

  @ApiPropertyOptional({ description: 'Si la columna está oculta' })
  @IsBoolean()
  @IsOptional()
  isHidden?: boolean;
}

export class ReorderBoardColumnsDto {
  @ApiProperty({ description: 'IDs de columnas en nuevo orden', example: ['uuid1', 'uuid2'] })
  @IsString({ each: true })
  columnIds: string[];
}
