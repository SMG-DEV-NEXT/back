import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) =>
          req.cookies?.access_token ||
          ExtractJwt.fromAuthHeaderAsBearerToken()(req),
      ]),
      secretOrKey: process.env.JWT_SECRET,
      ignoreExpiration: false,
    });
  }

  async validate(payload: { userId: string }) {
    if (!payload.userId) {
      throw new HttpException(
        'Invalid token payload',
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        name: true,
        email: true,
        logo: true,
        twoFactorSecret: true,
        isTwoFactorEnabled: true,
        isAdmin: true,
        comments: true,
        accept: true,
        transactions: { include: { cheat: true } },
      },
    });

    if (!user) {
      throw new HttpException('User not found', HttpStatus.PAYMENT_REQUIRED);
    }

    return user;
  }

  handleRequest(err, user, info, context) {
    // This is called by Passport automatically
    if (err) throw err;

    if (!user) {
      // No token or invalid token → return 402 instead of default 401
      throw new HttpException(
        'Token missing or invalid',
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    return user;
  }
}
