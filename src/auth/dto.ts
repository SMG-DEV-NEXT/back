import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class RegisterDto {
  @IsNotEmpty({ message: 'name_required' })
  name: string;

  @IsEmail({}, { message: 'email_invalid' })
  email: string;

  @MinLength(8, { message: 'password_min_8' })
  password: string;

  @MinLength(8, { message: 'password_min_8' })
  @IsOptional()
  confirmPassword?: string;

  @IsEmail({}, { message: 'email_invalid' })
  @IsOptional()
  repeatEmail?: string;

  @IsString()
  lang: string;

  @IsString()
  token: string;

  @IsOptional()
  @IsString()
  referralCode?: string;
}

export class UpdateDto {
  @IsNotEmpty({ message: 'name_required' })
  name: string;

  @IsEmail({}, { message: 'email_invalid' })
  email: string;

  @IsOptional()
  @MinLength(5, { message: 'password_min_5' })
  password?: string;

  @IsOptional()
  @IsString()
  currentPassword?: string;

  @IsOptional()
  @IsString()
  image?: string;
}

export class LoginDto {
  @IsEmail({}, { message: 'email_invalid' })
  email: string;

  @MinLength(5, { message: 'password_min_5' })
  password: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  token?: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  rememberMe: boolean;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  fromAdmin: boolean;
}

export class ForgetDtoStep1 {
  @IsEmail({}, { message: 'email_invalid' })
  email: string;

  @IsString()
  lang: string;

  @IsString()
  @IsNotEmpty()
  token: string;
}

export class ForgetDtoStep2 {
  @IsNotEmpty({ message: 'code_required' })
  code: string;

  @IsEmail({}, { message: 'email_invalid' })
  email: string;
}

export class DisableFaDto {
  @IsString()
  @IsNotEmpty({ message: 'code_required' })
  code: string;
}

export class ConfirmFaDto {
  @IsString()
  @IsNotEmpty({ message: 'code_required' })
  code: string;
}

export class ForgetDtoStep3 {
  @MinLength(5, { message: 'password_min_5' })
  password: string;

  @IsEmail({}, { message: 'email_invalid' })
  email: string;

  @IsString()
  @IsNotEmpty()
  resetToken: string;
}
