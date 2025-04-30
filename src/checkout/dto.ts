import { IsString, IsOptional, IsInt, IsEmail } from 'class-validator';

export class CheckoutDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  promo?: string;

  @IsString()
  itemId: string;

  @IsString()
  type: string;

  @IsInt()
  count: number;
}
