import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export enum SnapshotType {
  MANUAL = 'manual',
  AUTO = 'auto',
}

// Interface para el payload del snapshot
export interface SnapshotPayload {
  columns: {
    id: string;
    name: string;
    taskIds: string[];
  }[];
  tasks: Record<
    string,
    {
      id: string;
      clientId: string;
      clientName: string;
      title: string;
      description: string | null;
      status: string;
      priority: string;
      dueDate: string | null;
      tags: string[] | null;
      position: number;
    }
  >;
  metadata: {
    totalTasks: number;
    tasksByStatus: Record<string, number>;
    clientsWithTasks: string[];
  };
}

@Entity('snapshots')
export class Snapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'timestamp' })
  capturedAt: Date;

  @Column({
    type: 'enum',
    enum: SnapshotType,
    default: SnapshotType.MANUAL,
  })
  type: SnapshotType;

  @Column({ type: 'jsonb' })
  payload: SnapshotPayload;

  @CreateDateColumn()
  createdAt: Date;
}
