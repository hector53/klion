import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AiService } from "./ai.service";
import { AiController } from "./ai.controller";
import { GeminiService } from "./gemini.service";
import { AISettings } from "./entities/ai-settings.entity";
import { ClientsModule } from "../clients/clients.module";
import { TasksModule } from "../tasks/tasks.module";
import { WorklogsModule } from "../worklogs/worklogs.module";
import { FilesModule } from "../files/files.module";
import { ProjectsModule } from "../projects/projects.module";
import { KnowledgeModule } from "../knowledge/knowledge.module";
import { RagModule } from "../rag/rag.module";
import { UsersModule } from "../users/users.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([AISettings]),
    UsersModule,
    ClientsModule,
    TasksModule,
    WorklogsModule,
    FilesModule,
    forwardRef(() => ProjectsModule),
    forwardRef(() => KnowledgeModule),
    forwardRef(() => RagModule),
  ],
  controllers: [AiController],
  providers: [AiService, GeminiService],
  exports: [AiService, GeminiService],
})
export class AiModule {}
