import { IsInt, IsOptional, IsString, IsEnum, IsUrl, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDto {
  @IsString()
  title: string;

  @IsString()
  headRu: string;

  @IsString()
  headEn: string;

  @IsString()
  @IsOptional()
  link?: string;

  @IsString()
  @IsOptional()
  h1Ru?: string;

  @IsString()
  @IsOptional()
  h1En?: string;

  @IsString()
  metaRu: string;

  @IsString()
  metaEn: string;

  @IsString()
  @IsOptional()
  seoRu?: string;

  @IsString()
  @IsOptional()
  seoEn?: string;

  @IsOptional()
  @IsEnum(['published', 'unpublish'])
  type?: string;

  @IsInt()
  @Type(() => Number)
  position: number;

  @ValidateIf((o) => !!o.imageUrl)
  @IsUrl({
    require_protocol: true,
    protocols: ['http', 'https'],
  })
  @IsOptional()
  imageUrl?: string;
}
