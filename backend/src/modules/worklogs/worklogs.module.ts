import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorklogsService } from './worklogs.service';
import { WorklogsController } from './worklogs.controller';
import { Worklog } from './entities/worklog.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Worklog])],
  controllers: [WorklogsController],
  providers: [WorklogsService],
  exports: [WorklogsService],
})
export class WorklogsModule {}
