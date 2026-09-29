import { Injectable, NotFoundException } from "@nestjs/common";
import { ProjectsService } from "../projects/projects.service";
import { TasksService } from "../tasks/tasks.service";
import { Project } from "../projects/entities/project.entity";
import { Task, TaskStatus } from "../tasks/entities/task.entity";
import { PublicTaskFilterDto } from "./dto/public.dto";

/**
 * Read-only view of a single project for the client-facing share link.
 *
 * Everything here resolves the project from the share token first; no caller
 * input is ever used to pick the project. Responses are hand-built rather than
 * returning entities, so internal fields (the share token itself, client
 * contact details, project budget) never reach an unauthenticated caller.
 */
@Injectable()
export class PublicService {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly tasksService: TasksService,
  ) {}

  async getProject(token: string) {
    const project = await this.resolveProject(token);

    return {
      name: project.name,
      description: project.description,
      status: project.status,
      color: project.color,
      icon: project.icon,
      dueDate: project.dueDate,
      client: project.client ? { name: project.client.name } : null,
    };
  }

  async getBoard(token: string): Promise<Record<TaskStatus, Task[]>> {
    const project = await this.resolveProject(token);
    const board = await this.tasksService.getTasksGroupedByStatus({
      projectId: project.id,
    });

    return Object.fromEntries(
      Object.entries(board).map(([status, tasks]) => [
        status,
        tasks.map((task) => this.toPublicTask(task)),
      ]),
    ) as Record<TaskStatus, Task[]>;
  }

  async getTasks(token: string, filters: PublicTaskFilterDto) {
    const project = await this.resolveProject(token);
    const result = await this.tasksService.findAll({
      projectId: project.id,
      status: filters.status,
      search: filters.search,
      page: filters.page ?? 1,
      limit: filters.limit ?? 25,
      isArchived: false,
    });

    return {
      ...result,
      tasks: result.tasks.map((task) => this.toPublicTask(task)),
    };
  }

  private async resolveProject(token: string): Promise<Project> {
    const project = await this.projectsService.findByShareToken(token);
    if (!project) {
      throw new NotFoundException("Enlace no encontrado o desactivado");
    }
    return project;
  }

  /**
   * Whitelist of task fields safe to show a client. Notably drops `metadata`,
   * which is free-form and may hold internal notes.
   */
  private toPublicTask(task: Task): any {
    return {
      id: task.id,
      taskCode: task.taskCode,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      type: task.type,
      tags: task.tags,
      position: task.position,
      dueDate: task.dueDate,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      subtasks: (task.subtasks ?? []).map((subtask) => ({
        id: subtask.id,
        title: subtask.title,
        completed: subtask.completed,
        position: subtask.position,
      })),
    };
  }
}
