import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from 'src/prisma/prisma.service';
import { User } from '@prisma/client';
import { Response } from 'express';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import { MailService } from 'src/mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailer: MailService,
  ) {}

  async register(name: string, email: string, password: string): Promise<User> {
    const hashedPassword = await bcrypt.hash(password, 10);

    return this.prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        raiting: '0',
        isTwoFactorEnabled: false,
        resetCode: '',
      },
    });
  }

  async login(email: string, password: string, code: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    const passwordIsValid = await bcrypt.compare(password, user.password);
    if (!passwordIsValid) {
      throw new UnauthorizedException('Invalid password');
    }
    if (user.isTwoFactorEnabled && !code) {
      return { secret: user.twoFactorSecret };
    }
    if (code) {
      const isTrueCode = this.verifyFA(user.twoFactorSecret, code);
      if (!isTrueCode) {
        throw new UnauthorizedException('Invalid 2FA code');
      }
    }
    const tokens = this.generateTokens(user.id);
    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      user,
    };
  }

  async verifyToken(token: string) {
    const { id } = this.jwtService.verify(token);
    const user = await this.prisma.user.findFirst({
      where: {
        id,
      },
    });
    if (!user) {
      throw new BadRequestException('User not found');
    }
    const { password, ...data } = user;
    const tokens = this.generateTokens(id);
    return { data, tokens };
  }

  async refreshToken(refreshToken: string): Promise<{ access_token: string }> {
    try {
      const decoded = this.jwtService.verify(refreshToken);
      const accessToken = this.jwtService.sign(
        { userId: decoded.userId },
        { expiresIn: '1h' },
      );

      return { access_token: accessToken };
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  addRefreshTokenToCookies(res: Response, token: string) {
    const expireDate = new Date();
    expireDate.setDate(expireDate.getDate() + 7);
    res.cookie('refresh_token', token, {
      httpOnly: true,
      domain: 'localhost',
      expires: expireDate,
      secure: true,
      sameSite: 'none',
    });
  }

  removeRefreshTokenFromResponse(res: Response) {
    res.cookie('refresh_token', '', {
      httpOnly: true,
      domain: 'localhost',
      expires: new Date(0),
      secure: true,
      sameSite: 'none',
    });
  }

  async getUserByEmail(email: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    return user;
  }

  generateTokens(id: any): { access_token: string; refresh_token: string } {
    const accessToken = this.jwtService.sign(
      { userId: id },
      { expiresIn: '1h' },
    );
    const refreshToken = this.jwtService.sign(
      { userId: id },
      { expiresIn: '7d' },
    );
    return { access_token: accessToken, refresh_token: refreshToken };
  }

  async validateUser(userId: string): Promise<User> {
    return this.prisma.user.findUnique({ where: { id: userId } });
  }

  async enableTwoFactorAuth(userId: string) {
    const secret = speakeasy.generateSecret({
      length: 20,
      name: 'SMG',
    });
    const qrCodeDataURL = await QRCode.toDataURL(secret.otpauth_url);
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret.base32, isTwoFactorEnabled: true },
    });
    return { qrCode: qrCodeDataURL, secret: secret.base32 };
  }
  async getTwoFactorAuth(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { twoFactorSecret: true, isTwoFactorEnabled: true },
      });
      if (!user || !user.isTwoFactorEnabled || !user.twoFactorSecret) {
        throw new Error('2FA is not enabled');
      }
      const otpAuthUrl = `otpauth://totp/SMG?secret=${user.twoFactorSecret}&issuer=SMG`;
      const qrCodeDataURL = await QRCode.toDataURL(otpAuthUrl);
      return { qrCode: qrCodeDataURL, secret: user.twoFactorSecret };
    } catch (err) {
      console.log(err);
      return { qrCode: null, secret: null };
    }
  }

  verifyFA(secret: string, token: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 1, // Allows for a slight time drift
    });
  }

  async forgetStep1(email: string) {
    const user = await this.getUserByEmail(email);
    if (!user) {
      throw new UnauthorizedException('User not found.');
    }
    if (user.isTwoFactorEnabled) {
      return { message: 'Code sended.' };
    }
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await this.prisma.user.update({
      where: { email },
      data: { resetCode: `${code}` },
    });
    await this.mailer.sendMail(
      email,
      'Reset Your Password',
      null,
      `<p>Your pass code ${code}</p>`,
    );

    return { message: 'Code sended.' };
  }
  async forgetStep2(code: string, email: string) {
    const user = await this.getUserByEmail(email);
    if (!user) {
      throw new UnauthorizedException('User not found.');
    }
    if (user.isTwoFactorEnabled) {
      const isTrueCode = this.verifyFA(user.twoFactorSecret, code);
      if (!isTrueCode) {
        throw new UnauthorizedException('Invalid 2FA code');
      }
      return isTrueCode;
    }
    if (user.resetCode === code) {
      await this.prisma.user.update({
        where: { email },
        data: { resetCode: '' },
      });
      return true;
    }
    return false;
  }

  async forgetStep3(password: string, email: string) {
    const user = await this.getUserByEmail(email);
    if (!user) {
      throw new UnauthorizedException('User not found.');
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    await this.prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
    });
    return true;
  }

  async updateUser(name: string, password: string, image: string, id: any) {
    const hashedPassword = await bcrypt.hash(password, 10);

    const update = await this.prisma.user.update({
      where: { id },
      data: {
        name,
        password: hashedPassword,
        logo: image,
      },
    });
    const { password: p, ...data } = update;
    return data;
  }
}
