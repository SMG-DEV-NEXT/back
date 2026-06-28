// referral.dto.ts
import { IsString, IsInt, IsOptional, IsBoolean } from 'class-validator';

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

  @IsOptional()
  @IsBoolean()
  isAccumulating?: boolean;
}

export class MergeReferralDto {
  // Optional admin override: merge into the account with this email instead of
  // the referral's stored userAccountEmail (auto-match).
  @IsOptional()
  @IsString()
  targetUserEmail?: string;

  // When true, returns a preview (counts + totals) without crediting balances.
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
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

  @IsOptional()
  @IsBoolean()
  isAccumulating?: boolean;
}
