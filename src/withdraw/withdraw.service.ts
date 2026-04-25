import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateWithdrawRequestDto, UpdateWithdrawStatusDto } from './dto';

@Injectable()
export class WithdrawService {
    private readonly MIN_WITHDRAW_BALANCE_RUB = 10000;

    constructor(private readonly prisma: PrismaService) { }

    private normalizeTelegram(telegram: string) {
        const value = (telegram || '').trim();
        if (!value) return value;
        return value.startsWith('@') ? value : `@${value}`;
    }

    private normalizeCardNumber(cardNumber: string) {
        const digits = (cardNumber || '').replace(/\D/g, '').slice(0, 16);
        return digits.replace(/(.{4})/g, '$1-').replace(/-$/, '');
    }

    async create(userId: string, dto: CreateWithdrawRequestDto) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            throw new NotFoundException('user_not_found');
        }

        const balance = Number((user as any)?.balance || 0);
        if (balance < this.MIN_WITHDRAW_BALANCE_RUB) {
            throw new BadRequestException('withdraw_min_balance_required');
        }

        const method = dto.method === 'trc20' ? 'trc20' : 'card';
        const paymentInfo =
            method === 'card'
                ? this.normalizeCardNumber(dto.cardNumber || '')
                : (dto.trc20Address || '').trim();

        if (!paymentInfo) {
            throw new BadRequestException('payment_info_required');
        }

        return (this.prisma as any).withdrawRequest.create({
            data: {
                userId,
                method,
                telegram: this.normalizeTelegram(dto.telegram),
                paymentInfo,
                balanceAtTime: balance,
                status: 'pending',
            },
        });
    }

    async getMyRequests(userId: string) {
        return (this.prisma as any).withdrawRequest.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
    }

    async getAll(skip = 0, take = 20) {
        return this.prisma
            .$transaction([
                (this.prisma as any).withdrawRequest.findMany({
                    skip,
                    take,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        user: {
                            select: {
                                id: true,
                                email: true,
                                name: true,
                            },
                        },
                    },
                }),
                (this.prisma as any).withdrawRequest.count(),
            ])
            .then(([data, total]) => ({ data, total }));
    }

    async getPendingCount() {
        const pendingCount = await (this.prisma as any).withdrawRequest.count({
            where: { status: 'pending' },
        });

        return { pendingCount };
    }

    async getOne(id: string) {
        const request = await (this.prisma as any).withdrawRequest.findUnique({
            where: { id },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        balance: true,
                    },
                },
            },
        });

        if (!request) {
            throw new NotFoundException('withdraw_request_not_found');
        }

        return request;
    }

    async updateStatus(id: string, dto: UpdateWithdrawStatusDto) {
        const exists = await (this.prisma as any).withdrawRequest.findUnique({
            where: { id },
            select: { id: true },
        });

        if (!exists) {
            throw new NotFoundException('withdraw_request_not_found');
        }

        return (this.prisma as any).withdrawRequest.update({
            where: { id },
            data: {
                status: dto.status,
                note: dto.note || null,
            },
        });
    }
}
