// referral.dto.ts
import { IsString, IsInt, IsOptional } from 'class-validator';

export class CreateReferralDto {
  @IsString()
  code: string;

  @IsString()
  owner: string;

  @IsInt()
  prcentToPrice: number;
}

export class UpdateReferralDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsInt()
  prcentToPrice?: number;
}
