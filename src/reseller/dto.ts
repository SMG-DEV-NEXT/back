import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  Min,
  Max,
  IsOptional,
  IsString,
} from 'class-validator';

/**
 * DTO for creating a Reseller
 */
export class CreateResellerDto {
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  prcent: number;
}

/**
 * DTO for updating a Reseller (all fields optional)
 */
export class UpdateResellerDto {
  @IsOptional()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  prcent?: number;
}

export class ResellerRequestDto {
  @IsNotEmpty({ message: 'resourse_required' })
  resourse: string;

  @IsString({ message: 'telegram_required' })
  email: string;

  @IsNotEmpty({ message: 'count_required' })
  count: string;

  @IsNotEmpty({ message: 'product_required' })
  product: string;

  @IsNotEmpty({ message: 'pay_required' })
  payMethod: string;
}

export class UpdateRequestDto {
  @IsNotEmpty()
  not: string;

  @IsNotEmpty()
  id: string;
}
