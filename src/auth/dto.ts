import {
  isEmail,
  IsEmail,
  IsNotEmpty,
  minLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsNotEmpty({ message: 'Имя не должно быть пустым' })
  name: string;

  @IsEmail({}, { message: 'Неверный формат email' })
  email: string;

  @MinLength(8, { message: 'Пароль должен содержать не менее 8 символов' })
  password: string;
}

export class UpdateDto {
  @IsNotEmpty({ message: 'Имя не должно быть пустым' })
  name: string;

  image: string;

  @MinLength(5, { message: 'Пароль должен содержать не менее 5 символов' })
  password: string;
}

export class LoginDto {
  @IsEmail({}, { message: 'Неверный формат email' })
  email: string;

  @MinLength(5, { message: 'Пароль должен содержать не менее 5 символов' })
  password: string;

  code?: string;

  rememberMe: boolean;
}

export class ForgetDtoStep1 {
  @IsEmail({}, { message: 'Неверный формат email' })
  email: string;
}

export class ForgetDtoStep2 {
  @IsNotEmpty({ message: 'Код не должен быть пустым' })
  code: string;

  @IsEmail({}, { message: 'Неверный формат email' })
  email: string;
}

export class ForgetDtoStep3 {
  @MinLength(5, { message: 'Пароль должен содержать не менее 5 символов' })
  password: string;

  @IsEmail({}, { message: 'Неверный формат email' })
  email: string;
}
