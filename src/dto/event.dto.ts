import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { ISocialLinks } from '../common';
import { SocialLinksDto } from './social-links.dto';

const msg = (rule: string) => i18nValidationMessage(`errors.validation.${rule}`);

export const EVENT_STATUSES = ['published', 'cancelled', 'finished'] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export class EventDto {
  id?: string;
  title!: string;
  description!: string;
  additionalInfo?: string;
  socialLinks?: ISocialLinks;
  imageUrl!: string;
  typeIds!: string[];
  disciplineIds!: string[];
  eventDateFrom!: number;
  eventDateTo!: number;
  status!: string;
  isFree!: boolean;
  price!: number;
  creatorId!: string;
  address!: string;
  city!: string;
  latitude!: number;
  longitude!: number;
  seriesId?: string;
  seriesIndex?: number;
  seriesTotal?: number;
  createdAt!: number;
  updatedAt?: number;
}

/** An event returned by the combined filter search, hydrated with the
 * creator's name so the Events tab list can render a full card without a
 * request per event (same idea as FavoritedEventDto). */
export class SearchedEventDto extends EventDto {
  creatorName!: string;
}

export class CreateEventDto {
  @IsString({ message: msg('isString') })
  @IsNotEmpty({ message: msg('isNotEmpty') })
  @MaxLength(200, { message: msg('maxLength') })
  title!: string;

  @IsString({ message: msg('isString') })
  @IsNotEmpty({ message: msg('isNotEmpty') })
  description!: string;

  @IsOptional()
  @IsString({ message: msg('isString') })
  additionalInfo?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => SocialLinksDto)
  socialLinks?: SocialLinksDto;

  @IsString({ message: msg('isString') })
  @IsNotEmpty({ message: msg('isNotEmpty') })
  imageUrl!: string;

  // An event can be more than one type (e.g. workshop then jam) and more
  // than one dance style (e.g. Swing and Rock&Roll) - at least one of each
  // is required.
  @IsArray({ message: msg('isArray') })
  @ArrayMinSize(1, { message: msg('arrayMinSize') })
  @IsMongoId({ each: true, message: msg('isMongoId') })
  typeIds!: string[];

  @IsArray({ message: msg('isArray') })
  @ArrayMinSize(1, { message: msg('arrayMinSize') })
  @IsMongoId({ each: true, message: msg('isMongoId') })
  disciplineIds!: string[];

  @IsNumber({}, { message: msg('isNumber') })
  eventDateFrom!: number;

  @IsNumber({}, { message: msg('isNumber') })
  eventDateTo!: number;

  @IsIn(EVENT_STATUSES, { message: msg('isIn') })
  status!: EventStatus;

  @IsBoolean({ message: msg('isBoolean') })
  isFree!: boolean;

  @IsNumber({}, { message: msg('isNumber') })
  @Min(0, { message: msg('min') })
  price!: number;

  @IsMongoId({ message: msg('isMongoId') })
  creatorId!: string;

  @IsString({ message: msg('isString') })
  @IsNotEmpty({ message: msg('isNotEmpty') })
  address!: string;

  @IsString({ message: msg('isString') })
  @IsNotEmpty({ message: msg('isNotEmpty') })
  @MaxLength(100, { message: msg('maxLength') })
  city!: string;

  @IsNumber({}, { message: msg('isNumber') })
  @Min(-90, { message: msg('min') })
  @Max(90, { message: msg('max') })
  latitude!: number;

  @IsNumber({}, { message: msg('isNumber') })
  @Min(-180, { message: msg('min') })
  @Max(180, { message: msg('max') })
  longitude!: number;

  @IsOptional()
  @IsNumber({}, { message: msg('isNumber') })
  createdAt?: number;

  @IsOptional()
  @IsNumber({}, { message: msg('isNumber') })
  updatedAt?: number;
}

export class UpdateEventDto {
  @IsOptional()
  @IsString({ message: msg('isString') })
  @IsNotEmpty({ message: msg('isNotEmpty') })
  @MaxLength(200, { message: msg('maxLength') })
  title?: string;

  @IsOptional()
  @IsString({ message: msg('isString') })
  @IsNotEmpty({ message: msg('isNotEmpty') })
  description?: string;

  @IsOptional()
  @IsString({ message: msg('isString') })
  additionalInfo?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => SocialLinksDto)
  socialLinks?: SocialLinksDto;

  @IsOptional()
  @IsString({ message: msg('isString') })
  @IsNotEmpty({ message: msg('isNotEmpty') })
  imageUrl?: string;

  @IsOptional()
  @IsArray({ message: msg('isArray') })
  @ArrayMinSize(1, { message: msg('arrayMinSize') })
  @IsMongoId({ each: true, message: msg('isMongoId') })
  typeIds?: string[];

  @IsOptional()
  @IsArray({ message: msg('isArray') })
  @ArrayMinSize(1, { message: msg('arrayMinSize') })
  @IsMongoId({ each: true, message: msg('isMongoId') })
  disciplineIds?: string[];

  @IsOptional()
  @IsNumber({}, { message: msg('isNumber') })
  eventDateFrom?: number;

  @IsOptional()
  @IsNumber({}, { message: msg('isNumber') })
  eventDateTo?: number;

  @IsOptional()
  @IsIn(EVENT_STATUSES, { message: msg('isIn') })
  status?: EventStatus;

  @IsOptional()
  @IsBoolean({ message: msg('isBoolean') })
  isFree?: boolean;

  @IsOptional()
  @IsNumber({}, { message: msg('isNumber') })
  @Min(0, { message: msg('min') })
  price?: number;

  @IsOptional()
  @IsMongoId({ message: msg('isMongoId') })
  creatorId?: string;

  @IsOptional()
  @IsString({ message: msg('isString') })
  @IsNotEmpty({ message: msg('isNotEmpty') })
  address?: string;

  @IsOptional()
  @IsString({ message: msg('isString') })
  @IsNotEmpty({ message: msg('isNotEmpty') })
  @MaxLength(100, { message: msg('maxLength') })
  city?: string;

  @IsOptional()
  @IsNumber({}, { message: msg('isNumber') })
  @Min(-90, { message: msg('min') })
  @Max(90, { message: msg('max') })
  latitude?: number;

  @IsOptional()
  @IsNumber({}, { message: msg('isNumber') })
  @Min(-180, { message: msg('min') })
  @Max(180, { message: msg('max') })
  longitude?: number;

  @IsOptional()
  @IsNumber({}, { message: msg('isNumber') })
  createdAt?: number;

  @IsOptional()
  @IsNumber({}, { message: msg('isNumber') })
  updatedAt?: number;
}
