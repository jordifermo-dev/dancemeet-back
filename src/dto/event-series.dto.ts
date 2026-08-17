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
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { SocialLinksDto } from './social-links.dto';

const msg = (rule: string) => i18nValidationMessage(`errors.validation.${rule}`);

// No dedicated "errors.validation.matches" i18n key exists yet - 'default'
// is the same generic fallback CreateEventDto's own class-validator
// decorators would hit for anything not explicitly keyed.
const TIME_HHMM_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export const RECURRENCE_FREQUENCIES = ['weekly', 'monthlyNthWeekday'] as const;
export type RecurrenceFrequencyDto = (typeof RECURRENCE_FREQUENCIES)[number];

export class NthWeekdayDto {
  @IsNumber({}, { message: msg('isNumber') })
  @Min(1, { message: msg('min') })
  @Max(4, { message: msg('max') })
  nth!: number;

  @IsNumber({}, { message: msg('isNumber') })
  @Min(0, { message: msg('min') })
  @Max(6, { message: msg('max') })
  weekday!: number;
}

export class RecurrenceRuleDto {
  @IsIn(RECURRENCE_FREQUENCIES, { message: msg('isIn') })
  frequency!: RecurrenceFrequencyDto;

  @IsNumber({}, { message: msg('isNumber') })
  @Min(1, { message: msg('min') })
  interval!: number;

  // Required when frequency='weekly' - not enforced via a conditional
  // decorator (class-validator's own frequency-dependent validation would
  // need a custom validator class); EventService.createEventSeries()
  // rejects an empty/absent list itself via expandRecurrence() returning
  // zero occurrences.
  @IsOptional()
  @IsArray({ message: msg('isArray') })
  @ArrayMinSize(1, { message: msg('arrayMinSize') })
  @IsNumber({}, { each: true, message: msg('isNumber') })
  @Min(0, { each: true, message: msg('min') })
  @Max(6, { each: true, message: msg('max') })
  weekdays?: number[];

  // Required when frequency='monthlyNthWeekday' - same reasoning as weekdays above.
  @IsOptional()
  @IsArray({ message: msg('isArray') })
  @ArrayMinSize(1, { message: msg('arrayMinSize') })
  @ValidateNested({ each: true })
  @Type(() => NthWeekdayDto)
  nthWeekdays?: NthWeekdayDto[];

  @IsNumber({}, { message: msg('isNumber') })
  dateFrom!: number;

  // null = "sin límite" (see explorer.noEndLimit-equivalent in the recurrence
  // editor) - expandRecurrence() then caps generation at MAX_SERIES_OCCURRENCES.
  @IsOptional()
  @IsNumber({}, { message: msg('isNumber') })
  dateTo?: number | null;
}

/** Body for PATCH /api/events/:id/recurrence - attaches a recurrence rule to
 * an already-existing single event, turning it into the first instance of a
 * new series. dateFrom is ignored server-side (forced to the existing
 * event's own date - see EventService.attachRecurrenceToEvent) since that
 * event's day is always the anchor. No timeFrom/timeTo either - both are
 * derived from the existing event's own eventDateFrom/eventDateTo. */
export class AttachRecurrenceDto {
  @ValidateNested()
  @Type(() => RecurrenceRuleDto)
  recurrence!: RecurrenceRuleDto;
}

export class CreateEventSeriesDto {
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

  @IsArray({ message: msg('isArray') })
  @ArrayMinSize(1, { message: msg('arrayMinSize') })
  @IsMongoId({ each: true, message: msg('isMongoId') })
  typeIds!: string[];

  @IsArray({ message: msg('isArray') })
  @ArrayMinSize(1, { message: msg('arrayMinSize') })
  @IsMongoId({ each: true, message: msg('isMongoId') })
  disciplineIds!: string[];

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

  @ValidateNested()
  @Type(() => RecurrenceRuleDto)
  recurrence!: RecurrenceRuleDto;

  @Matches(TIME_HHMM_PATTERN, { message: msg('default') })
  timeFrom!: string;

  @Matches(TIME_HHMM_PATTERN, { message: msg('default') })
  timeTo!: string;
}

/** Bulk-edits every instance of a series at once - no absolute date fields
 * (each instance keeps its own date; only timeFrom/timeTo optionally shift
 * every instance's time-of-day while preserving its date and duration). */
export class PatchEventSeriesDto {
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
  @IsBoolean({ message: msg('isBoolean') })
  isFree?: boolean;

  @IsOptional()
  @IsNumber({}, { message: msg('isNumber') })
  @Min(0, { message: msg('min') })
  price?: number;

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
  @Matches(TIME_HHMM_PATTERN, { message: msg('default') })
  timeFrom?: string;

  @IsOptional()
  @Matches(TIME_HHMM_PATTERN, { message: msg('default') })
  timeTo?: string;
}
