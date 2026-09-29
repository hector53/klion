import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubtasksController } from './subtasks.controller';
import { SubtasksService } from './subtasks.service';
import { Subtask } from './entities/subtask.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Subtask])],
  controllers: [SubtasksController],
  providers: [SubtasksService],
  exports: [SubtasksService],
})
export class SubtasksModule {}
