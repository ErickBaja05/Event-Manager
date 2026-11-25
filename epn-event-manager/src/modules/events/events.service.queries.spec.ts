import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CreateEventEntity } from '../../database/entities/create-event.entity';
import { DeleteEventEntity } from '../../database/entities/delete-event.entity';
import { QueryEventEntity } from '../../database/entities/query-event.entity';
import { UpdateEventEntity } from '../../database/entities/update-event.entity';
import { EventsService } from './events.service';

type Row = Record<string, unknown>;

function repoWith(rows: Row[]) {
  return { find: jest.fn(() => Promise.resolve(rows)) };
}

describe('EventsService - consultas (perfectivo)', () => {
  let service: EventsService;
  let createRepo: ReturnType<typeof repoWith>;
  let updateRepo: ReturnType<typeof repoWith>;
  let deleteRepo: ReturnType<typeof repoWith>;
  let queryRepo: ReturnType<typeof repoWith>;

  beforeEach(async () => {
    // Fechas mezcladas a proposito: formato local legado e ISO UTC.
    createRepo = repoWith([
      {
        id: 1,
        source: 'a',
        entity: 'x',
        recorded_at: '5/5/2026, 2:21:04 p. m.',
      },
      {
        id: 2,
        source: 'a',
        entity: 'x',
        recorded_at: '2026-11-25T15:00:00.000Z',
      },
    ]);
    updateRepo = repoWith([
      { id: 1, source: 'b', entity: 'y', timestamp: '5/5/2026, 2:21:45 p. m.' },
    ]);
    deleteRepo = repoWith([]);
    queryRepo = repoWith([
      {
        id: 1,
        source: 'a',
        entity: 'x',
        event_date: '2026-06-01T10:00:00.000Z',
      },
    ]);

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

    service = module.get(EventsService);
  });

  it('findAll ordena cronologicamente y expone date y _table', async () => {
    const { items, total } = await service.findAll();

    expect(total).toBe(4);
    expect(items.map((e) => `${e._table}:${e.id}`)).toEqual([
      'create_events:1', // 5 de mayo, 2:21:04 p. m.
      'update_events:1', // 5 de mayo, 2:21:45 p. m.
      'query_events:1', // 1 de junio
      'create_events:2', // 25 de noviembre
    ]);
    expect(items.every((e) => typeof e.date === 'string')).toBe(true);
  });

  it('findAll sin parametros devuelve todo el historial', async () => {
    const { items } = await service.findAll({});
    expect(items).toHaveLength(4);
  });

  it('findAll pagina con limit y page y mantiene el total', async () => {
    const first = await service.findAll({ limit: 2, page: 1 });
    const second = await service.findAll({ limit: 2, page: 2 });
    const beyond = await service.findAll({ limit: 2, page: 3 });

    expect(first.total).toBe(4);
    expect(first.items.map((e) => `${e._table}:${e.id}`)).toEqual([
      'create_events:1',
      'update_events:1',
    ]);
    expect(second.items.map((e) => `${e._table}:${e.id}`)).toEqual([
      'query_events:1',
      'create_events:2',
    ]);
    expect(beyond.items).toEqual([]);
  });

  it('findAll usa limit 20 y page 1 por defecto cuando falta uno', async () => {
    expect((await service.findAll({ limit: 3 })).items).toHaveLength(3);
    expect((await service.findAll({ page: 1 })).items).toHaveLength(4);
  });

  it('findBySource y findByEntity filtran las 4 tablas con el mismo formato', async () => {
    const bySource = await service.findBySource('a');
    const byEntity = await service.findByEntity('y');

    for (const repo of [createRepo, updateRepo, deleteRepo, queryRepo]) {
      expect(repo.find).toHaveBeenCalledWith({ where: { source: 'a' } });
      expect(repo.find).toHaveBeenCalledWith({ where: { entity: 'y' } });
    }
    expect(bySource).toHaveLength(4);
    expect(byEntity).toHaveLength(4);
    expect((bySource as Row[])[0]).toHaveProperty('date');
    expect((bySource as Row[])[0]).toHaveProperty('_table');
  });
});
