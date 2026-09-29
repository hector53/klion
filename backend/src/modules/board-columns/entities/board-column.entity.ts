import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

/**
 * BoardColumn - Columnas personalizables del tablero Kanban
 * 
 * Cada usuario puede tener sus propias columnas personalizadas.
 * Las columnas tienen un "key" que mapea al TaskStatus original si es una columna base,
 * o puede ser un key personalizado para columnas completamente nuevas.
 */
@Entity('board_columns')
export class BoardColumn {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ length: 100 })
  name: string;

  /**
   * key: Identificador único de la columna
   * - Para columnas base: 'todo', 'doing', 'blocked', 'done'
   * - Para columnas custom: UUID o slug generado
   */
  @Column({ length: 50 })
  key: string;

  /**
   * Color de fondo de la columna (formato hex o clase tailwind)
   */
  @Column({ length: 50, default: 'bg-gray-100' })
  color: string;

  /**
   * Posición en el board (para ordenar)
   */
  @Column({ type: 'int', default: 0 })
  position: number;

  /**
   * Si la columna está oculta (pero no eliminada)
   */
  @Column({ default: false })
  isHidden: boolean;

  /**
   * Si es una columna del sistema (todo, doing, blocked, done)
   * Las columnas del sistema no se pueden eliminar, solo ocultar
   */
  @Column({ default: false })
  isSystem: boolean;

  /**
   * Icon de lucide-react (opcional)
   */
  @Column({ length: 50, nullable: true })
  icon: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
