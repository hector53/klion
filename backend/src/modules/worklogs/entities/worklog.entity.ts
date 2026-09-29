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

@Entity('worklogs')
export class Worklog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'client_id' })
  clientId: string;

  @Column({ name: 'task_id', nullable: true })
  taskId: string;

  @Column({ type: 'timestamp' })
  loggedAt: Date;

  @Column({ type: 'int', nullable: true })
  durationMinutes: number;

  @Column({ type: 'text' })
  note: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Client, (client) => client.worklogs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @ManyToOne(() => Task, (task) => task.worklogs, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'task_id' })
  task: Task;
}
