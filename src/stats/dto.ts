import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsInt,
  IsDateString,
  Min,
  IsIn,
  Matches,
  IsNumberString,
} from 'class-validator';
export class CreateStatDto {
  @IsString()
  titleru: string;

  @IsString()
  titleen: string;

  @IsString()
  metaru: string;

  @IsString()
  metaen: string;

  @IsOptional()
  @IsString()
  aboutru?: string;

  @IsOptional()
  @IsString()
  abouten?: string;

  @IsOptional()
  @IsString()
  contentru?: string;

  @IsOptional()
  @IsString()
  contenten?: string;

  @IsOptional()
  @IsString()
  Image1?: string;

  @IsOptional()
  @IsString()
  Image2?: string;

  @IsOptional()
  @IsIn(['published', 'unpublish'])
  type?: string;

  @Matches(/^[0-9a-fA-F]{24}$/, { message: 'Invalid catalogId format' })
  catalogId: string;
}

export class UpdateStatsDto {
  @IsString()
  titleru: string;

  @IsString()
  titleen: string;

  @IsString()
  metaru: string;

  @IsString()
  metaen: string;

  @IsOptional()
  @IsString()
  aboutru?: string;

  @IsOptional()
  @IsString()
  abouten?: string;

  @IsOptional()
  @IsString()
  contentru?: string;

  @IsOptional()
  @IsString()
  contenten?: string;

  @IsOptional()
  @IsString()
  Image1?: string;

  @IsOptional()
  @IsString()
  Image2?: string;

  @IsOptional()
  @IsIn(['published', 'unpublish'])
  type?: string;

  @Matches(/^[0-9a-fA-F]{24}$/, { message: 'Invalid catalogId format' })
  catalogId: string;
}

export class GetAllStatsDto {
  @IsOptional()
  @IsString()
  catalogId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;
}

export class GetAllStatsOfCatalog {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;
}
