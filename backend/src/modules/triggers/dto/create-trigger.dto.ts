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

export class CreateTriggerDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsEnum(TriggerType)
  @IsOptional()
  type?: TriggerType = TriggerType.TIME;

  @IsUUID()
  @IsOptional()
  taskId?: string;

  @IsObject()
  condition: Record<string, any>;

  @IsEnum(TriggerAction)
  @IsOptional()
  action?: TriggerAction = TriggerAction.NOTIFY;

  @IsObject()
  @IsOptional()
  actionConfig?: Record<string, any> = {};

  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;
}
