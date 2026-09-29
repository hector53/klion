import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiSecurity,
} from '@nestjs/swagger';
import { JwtOrServiceKeyGuard } from '../auth/guards/jwt-or-service-key.guard';
import { KnowledgeService } from './knowledge.service';
import {
  CreateKnowledgeDto,
  UpdateKnowledgeDto,
  KnowledgeFilterDto,
  SearchKnowledgeDto,
} from './dto/knowledge.dto';

@ApiTags('Knowledge')
@ApiBearerAuth()
@ApiSecurity('service-key')
@UseGuards(JwtOrServiceKeyGuard)
@Controller('knowledge')
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new knowledge entry',
    description:
      'Create a knowledge entry (snippet, flow, decision, pattern, solution, reference)',
  })
  @ApiResponse({ status: 201, description: 'Knowledge created successfully' })
  create(@Body() createDto: CreateKnowledgeDto) {
    return this.knowledgeService.create(createDto);
  }

  @Get()
  @ApiOperation({
    summary: 'List knowledge entries',
    description: 'Get all knowledge entries with optional filters',
  })
  findAll(@Query() filters: KnowledgeFilterDto) {
    return this.knowledgeService.findAll(filters);
  }

  @Get('search')
  @ApiOperation({
    summary: 'Search knowledge',
    description:
      'Search knowledge by text. Returns results sorted by relevance.',
  })
  @ApiQuery({ name: 'query', description: 'Search query', required: true })
  @ApiQuery({
    name: 'type',
    description: 'Filter by type',
    required: false,
    enum: ['snippet', 'flow', 'decision', 'pattern', 'solution', 'reference', 'other'],
  })
  @ApiQuery({ name: 'projectId', description: 'Filter by project', required: false })
  @ApiQuery({ name: 'clientId', description: 'Filter by client', required: false })
  @ApiQuery({ name: 'limit', description: 'Max results', required: false })
  search(@Query() searchDto: SearchKnowledgeDto) {
    return this.knowledgeService.search(searchDto);
  }

  @Get('tags')
  @ApiOperation({
    summary: 'Get all tags',
    description: 'Get all knowledge tags sorted by usage',
  })
  getAllTags() {
    return this.knowledgeService.getAllTags();
  }

  @Get('tags/popular')
  @ApiOperation({
    summary: 'Get popular tags',
    description: 'Get most used tags',
  })
  @ApiQuery({ name: 'limit', description: 'Max tags to return', required: false })
  getPopularTags(@Query('limit') limit?: number) {
    return this.knowledgeService.getPopularTags(limit);
  }

  @Get('project/:projectId')
  @ApiOperation({
    summary: 'Get knowledge by project',
    description: 'Get all knowledge entries related to a project',
  })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  findByProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query('limit') limit?: number,
  ) {
    return this.knowledgeService.findByProject(projectId, limit);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a knowledge entry',
    description: 'Get a specific knowledge entry by ID',
  })
  @ApiParam({ name: 'id', description: 'Knowledge UUID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    // Record access for analytics
    await this.knowledgeService.recordAccess(id);
    return this.knowledgeService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a knowledge entry',
    description: 'Update an existing knowledge entry',
  })
  @ApiParam({ name: 'id', description: 'Knowledge UUID' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateKnowledgeDto,
  ) {
    return this.knowledgeService.update(id, updateDto);
  }

  @Patch(':id/archive')
  @ApiOperation({
    summary: 'Archive a knowledge entry',
    description: 'Soft delete a knowledge entry by archiving it',
  })
  @ApiParam({ name: 'id', description: 'Knowledge UUID' })
  archive(@Param('id', ParseUUIDPipe) id: string) {
    return this.knowledgeService.archive(id);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a knowledge entry',
    description: 'Permanently delete a knowledge entry',
  })
  @ApiParam({ name: 'id', description: 'Knowledge UUID' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.knowledgeService.remove(id);
  }
}
