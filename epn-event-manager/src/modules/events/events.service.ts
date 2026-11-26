import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ObjectLiteral, Repository } from 'typeorm';
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

export const MAX_PAYLOAD_BYTES = 65536; // 64 KB

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

  /**
   * Mantenimiento preventivo: envuelve la persistencia en try-catch
   * y lanza InternalServerErrorException con mensaje claro si SQLite falla.
   */
  private async persistEvent<T extends ObjectLiteral>(
    repo: Repository<T>,
    entity: T,
  ): Promise<void> {
    try {
      await repo.save(entity);
    } catch {
      throw new InternalServerErrorException(
        'Error al persistir el evento en la base de datos SQLite',
      );
    }
  }

  /**
   * Mantenimiento preventivo: sanitiza y valida parametros de URL (:source, :entity)
   * asegurando trim, longitud maxima y caracteres alfanumericos seguros.
   */
  validateIdentifier(name: 'source' | 'entity', value: string): string {
    if (typeof value !== 'string') {
      throw new BadRequestException(
        `El parametro "${name}" debe ser una cadena de texto`,
      );
    }
    const trimmed = value.trim();
    if (!trimmed) {
      throw new BadRequestException(
        `El parametro "${name}" no puede estar vacio`,
      );
    }
    if (trimmed.length > 64) {
      throw new BadRequestException(
        `El parametro "${name}" no puede exceder 64 caracteres`,
      );
    }
    const validPattern = /^[a-zA-Z0-9_-]+$/;
    if (!validPattern.test(trimmed)) {
      throw new BadRequestException(
        `El parametro "${name}" contiene caracteres no permitidos. Solo se permiten letras, numeros, guiones y guiones bajos`,
      );
    }
    return trimmed;
  }

  async registerEvent(dto: CreateEventDto): Promise<{ ok: boolean }> {
    const action = (dto.action ?? '').toUpperCase();

    // Mantenimiento preventivo: serializacion segura y control de tamano de payload
    let payloadStr: string;
    try {
      payloadStr = JSON.stringify(dto.payload ?? {});
    } catch {
      throw new BadRequestException(
        'El payload no es un JSON serializable valido',
      );
    }

    if (Buffer.byteLength(payloadStr, 'utf8') > MAX_PAYLOAD_BYTES) {
      throw new BadRequestException(
        `El payload excede el tamano maximo permitido de ${MAX_PAYLOAD_BYTES} bytes (64 KB)`,
      );
    }

    // Fecha guardada en formato UTC ISO 8601
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
      await this.persistEvent(this.createRepo, ev);
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
      await this.persistEvent(this.updateRepo, ev);
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
      await this.persistEvent(this.deleteRepo, ev);
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
      await this.persistEvent(this.queryRepo, ev);
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
    const sanitized = this.validateIdentifier('source', source);
    return this.collectEvents({ source: sanitized });
  }

  async findByEntity(entity: string): Promise<object[]> {
    const sanitized = this.validateIdentifier('entity', entity);
    return this.collectEvents({ entity: sanitized });
  }

  /** Conteo agrupado por columna, sumando las 4 tablas (GROUP BY en SQL). */
  private async countGroupedBy(
    column: 'source' | 'entity',
  ): Promise<Record<string, number>> {
    const repos: Repository<ObjectLiteral>[] = [
      this.createRepo,
      this.updateRepo,
      this.deleteRepo,
      this.queryRepo,
    ];
    const totals: Record<string, number> = {};
    for (const repo of repos) {
      const rows = await repo
        .createQueryBuilder('e')
        .select(`e.${column}`, 'key')
        .addSelect('COUNT(*)', 'count')
        .groupBy(`e.${column}`)
        .getRawMany<{ key: string | null; count: string | number }>();
      for (const row of rows) {
        const key = row.key ?? '(sin valor)';
        totals[key] = (totals[key] ?? 0) + Number(row.count);
      }
    }
    return totals;
  }

  /** Ultimo evento de cada tabla (mayor id) y se elige el mas reciente. */
  private async findLastEvent(): Promise<NormalizedEvent | null> {
    const order = { id: 'DESC' as const };
    const [create, update, del, query] = await Promise.all([
      this.createRepo.findOne({ where: {}, order }),
      this.updateRepo.findOne({ where: {}, order }),
      this.deleteRepo.findOne({ where: {}, order }),
      this.queryRepo.findOne({ where: {}, order }),
    ]);
    const candidates: NormalizedEvent[] = [];
    if (create) candidates.push(normalizeEvent({ ...create }, 'create_events'));
    if (update) candidates.push(normalizeEvent({ ...update }, 'update_events'));
    if (del) candidates.push(normalizeEvent({ ...del }, 'delete_events'));
    if (query) candidates.push(normalizeEvent({ ...query }, 'query_events'));
    if (candidates.length === 0) {
      return null;
    }
    return candidates.sort(compareByDate)[candidates.length - 1];
  }

  async getStats(): Promise<object> {
    const [createCount, updateCount, deleteCount, queryCount] =
      await Promise.all([
        this.createRepo.count(),
        this.updateRepo.count(),
        this.deleteRepo.count(),
        this.queryRepo.count(),
      ]);
    const [bySource, byEntity, lastEvent] = await Promise.all([
      this.countGroupedBy('source'),
      this.countGroupedBy('entity'),
      this.findLastEvent(),
    ]);

    return {
      create: createCount,
      update: updateCount,
      delete: deleteCount,
      query: queryCount,
      total: createCount + updateCount + deleteCount + queryCount,
      by_source: bySource,
      by_entity: byEntity,
      last_event: lastEvent,
    };
  }
}