import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  Min,
  Max,
  IsOptional,
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
