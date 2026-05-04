import { IsArray, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export enum PromocodeStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export class CreatePromocodeDto {
  @IsString()
  code: string;

  @IsInt()
  @Min(1)
  @Max(100)
  percent: number;

  @IsEnum(PromocodeStatus)
  status: PromocodeStatus;

  @IsInt()
  maxActivate: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cheats?: string[];
}

export class UpdatePromocodeDto extends PartialType(CreatePromocodeDto) { }
