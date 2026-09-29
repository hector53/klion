import { Module } from "@nestjs/common";
import { PublicController } from "./public.controller";
import { PublicService } from "./public.service";
import { ProjectsModule } from "../projects/projects.module";
import { TasksModule } from "../tasks/tasks.module";

@Module({
  imports: [ProjectsModule, TasksModule],
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicModule {}
