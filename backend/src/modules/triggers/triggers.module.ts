import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Trigger } from "./entities/trigger.entity";
import { TriggersService } from "./triggers.service";
import { TriggersController } from "./triggers.controller";
import { TriggersEvaluatorService } from "./triggers-evaluator.service";
import { NotificationsModule } from "../notifications/notifications.module";
import { TasksModule } from "../tasks/tasks.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Trigger]),
    NotificationsModule,
    TasksModule,
  ],
  controllers: [TriggersController],
  providers: [TriggersService, TriggersEvaluatorService],
  exports: [TriggersService],
})
export class TriggersModule {}
