import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Space, SpaceType } from './entities/space.entity';
import { CreateSpaceDto, UpdateSpaceDto } from './dto';

@Injectable()
export class SpacesService {
  constructor(
    @InjectRepository(Space)
    private readonly spacesRepository: Repository<Space>,
  ) {}

  /**
   * Create a new space for a user
   */
  async create(userId: string, createSpaceDto: CreateSpaceDto): Promise<Space> {
    // Get the next position
    const maxPosition = await this.spacesRepository
      .createQueryBuilder('space')
      .where('space.userId = :userId', { userId })
      .select('MAX(space.position)', 'max')
      .getRawOne();

    const space = this.spacesRepository.create({
      ...createSpaceDto,
      userId,
      position: createSpaceDto.position ?? (maxPosition?.max ?? -1) + 1,
    });

    return this.spacesRepository.save(space);
  }

  /**
   * Find all spaces for a user
   */
  async findAll(userId: string, includeArchived = false): Promise<Space[]> {
    const query = this.spacesRepository
      .createQueryBuilder('space')
      .where('space.userId = :userId', { userId })
      .orderBy('space.position', 'ASC');

    if (!includeArchived) {
      query.andWhere('space.isArchived = :isArchived', { isArchived: false });
    }

    return query.getMany();
  }

  /**
   * Find a single space by ID
   */
  async findOne(id: string, userId: string): Promise<Space> {
    const space = await this.spacesRepository.findOne({
      where: { id, userId },
      relations: ['clients', 'projects'],
    });

    if (!space) {
      throw new NotFoundException(`Space with ID ${id} not found`);
    }

    return space;
  }

  /**
   * Update a space
   */
  async update(
    id: string,
    userId: string,
    updateSpaceDto: UpdateSpaceDto,
  ): Promise<Space> {
    const space = await this.findOne(id, userId);

    Object.assign(space, updateSpaceDto);

    return this.spacesRepository.save(space);
  }

  /**
   * Delete a space (soft delete by archiving)
   */
  async remove(id: string, userId: string): Promise<void> {
    const space = await this.findOne(id, userId);

    // Don't allow deletion if space has active projects or clients
    const hasContent = await this.spacesRepository
      .createQueryBuilder('space')
      .leftJoin('space.projects', 'project')
      .leftJoin('space.clients', 'client')
      .where('space.id = :id', { id })
      .andWhere('(project.id IS NOT NULL OR client.id IS NOT NULL)')
      .getCount();

    if (hasContent > 0) {
      throw new ForbiddenException(
        'Cannot delete space with existing projects or clients. Archive it instead or move/delete the content first.',
      );
    }

    await this.spacesRepository.remove(space);
  }

  /**
   * Archive a space (soft delete)
   */
  async archive(id: string, userId: string): Promise<Space> {
    return this.update(id, userId, { isArchived: true });
  }

  /**
   * Unarchive a space
   */
  async unarchive(id: string, userId: string): Promise<Space> {
    return this.update(id, userId, { isArchived: false });
  }

  /**
   * Reorder spaces
   */
  async reorder(
    userId: string,
    spaceIds: string[],
  ): Promise<Space[]> {
    const spaces = await this.findAll(userId, true);

    // Verify all IDs belong to the user
    const userSpaceIds = new Set(spaces.map((s) => s.id));
    for (const id of spaceIds) {
      if (!userSpaceIds.has(id)) {
        throw new ForbiddenException(`Space ${id} not found or not owned by user`);
      }
    }

    // Update positions
    const updates = spaceIds.map((id, index) =>
      this.spacesRepository.update({ id, userId }, { position: index }),
    );

    await Promise.all(updates);

    return this.findAll(userId, true);
  }

  /**
   * Create default spaces for a new user
   */
  async createDefaultSpaces(userId: string): Promise<Space[]> {
    const defaultSpaces = [
      {
        name: 'Personal',
        type: SpaceType.PERSONAL,
        icon: '🏠',
        color: '#10B981', // Green
        position: 0,
      },
      {
        name: 'Trabajo',
        type: SpaceType.WORK,
        icon: '💼',
        color: '#3B82F6', // Blue
        position: 1,
      },
    ];

    const spaces = defaultSpaces.map((spaceData) =>
      this.spacesRepository.create({ ...spaceData, userId }),
    );

    return this.spacesRepository.save(spaces);
  }

  /**
   * Get space statistics
   */
  async getStats(id: string, userId: string) {
    const space = await this.findOne(id, userId);

    const stats = await this.spacesRepository
      .createQueryBuilder('space')
      .leftJoin('space.projects', 'project')
      .leftJoin('space.clients', 'client')
      .leftJoin('project.tasks', 'task')
      .where('space.id = :id', { id })
      .select([
        'COUNT(DISTINCT project.id) as projectCount',
        'COUNT(DISTINCT client.id) as clientCount',
        'COUNT(DISTINCT task.id) as taskCount',
        'COUNT(DISTINCT CASE WHEN task.status = \'todo\' THEN task.id END) as todoCount',
        'COUNT(DISTINCT CASE WHEN task.status = \'doing\' THEN task.id END) as doingCount',
        'COUNT(DISTINCT CASE WHEN task.status = \'done\' THEN task.id END) as doneCount',
      ])
      .getRawOne();

    return {
      space,
      stats: {
        projects: parseInt(stats.projectCount) || 0,
        clients: parseInt(stats.clientCount) || 0,
        tasks: {
          total: parseInt(stats.taskCount) || 0,
          todo: parseInt(stats.todoCount) || 0,
          doing: parseInt(stats.doingCount) || 0,
          done: parseInt(stats.doneCount) || 0,
        },
      },
    };
  }
}
