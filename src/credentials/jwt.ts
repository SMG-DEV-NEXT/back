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
import { AuditService } from 'src/audit/audit.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) =>
          req.cookies?.access_token ||
          ExtractJwt.fromAuthHeaderAsBearerToken()(req),
      ]),
      secretOrKey: process.env.JWT_SECRET,
      ignoreExpiration: false,
      passReqToCallback: true,
    });
  }

  private getClientIp(req: Request): string {
    const ipHeader =
      (req.headers['x-real-ip'] as string) ||
      (req.headers['x-forwarded-for'] as string) ||
      req.socket.remoteAddress ||
      '';

    return ipHeader
      .split(',')[0]
      .trim()
      .replace(/^::ffff:/, '');
  }

  async validate(req: Request, payload: { userId: string }) {
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
        role: true,
        comments: true,
        accept: true,
        transactions: {
          where: { status: 'success' },
          include: { cheat: true },
        },
      },
    });

    if (!user) {
      throw new HttpException('User not found', HttpStatus.PAYMENT_REQUIRED);
    }

    if (user.isAdmin || user.role === 'admin') {
      void this.audit.record({
        type: 'admin',
        event: 'admin_jwt_request',
        severity: 'info',
        userId: user.id,
        userEmail: user.email,
        userRole: user.role,
        ip: this.getClientIp(req),
        method: req.method,
        path: req.originalUrl || req.url,
        userAgent: req.headers['user-agent'] || null,
        metadata: {
          query: req.query,
          body: req.body,
          params: req.params,
        },
      });
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
