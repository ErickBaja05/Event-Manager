import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CreateEventEntity } from '../../database/entities/create-event.entity';
import { DeleteEventEntity } from '../../database/entities/delete-event.entity';
import { QueryEventEntity } from '../../database/entities/query-event.entity';
import { UpdateEventEntity } from '../../database/entities/update-event.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { EventsService } from './events.service';

interface MockRepo<T> {
  create: jest.Mock<T, [Partial<T>]>;
  save: jest.Mock<Promise<T>, [T]>;
  find: jest.Mock<Promise<T[]>, []>;
  findBy: jest.Mock<Promise<T[]>, [Partial<T>]>;
  count: jest.Mock<Promise<number>, []>;
}

function createMockRepo<T>(): MockRepo<T> {
  return {
    create: jest.fn((entity: Partial<T>) => entity as T),
    save: jest.fn((entity: T) => Promise.resolve(entity)),
    find: jest.fn(() => Promise.resolve([])),
    findBy: jest.fn(() => Promise.resolve([])),
    count: jest.fn(() => Promise.resolve(0)),
  };
}

describe('EventsService', () => {
  let service: EventsService;
  let createRepo: MockRepo<CreateEventEntity>;
  let updateRepo: MockRepo<UpdateEventEntity>;
  let deleteRepo: MockRepo<DeleteEventEntity>;
  let queryRepo: MockRepo<QueryEventEntity>;

  const baseDto: Omit<CreateEventDto, 'action'> = {
    source: 'test-crud',
    entity: 'item',
    title: 'Evento de prueba',
    description: 'Descripcion del evento',
    payload: { id: 1, name: 'Ejemplo' },
  };

  beforeEach(async () => {
    createRepo = createMockRepo<CreateEventEntity>();
    updateRepo = createMockRepo<UpdateEventEntity>();
    deleteRepo = createMockRepo<DeleteEventEntity>();
    queryRepo = createMockRepo<QueryEventEntity>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        {
          provide: getRepositoryToken(CreateEventEntity),
          useValue: createRepo,
        },
        {
          provide: getRepositoryToken(UpdateEventEntity),
          useValue: updateRepo,
        },
        {
          provide: getRepositoryToken(DeleteEventEntity),
          useValue: deleteRepo,
        },
        { provide: getRepositoryToken(QueryEventEntity), useValue: queryRepo },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
  });

  it('persists DELETE events with description in delete_events', async () => {
    const result = await service.registerEvent({
      ...baseDto,
      action: 'DELETE',
    });

    expect(result).toEqual({ ok: true });
    expect(deleteRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'test-crud',
        entity: 'item',
        action: 'DELETE',
        title: 'Evento de prueba',
        description: 'Descripcion del evento',
        payload: JSON.stringify({ id: 1, name: 'Ejemplo' }),
      }),
    );
    expect(deleteRepo.save).toHaveBeenCalledTimes(1);
    expect(deleteRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'DELETE',
        description: 'Descripcion del evento',
      }),
    );
  });

  it('handles lowercase delete action and persists it', async () => {
    const result = await service.registerEvent({
      ...baseDto,
      action: 'delete',
    });

    expect(result).toEqual({ ok: true });
    expect(deleteRepo.save).toHaveBeenCalledTimes(1);
  });

  it('keeps CREATE, UPDATE and QUERY working without regressions', async () => {
    await expect(
      service.registerEvent({ ...baseDto, action: 'CREATE' }),
    ).resolves.toEqual({ ok: true });
    await expect(
      service.registerEvent({ ...baseDto, action: 'UPDATE' }),
    ).resolves.toEqual({ ok: true });
    await expect(
      service.registerEvent({
        ...baseDto,
        action: 'QUERY',
        query_term: 'ejemplo',
      }),
    ).resolves.toEqual({ ok: true });

    expect(createRepo.save).toHaveBeenCalledTimes(1);
    expect(updateRepo.save).toHaveBeenCalledTimes(1);
    expect(queryRepo.save).toHaveBeenCalledTimes(1);
  });

  it('throws BadRequestException when action is unrecognized', async () => {
    await expect(
      service.registerEvent({ ...baseDto, action: 'INVALID' }),
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.registerEvent({ ...baseDto, action: '' }),
    ).rejects.toThrow(BadRequestException);

    expect(createRepo.save).not.toHaveBeenCalled();
    expect(updateRepo.save).not.toHaveBeenCalled();
    expect(deleteRepo.save).not.toHaveBeenCalled();
    expect(queryRepo.save).not.toHaveBeenCalled();
  });
});
