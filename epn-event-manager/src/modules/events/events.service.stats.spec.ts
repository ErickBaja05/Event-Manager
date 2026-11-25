import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CreateEventEntity } from '../../database/entities/create-event.entity';
import { DeleteEventEntity } from '../../database/entities/delete-event.entity';
import { QueryEventEntity } from '../../database/entities/query-event.entity';
import { UpdateEventEntity } from '../../database/entities/update-event.entity';
import { EventsService } from './events.service';

type Row = Record<string, unknown>;

interface StatsResult {
  create: number;
  update: number;
  delete: number;
  query: number;
  total: number;
  by_source: Record<string, number>;
  by_entity: Record<string, number>;
  last_event: Row | null;
}

interface QueryBuilderMock {
  select: (expr: string) => QueryBuilderMock;
  addSelect: () => QueryBuilderMock;
  groupBy: () => QueryBuilderMock;
  getRawMany: () => Promise<Row[]>;
}

function statsRepo(
  count: number,
  last: Row | null,
  bySource: Row[],
  byEntity: Row[],
) {
  return {
    count: jest.fn(() => Promise.resolve(count)),
    findOne: jest.fn(() => Promise.resolve(last)),
    createQueryBuilder: jest.fn(() => {
      let column = '';
      const qb: QueryBuilderMock = {
        select: (expr: string) => {
          column = expr;
          return qb;
        },
        addSelect: () => qb,
        groupBy: () => qb,
        getRawMany: () =>
          Promise.resolve(column === 'e.source' ? bySource : byEntity),
      };
      return qb;
    }),
  };
}

async function buildService(repos: {
  create: ReturnType<typeof statsRepo>;
  update: ReturnType<typeof statsRepo>;
  del: ReturnType<typeof statsRepo>;
  query: ReturnType<typeof statsRepo>;
}): Promise<EventsService> {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      EventsService,
      {
        provide: getRepositoryToken(CreateEventEntity),
        useValue: repos.create,
      },
      {
        provide: getRepositoryToken(UpdateEventEntity),
        useValue: repos.update,
      },
      { provide: getRepositoryToken(DeleteEventEntity), useValue: repos.del },
      { provide: getRepositoryToken(QueryEventEntity), useValue: repos.query },
    ],
  }).compile();
  return module.get(EventsService);
}

describe('EventsService - getStats (perfectivo)', () => {
  it('incluye query en el desglose y en el total', async () => {
    const service = await buildService({
      create: statsRepo(4, null, [], []),
      update: statsRepo(2, null, [], []),
      del: statsRepo(0, null, [], []),
      query: statsRepo(3, null, [], []),
    });

    const stats = (await service.getStats()) as StatsResult;

    expect(stats.create).toBe(4);
    expect(stats.update).toBe(2);
    expect(stats.delete).toBe(0);
    expect(stats.query).toBe(3);
    expect(stats.total).toBe(9);
  });

  it('agrupa por source y por entity sumando las 4 tablas', async () => {
    const service = await buildService({
      create: statsRepo(
        2,
        null,
        [{ key: 'crud-a', count: '2' }],
        [{ key: 'planet', count: '2' }],
      ),
      update: statsRepo(
        1,
        null,
        [{ key: 'crud-a', count: 1 }],
        [{ key: 'planet', count: 1 }],
      ),
      del: statsRepo(0, null, [], []),
      query: statsRepo(
        1,
        null,
        [{ key: 'crud-b', count: '1' }],
        [{ key: null, count: '1' }],
      ),
    });

    const stats = (await service.getStats()) as StatsResult;

    expect(stats.by_source).toEqual({ 'crud-a': 3, 'crud-b': 1 });
    expect(stats.by_entity).toEqual({ planet: 3, '(sin valor)': 1 });
  });

  it('devuelve como last_event el mas reciente entre las 4 tablas', async () => {
    const service = await buildService({
      create: statsRepo(
        1,
        { id: 9, title: 'viejo', recorded_at: '5/5/2026, 2:21:04 p. m.' },
        [],
        [],
      ),
      update: statsRepo(
        1,
        { id: 3, title: 'ultimo', timestamp: '2026-11-25T15:00:00.000Z' },
        [],
        [],
      ),
      del: statsRepo(0, null, [], []),
      query: statsRepo(
        1,
        { id: 5, title: 'medio', event_date: '2026-06-01T10:00:00.000Z' },
        [],
        [],
      ),
    });

    const stats = (await service.getStats()) as StatsResult;

    expect(stats.last_event).toMatchObject({
      id: 3,
      title: 'ultimo',
      _table: 'update_events',
      date: '2026-11-25T15:00:00.000Z',
    });
  });

  it('devuelve last_event null cuando no hay eventos', async () => {
    const service = await buildService({
      create: statsRepo(0, null, [], []),
      update: statsRepo(0, null, [], []),
      del: statsRepo(0, null, [], []),
      query: statsRepo(0, null, [], []),
    });

    const stats = (await service.getStats()) as StatsResult;

    expect(stats.total).toBe(0);
    expect(stats.last_event).toBeNull();
  });
});
