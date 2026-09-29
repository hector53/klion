import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Res,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { FilesService } from './files.service';
import {
  CreateFileDto,
  UpdateFileDto,
  FileResponseDto,
} from './dto/file.dto';

const UPLOADS_DIR = join(process.cwd(), 'uploads');

// Ensure uploads directory exists
if (!existsSync(UPLOADS_DIR)) {
  mkdirSync(UPLOADS_DIR, { recursive: true });
}

const imageFileFilter = (_req: any, file: Express.Multer.File, cb: any) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new BadRequestException('Only image files are allowed'), false);
  }
};

@ApiTags('files')
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload an image file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: 201, schema: { properties: { ok: { type: 'boolean' }, url: { type: 'string' } } } })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: UPLOADS_DIR,
        filename: (_req, file, cb) => {
          const uniqueName = `${Date.now()}-${randomUUID()}${extname(file.originalname || '.png')}`;
          cb(null, uniqueName);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
      fileFilter: imageFileFilter,
    }),
  )
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    return {
      ok: true,
      url: `/api/files/serve/${file.filename}`,
    };
  }

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo archivo/link' })
  @ApiResponse({ status: 201, type: FileResponseDto })
  create(@Body() createFileDto: CreateFileDto) {
    return this.filesService.create(createFileDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos los archivos/links' })
  @ApiQuery({ name: 'clientId', required: false })
  @ApiResponse({ status: 200, type: [FileResponseDto] })
  findAll(@Query('clientId') clientId?: string) {
    return this.filesService.findAll(clientId);
  }

  @Get('client/:clientId')
  @ApiOperation({ summary: 'Obtener archivos de un cliente' })
  @ApiResponse({ status: 200, type: [FileResponseDto] })
  findByClient(@Param('clientId', ParseUUIDPipe) clientId: string) {
    return this.filesService.findByClient(clientId);
  }

  @Get('serve/:filename')
  @ApiOperation({ summary: 'Serve an uploaded file by filename' })
  @ApiResponse({ status: 200, description: 'File content' })
  @ApiResponse({ status: 404, description: 'File not found' })
  serveUpload(@Param('filename') filename: string, @Res() res: Response) {
    // Sanitize: prevent path traversal
    const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '');
    const filePath = join(UPLOADS_DIR, safe);
    if (!existsSync(filePath)) {
      throw new NotFoundException('File not found');
    }
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return res.sendFile(filePath);
  }

  @Get('task/:taskId')
  @ApiOperation({ summary: 'Obtener archivos de una tarea' })
  @ApiResponse({ status: 200, type: [FileResponseDto] })
  findByTask(@Param('taskId', ParseUUIDPipe) taskId: string) {
    return this.filesService.findByTask(taskId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un archivo por ID' })
  @ApiResponse({ status: 200, type: FileResponseDto })
  @ApiResponse({ status: 404, description: 'Archivo no encontrado' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.filesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un archivo' })
  @ApiResponse({ status: 200, type: FileResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateFileDto: UpdateFileDto,
  ) {
    return this.filesService.update(id, updateFileDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar un archivo' })
  @ApiResponse({ status: 204, description: 'Archivo eliminado' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.filesService.remove(id);
  }
}
