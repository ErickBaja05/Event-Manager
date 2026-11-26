import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
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
  find: jest.Mock<Promise<T[]>, [unknown]>;
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

  describe('Mantenimiento Preventivo (Robustez, Validacion y Sanitizacion)', () => {
    it('lanza BadRequestException cuando el payload excede el limite maximo de 64 KB', async () => {
      const oversizedPayload = { data: 'a'.repeat(70000) };
      await expect(
        service.registerEvent({
          ...baseDto,
          action: 'CREATE',
          payload: oversizedPayload,
        }),
      ).rejects.toThrow(BadRequestException);

      expect(createRepo.save).not.toHaveBeenCalled();
    });

    it('lanza InternalServerErrorException cuando falla la persistencia en SQLite', async () => {
      createRepo.save.mockRejectedValueOnce(new Error('SQLite disk I/O lock error'));
      await expect(
        service.registerEvent({ ...baseDto, action: 'CREATE' }),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('sanitiza parametro source eliminando espacios y realizando busqueda', async () => {
      const result = await service.findBySource('  test-crud  ');
      expect(result).toBeDefined();
      expect(createRepo.find).toHaveBeenCalledWith({
        where: { source: 'test-crud' },
      });
    });

    it('lanza BadRequestException si source esta vacio, excede 64 chars o contiene caracteres invalidos', async () => {
      await expect(service.findBySource('')).rejects.toThrow(BadRequestException);
      await expect(service.findBySource('   ')).rejects.toThrow(BadRequestException);
      await expect(service.findBySource('x'.repeat(65))).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.findBySource('crud; DROP TABLE events;')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('sanitiza parametro entity eliminando espacios y realizando busqueda', async () => {
      const result = await service.findByEntity('  item  ');
      expect(result).toBeDefined();
      expect(createRepo.find).toHaveBeenCalledWith({
        where: { entity: 'item' },
      });
    });

    it('lanza BadRequestException si entity esta vacio, excede 64 chars o contiene caracteres invalidos', async () => {
      await expect(service.findByEntity('')).rejects.toThrow(BadRequestException);
      await expect(service.findByEntity('   ')).rejects.toThrow(BadRequestException);
      await expect(service.findByEntity('e'.repeat(65))).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.findByEntity('item<script>')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});