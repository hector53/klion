import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Trigger } from "./entities/trigger.entity";
import { CreateTriggerDto } from "./dto/create-trigger.dto";
import { UpdateTriggerDto } from "./dto/update-trigger.dto";

@Injectable()
export class TriggersService {
  constructor(
    @InjectRepository(Trigger)
    private readonly triggersRepository: Repository<Trigger>,
  ) {}

  async create(
    userId: string,
    createTriggerDto: CreateTriggerDto,
  ): Promise<Trigger> {
    const trigger = this.triggersRepository.create({
      ...createTriggerDto,
      userId,
    });
    return this.triggersRepository.save(trigger);
  }

  async findAll(userId: string): Promise<Trigger[]> {
    return this.triggersRepository.find({
      where: { userId },
      relations: ["task"],
      order: { createdAt: "DESC" },
    });
  }

  async findOne(id: string, userId: string): Promise<Trigger> {
    const trigger = await this.triggersRepository.findOne({
      where: { id, userId },
      relations: ["task"],
    });

    if (!trigger) {
      throw new NotFoundException(`Trigger with ID ${id} not found`);
    }

    return trigger;
  }

  async update(
    id: string,
    userId: string,
    updateTriggerDto: UpdateTriggerDto,
  ): Promise<Trigger> {
    const trigger = await this.findOne(id, userId);
    Object.assign(trigger, updateTriggerDto);
    return this.triggersRepository.save(trigger);
  }

  async remove(id: string, userId: string): Promise<void> {
    const trigger = await this.findOne(id, userId);
    await this.triggersRepository.remove(trigger);
  }

  async toggle(id: string, userId: string): Promise<Trigger> {
    const trigger = await this.findOne(id, userId);
    trigger.isActive = !trigger.isActive;
    return this.triggersRepository.save(trigger);
  }

  async findActiveByType(type?: string): Promise<Trigger[]> {
    const query = this.triggersRepository
      .createQueryBuilder("trigger")
      .leftJoinAndSelect("trigger.task", "task")
      .where("trigger.isActive = :isActive", { isActive: true });

    if (type) {
      query.andWhere("trigger.type = :type", { type });
    }

    return query.getMany();
  }

  async markTriggered(id: string): Promise<void> {
    await this.triggersRepository.update(id, {
      lastTriggeredAt: new Date(),
    });
  }

  async deactivate(id: string): Promise<void> {
    await this.triggersRepository.update(id, { isActive: false });
  }
}
