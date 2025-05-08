import {
  IsEnum,
  IsJSON,
  IsOptional,
  IsNumber,
  IsString,
} from 'class-validator';
import { StatType } from '@prisma/client';

export class UpdateStatDto {
  @IsOptional()
  @IsEnum(StatType)
  type?: StatType;

  @IsOptional()
  @IsJSON()
  content?: any;

  @IsOptional()
  @IsJSON()
  data?: any;
}

export class CreateStatDto {
  @IsString()
  faqBlockId: string;

  @IsEnum(StatType)
  type: StatType;

  @IsJSON()
  content: any;

  @IsOptional()
  @IsJSON()
  data?: any;
}

export class UpdateBlockDto {
  @IsString()
  titleru: string;

  @IsString()
  titleen: string;

  @IsString()
  @IsOptional()
  aboutru?: string;

  @IsString()
  @IsOptional()
  abouten?: string;
}
