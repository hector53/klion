import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from './entities/client.entity';
import { CreateClientDto, UpdateClientDto, ClientFilterDto } from './dto/client.dto';

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
  ) {}

  async create(createClientDto: CreateClientDto): Promise<Client> {
    const client = this.clientRepository.create(createClientDto);
    return this.clientRepository.save(client);
  }

  async findAll(filters?: ClientFilterDto): Promise<Client[]> {
    const where: {
      isActive?: boolean;
      spaceId?: string;
    } = {};

    if (!filters?.includeInactive) {
      where.isActive = true;
    }

    if (filters?.spaceId) {
      where.spaceId = filters.spaceId;
    }

    return this.clientRepository.find({
      where,
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Client> {
    const client = await this.clientRepository.findOne({
      where: { id },
      relations: ['tasks', 'worklogs', 'files'],
    });

    if (!client) {
      throw new NotFoundException(`Cliente con ID ${id} no encontrado`);
    }

    return client;
  }

  async update(id: string, updateClientDto: UpdateClientDto): Promise<Client> {
    const client = await this.findOne(id);
    Object.assign(client, updateClientDto);
    return this.clientRepository.save(client);
  }

  async remove(id: string): Promise<void> {
    const client = await this.findOne(id);
    await this.clientRepository.remove(client);
  }

  async softDelete(id: string): Promise<Client> {
    return this.update(id, { isActive: false });
  }

  // Para uso interno por otros módulos
  async findByIds(ids: string[]): Promise<Client[]> {
    return this.clientRepository.findByIds(ids);
  }

  async getActiveClientsWithOpenTasks(): Promise<Client[]> {
    return this.clientRepository
      .createQueryBuilder('client')
      .leftJoinAndSelect('client.tasks', 'task')
      .where('client.isActive = :isActive', { isActive: true })
      .andWhere('task.status != :status', { status: 'done' })
      .getMany();
  }
}
