import { Module, OnModuleInit } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ScheduleModule } from "@nestjs/schedule";

import { DatabaseModule } from "./database/database.module";
import { SpacesModule } from "./modules/spaces/spaces.module";
import { ClientsModule } from "./modules/clients/clients.module";
import { TasksModule } from "./modules/tasks/tasks.module";
import { WorklogsModule } from "./modules/worklogs/worklogs.module";
import { FilesModule } from "./modules/files/files.module";
import { SnapshotsModule } from "./modules/snapshots/snapshots.module";
import { AiModule } from "./modules/ai/ai.module";
import { SubtasksModule } from "./modules/subtasks/subtasks.module";
import { ProjectsModule } from "./modules/projects/projects.module";
import { UsersModule } from "./modules/users/users.module";
import { AuthModule } from "./modules/auth/auth.module";
import { BoardColumnsModule } from "./modules/board-columns/board-columns.module";
import { KnowledgeModule } from "./modules/knowledge/knowledge.module";
import { RagModule } from "./modules/rag/rag.module";
import { GitModule } from "./modules/git/git.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { TriggersModule } from "./modules/triggers/triggers.module";
import { PublicModule } from "./modules/public/public.module";
import { UsersService } from "./modules/users/users.service";

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),

    // Scheduler for cron jobs (daily snapshots)
    ScheduleModule.forRoot(),

    // Database
    DatabaseModule,

    // Auth & Users
    UsersModule,
    AuthModule,

    // Core modules
    SpacesModule,

    // Feature modules
    ClientsModule,
    TasksModule,
    WorklogsModule,
    FilesModule,
    SnapshotsModule,
    AiModule,
    SubtasksModule,
    ProjectsModule,
    BoardColumnsModule,
    KnowledgeModule,
    RagModule,
    GitModule,
    NotificationsModule,
    TriggersModule,
    PublicModule,
  ],
})
export class AppModule implements OnModuleInit {
  constructor(private readonly usersService: UsersService) {}

  async onModuleInit() {
    // Seed master user on startup
    await this.usersService.createMasterUser();
  }
}
