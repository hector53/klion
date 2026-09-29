import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subtask } from './entities/subtask.entity';
import { CreateSubtaskDto, UpdateSubtaskDto } from './dto/subtask.dto';

@Injectable()
export class SubtasksService {
  constructor(
    @InjectRepository(Subtask)
    private subtaskRepository: Repository<Subtask>,
  ) {}

  async findByTaskId(taskId: string): Promise<Subtask[]> {
    return this.subtaskRepository.find({
      where: { taskId },
      order: { position: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Subtask> {
    const subtask = await this.subtaskRepository.findOne({ where: { id } });
    if (!subtask) {
      throw new NotFoundException(`Subtask with ID ${id} not found`);
    }
    return subtask;
  }

  async create(createSubtaskDto: CreateSubtaskDto): Promise<Subtask> {
    // Obtener la posición máxima actual para esta tarea
    const maxPosition = await this.subtaskRepository
      .createQueryBuilder('subtask')
      .where('subtask.taskId = :taskId', { taskId: createSubtaskDto.taskId })
      .select('MAX(subtask.position)', 'max')
      .getRawOne();

    const subtask = this.subtaskRepository.create({
      ...createSubtaskDto,
      position: (maxPosition?.max ?? -1) + 1,
    });

    return this.subtaskRepository.save(subtask);
  }

  async update(id: string, updateSubtaskDto: UpdateSubtaskDto): Promise<Subtask> {
    const subtask = await this.findOne(id);
    Object.assign(subtask, updateSubtaskDto);
    return this.subtaskRepository.save(subtask);
  }

  async toggleComplete(id: string): Promise<Subtask> {
    const subtask = await this.findOne(id);
    subtask.completed = !subtask.completed;
    return this.subtaskRepository.save(subtask);
  }

  async remove(id: string): Promise<void> {
    const subtask = await this.findOne(id);
    await this.subtaskRepository.remove(subtask);
  }

  async reorder(taskId: string, subtaskIds: string[]): Promise<Subtask[]> {
    const subtasks = await this.findByTaskId(taskId);
    
    // Actualizar posiciones según el nuevo orden
    const updates = subtaskIds.map((id, index) => {
      return this.subtaskRepository.update(id, { position: index });
    });
    
    await Promise.all(updates);
    return this.findByTaskId(taskId);
  }
}
