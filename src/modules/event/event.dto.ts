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
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { ISocialLinks } from '../../common';
import { SocialLinksDto } from '../../common/social-links.dto';

const msg = (rule: string) => i18nValidationMessage(`errors.validation.${rule}`);

export const EVENT_STATUSES = ['draft', 'published', 'cancelled', 'finished'] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const EVENT_JOIN_MODES = ['open', 'approval'] as const;
export type EventJoinMode = (typeof EVENT_JOIN_MODES)[number];

export class EventDto {
  id?: string;
  title!: string;
  // Optional because a draft event can be saved with just a title - only
  // guaranteed present once status is 'published'.
  description?: string;
  additionalInfo?: string;
  socialLinks?: ISocialLinks;
  imageUrl?: string;
  typeIds?: string[];
  disciplineIds?: string[];
  eventDateFrom?: number;
  eventDateTo?: number;
  status!: string;
  isFree!: boolean;
  price!: number;
  allowAttendeePhotos!: boolean;
  joinMode!: EventJoinMode;
  creatorId!: string;
  address?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  seriesId?: string;
  seriesIndex?: number;
  seriesTotal?: number;
  createdAt!: number;
  updatedAt?: number;
}

/** An event returned by the combined filter search, hydrated with the
 * creator's name so the Events tab list can render a full card without a
 * request per event (same idea as FavoritedEventDto). attendeesCount/
 * likesCount/reviewsCount/averageRating are batch-computed once for the
 * whole result list (see EventService.searchEvents), not per event - they
 * power the event-card badges. Optional: this DTO is also reused by
 * getEventDetail (a single event), which doesn't populate them since
 * event-detail already fetches its own richer attendee/review data. */
export class SearchedEventDto extends EventDto {
  creatorName!: string;
  attendeesCount?: number;
  likesCount?: number;
  reviewsCount?: number;
  averageRating?: number;
}

export class CreateEventDto {
  @IsString({ message: msg('isString') })
  @IsNotEmpty({ message: msg('isNotEmpty') })
  @MaxLength(200, { message: msg('maxLength') })
  title!: string;

  // Every field below except title/status/creatorId is only meaningful once
  // the event is actually published - a draft can be saved with just a
  // title and completed later, so validation is skipped entirely for them
  // while status is 'draft' (see EventService.updateEvent for the
  // completeness check enforced when a draft transitions to published).
  @ValidateIf((o) => o.status !== 'draft')
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

  @ValidateIf((o) => o.status !== 'draft')
  @IsString({ message: msg('isString') })
  @IsNotEmpty({ message: msg('isNotEmpty') })
  imageUrl!: string;

  // An event can be more than one type (e.g. workshop then jam) and more
  // than one dance style (e.g. Swing and Rock&Roll) - at least one of each
  // is required.
  @ValidateIf((o) => o.status !== 'draft')
  @IsArray({ message: msg('isArray') })
  @ArrayMinSize(1, { message: msg('arrayMinSize') })
  @IsMongoId({ each: true, message: msg('isMongoId') })
  typeIds!: string[];

  @ValidateIf((o) => o.status !== 'draft')
  @IsArray({ message: msg('isArray') })
  @ArrayMinSize(1, { message: msg('arrayMinSize') })
  @IsMongoId({ each: true, message: msg('isMongoId') })
  disciplineIds!: string[];

  @ValidateIf((o) => o.status !== 'draft')
  @IsNumber({}, { message: msg('isNumber') })
  eventDateFrom!: number;

  @ValidateIf((o) => o.status !== 'draft')
  @IsNumber({}, { message: msg('isNumber') })
  eventDateTo!: number;

  @IsIn(EVENT_STATUSES, { message: msg('isIn') })
  status!: EventStatus;

  @ValidateIf((o) => o.status !== 'draft')
  @IsBoolean({ message: msg('isBoolean') })
  isFree!: boolean;

  @ValidateIf((o) => o.status !== 'draft')
  @IsNumber({}, { message: msg('isNumber') })
  @Min(0, { message: msg('min') })
  price!: number;

  @IsOptional()
  @IsIn(EVENT_JOIN_MODES, { message: msg('isIn') })
  joinMode?: EventJoinMode;

  @IsMongoId({ message: msg('isMongoId') })
  creatorId!: string;

  @ValidateIf((o) => o.status !== 'draft')
  @IsString({ message: msg('isString') })
  @IsNotEmpty({ message: msg('isNotEmpty') })
  address!: string;

  @ValidateIf((o) => o.status !== 'draft')
  @IsString({ message: msg('isString') })
  @IsNotEmpty({ message: msg('isNotEmpty') })
  @MaxLength(100, { message: msg('maxLength') })
  city!: string;

  @ValidateIf((o) => o.status !== 'draft')
  @IsNumber({}, { message: msg('isNumber') })
  @Min(-90, { message: msg('min') })
  @Max(90, { message: msg('max') })
  latitude!: number;

  @ValidateIf((o) => o.status !== 'draft')
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
  @IsBoolean({ message: msg('isBoolean') })
  allowAttendeePhotos?: boolean;

  @IsOptional()
  @IsIn(EVENT_JOIN_MODES, { message: msg('isIn') })
  joinMode?: EventJoinMode;

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
