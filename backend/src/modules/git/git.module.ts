import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GitService } from './git.service';
import { GitController } from './git.controller';
import { ProjectsModule } from '../projects/projects.module';
import { TasksModule } from '../tasks/tasks.module';

@Module({
  imports: [
    ConfigModule,
    forwardRef(() => ProjectsModule),
    forwardRef(() => TasksModule),
  ],
  controllers: [GitController],
  providers: [GitService],
  exports: [GitService],
})
export class GitModule {}
