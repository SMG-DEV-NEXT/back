import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  IsObject,
} from 'class-validator';

export class CreatePlanDto {
  @IsString()
  cheatId: string;
}

export class UpdatePlanDto {
  @IsString()
  @IsOptional()
  cheatId?: string;

  @IsObject()
  day: {
    keys: string[];
    id: string;
    price: number;
    prcent: number;
  };

  @IsObject()
  week: {
    keys: string[];
    id: string;
    price: number;
    prcent: number;
  };

  @IsObject()
  @IsOptional()
  month: {
    keys: string[];
    id: string;
    price: number;
    prcent: number;
  };
}

export class ParamsIdDto {
  @IsString()
  id: string;
}
