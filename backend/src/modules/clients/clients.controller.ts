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
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
  ApiSecurity,
} from '@nestjs/swagger';
import { JwtOrServiceKeyGuard } from '../auth/guards/jwt-or-service-key.guard';
import { ClientsService } from './clients.service';
import {
  CreateClientDto,
  UpdateClientDto,
  ClientFilterDto,
  ClientResponseDto,
} from './dto/client.dto';

@ApiTags('clients')
@ApiBearerAuth()
@ApiSecurity('service-key')
@UseGuards(JwtOrServiceKeyGuard)
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo cliente' })
  @ApiResponse({ status: 201, type: ClientResponseDto })
  create(@Body() createClientDto: CreateClientDto) {
    return this.clientsService.create(createClientDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos los clientes' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  @ApiQuery({ name: 'spaceId', required: false, type: String })
  @ApiResponse({ status: 200, type: [ClientResponseDto] })
  findAll(@Query() filters: ClientFilterDto) {
    return this.clientsService.findAll(filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un cliente por ID' })
  @ApiResponse({ status: 200, type: ClientResponseDto })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.clientsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un cliente' })
  @ApiResponse({ status: 200, type: ClientResponseDto })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateClientDto: UpdateClientDto,
  ) {
    return this.clientsService.update(id, updateClientDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un cliente (soft delete)' })
  @ApiResponse({ status: 200, type: ClientResponseDto })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.clientsService.softDelete(id);
  }

  @Delete(':id/permanent')
  @ApiOperation({ summary: 'Eliminar permanentemente un cliente' })
  @ApiResponse({ status: 204, description: 'Cliente eliminado' })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  permanentRemove(@Param('id', ParseUUIDPipe) id: string) {
    return this.clientsService.remove(id);
  }
}
