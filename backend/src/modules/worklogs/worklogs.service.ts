import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Worklog } from './entities/worklog.entity';
import {
  CreateWorklogDto,
  UpdateWorklogDto,
  WorklogFilterDto,
} from './dto/worklog.dto';

@Injectable()
export class WorklogsService {
  constructor(
    @InjectRepository(Worklog)
    private readonly worklogRepository: Repository<Worklog>,
  ) {}

  async create(createWorklogDto: CreateWorklogDto): Promise<Worklog> {
    const worklog = this.worklogRepository.create({
      ...createWorklogDto,
      loggedAt: new Date(createWorklogDto.loggedAt),
    });
    return this.worklogRepository.save(worklog);
  }

  async findAll(filters?: WorklogFilterDto): Promise<Worklog[]> {
    const where: any = {};

    if (filters?.clientId) {
      where.clientId = filters.clientId;
    }

    if (filters?.taskId) {
      where.taskId = filters.taskId;
    }

    if (filters?.from && filters?.to) {
      where.loggedAt = Between(new Date(filters.from), new Date(filters.to));
    } else if (filters?.from) {
      where.loggedAt = MoreThanOrEqual(new Date(filters.from));
    } else if (filters?.to) {
      where.loggedAt = LessThanOrEqual(new Date(filters.to));
    }

    return this.worklogRepository.find({
      where,
      relations: ['client', 'task'],
      order: { loggedAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Worklog> {
    const worklog = await this.worklogRepository.findOne({
      where: { id },
      relations: ['client', 'task'],
    });

    if (!worklog) {
      throw new NotFoundException(`Worklog con ID ${id} no encontrado`);
    }

    return worklog;
  }

  async findByClient(clientId: string, limit = 20): Promise<Worklog[]> {
    return this.worklogRepository.find({
      where: { clientId },
      relations: ['task'],
      order: { loggedAt: 'DESC' },
      take: limit,
    });
  }

  async update(id: string, updateWorklogDto: UpdateWorklogDto): Promise<Worklog> {
    const worklog = await this.findOne(id);

    if (updateWorklogDto.loggedAt) {
      updateWorklogDto.loggedAt = new Date(updateWorklogDto.loggedAt) as any;
    }

    Object.assign(worklog, updateWorklogDto);
    return this.worklogRepository.save(worklog);
  }

  async remove(id: string): Promise<void> {
    const worklog = await this.findOne(id);
    await this.worklogRepository.remove(worklog);
  }

  // Métodos para AI y reportes
  async getHoursLoggedThisWeek(clientId: string): Promise<number> {
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const result = await this.worklogRepository
      .createQueryBuilder('worklog')
      .select('SUM(worklog.durationMinutes)', 'totalMinutes')
      .where('worklog.clientId = :clientId', { clientId })
      .andWhere('worklog.loggedAt >= :startOfWeek', { startOfWeek })
      .getRawOne();

    return Math.round((result?.totalMinutes || 0) / 60 * 10) / 10;
  }

  async getRecentByClient(clientId: string, days = 7): Promise<Worklog[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    return this.worklogRepository.find({
      where: {
        clientId,
        loggedAt: MoreThanOrEqual(since),
      },
      relations: ['task'],
      order: { loggedAt: 'DESC' },
    });
  }
}
