import {
    isEmail,
    IsEmail,
    IsNotEmpty,
    minLength,
    MinLength,
} from 'class-validator';
export class RegisterDto {
    @IsNotEmpty()
    name: string;

    @IsEmail()
    email: string;

    @MinLength(8)
    password: string;
}

export class UpdateDto {
    @IsNotEmpty()
    name: string;

    image: string;

    @MinLength(8)
    password: string;
}

// DTO for login
export class LoginDto {
    @IsEmail()
    email: string;

    @MinLength(8)
    password: string;

    code?: string;

    rememberMe: boolean;
}

export class ForgetDtoStep1 {
    @IsEmail()
    email: string;
}

export class ForgetDtoStep2 {
    code: string;

    email: string;
}

export class ForgetDtoStep3 {
    @MinLength(8)
    password: string;

    email: string;
}
