import {
  IsString,
  IsEnum,
  IsOptional,
  MaxLength,
  IsHexColor,
  IsInt,
  Min,
  IsBoolean,
} from 'class-validator';
import { SpaceType } from '../entities/space.entity';

export class UpdateSpaceDto {
  @IsString()
  @MaxLength(255)
  @IsOptional()
  name?: string;

  @IsEnum(SpaceType)
  @IsOptional()
  type?: SpaceType;

  @IsString()
  @MaxLength(50)
  @IsOptional()
  icon?: string;

  @IsHexColor()
  @IsOptional()
  color?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  position?: number;

  @IsBoolean()
  @IsOptional()
  isArchived?: boolean;
}
