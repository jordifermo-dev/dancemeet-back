import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
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
import { NOTIFICATION_TYPES, NotificationType } from '../schemas/notification.schema';
import { SocialLinksDto } from './social-links.dto';

const msg = (rule: string) => i18nValidationMessage(`errors.validation.${rule}`);

const SUPPORTED_LANGUAGES = ['es', 'ca', 'en'];
const PRICE_OPTIONS = ['free', 'paid'];
const RELATION_TYPES = ['organizer', 'attendee'];

export class UserDto {
  id?: string;
  name!: string;
  email!: string;
  phone?: string;
  socialLinks?: ISocialLinks;
  photoUrl?: string;
  city!: string;
  address!: string;
  latitude!: number;
  longitude!: number;
  distanceRange!: number;
  eventDateFrom?: number | null;
  eventDateTo?: number | null;
  /** Notification types the user has turned off - empty means every type is
   * enabled (the default), all six means "no notifications at all". */
  disabledNotificationTypes!: NotificationType[];
  disciplineIds!: string[];
  eventTypeIds!: string[];
  statusIds!: string[];
  priceOptions!: string[];
  relationTypes!: string[];
  language!: string;
  showEmail!: boolean;
  showPhone!: boolean;
  showCity!: boolean;
  showLocation!: boolean;
  createdAt!: number;
  updatedAt?: number;
  followedId!: string[];
  followingId!: string[];
  blockedIds!: string[];
  fcmTokens!: string[];
}

export class FcmTokenDto {
  @IsString({ message: msg('isString') })
  @IsNotEmpty({ message: msg('isNotEmpty') })
  token!: string;
}

/** One row of a followers/following list - just enough to render an avatar + name + sort by date. */
export class FollowUserDto {
  id!: string;
  name!: string;
  photoUrl?: string;
  disciplineIds!: string[];
  followedAt!: number;
}

export class CreateUserDto {
  @IsString({ message: msg('isString') })
  @IsNotEmpty({ message: msg('isNotEmpty') })
  @MaxLength(100, { message: msg('maxLength') })
  name!: string;

  @IsEmail({}, { message: msg('isEmail') })
  email!: string;

