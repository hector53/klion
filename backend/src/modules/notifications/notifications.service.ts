import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Notification, NotificationType } from "./entities/notification.entity";

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationsRepository: Repository<Notification>,
  ) {}

  async create(data: {
    userId: string;
    title: string;
    message?: string;
    type?: NotificationType;
    triggerId?: string;
    taskId?: string;
  }): Promise<Notification> {
    const notification = this.notificationsRepository.create({
      ...data,
      type: data.type || NotificationType.TRIGGER,
    });
    return this.notificationsRepository.save(notification);
  }

  async findAll(
    userId: string,
    options?: { limit?: number; includeRead?: boolean },
  ): Promise<Notification[]> {
    const query = this.notificationsRepository
      .createQueryBuilder("notification")
      .where("notification.userId = :userId", { userId })
      .leftJoinAndSelect("notification.task", "task")
      .orderBy("notification.createdAt", "DESC");

    if (!options?.includeRead) {
      query.andWhere("notification.isRead = :isRead", { isRead: false });
    }

    if (options?.limit) {
      query.take(options.limit);
    } else {
      query.take(50);
    }

    return query.getMany();
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationsRepository.count({
      where: { userId, isRead: false },
    });
  }

  async markAsRead(id: string, userId: string): Promise<Notification | null> {
    await this.notificationsRepository.update({ id, userId }, { isRead: true });
    return this.notificationsRepository.findOne({ where: { id, userId } });
  }

  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.notificationsRepository.update(
      { userId, isRead: false },
      { isRead: true },
    );
    return result.affected || 0;
  }
}
