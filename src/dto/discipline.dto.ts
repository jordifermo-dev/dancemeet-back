import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

const msg = (rule: string) => i18nValidationMessage(`errors.validation.${rule}`);

export const DISCIPLINE_NAMES = ['Swing', 'Rock&Roll', 'Hip-Hop', 'Salsa', 'Bachata', 'Tango'] as const;
export type DisciplineName = (typeof DISCIPLINE_NAMES)[number];

export class DisciplineDto {
  id?: string;
  name!: string;
  color!: string;
  iconUrl!: string;
  createdAt!: number;
}

export class CreateDisciplineDto {
  @IsIn(DISCIPLINE_NAMES, { message: msg('isIn') })
  name!: DisciplineName;

  @IsString({ message: msg('isString') })
  @IsNotEmpty({ message: msg('isNotEmpty') })
  color!: string;

  @IsString({ message: msg('isString') })
  @IsNotEmpty({ message: msg('isNotEmpty') })
  iconUrl!: string;

  @IsOptional()
  @IsNumber({}, { message: msg('isNumber') })
  createdAt?: number;
}

export class UpdateDisciplineDto {
  @IsOptional()
  @IsIn(DISCIPLINE_NAMES, { message: msg('isIn') })
  name?: DisciplineName;

  @IsOptional()
  @IsString({ message: msg('isString') })
  @IsNotEmpty({ message: msg('isNotEmpty') })
  color?: string;

  @IsOptional()
  @IsString({ message: msg('isString') })
  @IsNotEmpty({ message: msg('isNotEmpty') })
  iconUrl?: string;

  @IsOptional()
  @IsNumber({}, { message: msg('isNumber') })
  createdAt?: number;
}
