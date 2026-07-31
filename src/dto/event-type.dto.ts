import { IsIn, IsNumber, IsOptional } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

const msg = (rule: string) => i18nValidationMessage(`errors.validation.${rule}`);

export const EVENT_TYPE_NAMES = ['Jam', 'Taller', 'Curso', 'Festival', 'Competición', 'Party'] as const;
export type EventTypeName = (typeof EVENT_TYPE_NAMES)[number];

export class EventTypeDto {
  id?: string;
  name!: string;
  createdAt!: number;
}

export class CreateEventTypeDto {
  @IsIn(EVENT_TYPE_NAMES, { message: msg('isIn') })
  name!: EventTypeName;

  @IsOptional()
  @IsNumber({}, { message: msg('isNumber') })
  createdAt?: number;
}

export class UpdateEventTypeDto {
  @IsOptional()
  @IsIn(EVENT_TYPE_NAMES, { message: msg('isIn') })
  name?: EventTypeName;

  @IsOptional()
  @IsNumber({}, { message: msg('isNumber') })
  createdAt?: number;
}
