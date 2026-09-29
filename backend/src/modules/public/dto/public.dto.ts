import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsInt, IsOptional, IsString, Min } from "class-validator";
import { TaskStatus } from "../../tasks/entities/task.entity";

/**
 * Filters accepted by the public task list.
 *
 * Deliberately narrower than TaskFilterDto: there is no projectId/clientId here
 * because the project is fixed by the share token. Accepting either would let a
 * link holder pivot to another client's data.
 */
export class PublicTaskFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: TaskStatus })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 25 })
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;
}
