import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BoardColumnsService } from './board-columns.service';
import { CreateBoardColumnDto, UpdateBoardColumnDto, ReorderBoardColumnsDto } from './dto/board-column.dto';
import { BoardColumn } from './entities/board-column.entity';

@ApiTags('Board Columns')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('board-columns')
export class BoardColumnsController {
  constructor(private readonly boardColumnsService: BoardColumnsService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener todas las columnas del usuario' })
  @ApiResponse({ status: 200, description: 'Lista de columnas' })
  async findAll(@Req() req: any): Promise<BoardColumn[]> {
    // Primero asegurarse de que el usuario tenga columnas
    return this.boardColumnsService.ensureUserHasColumns(req.user.id);
  }

  @Get('visible')
  @ApiOperation({ summary: 'Obtener solo columnas visibles del usuario' })
  @ApiResponse({ status: 200, description: 'Lista de columnas visibles' })
  async findVisible(@Req() req: any): Promise<BoardColumn[]> {
    // Asegurar columnas y luego filtrar visibles
    await this.boardColumnsService.ensureUserHasColumns(req.user.id);
    return this.boardColumnsService.findVisible(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una columna por ID' })
  @ApiResponse({ status: 200, description: 'Columna encontrada' })
  @ApiResponse({ status: 404, description: 'Columna no encontrada' })
  async findOne(@Param('id') id: string, @Req() req: any): Promise<BoardColumn> {
    return this.boardColumnsService.findOne(id, req.user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear una nueva columna personalizada' })
  @ApiResponse({ status: 201, description: 'Columna creada exitosamente' })
  async create(
    @Body() dto: CreateBoardColumnDto,
    @Req() req: any,
  ): Promise<BoardColumn> {
    return this.boardColumnsService.create(req.user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar una columna' })
  @ApiResponse({ status: 200, description: 'Columna actualizada' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateBoardColumnDto,
    @Req() req: any,
  ): Promise<BoardColumn> {
    return this.boardColumnsService.update(id, req.user.id, dto);
  }

  @Patch(':id/toggle-visibility')
  @ApiOperation({ summary: 'Toggle visibilidad de una columna' })
  @ApiResponse({ status: 200, description: 'Visibilidad cambiada' })
  async toggleVisibility(@Param('id') id: string, @Req() req: any): Promise<BoardColumn> {
    return this.boardColumnsService.toggleVisibility(id, req.user.id);
  }

  @Post('reorder')
  @ApiOperation({ summary: 'Reordenar columnas' })
  @ApiResponse({ status: 200, description: 'Columnas reordenadas' })
  async reorder(
    @Body() dto: ReorderBoardColumnsDto,
    @Req() req: any,
  ): Promise<BoardColumn[]> {
    return this.boardColumnsService.reorder(req.user.id, dto.columnIds);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una columna (solo personalizadas)' })
  @ApiResponse({ status: 200, description: 'Columna eliminada' })
  @ApiResponse({ status: 400, description: 'No se puede eliminar columna del sistema' })
  async delete(@Param('id') id: string, @Req() req: any): Promise<{ message: string }> {
    await this.boardColumnsService.delete(id, req.user.id);
    return { message: 'Columna eliminada exitosamente' };
  }
}
