import { IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProjectNoteDto {
  @ApiProperty({
    description: 'Rich text (HTML) content of the project scratchpad note',
    example: '<p>El botón de login no responde en móvil...</p>',
  })
  @IsString()
  content: string;
}

export class ProjectNoteResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  projectId: string;

  @ApiProperty()
  content: string;

  @ApiPropertyOptional()
  lastAnalyzedAt: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
