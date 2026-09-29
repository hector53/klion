import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { SubtasksService } from './subtasks.service';
import { CreateSubtaskDto, UpdateSubtaskDto, ReorderSubtasksDto } from './dto/subtask.dto';

@Controller('subtasks')
export class SubtasksController {
  constructor(private readonly subtasksService: SubtasksService) {}

  @Get('task/:taskId')
  findByTaskId(@Param('taskId', ParseUUIDPipe) taskId: string) {
    return this.subtasksService.findByTaskId(taskId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.subtasksService.findOne(id);
  }

  @Post()
  create(@Body() createSubtaskDto: CreateSubtaskDto) {
    return this.subtasksService.create(createSubtaskDto);
  }

  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSubtaskDto: UpdateSubtaskDto,
  ) {
    return this.subtasksService.update(id, updateSubtaskDto);
  }

  @Patch(':id/toggle')
  toggleComplete(@Param('id', ParseUUIDPipe) id: string) {
    return this.subtasksService.toggleComplete(id);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.subtasksService.remove(id);
  }

  @Post('task/:taskId/reorder')
  reorder(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() reorderDto: ReorderSubtasksDto,
  ) {
    return this.subtasksService.reorder(taskId, reorderDto.subtaskIds);
  }
}
