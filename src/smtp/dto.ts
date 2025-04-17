import { IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateSmtpDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  host: string;

  @IsInt()
  port: number;

  @IsString()
  user: string;

  @IsString()
  pass: string;

  @IsOptional()
  fromName?: string;

  @IsOptional()
  fromEmail?: string;
}
