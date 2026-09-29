import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Task } from '../../tasks/entities/task.entity';

@Entity('subtasks')
export class Subtask {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'task_id' })
  taskId: string;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'boolean', default: false })
  completed: boolean;

  @Column({ type: 'int', default: 0 })
  position: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Task, (task) => task.subtasks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: Task;
}
