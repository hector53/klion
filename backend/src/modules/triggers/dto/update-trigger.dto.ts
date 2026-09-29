import {
  IsString,
  IsEnum,
  IsOptional,
  IsUUID,
  IsObject,
  IsBoolean,
  MaxLength,
} from "class-validator";
import { TriggerType, TriggerAction } from "../entities/trigger.entity";

export class UpdateTriggerDto {
  @IsString()
  @MaxLength(255)
  @IsOptional()
  name?: string;

  @IsEnum(TriggerType)
  @IsOptional()
  type?: TriggerType;

  @IsUUID()
  @IsOptional()
  taskId?: string;

  @IsObject()
  @IsOptional()
  condition?: Record<string, any>;

  @IsEnum(TriggerAction)
  @IsOptional()
  action?: TriggerAction;

  @IsObject()
  @IsOptional()
  actionConfig?: Record<string, any>;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
