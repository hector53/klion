import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { NotificationsService } from "./notifications.service";

@Controller("notifications")
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
  ) {}

  @Get()
  async findAll(
    @CurrentUser("id") userId: string,
    @Query("includeRead") includeRead?: string,
    @Query("limit") limit?: string,
  ) {
    const notifications = await this.notificationsService.findAll(userId, {
      includeRead: includeRead === "true",
      limit: limit ? parseInt(limit, 10) : undefined,
    });
    return { success: true, notifications };
  }

  @Get("unread-count")
  async getUnreadCount(@CurrentUser("id") userId: string) {
    const count = await this.notificationsService.getUnreadCount(userId);
    return { success: true, count };
  }

  @Patch(":id/read")
  async markAsRead(
    @CurrentUser("id") userId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    const notification = await this.notificationsService.markAsRead(id, userId);
    return { success: true, notification };
  }

  @Patch("read-all")
  async markAllAsRead(@CurrentUser("id") userId: string) {
    const count = await this.notificationsService.markAllAsRead(userId);
    return { success: true, message: `${count} notifications marked as read` };
  }
}
