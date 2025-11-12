import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  name: string;

  @IsString()
  @IsOptional()
  password: string;

  @IsBoolean()
  @IsOptional()
  isTwoFactorEnabled: boolean;

  @IsBoolean()
  @IsOptional()
  isAdmin: boolean;

  @IsBoolean()
  @IsOptional()
  accept: boolean;
}
