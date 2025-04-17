import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export enum ContactServiceType {
  TELEGRAM = 'telegram',
  VK = 'vk',
  DISCORD = 'discord',
}

export enum ContactStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export class CreateContactDto {
  @IsBoolean()
  help: boolean;

  @IsEnum(ContactServiceType)
  service: ContactServiceType;

  @IsEnum(ContactStatus)
  status: ContactStatus;

  @IsString()
  titleru: string;

  @IsString()
  titleen: string;

  @IsString()
  textru: string;

  @IsString()
  texten: string;

  @IsUrl()
  url: string;

  @IsString()
  icon: string;
}

export class UpdateContactDto extends PartialType(CreateContactDto) {}
