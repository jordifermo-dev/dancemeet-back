import { IsMongoId, IsNumber, IsOptional } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

const msg = (rule: string) => i18nValidationMessage(`errors.validation.${rule}`);

export class FollowersDto {
  id?: string;
  userId!: string;
  followerId!: string;
  createdAt!: number;
}

export class CreateFollowersDto {
  @IsMongoId({ message: msg('isMongoId') })
  userId!: string;

  @IsMongoId({ message: msg('isMongoId') })
  followerId!: string;

  @IsOptional()
  @IsNumber({}, { message: msg('isNumber') })
  createdAt?: number;
}
