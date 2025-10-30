import {
  IsString,
  IsOptional,
  IsInt,
  IsEmail,
  IsIn,
  IsNumber,
} from 'class-validator';
export type CheatType = 'day' | 'week' | 'month';

export class CheckoutDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  promo?: string;

  @IsString()
  itemId: string;

  @IsString()
  @IsIn(['day', 'week', 'month'])
  type: CheatType;

  @IsInt()
  count: number;

  @IsString()
  locale: string;

  @IsString()
  @IsOptional()
  ref: string;

  @IsString()
  currency: string;

  @IsNumber()
  usd: number;
}

export class CreatePaymentDto {
  amount: number; // сумма в копейках (например, 10000 = 100 руб)
  description: string;
  // любые другие поля, которые нужны для создания платежа
}
