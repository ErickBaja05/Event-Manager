import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateEventDto } from './create-event.dto';

describe('CreateEventDto (Mantenimiento Preventivo)', () => {
  const validPayload = {
    source: 'test-crud',
    entity: 'player',
    action: 'CREATE',
    title: 'Nuevo jugador',
    description: 'Registro de nuevo jugador',
    payload: { id: 1, name: 'Mario' },
  };

  it('debe ser valido cuando todos los campos requeridos cumplen las reglas', async () => {
    const dto = plainToInstance(CreateEventDto, validPayload);
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('debe fallar si los campos de texto requeridos estan vacios o no son string', async () => {
    const dto = plainToInstance(CreateEventDto, {
      ...validPayload,
      source: '',
      entity: '',
      title: '',
      description: '',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThanOrEqual(4);
    const errorProperties = errors.map((e) => e.property);
    expect(errorProperties).toContain('source');
    expect(errorProperties).toContain('entity');
    expect(errorProperties).toContain('title');
    expect(errorProperties).toContain('description');
  });

  it('debe fallar si los campos exceden la longitud maxima', async () => {
    const dto = plainToInstance(CreateEventDto, {
      ...validPayload,
      source: 'a'.repeat(65),
      entity: 'b'.repeat(65),
      title: 'c'.repeat(151),
      description: 'd'.repeat(501),
    });
    const errors = await validate(dto);
    const errorProperties = errors.map((e) => e.property);
    expect(errorProperties).toContain('source');
    expect(errorProperties).toContain('entity');
    expect(errorProperties).toContain('title');
    expect(errorProperties).toContain('description');
  });

  it('debe normalizar action en minusculas y aceptarlo', async () => {
    const dto = plainToInstance(CreateEventDto, {
      ...validPayload,
      action: 'create',
    });
    const errors = await validate(dto);
    expect(dto.action).toBe('CREATE');
    expect(errors.length).toBe(0);
  });

  it('debe fallar si action no pertenece a las acciones validas', async () => {
    const dto = plainToInstance(CreateEventDto, {
      ...validPayload,
      action: 'DROP_TABLE',
    });
    const errors = await validate(dto);
    const actionError = errors.find((e) => e.property === 'action');
    expect(actionError).toBeDefined();
    expect(actionError?.constraints).toHaveProperty('isIn');
  });

  it('debe fallar si payload no es un objeto o esta ausente', async () => {
    const dtoJson = plainToInstance(CreateEventDto, {
      ...validPayload,
      payload: 'cadena-no-objeto',
    });
    const errors = await validate(dtoJson);
    const payloadError = errors.find((e) => e.property === 'payload');
    expect(payloadError).toBeDefined();
    expect(payloadError?.constraints).toHaveProperty('isObject');
  });

  it('debe aceptar query_term opcional valido y rechazar si excede longitud', async () => {
    const dtoValido = plainToInstance(CreateEventDto, {
      ...validPayload,
      action: 'QUERY',
      query_term: 'busqueda-ejemplo',
    });
    const errorsValido = await validate(dtoValido);
    expect(errorsValido.length).toBe(0);

    const dtoInvalido = plainToInstance(CreateEventDto, {
      ...validPayload,
      query_term: 'x'.repeat(151),
    });
    const errorsInvalido = await validate(dtoInvalido);
    const queryError = errorsInvalido.find((e) => e.property === 'query_term');
    expect(queryError).toBeDefined();
  });
});