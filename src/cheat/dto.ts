import { Transform } from 'class-transformer';
import {
  IsString,
  IsArray,
  IsObject,
  IsNumber,
  IsEnum,
  IsOptional,
  IsBoolean,
} from 'class-validator';

export type CheatVisibility = 'onUpdate' | 'closed' | 'work';

export class CreateCheatDto {
  @IsString() titleEn: string;
  @IsString() titleRu: string;
  @IsEnum(['published', 'unpublished']) status: string;
  @IsNumber() position: number;
  @IsString() aboutRu: string;
  @IsString() aboutEn: string;
  @IsString() image1: string;
  @IsString() image2: string;
  @IsString() catalogId: string;
  @IsEnum(['undetected', 'detected', 'update', 'risk', 'freeze']) type: string;
  @IsString() link: string;
  @IsString() metaTitleRu: string;
  @IsString() metaTitleEn: string;
  @IsString() metaRu: string;
  @IsString() metaEn: string;
  @IsString() @IsOptional() h1Ru?: string;
  @IsString() @IsOptional() h1En?: string;
  @IsArray() thumbnailVideo: string[];
  @IsArray() tags: { ru: string; en: string }[];
  @IsArray() images: string[];
  @IsArray() videos: string[];
  @IsString() imageUrl: string;
  @IsArray() functions: any[];
  @IsString() instructionRu: string;
  @IsString() instructionEn: string;
  @IsObject() requirments: Record<string, any>;
  @IsNumber() minimumPrice: number;
  @IsEnum(['onUpdate', 'closed', 'work']) visibility: CheatVisibility;
  @IsBoolean() showOtherCheats: boolean;
}

export class UpdateCheatDto {
  @IsString() @IsOptional() titleRu?: string;
  @IsString() @IsOptional() titleEn?: string;
  @IsString() @IsOptional() aboutRu?: string;
  @IsString() @IsOptional() aboutEn?: string;
  @IsString() @IsOptional() image1?: string;
  @IsString() @IsOptional() image2?: string;
  @IsString() @IsOptional() imageUrl?: string;
  @IsString() @IsOptional() status?: string;
  @IsString() @IsOptional() type?: string;
  @IsString() @IsOptional() link?: string;
  @IsString() @IsOptional() metaTitleRu?: string;
  @IsString() @IsOptional() metaTitleEn?: string;
  @IsString() @IsOptional() metaRu?: string;
  @IsString() @IsOptional() metaEn?: string;
  @IsString() @IsOptional() h1Ru?: string;
  @IsString() @IsOptional() h1En?: string;
  @IsString() @IsOptional() instructionRu?: string;
  @IsString() @IsOptional() instructionEn?: string;
  @IsString() @IsOptional() catalogId?: string;
  @IsArray() @IsOptional() tags?: { ru: string; en: string }[];
  @IsArray() @IsOptional() images?: string[];
  @IsArray() @IsOptional() videos?: string[];
  @IsArray() @IsOptional() thumbnailVideo?: string[];
  @IsArray() @IsOptional() functions?: any[];
  @IsObject() @IsOptional() requirments?: Record<string, any>;
  @IsNumber() @IsOptional() minimumPrice?: number;
  @IsNumber() @IsOptional() position?: number;
  @IsBoolean() @IsOptional() showOtherCheats?: boolean;
  @IsEnum(['onUpdate', 'closed', 'work']) @IsOptional() visibility?: CheatVisibility;
}

export class ParamsIdDto {
  @IsString()
  id: string;
}

export class ParamsFilterDto {
  @IsString()
  catalogId: string;
}

export class GetCheatsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  type?: 'high_price' | 'low_price' | 'raiting' | 'popular';

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  price_start?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  price_end?: number;

  @IsOptional()
  @IsArray()
  sortingTags?: string[];

  @IsOptional()
  @IsString()
  catalogId?: string;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  limit?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  page?: number;
}

export type GetStatusCheatsDtoTypes = 'all' | 'onUpdate' | 'closed' | 'work';

export class GetStatusCheatsDto {
  @IsOptional()
  @IsString()
  search: string;

  @IsEnum(['all', 'onUpdate', 'closed', 'work'])
  type: GetStatusCheatsDtoTypes;

  @IsString()
  @IsOptional()
  catalog: string;
}
