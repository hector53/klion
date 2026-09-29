import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiSecurity,
} from "@nestjs/swagger";
import { JwtOrServiceKeyGuard } from "../auth/guards/jwt-or-service-key.guard";
import { TasksService } from "./tasks.service";
import {
  CreateTaskDto,
  UpdateTaskDto,
  MoveTaskDto,
  ReorderTasksDto,
  TaskResponseDto,
  TaskFilterDto,
  BoardFilterDto,
  BulkDeleteTasksDto,
} from "./dto/task.dto";

@ApiTags("tasks")
@ApiBearerAuth()
@ApiSecurity("service-key")
@UseGuards(JwtOrServiceKeyGuard)
@Controller("tasks")
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @ApiOperation({ summary: "Crear una nueva tarea" })
  @ApiResponse({ status: 201, type: TaskResponseDto })
  create(@Body() createTaskDto: CreateTaskDto) {
    return this.tasksService.create(createTaskDto);
  }

  @Get()
  @ApiOperation({ summary: "Listar todas las tareas con filtros opcionales" })
  @ApiResponse({ status: 200, type: [TaskResponseDto] })
  findAll(@Query() filters: TaskFilterDto) {
    return this.tasksService.findAll(filters);
  }

  /**
   * Tope por defecto de la columna "done" en la respuesta HTTP del board.
   * Se aplica acá y no en el service para que los llamadores internos que sí necesitan
   * el board completo (snapshots) no queden recortados sin enterarse.
   */
  private static readonly DEFAULT_BOARD_DONE_LIMIT = 50;

  @Get("board")
  @ApiOperation({
    summary: "Obtener tareas agrupadas por estado (para kanban)",
    description:
      "Las columnas activas (todo/doing/blocked) vienen completas. La columna 'done' " +
      "se recorta a las `doneLimit` más recientes (default 50, 0 = sin límite) porque " +
      "acumula sin techo y hacía que la respuesta no terminara nunca.",
  })
  @ApiResponse({ status: 200, description: "Tareas agrupadas por columna" })
  getBoard(@Query() filters: BoardFilterDto) {
    return this.tasksService.getTasksGroupedByStatus({
      ...filters,
      doneLimit:
        filters.doneLimit ?? TasksController.DEFAULT_BOARD_DONE_LIMIT,
    });
  }

  @Get("client/:clientId")
  @ApiOperation({ summary: "Obtener tareas de un cliente específico" })
  @ApiResponse({ status: 200, type: [TaskResponseDto] })
  findByClient(@Param("clientId", ParseUUIDPipe) clientId: string) {
    return this.tasksService.findByClient(clientId);
  }

  @Get("by-code/:code")
  @ApiOperation({
    summary: "Buscar tarea por código (e.g., BEB-162 o #123)",
  })
  @ApiResponse({ status: 200, type: TaskResponseDto })
  @ApiResponse({ status: 404, description: "Tarea no encontrada" })
  findByCode(@Param("code") code: string) {
    return this.tasksService.findByCode(code);
  }

  @Get(":id")
  @ApiOperation({ summary: "Obtener una tarea por ID o código" })
  @ApiResponse({ status: 200, type: TaskResponseDto })
  @ApiResponse({ status: 404, description: "Tarea no encontrada" })
  findOne(@Param("id") id: string) {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(id)) {
      return this.tasksService.findOne(id);
    }
    return this.tasksService.findByCode(id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Actualizar una tarea" })
  @ApiResponse({ status: 200, type: TaskResponseDto })
  @ApiResponse({ status: 404, description: "Tarea no encontrada" })
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() updateTaskDto: UpdateTaskDto,
  ) {
    return this.tasksService.update(id, updateTaskDto);
  }

  @Patch(":id/move")
  @ApiOperation({ summary: "Mover tarea a otra columna/posición" })
  @ApiResponse({ status: 200, type: TaskResponseDto })
  @ApiResponse({ status: 404, description: "Tarea no encontrada" })
  move(@Param("id", ParseUUIDPipe) id: string, @Body() moveDto: MoveTaskDto) {
    return this.tasksService.move(id, moveDto);
  }

  @Post("reorder")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Reordenar múltiples tareas de una columna" })
  @ApiResponse({ status: 204, description: "Tareas reordenadas" })
  reorder(@Body() reorderDto: ReorderTasksDto) {
    return this.tasksService.reorder(reorderDto);
  }

  @Delete("completed")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Archivar todas las tareas completadas" })
  @ApiResponse({ status: 204, description: "Tareas completadas archivadas" })
  removeCompleted() {
    return this.tasksService.removeCompleted();
  }

  @Post("bulk-delete")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Eliminar permanentemente varias tareas por ID (borrado masivo). IDs inexistentes se ignoran.",
  })
  @ApiResponse({
    status: 200,
    description: "Cantidad de tareas eliminadas",
    schema: { properties: { deleted: { type: "number" } } },
  })
  bulkRemove(@Body() bulkDeleteDto: BulkDeleteTasksDto) {
    return this.tasksService.bulkRemove(bulkDeleteDto.ids);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Eliminar una tarea" })
  @ApiResponse({ status: 204, description: "Tarea eliminada" })
  @ApiResponse({ status: 404, description: "Tarea no encontrada" })
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.tasksService.remove(id);
  }
}
