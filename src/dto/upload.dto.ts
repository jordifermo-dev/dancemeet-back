import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

const msg = (rule: string) => i18nValidationMessage(`errors.validation.${rule}`);

export class UploadImageDto {
  @IsIn(['profile', 'event'], { message: msg('isIn') })
  type!: 'profile' | 'event';

  @IsString({ message: msg('isString') })
  @IsNotEmpty({ message: msg('isNotEmpty') })
  @MaxLength(200, { message: msg('maxLength') })
  name!: string;

  @IsString({ message: msg('isString') })
  @IsNotEmpty({ message: msg('isNotEmpty') })
  dataUrl!: string;
}
