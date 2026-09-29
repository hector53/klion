import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString, MaxLength } from 'class-validator';
import { SnapshotType, SnapshotPayload } from '../entities/snapshot.entity';

export class CreateSnapshotDto {
  @ApiPropertyOptional({
    example: 'Snapshot antes de vacaciones',
    description: 'Nombre personalizado (opcional, se genera automáticamente)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;
}

export class SnapshotResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  capturedAt: Date;

  @ApiProperty({ enum: SnapshotType })
  type: SnapshotType;

  @ApiProperty()
  createdAt: Date;
}

export class SnapshotDetailResponseDto extends SnapshotResponseDto {
  @ApiProperty({ description: 'Payload completo del snapshot' })
  payload: SnapshotPayload;
}

export class SnapshotFilterDto {
  @ApiPropertyOptional({ description: 'Fecha desde (ISO)' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'Fecha hasta (ISO)' })
  @IsOptional()
  @IsDateString()
  to?: string;
}
