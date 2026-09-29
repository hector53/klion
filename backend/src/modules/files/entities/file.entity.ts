import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Client } from '../../clients/entities/client.entity';
import { Task } from '../../tasks/entities/task.entity';

export enum FileType {
  FILE = 'file',
  LINK = 'link',
}

@Entity('files')
export class File {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'client_id' })
  clientId: string;

  @Column({ name: 'task_id', nullable: true })
  taskId: string;

  @Column({
    type: 'enum',
    enum: FileType,
    default: FileType.LINK,
  })
  type: FileType;

  @Column({ length: 2048 })
  url: string;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Client, (client) => client.files, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @ManyToOne(() => Task, (task) => task.files, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'task_id' })
  task: Task;
}
