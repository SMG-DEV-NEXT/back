import { Transform } from 'class-transformer';
import {
  IsString,
  IsArray,
  IsObject,
  IsNumber,
  IsEnum,
  IsOptional,
  Max,
  MaxLength,
  Min,
  MinLength,
  isString,
} from 'class-validator';
import { IsEmail, IsIn, IsNumberString } from 'class-validator';

export class CommentCreate {
  @IsString()
  @MinLength(1, { message: 'Comment must not be empty' })
  @MaxLength(300, { message: 'Comment must not exceed 300 characters' })
  text: string;

  @IsString()
  cheatId: string;

  @IsNumber()
  @Min(1, { message: 'Stars must be at least 1' })
  @Max(5, { message: 'Stars must be at most 5' })
  stars: number;
}

// comment.dto.ts

export class GetCommentsDto {
  @IsOptional()
  @IsString()
  cheatTitle?: string;

  @IsOptional()
  @IsString()
  userEmail?: string;

  @IsOptional()
  @IsString()
  createdFrom?: string; // ISO date

  @IsOptional()
  @IsString()
  createdTo?: string; // ISO date

  @IsOptional()
  @IsIn(['createdAt', 'stars'])
  sortBy?: 'createdAt' | 'stars';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';

  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;
}

export class getComment {
  @IsString()
  id: string;
}

export class UpdateComment {
  @IsString()
  @MinLength(1, { message: 'Comment must not be empty' })
  @MaxLength(300, { message: 'Comment must not exceed 300 characters' })
  text: string;

  @IsNumber()
  @Min(1, { message: 'Stars must be at least 1' })
  @Max(5, { message: 'Stars must be at most 5' })
  stars: number;
}
