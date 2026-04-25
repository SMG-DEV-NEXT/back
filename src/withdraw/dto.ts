import {
    IsIn,
    IsNotEmpty,
    IsOptional,
    IsString,
    Matches,
    ValidateIf,
} from 'class-validator';

export class CreateWithdrawRequestDto {
    @IsString({ message: 'telegram_required' })
    @IsNotEmpty({ message: 'telegram_required' })
    @Matches(/^@?[a-zA-Z0-9_]{5,32}$/, { message: 'telegram_invalid' })
    telegram: string;

    @IsString({ message: 'method_required' })
    @IsIn(['card', 'trc20'], { message: 'method_invalid' })
    method: 'card' | 'trc20';

    @ValidateIf((dto) => dto.method === 'card')
    @IsString({ message: 'card_required' })
    @IsNotEmpty({ message: 'card_required' })
    @Matches(/^[0-9\s]{12,24}$/, { message: 'card_invalid' })
    cardNumber?: string;

    @ValidateIf((dto) => dto.method === 'trc20')
    @IsString({ message: 'trc20_required' })
    @IsNotEmpty({ message: 'trc20_required' })
    @Matches(/^T[a-zA-Z0-9]{20,50}$/, { message: 'trc20_invalid' })
    trc20Address?: string;
}

export class UpdateWithdrawStatusDto {
    @IsString()
    @IsIn(['pending', 'approved', 'rejected'])
    status: 'pending' | 'approved' | 'rejected';

    @IsOptional()
    @IsString()
    note?: string;
}
