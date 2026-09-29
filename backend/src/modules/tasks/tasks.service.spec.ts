import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ConflictException } from "@nestjs/common";
import { QueryFailedError } from "typeorm";
import { TasksService } from "./tasks.service";
import { Task } from "./entities/task.entity";

/**
 * Regression coverage for CBK-71: taskNumber must come from the atomic
 * next_task_number counter (UPDATE ... RETURNING inside a transaction),
 * never from a MAX(taskNumber) computed over a possibly-limited/filtered
 * task list, which is what caused number collisions in production.
 */
function makeDuplicateTaskNumberError(): QueryFailedError {
  const error = Object.create(QueryFailedError.prototype);
  (error as any).driverError = {
    code: "23505",
    constraint: "uq_tasks_project_task_number",
  };
  return error as QueryFailedError;
}

describe("TasksService - asignación de taskNumber", () => {
  let service: TasksService;
  let manager: {
    query: jest.Mock;
    createQueryBuilder: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
  };

  beforeEach(async () => {
    manager = {
      query: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ max: null }),
      }),
      create: jest.fn((_entity, data) => ({ ...data })),
      save: jest.fn(async (_entity, entity) => entity),
      findOne: jest.fn(),
    };

    const taskRepository = {
      manager: {
        transaction: jest.fn((cb: any) => cb(manager)),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: getRepositoryToken(Task), useValue: taskRepository },
      ],
    }).compile();

    service = moduleRef.get(TasksService);
  });

  it("asigna el taskNumber desde el UPDATE atómico sobre next_task_number, no desde un MAX() de tareas", async () => {
    manager.query.mockResolvedValueOnce([{ current_number: 199 }]);
    manager.findOne.mockResolvedValueOnce({
      id: "task-1",
      taskNumber: 199,
      project: { code: "VF" },
    });

    const result = await service.create({
      title: "Nueva tarea",
      projectId: "project-1",
    } as any);

    expect(result.taskNumber).toBe(199);

    const [sql] = manager.query.mock.calls[0];
    expect(sql).toMatch(/UPDATE projects/i);
    expect(sql).toMatch(/next_task_number/i);
    expect(sql).toMatch(/RETURNING/i);
  });

  it("reintenta ante colisión de unique constraint (23505) y asigna el siguiente número disponible", async () => {
    manager.query
      .mockResolvedValueOnce([{ current_number: 199 }])
      .mockResolvedValueOnce([{ current_number: 200 }]);

    manager.save
      .mockRejectedValueOnce(makeDuplicateTaskNumberError())
      .mockImplementationOnce(async (_entity, entity) => entity);

    manager.findOne.mockResolvedValueOnce({
      id: "task-1",
      taskNumber: 200,
      project: { code: "VF" },
    });

    const result = await service.create({
      title: "Nueva tarea",
      projectId: "project-1",
    } as any);

    expect(result.taskNumber).toBe(200);
    expect(manager.query).toHaveBeenCalledTimes(2);
    expect(manager.save).toHaveBeenCalledTimes(2);
  });

  it("lanza ConflictException si las colisiones persisten en todos los reintentos", async () => {
    manager.query.mockResolvedValue([{ current_number: 199 }]);
    manager.save.mockRejectedValue(makeDuplicateTaskNumberError());

    await expect(
      service.create({ title: "Nueva tarea", projectId: "project-1" } as any),
    ).rejects.toThrow(ConflictException);

    expect(manager.save).toHaveBeenCalledTimes(3);
  });
});
