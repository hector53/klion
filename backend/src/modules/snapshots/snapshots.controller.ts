import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SnapshotsService } from './snapshots.service';
import {
  CreateSnapshotDto,
  SnapshotResponseDto,
  SnapshotDetailResponseDto,
  SnapshotFilterDto,
} from './dto/snapshot.dto';

@ApiTags('snapshots')
@Controller('snapshots')
export class SnapshotsController {
  constructor(private readonly snapshotsService: SnapshotsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un snapshot manual del board actual' })
  @ApiResponse({ status: 201, type: SnapshotDetailResponseDto })
  create(@Body() createSnapshotDto: CreateSnapshotDto) {
    return this.snapshotsService.create(createSnapshotDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos los snapshots (sin payload)' })
  @ApiResponse({ status: 200, type: [SnapshotResponseDto] })
  findAll(@Query() filters: SnapshotFilterDto) {
    return this.snapshotsService.findAll(filters);
  }

  @Get('today')
  @ApiOperation({ summary: 'Obtener snapshots de hoy' })
  @ApiResponse({ status: 200, type: [SnapshotResponseDto] })
  getTodaySnapshots() {
    return this.snapshotsService.getTodaySnapshots();
  }

  @Get('latest')
  @ApiOperation({ summary: 'Obtener el snapshot más reciente' })
  @ApiResponse({ status: 200, type: SnapshotDetailResponseDto })
  getLatest() {
    return this.snapshotsService.getLatest();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un snapshot por ID (con payload completo)' })
  @ApiResponse({ status: 200, type: SnapshotDetailResponseDto })
  @ApiResponse({ status: 404, description: 'Snapshot no encontrado' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.snapshotsService.findOne(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar un snapshot' })
  @ApiResponse({ status: 204, description: 'Snapshot eliminado' })
  @ApiResponse({ status: 404, description: 'Snapshot no encontrado' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.snapshotsService.remove(id);
  }
}
