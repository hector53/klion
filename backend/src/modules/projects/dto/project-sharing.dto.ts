import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean } from "class-validator";

export class UpdateProjectSharingDto {
  @ApiProperty({
    example: true,
    description: "Whether the read-only public link is active",
  })
  @IsBoolean()
  enabled: boolean;
}
