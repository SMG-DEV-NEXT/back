import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => {
          // Try to get token from Authorization header
          let token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);

          // If no token in header, try to get it from cookies
          if (!token && req.cookies?.access) {
            token = req.cookies.access;
          }

          return token;
        },
      ]),
      secretOrKey: process.env.JWT_SECRET, // JWT secret from config
    });
  }

  async validate(data) {
    const { userId } = data;
    try {
      const user = await this.prisma.user.findFirst({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          logo: true,
          twoFactorSecret: true,
          isTwoFactorEnabled: true,
          isAdmin: true,
          comments: true,
          transactions: { include: { cheat: true } },
        },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      return user;
    } catch (err) {
      console.error(err);
      throw new UnauthorizedException('Invalid token');
    }
  }
}
