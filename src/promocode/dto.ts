import { IsEnum, IsInt, IsString, Max, Min } from 'class-validator';
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
}

export class UpdatePromocodeDto extends PartialType(CreatePromocodeDto) {}
