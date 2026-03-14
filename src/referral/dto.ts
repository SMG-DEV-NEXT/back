// referral.dto.ts
import { IsString, IsInt, IsOptional } from 'class-validator';

export class CreateReferralDto {
  @IsString()
  code: string;

  @IsString()
  owner: string;

  @IsOptional()
  @IsString()
  userAccountEmail?: string;

  @IsInt()
  prcentToPrice: number;

  @IsOptional()
  @IsInt()
  prcentToBalance?: number;
}

export class UpdateReferralDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  owner?: string;

  @IsOptional()
  @IsString()
  userAccountEmail?: string;

  @IsOptional()
  @IsInt()
  prcentToPrice?: number;

  @IsOptional()
  @IsInt()
  prcentToBalance?: number;
}
