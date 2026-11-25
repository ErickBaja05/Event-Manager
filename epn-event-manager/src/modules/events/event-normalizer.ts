/**
 * Mantenimiento perfectivo: helper comun para unificar los eventos de las
 * 4 tablas (create/update/delete/query) sin fusionarlas en el modelo de datos.
 * Cada tabla guarda su fecha en una columna y formato distintos; aqui se
 * normalizan a un unico campo `date` en ISO 8601 (UTC).
 */

export type EventTableName =
  | 'create_events'
  | 'update_events'
  | 'delete_events'
  | 'query_events';

/** Columna de fecha propia de cada tabla (el anti patron se mantiene). */
export const TABLE_DATE_COLUMN: Record<EventTableName, string> = {
  create_events: 'recorded_at',
  update_events: 'timestamp',
  delete_events: 'createdAt',
  query_events: 'event_date',
};

export type NormalizedEvent = Record<string, unknown> & {
  id: number;
  date: string | null;
  _table: EventTableName;
};

// Formato legado guardado con toLocaleString('es-EC'): "5/5/2026, 2:21:04 p. m."
const LEGACY_LOCAL_DATE =
  /^(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s+(\d{1,2}):(\d{2}):(\d{2})\s*([ap])\.?\s*m\.?$/i;

/**
 * Convierte la fecha de cualquiera de los dos formatos presentes (ISO UTC o
 * local legado) a ISO 8601. Devuelve null si no se puede interpretar.
 */
export function parseEventDate(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.trim() === '') {
    return null;
  }
  const value = raw.replace(new RegExp('[\u00a0\u202f]', 'g'), ' ').trim();

  const legacy = LEGACY_LOCAL_DATE.exec(value);
  if (legacy) {
    const [, day, month, year, hour12, minute, second, meridiem] = legacy;
    let hour = Number(hour12) % 12;
    if (meridiem.toLowerCase() === 'p') {
      hour += 12;
    }
    const date = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      hour,
      Number(minute),
      Number(second),
    );
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

/** Agrega el campo `date` unificado y `_table` conservando las columnas originales. */
export function normalizeEvent(
  row: { id: number } & Record<string, unknown>,
  table: EventTableName,
): NormalizedEvent {
  return {
    ...row,
    date: parseEventDate(row[TABLE_DATE_COLUMN[table]]),
    _table: table,
  };
}

/** Orden cronologico real (ascendente); sin fecha al final; desempate estable. */
export function compareByDate(a: NormalizedEvent, b: NormalizedEvent): number {
  const ta = a.date ? Date.parse(a.date) : Number.POSITIVE_INFINITY;
  const tb = b.date ? Date.parse(b.date) : Number.POSITIVE_INFINITY;
  if (ta !== tb) {
    return ta < tb ? -1 : 1;
  }
  if (a._table !== b._table) {
    return a._table.localeCompare(b._table);
  }
  return a.id - b.id;
}
