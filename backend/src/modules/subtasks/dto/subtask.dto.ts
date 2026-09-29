import { IsString, IsNotEmpty, IsBoolean, IsOptional, IsInt, IsUUID } from 'class-validator';

export class CreateSubtaskDto {
  @IsUUID()
  @IsNotEmpty()
  taskId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsBoolean()
  @IsOptional()
  completed?: boolean;

  @IsInt()
  @IsOptional()
  position?: number;
}

export class UpdateSubtaskDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsBoolean()
  @IsOptional()
  completed?: boolean;

  @IsInt()
  @IsOptional()
  position?: number;
}

export class ReorderSubtasksDto {
  @IsUUID('4', { each: true })
  subtaskIds: string[];
}
