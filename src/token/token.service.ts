import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class TokenService {
  constructor(private prisma: PrismaService) {}

  async createToken(userId: string) {
    const generatedToken = crypto.randomBytes(64).toString('hex');
    return this.prisma.token.create({
      data: {
        userId,
        token: generatedToken,
      },
    });
  }

  async verifyToken(token: string) {
    const foundToken = await this.prisma.token.findFirst({
      where: { token },
    });
    if (!foundToken) throw new BadRequestException('invalid_token');
    await this.prisma.user.update({
      where: { id: foundToken.userId },
      data: { accept: true },
    });
    await this.prisma.token.delete({
      where: { userId: foundToken.userId },
    });
    return true;
  }

  async findTokenByUserId(userId: string) {
    return this.prisma.token.findFirst({
      where: { userId },
    });
  }
}
