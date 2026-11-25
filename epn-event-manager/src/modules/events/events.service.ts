import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateEventDto } from './dto/create-event.dto';
import { CreateEventEntity } from '../../database/entities/create-event.entity';
import { UpdateEventEntity } from '../../database/entities/update-event.entity';
import { DeleteEventEntity } from '../../database/entities/delete-event.entity';
import { QueryEventEntity } from '../../database/entities/query-event.entity';
import {
  compareByDate,
  NormalizedEvent,
  normalizeEvent,
} from './event-normalizer';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(CreateEventEntity)
    private readonly createRepo: Repository<CreateEventEntity>,
    @InjectRepository(UpdateEventEntity)
    private readonly updateRepo: Repository<UpdateEventEntity>,
    @InjectRepository(DeleteEventEntity)
    private readonly deleteRepo: Repository<DeleteEventEntity>,
    @InjectRepository(QueryEventEntity)
    private readonly queryRepo: Repository<QueryEventEntity>,
  ) {}

  async registerEvent(dto: CreateEventDto): Promise<{ ok: boolean }> {
    const action = (dto.action ?? '').toUpperCase();
    const payloadStr = JSON.stringify(dto.payload ?? {});
    // Fecha guardada en formato local, no UTC (debilidad intencional)
    const utcDate = new Date().toISOString();

    if (action === 'CREATE') {
      const ev = this.createRepo.create({
        source: dto.source,
        entity: dto.entity,
        action: dto.action,
        title: dto.title,
        description: dto.description,
        payload: payloadStr,
        recorded_at: utcDate,
      });
      await this.createRepo.save(ev);
      return { ok: true };
    }

    if (action === 'UPDATE') {
      const ev = this.updateRepo.create({
        source: dto.source,
        entity: dto.entity,
        action: dto.action,
        title: dto.title,
        description: dto.description,
        payload: payloadStr,
        timestamp: utcDate,
      });
      await this.updateRepo.save(ev);
      return { ok: true };
    }

    if (action === 'DELETE') {
      const ev = this.deleteRepo.create({
        source: dto.source,
        entity: dto.entity,
        action: dto.action,
        title: dto.title,
        description: dto.description,
        payload: payloadStr,
        createdAt: utcDate,
      });
      await this.deleteRepo.save(ev);
      return { ok: true };
    }

    if (action === 'QUERY') {
      const ev = this.queryRepo.create({
        source: dto.source,
        entity: dto.entity,
        action: dto.action,
        title: dto.title,
        description: dto.description,
        payload: payloadStr,
        query_term: dto.query_term,
        event_date: utcDate,
      });
      await this.queryRepo.save(ev);
      return { ok: true };
    }

    throw new BadRequestException(
      `Accion no reconocida: "${dto.action ?? ''}". Acciones validas: CREATE, UPDATE, DELETE, QUERY.`,
    );
  }

  /**
   * Mantenimiento perfectivo: unica via de lectura sobre las 4 tablas.
   * Lee cada tabla (opcionalmente filtrada), normaliza con el helper comun y
   * ordena cronologicamente de forma real.
   */
  private async collectEvents(
    where: { source?: string; entity?: string } = {},
  ): Promise<NormalizedEvent[]> {
    const [creates, updates, deletes, queries] = await Promise.all([
      this.createRepo.find({ where }),
      this.updateRepo.find({ where }),
      this.deleteRepo.find({ where }),
      this.queryRepo.find({ where }),
    ]);

    return [
      ...creates.map((e) => normalizeEvent({ ...e }, 'create_events')),
      ...updates.map((e) => normalizeEvent({ ...e }, 'update_events')),
      ...deletes.map((e) => normalizeEvent({ ...e }, 'delete_events')),
      ...queries.map((e) => normalizeEvent({ ...e }, 'query_events')),
    ].sort(compareByDate);
  }

  /**
   * Historial completo. Sin `limit`/`page` devuelve todo (contrato original);
   * con ellos devuelve solo la pagina pedida junto al total.
   */
  async findAll(
    pagination: { limit?: number; page?: number } = {},
  ): Promise<{ items: NormalizedEvent[]; total: number }> {
    const all = await this.collectEvents();
    if (pagination.limit === undefined && pagination.page === undefined) {
      return { items: all, total: all.length };
    }
    const limit = pagination.limit ?? 20;
    const page = pagination.page ?? 1;
    const start = (page - 1) * limit;
    return { items: all.slice(start, start + limit), total: all.length };
  }

  async findBySource(source: string): Promise<object[]> {
    return this.collectEvents({ source });
  }

  async findByEntity(entity: string): Promise<object[]> {
    return this.collectEvents({ entity });
  }

  async getStats(): Promise<object> {
    const createCount = await this.createRepo.count();
    const updateCount = await this.updateRepo.count();
    const deleteCount = await this.deleteRepo.count();
    // Incidencia perfectiva: query_events no se incluye en el total
    return {
      create: createCount,
      update: updateCount,
      delete: deleteCount,
      total: createCount + updateCount + deleteCount,
    };
  }
}
