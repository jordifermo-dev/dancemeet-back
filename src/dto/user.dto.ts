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
import { ISocialLinks } from '../models';
import { SocialLinksDto } from './social-links.dto';

const msg = (rule: string) => i18nValidationMessage(`errors.validation.${rule}`);

const SUPPORTED_LANGUAGES = ['es', 'ca', 'en'];

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
  eventDateFrom?: number;
  eventDateTo?: number | null;
  notificationsEnabled!: boolean;
  disciplineIds!: string[];
  eventTypeIds!: string[];
  statusIds!: string[];
  language!: string;
  showEmail!: boolean;
  showPhone!: boolean;
  showCity!: boolean;
  showLocation!: boolean;
  createdAt!: number;
  updatedAt?: number;
  lastLoginAt?: number;
  followedId!: string[];
  followingId!: string[];
  blockedIds!: string[];
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
  eventDateFrom?: number;

  @IsOptional()
  @IsNumber({}, { message: msg('isNumber') })
  eventDateTo?: number | null;

  @IsBoolean({ message: msg('isBoolean') })
  notificationsEnabled!: boolean;

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

  @IsOptional()
  @IsNumber({}, { message: msg('isNumber') })
  lastLoginAt?: number;
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
  eventDateFrom?: number;

  @IsOptional()
  @IsNumber({}, { message: msg('isNumber') })
  eventDateTo?: number | null;

  @IsOptional()
  @IsBoolean({ message: msg('isBoolean') })
  notificationsEnabled?: boolean;

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

  @IsOptional()
  @IsNumber({}, { message: msg('isNumber') })
  lastLoginAt?: number;
}