  @IsOptional()
  @IsString({ message: msg('isString') })
  @MaxLength(20, { message: msg('maxLength') })
  phone?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => SocialLinksDto)
  socialLinks?: SocialLinksDto;

  @IsOptional()
  @IsString({ message: msg('isString') })
  photoUrl?: string;

  @IsString({ message: msg('isString') })
  @IsNotEmpty({ message: msg('isNotEmpty') })
  @MaxLength(100, { message: msg('maxLength') })
  city!: string;

  @IsString({ message: msg('isString') })
  @IsNotEmpty({ message: msg('isNotEmpty') })
  @MaxLength(200, { message: msg('maxLength') })
  address!: string;

  @IsNumber({}, { message: msg('isNumber') })
  @Min(-90, { message: msg('min') })
  @Max(90, { message: msg('max') })
  latitude!: number;

  @IsNumber({}, { message: msg('isNumber') })
  @Min(-180, { message: msg('min') })
  @Max(180, { message: msg('max') })
  longitude!: number;

  @IsNumber({}, { message: msg('isNumber') })
  @Min(0, { message: msg('min') })
  distanceRange!: number;

  @IsOptional()
  @IsNumber({}, { message: msg('isNumber') })
  eventDateFrom?: number | null;

  @IsOptional()
  @IsNumber({}, { message: msg('isNumber') })
  eventDateTo?: number | null;

  @IsOptional()
  @IsArray({ message: msg('isArray') })
  @IsIn(NOTIFICATION_TYPES, { each: true, message: msg('isIn') })
  disabledNotificationTypes?: NotificationType[];

  @IsArray({ message: msg('isArray') })
  @IsMongoId({ each: true, message: msg('isMongoId') })
  disciplineIds!: string[];

  @IsArray({ message: msg('isArray') })
  @IsMongoId({ each: true, message: msg('isMongoId') })
  eventTypeIds!: string[];

  @IsArray({ message: msg('isArray') })
  @IsString({ each: true, message: msg('isString') })
  statusIds!: string[];

  @IsOptional()
  @IsArray({ message: msg('isArray') })
  @IsIn(PRICE_OPTIONS, { each: true, message: msg('isIn') })
  priceOptions?: string[];

  @IsOptional()
  @IsArray({ message: msg('isArray') })
  @IsIn(RELATION_TYPES, { each: true, message: msg('isIn') })
  relationTypes?: string[];

  @IsOptional()
  @IsIn(SUPPORTED_LANGUAGES, { message: msg('isIn') })
  language?: string;

  @IsOptional()
  @IsBoolean({ message: msg('isBoolean') })
  showEmail?: boolean;

  @IsOptional()
  @IsBoolean({ message: msg('isBoolean') })
  showPhone?: boolean;

  @IsOptional()
  @IsBoolean({ message: msg('isBoolean') })
  showCity?: boolean;

  @IsOptional()
  @IsBoolean({ message: msg('isBoolean') })
  showLocation?: boolean;

  @IsOptional()
  @IsNumber({}, { message: msg('isNumber') })
  createdAt?: number;

  @IsOptional()
  @IsNumber({}, { message: msg('isNumber') })
  updatedAt?: number;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString({ message: msg('isString') })
  @IsNotEmpty({ message: msg('isNotEmpty') })
  @MaxLength(100, { message: msg('maxLength') })
  name?: string;

  @IsOptional()
  @IsEmail({}, { message: msg('isEmail') })
  email?: string;

  @IsOptional()
  @IsString({ message: msg('isString') })
  @MaxLength(20, { message: msg('maxLength') })
  phone?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => SocialLinksDto)
  socialLinks?: SocialLinksDto;

  @IsOptional()
  @IsString({ message: msg('isString') })
  photoUrl?: string;

  @IsOptional()
  @IsString({ message: msg('isString') })
  @IsNotEmpty({ message: msg('isNotEmpty') })
  @MaxLength(100, { message: msg('maxLength') })
  city?: string;

  @IsOptional()
  @IsString({ message: msg('isString') })
  @IsNotEmpty({ message: msg('isNotEmpty') })
  @MaxLength(200, { message: msg('maxLength') })
  address?: string;

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
  @Min(0, { message: msg('min') })
  distanceRange?: number;

  @IsOptional()
  @IsNumber({}, { message: msg('isNumber') })
  eventDateFrom?: number | null;

  @IsOptional()
  @IsNumber({}, { message: msg('isNumber') })
  eventDateTo?: number | null;

  @IsOptional()
  @IsArray({ message: msg('isArray') })
  @IsIn(NOTIFICATION_TYPES, { each: true, message: msg('isIn') })
  disabledNotificationTypes?: NotificationType[];

  @IsOptional()
  @IsArray({ message: msg('isArray') })
  @IsMongoId({ each: true, message: msg('isMongoId') })
  disciplineIds?: string[];

  @IsOptional()
  @IsArray({ message: msg('isArray') })
  @IsMongoId({ each: true, message: msg('isMongoId') })
  eventTypeIds?: string[];

  @IsOptional()
  @IsArray({ message: msg('isArray') })
  @IsString({ each: true, message: msg('isString') })
  statusIds?: string[];

  @IsOptional()
  @IsArray({ message: msg('isArray') })
  @IsIn(PRICE_OPTIONS, { each: true, message: msg('isIn') })
  priceOptions?: string[];

  @IsOptional()
  @IsArray({ message: msg('isArray') })
  @IsIn(RELATION_TYPES, { each: true, message: msg('isIn') })
  relationTypes?: string[];

  @IsOptional()
  @IsIn(SUPPORTED_LANGUAGES, { message: msg('isIn') })
  language?: string;

  @IsOptional()
  @IsBoolean({ message: msg('isBoolean') })
  showEmail?: boolean;

  @IsOptional()
  @IsBoolean({ message: msg('isBoolean') })
  showPhone?: boolean;

  @IsOptional()
  @IsBoolean({ message: msg('isBoolean') })
  showCity?: boolean;

  @IsOptional()
  @IsBoolean({ message: msg('isBoolean') })
  showLocation?: boolean;

  @IsOptional()
  @IsNumber({}, { message: msg('isNumber') })
  createdAt?: number;

  @IsOptional()
  @IsNumber({}, { message: msg('isNumber') })
  updatedAt?: number;
}
