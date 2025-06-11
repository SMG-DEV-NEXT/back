import { IsInt, IsOptional, IsString, IsEnum, IsUrl } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDto {
  @IsString()
  title: string;

  @IsString()
  headRu: string;

  @IsString()
  headEn: string;

  @IsString()
  metaRu: string;

  @IsString()
  metaEn: string;

  @IsOptional()
  @IsEnum(['published', 'unpublish'])
  type?: string;

  @IsInt()
  @Type(() => Number)
  position: number;

  @IsOptional()
  @IsUrl({
    require_protocol: true,
    protocols: ['http', 'https'],
    host_whitelist: ['localhost', /^\w+(\.\w+)*$/],
  })
  imageUrl?: string;
}
