import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from "@nestjs/swagger";
import { PublicService } from "./public.service";
import { PublicTaskFilterDto } from "./dto/public.dto";

/**
 * The only unauthenticated surface of the API (CBK-87).
 *
 * Read-only and scoped to whatever single project the share token resolves to.
 * Nothing here takes a project id, and there are no mutating routes — keep it
 * that way when adding endpoints.
 */
@ApiTags("public")
@Controller("public")
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get("project/:token")
  @ApiOperation({ summary: "Datos básicos del proyecto compartido" })
  @ApiParam({ name: "token", description: "Token del enlace público" })
  @ApiResponse({ status: 404, description: "Enlace no encontrado o desactivado" })
  getProject(@Param("token") token: string) {
    return this.publicService.getProject(token);
  }

  @Get("board/:token")
  @ApiOperation({ summary: "Tareas del proyecto compartido agrupadas por estado" })
  @ApiParam({ name: "token", description: "Token del enlace público" })
  @ApiResponse({ status: 404, description: "Enlace no encontrado o desactivado" })
  getBoard(@Param("token") token: string) {
    return this.publicService.getBoard(token);
  }

  @Get("tasks/:token")
  @ApiOperation({ summary: "Listado paginado de tareas del proyecto compartido" })
  @ApiParam({ name: "token", description: "Token del enlace público" })
  @ApiResponse({ status: 404, description: "Enlace no encontrado o desactivado" })
  getTasks(
    @Param("token") token: string,
    @Query() filters: PublicTaskFilterDto,
  ) {
    return this.publicService.getTasks(token, filters);
  }
}
