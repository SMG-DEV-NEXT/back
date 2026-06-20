import {
  Allow,
  IsString,
  IsOptional,
  IsObject,
} from 'class-validator';

export class CreatePlanDto {
  @IsString()
  cheatId: string;

  @Allow()
  @IsOptional()
  cheat?: Record<string, any>;
}

export class UpdatePlanDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  @IsOptional()
  cheatId?: string;

  @IsString()
  @IsOptional()
  dayId?: string;

  @IsString()
  @IsOptional()
  weekId?: string;

  @IsString()
  @IsOptional()
  monthId?: string;

  @Allow()
  @IsOptional()
  cheat?: Record<string, any>;

  @IsObject()
  day: {
    keys: string[];
    id: string;
    price: number;
    prcent: number;
    titleRu: string;
    titleEn: string;
  };

  @IsObject()
  week: {
    keys: string[];
    id: string;
    price: number;
    prcent: number;
    titleRu: string;
    titleEn: string;
  };

  @IsObject()
  @IsOptional()
  month: {
    keys: string[];
    id: string;
    price: number;
    prcent: number;
    titleRu: string;
    titleEn: string;
  };
}

export class ParamsIdDto {
  @IsString()
  id: string;
}
