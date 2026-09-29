import {
  IsString,
  IsEnum,
  IsOptional,
  MaxLength,
  IsHexColor,
  IsInt,
  Min,
} from 'class-validator';
import { SpaceType } from '../entities/space.entity';

export class CreateSpaceDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsEnum(SpaceType)
  @IsOptional()
  type?: SpaceType = SpaceType.PERSONAL;

  @IsString()
  @MaxLength(50)
  @IsOptional()
  icon?: string;

  @IsHexColor()
  @IsOptional()
  color?: string = '#3B82F6';

  @IsInt()
  @Min(0)
  @IsOptional()
  position?: number = 0;
}
