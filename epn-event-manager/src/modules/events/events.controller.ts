import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  registerEvent(@Body() dto: CreateEventDto) {
    return this.eventsService.registerEvent(dto);
  }

  /**
   * Paginacion opcional (`?limit=&page=`). La respuesta sigue siendo un arreglo;
   * el total y la pagina viajan en cabeceras para no cambiar el contrato.
   */
  @Get()
  async findAll(
    @Res({ passthrough: true }) res: Response,
    @Query('limit') limitRaw?: string,
    @Query('page') pageRaw?: string,
  ) {
    const limit = this.parsePositiveInt('limit', limitRaw, 100);
    const page = this.parsePositiveInt('page', pageRaw);
    const { items, total } = await this.eventsService.findAll({ limit, page });
    res.setHeader('X-Total-Count', String(total));
    if (limit !== undefined || page !== undefined) {
      res.setHeader('X-Page', String(page ?? 1));
      res.setHeader('X-Limit', String(limit ?? 20));
    }
    return items;
  }

  @Get('source/:source')
  findBySource(@Param('source') source: string) {
    return this.eventsService.findBySource(source);
  }

  @Get('entity/:entity')
  findByEntity(@Param('entity') entity: string) {
    return this.eventsService.findByEntity(entity);
  }

  private parsePositiveInt(
    name: string,
    raw: string | undefined,
    max?: number,
  ): number | undefined {
    if (raw === undefined) {
      return undefined;
    }
    const value = Number(raw);
    if (!Number.isInteger(value) || value < 1 || (max && value > max)) {
      throw new BadRequestException(
        `${name} debe ser un entero entre 1${max ? ` y ${max}` : ''}`,
      );
    }
    return value;
  }
}
