import { Injectable, NotFoundException} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BoardColumn } from './entities/board-column.entity';
import { CreateBoardColumnDto, UpdateBoardColumnDto } from './dto/board-column.dto';
import { v4 as uuidv4 } from 'uuid';

// Columnas por defecto del sistema
const DEFAULT_COLUMNS = [
  { key: 'todo', name: 'Por hacer', color: 'bg-slate-100', position: 0, isSystem: true },
  { key: 'doing', name: 'En progreso', color: 'bg-blue-100', position: 1, isSystem: true },
  { key: 'blocked', name: 'Bloqueado', color: 'bg-red-100', position: 2, isSystem: true },
  { key: 'done', name: 'Completado', color: 'bg-green-100', position: 3, isSystem: true },
];

@Injectable()
export class BoardColumnsService {
  constructor(
    @InjectRepository(BoardColumn)
    private readonly boardColumnRepository: Repository<BoardColumn>,
  ) {}

  /**
   * Obtener todas las columnas del usuario (visible e invisibles)
   */
  async findAll(userId: string): Promise<BoardColumn[]> {
    return this.boardColumnRepository.find({
      where: { userId },
      order: { position: 'ASC' },
    });
  }

  /**
   * Obtener solo columnas visibles del usuario
   */
  async findVisible(userId: string): Promise<BoardColumn[]> {
    return this.boardColumnRepository.find({
      where: { userId, isHidden: false },
      order: { position: 'ASC' },
    });
  }

  /**
   * Obtener una columna por ID
   */
  async findOne(id: string, userId: string): Promise<BoardColumn> {
    const column = await this.boardColumnRepository.findOne({
      where: { id, userId },
    });

    if (!column) {
      throw new NotFoundException(`Columna con ID ${id} no encontrada`);
    }

    return column;
  }

  /**
   * Crear columnas por defecto para un usuario nuevo
   */
  async createDefaultColumns(userId: string): Promise<BoardColumn[]> {
    const columns = DEFAULT_COLUMNS.map((col) =>
      this.boardColumnRepository.create({
        ...col,
        userId,
      }),
    );

    return this.boardColumnRepository.save(columns);
  }

  /**
   * Crear una nueva columna personalizada
   */
  async create(userId: string, dto: CreateBoardColumnDto): Promise<BoardColumn> {
    // Si no hay key, generar uno único
    const key = dto.key || `custom_${uuidv4().substring(0, 8)}`;

    // Obtener la posición máxima actual
    const maxPositionResult = await this.boardColumnRepository
      .createQueryBuilder('column')
      .select('MAX(column.position)', 'maxPosition')
      .where('column.userId = :userId', { userId })
      .getRawOne();

    const position = dto.position ?? (maxPositionResult?.maxPosition ?? -1) + 1;

    const column = this.boardColumnRepository.create({
      userId,
      name: dto.name,
      key,
      color: dto.color || 'bg-gray-100',
      icon: dto.icon,
      position,
      isSystem: false,
      isHidden: false,
    });

    return this.boardColumnRepository.save(column);
  }

  /**
   * Actualizar una columna
   */
  async update(id: string, userId: string, dto: UpdateBoardColumnDto): Promise<BoardColumn> {
    const column = await this.findOne(id, userId);

    // Actualizar solo los campos proporcionados
    if (dto.name !== undefined) column.name = dto.name;
    if (dto.color !== undefined) column.color = dto.color;
    if (dto.icon !== undefined) column.icon = dto.icon;
    if (dto.position !== undefined) column.position = dto.position;
    if (dto.isHidden !== undefined) column.isHidden = dto.isHidden;

    return this.boardColumnRepository.save(column);
  }

  /**
   * Eliminar una columna (solo columnas no del sistema)
   */
  async delete(id: string, userId: string): Promise<void> {
    const column = await this.findOne(id, userId);

    if (column.isSystem) {
      throw new Error('No se pueden eliminar columnas del sistema. Solo puedes ocultarlas.');
    }

    await this.boardColumnRepository.remove(column);
  }

  /**
   * Reordenar columnas
   */
  async reorder(userId: string, columnIds: string[]): Promise<BoardColumn[]> {
    const updates = columnIds.map((id, index) => 
      this.boardColumnRepository.update(
        { id, userId },
        { position: index },
      ),
    );

    await Promise.all(updates);

    return this.findAll(userId);
  }

  /**
   * Toggle visibilidad de una columna
   */
  async toggleVisibility(id: string, userId: string): Promise<BoardColumn> {
    const column = await this.findOne(id, userId);
    column.isHidden = !column.isHidden;
    return this.boardColumnRepository.save(column);
  }

  /**
   * Verificar si el usuario tiene columnas, si no, crear las por defecto
   */
  async ensureUserHasColumns(userId: string): Promise<BoardColumn[]> {
    const existingColumns = await this.findAll(userId);
    
    if (existingColumns.length === 0) {
      return this.createDefaultColumns(userId);
    }
    
    return existingColumns;
  }
}
