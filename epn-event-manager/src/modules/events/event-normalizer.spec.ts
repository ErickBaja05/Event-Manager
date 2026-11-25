import {
  compareByDate,
  normalizeEvent,
  NormalizedEvent,
  parseEventDate,
} from './event-normalizer';

describe('event-normalizer', () => {
  describe('parseEventDate', () => {
    it('convierte el formato local legado a ISO 8601', () => {
      expect(parseEventDate('5/5/2026, 2:21:04 p. m.')).toBe(
        new Date(2026, 4, 5, 14, 21, 4).toISOString(),
      );
    });

    it('maneja las 12 a. m. y las 12 p. m.', () => {
      expect(parseEventDate('1/1/2026, 12:00:00 a. m.')).toBe(
        new Date(2026, 0, 1, 0, 0, 0).toISOString(),
      );
      expect(parseEventDate('1/1/2026, 12:00:00 p. m.')).toBe(
        new Date(2026, 0, 1, 12, 0, 0).toISOString(),
      );
    });

    it('acepta espacios no separables entre la hora y a. m./p. m.', () => {
      const nbsp = String.fromCharCode(0x202f);
      expect(parseEventDate(`5/5/2026, 2:21:04${nbsp}p. m.`)).toBe(
        new Date(2026, 4, 5, 14, 21, 4).toISOString(),
      );
    });

    it('mantiene las fechas ISO UTC', () => {
      expect(parseEventDate('2026-11-25T15:28:13.963Z')).toBe(
        '2026-11-25T15:28:13.963Z',
      );
    });

    it('devuelve null si no hay fecha valida', () => {
      expect(parseEventDate(undefined)).toBeNull();
      expect(parseEventDate('')).toBeNull();
      expect(parseEventDate('no es una fecha')).toBeNull();
    });
  });

  describe('normalizeEvent', () => {
    it('agrega date y _table conservando las columnas originales', () => {
      const result = normalizeEvent(
        { id: 7, title: 'x', timestamp: '2026-01-02T03:04:05.000Z' },
        'update_events',
      );
      expect(result).toEqual({
        id: 7,
        title: 'x',
        timestamp: '2026-01-02T03:04:05.000Z',
        date: '2026-01-02T03:04:05.000Z',
        _table: 'update_events',
      });
    });

    it('lee la columna de fecha propia de cada tabla', () => {
      expect(
        normalizeEvent(
          { id: 1, event_date: '2026-01-01T00:00:00.000Z' },
          'query_events',
        ).date,
      ).toBe('2026-01-01T00:00:00.000Z');
      expect(
        normalizeEvent(
          { id: 1, createdAt: '2026-01-01T00:00:00.000Z' },
          'delete_events',
        ).date,
      ).toBe('2026-01-01T00:00:00.000Z');
    });
  });

  describe('compareByDate', () => {
    const ev = (
      id: number,
      date: string | null,
      table: NormalizedEvent['_table'] = 'create_events',
    ): NormalizedEvent => ({ id, date, _table: table });

    it('ordena cronologicamente aunque los formatos originales difieran', () => {
      // Regresion: como texto, "2026-11-25..." quedaba antes que "5/5/2026...".
      const mayo = normalizeEvent(
        { id: 1, recorded_at: '5/5/2026, 2:21:04 p. m.' },
        'create_events',
      );
      const noviembre = normalizeEvent(
        { id: 2, recorded_at: '2026-11-25T15:28:13.963Z' },
        'create_events',
      );
      expect([noviembre, mayo].sort(compareByDate)).toEqual([mayo, noviembre]);
    });

    it('deja los eventos sin fecha al final', () => {
      const sorted = [ev(1, null), ev(2, '2026-01-01T00:00:00.000Z')].sort(
        compareByDate,
      );
      expect(sorted.map((e) => e.id)).toEqual([2, 1]);
    });

    it('desempata por tabla y luego por id', () => {
      const d = '2026-01-01T00:00:00.000Z';
      const sorted = [
        ev(2, d, 'update_events'),
        ev(3, d, 'create_events'),
        ev(1, d, 'create_events'),
      ].sort(compareByDate);
      expect(sorted.map((e) => `${e._table}:${e.id}`)).toEqual([
        'create_events:1',
        'create_events:3',
        'update_events:2',
      ]);
    });
  });
});
