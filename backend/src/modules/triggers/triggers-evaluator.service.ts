import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { TriggersService } from "./triggers.service";
import { NotificationsService } from "../notifications/notifications.service";
import { TasksService } from "../tasks/tasks.service";
import { Trigger, TriggerType, TriggerAction } from "./entities/trigger.entity";
import { NotificationType } from "../notifications/entities/notification.entity";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cronParser = require("cron-parser");
import { TaskStatus } from "../tasks/entities/task.entity";

@Injectable()
export class TriggersEvaluatorService {
  private readonly logger = new Logger(TriggersEvaluatorService.name);

  constructor(
    private readonly triggersService: TriggersService,
    private readonly notificationsService: NotificationsService,
    private readonly tasksService: TasksService,
  ) {}

  /**
   * Runs every minute to evaluate active triggers
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async evaluate() {
    try {
      const triggers = await this.triggersService.findActiveByType();
      let triggered = 0;

      for (const trigger of triggers) {
        try {
          const shouldFire = await this.shouldTriggerFire(trigger);
          if (shouldFire) {
            await this.executeTrigger(trigger);
            triggered++;
          }
        } catch (error) {
          this.logger.error(
            `Error evaluating trigger ${trigger.id}: ${error.message}`,
          );
        }
      }

      if (triggered > 0) {
        this.logger.log(
          `Evaluated ${triggers.length} triggers, fired ${triggered}`,
        );
      }
    } catch (error) {
      this.logger.error(`Error in trigger evaluation cycle: ${error.message}`);
    }
  }

  private async shouldTriggerFire(trigger: Trigger): Promise<boolean> {
    switch (trigger.type) {
      case TriggerType.TIME:
        return this.evaluateTimeTrigger(trigger);
      case TriggerType.RECURRING:
        return this.evaluateRecurringTrigger(trigger);
      case TriggerType.CONDITION:
        return this.evaluateConditionTrigger(trigger);
      default:
        return false;
    }
  }

  /**
   * Time trigger: fires once when datetime <= now
   */
  private evaluateTimeTrigger(trigger: Trigger): boolean {
    const datetime = trigger.condition?.datetime;
    if (!datetime) return false;

    const triggerTime = new Date(datetime);
    const now = new Date();

    // Fire if the time has passed and hasn't been triggered yet
    return triggerTime <= now && !trigger.lastTriggeredAt;
  }

  /**
   * Recurring trigger: fires based on cron expression
   */
  private evaluateRecurringTrigger(trigger: Trigger): boolean {
    const cronExpr = trigger.condition?.cron;
    if (!cronExpr) return false;

    try {
      const interval = cronParser.parseExpression(cronExpr);
      const prev = interval.prev().toDate();
      const now = new Date();

      // Check if the previous occurrence is within the last 90 seconds
      // (to account for cron job running every minute with some tolerance)
      const diffMs = now.getTime() - prev.getTime();
      if (diffMs > 90000) return false;

      // Check if we already triggered for this occurrence
      if (trigger.lastTriggeredAt) {
        const lastDiff = prev.getTime() - trigger.lastTriggeredAt.getTime();
        // If last triggered is within 60s of this occurrence, skip
        if (Math.abs(lastDiff) < 60000) return false;
      }

      return true;
    } catch {
      this.logger.warn(
        `Invalid cron expression for trigger ${trigger.id}: ${cronExpr}`,
      );
      return false;
    }
  }

  /**
   * Condition trigger: evaluates metadata field against value
   * condition: { field: "metadata.km_actual", operator: ">=", value: 50000 }
   */
  private async evaluateConditionTrigger(trigger: Trigger): Promise<boolean> {
    if (!trigger.taskId || !trigger.task) return false;

    const { field, operator, value } = trigger.condition;
    if (!field || !operator || value === undefined) return false;

    // Resolve the field value from the task
    const fieldValue = this.resolveFieldValue(trigger.task, field);
    if (fieldValue === undefined) return false;

    // Evaluate condition
    const conditionMet = this.evaluateCondition(fieldValue, operator, value);

    // Only fire if condition met and not already triggered recently (within 24h)
    if (!conditionMet) return false;

    if (trigger.lastTriggeredAt) {
      const hoursSinceLastTrigger =
        (Date.now() - trigger.lastTriggeredAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastTrigger < 24) return false;
    }

    return true;
  }

  /**
   * Resolve a dotted field path from a task object
   * e.g., "metadata.km_actual" => task.metadata.km_actual
   */
  private resolveFieldValue(obj: any, path: string): any {
    return path.split(".").reduce((current, key) => {
      return current?.[key];
    }, obj);
  }

  private evaluateCondition(
    fieldValue: any,
    operator: string,
    value: any,
  ): boolean {
    const numField = Number(fieldValue);
    const numValue = Number(value);

    switch (operator) {
      case "==":
      case "===":
        return fieldValue === value || fieldValue == value;
      case "!=":
      case "!==":
        return fieldValue !== value && fieldValue != value;
      case ">":
        return numField > numValue;
      case ">=":
        return numField >= numValue;
      case "<":
        return numField < numValue;
      case "<=":
        return numField <= numValue;
      case "contains":
        return String(fieldValue).includes(String(value));
      default:
        return false;
    }
  }

  /**
   * Execute the trigger's action
   */
  private async executeTrigger(trigger: Trigger): Promise<void> {
    this.logger.log(
      `Firing trigger "${trigger.name}" (${trigger.type}/${trigger.action})`,
    );

    switch (trigger.action) {
      case TriggerAction.NOTIFY:
        await this.executeNotifyAction(trigger);
        break;
      case TriggerAction.CREATE_TASK:
        await this.executeCreateTaskAction(trigger);
        break;
    }

    // Mark as triggered
    await this.triggersService.markTriggered(trigger.id);

    // Deactivate one-shot time triggers
    if (trigger.type === TriggerType.TIME) {
      await this.triggersService.deactivate(trigger.id);
    }
  }

  private async executeNotifyAction(trigger: Trigger): Promise<void> {
    const config = trigger.actionConfig || {};
    await this.notificationsService.create({
      userId: trigger.userId,
      title: config.title || trigger.name,
      message: config.message || `Trigger "${trigger.name}" fired`,
      type: NotificationType.TRIGGER,
      triggerId: trigger.id,
      taskId: trigger.taskId || undefined,
    });
  }

  private async executeCreateTaskAction(trigger: Trigger): Promise<void> {
    const config = trigger.actionConfig || {};

    await this.tasksService.create({
      title: config.title || `Auto: ${trigger.name}`,
      description: config.description,
      clientId: config.clientId,
      projectId: config.projectId,
      priority: config.priority || "medium",
      status: TaskStatus.TODO,
      tags: config.tags || ["auto-trigger"],
    });

    // Also notify about the auto-created task
    await this.notificationsService.create({
      userId: trigger.userId,
      title: `Tarea auto-creada: ${config.title || trigger.name}`,
      message: `Se creó automáticamente la tarea "${config.title || trigger.name}" por el trigger "${trigger.name}"`,
      type: NotificationType.TRIGGER,
      triggerId: trigger.id,
    });
  }
}
