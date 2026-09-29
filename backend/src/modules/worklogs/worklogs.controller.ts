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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { WorklogsService } from './worklogs.service';
import {
  CreateWorklogDto,
  UpdateWorklogDto,
  WorklogResponseDto,
  WorklogFilterDto,
} from './dto/worklog.dto';

@ApiTags('worklogs')
@Controller('worklogs')
export class WorklogsController {
  constructor(private readonly worklogsService: WorklogsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo registro de trabajo' })
  @ApiResponse({ status: 201, type: WorklogResponseDto })
  create(@Body() createWorklogDto: CreateWorklogDto) {
    return this.worklogsService.create(createWorklogDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar registros de trabajo con filtros' })
  @ApiResponse({ status: 200, type: [WorklogResponseDto] })
  findAll(@Query() filters: WorklogFilterDto) {
    return this.worklogsService.findAll(filters);
  }

  @Get('client/:clientId')
  @ApiOperation({ summary: 'Obtener registros de trabajo de un cliente' })
  @ApiResponse({ status: 200, type: [WorklogResponseDto] })
  findByClient(
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Query('limit') limit?: number,
  ) {
    return this.worklogsService.findByClient(clientId, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un registro de trabajo por ID' })
  @ApiResponse({ status: 200, type: WorklogResponseDto })
  @ApiResponse({ status: 404, description: 'Worklog no encontrado' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.worklogsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un registro de trabajo' })
  @ApiResponse({ status: 200, type: WorklogResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateWorklogDto: UpdateWorklogDto,
  ) {
    return this.worklogsService.update(id, updateWorklogDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar un registro de trabajo' })
  @ApiResponse({ status: 204, description: 'Worklog eliminado' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.worklogsService.remove(id);
  }
}
