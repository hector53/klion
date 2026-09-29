import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ProjectsController } from "./projects.controller";
import { ProjectsService } from "./projects.service";
import { Project } from "./entities/project.entity";
import { ProjectContext } from "./entities/project-context.entity";
import { ProjectNote } from "./entities/project-note.entity";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, ProjectContext, ProjectNote]),
    AuthModule,
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
