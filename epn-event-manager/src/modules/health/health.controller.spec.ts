import { ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { HealthController } from './health.controller';

describe('HealthController (Mantenimiento Preventivo)', () => {
  let controller: HealthController;
  let mockDataSource: { query: jest.Mock };

  beforeEach(async () => {
    mockDataSource = {
      query: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: getDataSourceToken(),
          useValue: mockDataSource,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('debe estar definido', () => {
    expect(controller).toBeDefined();
  });

  it('debe retornar status ok y database connected cuando la BD responde a SELECT 1', async () => {
    mockDataSource.query.mockResolvedValueOnce([{ '1': 1 }]);

    const result = await controller.check();

    expect(mockDataSource.query).toHaveBeenCalledWith('SELECT 1');
    expect(result).toMatchObject({
      status: 'ok',
      database: 'connected',
    });
    expect(result.timestamp).toBeDefined();
    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
  });

  it('debe lanzar ServiceUnavailableException (503) cuando la BD falla', async () => {
    mockDataSource.query.mockRejectedValue(
      new Error('SQLite busy / connection failed'),
    );

    await expect(controller.check()).rejects.toThrow(
      ServiceUnavailableException,
    );

    try {
      await controller.check();
    } catch (error) {
      expect(error).toBeInstanceOf(ServiceUnavailableException);
      const response = (error as ServiceUnavailableException).getResponse();
      expect(response).toMatchObject({
        status: 'error',
        database: 'disconnected',
        message: 'La base de datos SQLite no responde',
      });
    }
  });
});
