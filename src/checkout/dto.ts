import {
  IsBoolean,
  IsString,
  IsOptional,
  IsInt,
  IsEmail,
  IsNumber,
  IsEnum,
  Matches,
  Max,
  MaxLength,
  Min,
  IsMongoId,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
export type CheatType = 'day' | 'week' | 'month';

export enum CheckoutType {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
}

export enum CheckoutLocale {
  RU = 'ru',
  EN = 'en',
}

export enum CheckoutCurrency {
  RUB = 'RUB',
  USD = 'USD',
}

export enum CheckoutPaymentMethod {
  FK = 'fk',
  PALLY = 'pally',
  B2PAY = 'b2pay',
}

export class CheckoutDto {
  @IsEmail()
  @MaxLength(254)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  @Matches(/^[A-Za-z0-9_-]+$/)
  promo?: string;

  @IsString()
  @IsMongoId()
  itemId: string;

  @IsString()
  @IsEnum(CheckoutType)
  type: CheatType;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  count: number;

  @IsString()
  @IsEnum(CheckoutLocale)
  locale: string;

  @IsString()
  @IsOptional()
  @MaxLength(64)
  @Matches(/^[A-Za-z0-9_-]+$/)
  ref: string;

  @IsString()
  @IsEnum(CheckoutCurrency)
  currency: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.000001)
  usd: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(999)
  variantPay: number;

  @IsString()
  @IsEnum(CheckoutPaymentMethod)
  methodPay: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  isUsedBalance?: boolean;
}

export class CreatePaymentDto {
  amount: number; // сумма в копейках (например, 10000 = 100 руб)
  description: string;
  // любые другие поля, которые нужны для создания платежа
}
