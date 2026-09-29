import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { File } from './entities/file.entity';
import { CreateFileDto, UpdateFileDto } from './dto/file.dto';

@Injectable()
export class FilesService {
  constructor(
    @InjectRepository(File)
    private readonly fileRepository: Repository<File>,
  ) {}

  async create(createFileDto: CreateFileDto): Promise<File> {
    const file = this.fileRepository.create(createFileDto);
    return this.fileRepository.save(file);
  }

  async findAll(clientId?: string): Promise<File[]> {
    const where = clientId ? { clientId } : {};
    return this.fileRepository.find({
      where,
      relations: ['client', 'task'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<File> {
    const file = await this.fileRepository.findOne({
      where: { id },
      relations: ['client', 'task'],
    });

    if (!file) {
      throw new NotFoundException(`Archivo con ID ${id} no encontrado`);
    }

    return file;
  }

  async findByClient(clientId: string): Promise<File[]> {
    return this.fileRepository.find({
      where: { clientId },
      relations: ['task'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByTask(taskId: string): Promise<File[]> {
    return this.fileRepository.find({
      where: { taskId },
      order: { createdAt: 'DESC' },
    });
  }

  async update(id: string, updateFileDto: UpdateFileDto): Promise<File> {
    const file = await this.findOne(id);
    Object.assign(file, updateFileDto);
    return this.fileRepository.save(file);
  }

  async remove(id: string): Promise<void> {
    const file = await this.findOne(id);
    await this.fileRepository.remove(file);
  }

  // Para AI
  async getRecentByClient(clientId: string, limit = 10): Promise<File[]> {
    return this.fileRepository.find({
      where: { clientId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
