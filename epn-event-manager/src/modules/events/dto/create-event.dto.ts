import { Transform } from 'class-transformer';
import {
  IsDefined,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateEventDto {
  @IsString({ message: 'source debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'source no puede estar vacio' })
  @MaxLength(64, { message: 'source no puede exceder 64 caracteres' })
  source: string;

  @IsString({ message: 'entity debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'entity no puede estar vacio' })
  @MaxLength(64, { message: 'entity no puede exceder 64 caracteres' })
  entity: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString({ message: 'action debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'action no puede estar vacio' })
  @IsIn(['CREATE', 'UPDATE', 'DELETE', 'QUERY'], {
    message: 'action debe ser CREATE, UPDATE, DELETE o QUERY',
  })
  action: string;

  @IsString({ message: 'title debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'title no puede estar vacio' })
  @MaxLength(150, { message: 'title no puede exceder 150 caracteres' })
  title: string;

  @IsString({ message: 'description debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'description no puede estar vacio' })
  @MaxLength(500, { message: 'description no puede exceder 500 caracteres' })
  description: string;

  @IsDefined({ message: 'payload es requerido' })
  @IsObject({ message: 'payload debe ser un objeto' })
  payload: Record<string, unknown>;

  @IsOptional()
  @IsString({ message: 'query_term debe ser una cadena de texto' })
  @MaxLength(150, { message: 'query_term no puede exceder 150 caracteres' })
  query_term?: string;
}