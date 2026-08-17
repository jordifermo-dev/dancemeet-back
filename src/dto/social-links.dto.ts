import { IsOptional, IsString, Matches, MaxLength, ValidateIf } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

const msg = (rule: string) => i18nValidationMessage(`errors.validation.${rule}`);

// Each pattern accepts with/without protocol and "www.", but requires the
// platform's own domain plus something after it (not just the bare domain) -
// so a Facebook link can't be saved into the Instagram field by mistake.
const FACEBOOK_URL = /^(https?:\/\/)?(www\.)?(facebook\.com|fb\.com)\/.+/i;
const INSTAGRAM_URL = /^(https?:\/\/)?(www\.)?instagram\.com\/.+/i;
const PINTEREST_URL = /^(https?:\/\/)?(www\.)?(pinterest\.[a-z.]+|pin\.it)\/.+/i;
const TIKTOK_URL = /^(https?:\/\/)?(www\.)?tiktok\.com\/.+/i;
const WHATSAPP_URL = /^(https?:\/\/)?(www\.)?(wa\.me|whatsapp\.com)\/.+/i;
const YOUTUBE_URL = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/i;

export class SocialLinksDto {
  // @ValidateIf skips every validator below for this property when the value
  // is falsy - needed because @IsOptional alone only skips undefined/null,
  // not an empty string (which every unfilled social field is sent as).
  @ValidateIf((_, value) => !!value)
  @IsString({ message: msg('isString') })
  @MaxLength(200, { message: msg('maxLength') })
  @Matches(FACEBOOK_URL, { message: msg('socialUrlFacebook') })
  facebook?: string;

  @ValidateIf((_, value) => !!value)
  @IsString({ message: msg('isString') })
  @MaxLength(200, { message: msg('maxLength') })
  @Matches(INSTAGRAM_URL, { message: msg('socialUrlInstagram') })
  instagram?: string;

  @ValidateIf((_, value) => !!value)
  @IsString({ message: msg('isString') })
  @MaxLength(200, { message: msg('maxLength') })
  @Matches(PINTEREST_URL, { message: msg('socialUrlPinterest') })
  pinterest?: string;

  @ValidateIf((_, value) => !!value)
  @IsString({ message: msg('isString') })
  @MaxLength(200, { message: msg('maxLength') })
  @Matches(TIKTOK_URL, { message: msg('socialUrlTiktok') })
  tiktok?: string;

  @IsOptional()
  @IsString({ message: msg('isString') })
  @MaxLength(200, { message: msg('maxLength') })
  website?: string;

  @ValidateIf((_, value) => !!value)
  @IsString({ message: msg('isString') })
  @MaxLength(200, { message: msg('maxLength') })
  @Matches(WHATSAPP_URL, { message: msg('socialUrlWhatsapp') })
  whatsapp?: string;

  @ValidateIf((_, value) => !!value)
  @IsString({ message: msg('isString') })
  @MaxLength(200, { message: msg('maxLength') })
  @Matches(YOUTUBE_URL, { message: msg('socialUrlYoutube') })
  youtube?: string;
}
