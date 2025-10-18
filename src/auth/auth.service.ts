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
import {
  generateForgetPasswordMail,
  generateForRegistrationEn,
  generateForRegistrationRu,
} from 'src/mail/generator';
import { TokenService } from 'src/token/token.service';
import { RecaptchaService } from 'src/recaptcha/recaptcha.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailer: MailService,
    private tokenService: TokenService,
    private recaptchaService: RecaptchaService,
  ) {}

  async register(
    name: string,
    email: string,
    password: string,
    lang: string,
    token: string,
  ): Promise<User> {
    await this.recaptchaService.validate(token);
    const hashedPassword = await bcrypt.hash(password, 10);
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new BadRequestException('email_already_exists');
    }
    const user = await this.prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        raiting: '0',
        isTwoFactorEnabled: false,
        resetCode: '',
        accept: false,
      },
      include: {
        transactions: true,
        comments: true,
      },
    });
    const authToken = await this.tokenService.createToken(user.id);
    await this.mailer.sendMail(
      user.email,
      lang === 'ru' ? 'Подтверждение регистрации' : 'Registration Confirmation',
      null,
      lang === 'ru'
        ? generateForRegistrationRu(
            `${process.env.FRONT_URL}/${lang}/?token=${authToken.token}`,
          )
        : generateForRegistrationEn(
            `${process.env.FRONT_URL}/${lang}/?token=${authToken.token}`,
          ),
    );
    return user;
  }

  async resendEmail(email: string, lang: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });
    if (!user) {
      throw new BadRequestException('user_not_found');
    }
    const authToken = await this.tokenService.findTokenByUserId(user.id);
    await this.mailer.sendMail(
      user.email,
      lang === 'ru' ? 'Подтверждение регистрации' : 'Registration Confirmation',
      null,
      lang === 'ru'
        ? generateForRegistrationRu(
            `${process.env.FRONT_URL}/${lang}/?token=${authToken.token}`,
          )
        : generateForRegistrationEn(
            `${process.env.FRONT_URL}/${lang}/?token=${authToken.token}`,
          ),
    );
    return user;
  }

  async login(email: string, password: string, code: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { comments: true, transactions: { include: { cheat: true } } },
    });
    if (!user) {
      throw new UnauthorizedException('user_not_found');
    }
    const passwordIsValid = await bcrypt.compare(password, user.password);
    if (!passwordIsValid) {
      throw new UnauthorizedException('user_not_found');
    }
    if (user.isTwoFactorEnabled && !code) {
      return { secret: user.twoFactorSecret };
    }
    if (code) {
      const isTrueCode = this.verifyFA(user.twoFactorSecret, code);
      if (!isTrueCode) {
        throw new UnauthorizedException('invalid_code');
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
      throw new BadRequestException('email_not_found');
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
        { expiresIn: '7d' },
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
      { expiresIn: '2d' },
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

  async enableTwoFactorAuth(user: User) {
    if (user.twoFactorSecret) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { isTwoFactorEnabled: true },
      });
      const otpAuthUrl = `otpauth://totp/SMG?secret=${user.twoFactorSecret}&issuer=SMG`;
      const qrCodeDataURL = await QRCode.toDataURL(otpAuthUrl);
      return { qrCode: qrCodeDataURL, secret: user.twoFactorSecret };
    }
    const secret = speakeasy.generateSecret({
      length: 20,
      name: 'SMG',
    });
    const qrCodeDataURL = await QRCode.toDataURL(secret.otpauth_url);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { twoFactorSecret: secret.base32, isTwoFactorEnabled: true },
    });
    return { qrCode: qrCodeDataURL, secret: secret.base32 };
  }
  async disableTwoFactorAuth(user: User) {
    await this.prisma.user.update({
      where: { id: user.id },
      data: { isTwoFactorEnabled: false },
    });
  }
  async getTwoFactorAuth(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { twoFactorSecret: true, isTwoFactorEnabled: true },
      });
      if (!user || !user.isTwoFactorEnabled || !user.twoFactorSecret) {
        throw new Error('2fa_not_enabled');
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

  async forgetStep1(email: string, lang: string) {
    const user = await this.getUserByEmail(email);
    if (!user) {
      throw new UnauthorizedException('email_not_found');
    }
    if (user.isTwoFactorEnabled) {
      return { message: 'Code sended.', isTwoFactor: true };
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
      generateForgetPasswordMail(code, lang),
    );

    return { message: 'Code sended.', isTwoFactor: false };
  }
  async forgetStep2(code: string, email: string) {
    const user = await this.getUserByEmail(email);
    if (!user) {
      throw new UnauthorizedException('email_not_found');
    }
    if (user.isTwoFactorEnabled) {
      const isTrueCode = this.verifyFA(user.twoFactorSecret, code);
      if (!isTrueCode) {
        throw new UnauthorizedException('Неверный код');
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
      throw new UnauthorizedException('email_not_found');
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    await this.prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
    });
    return true;
  }

  async updateUser(
    name: string,
    password: string | undefined,
    image: string,
    id: any,
  ) {
    const updateData: any = {
      name,
      logo: image,
    };
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateData.password = hashedPassword;
    }
    const update = await this.prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        transactions: true,
        comments: true,
      },
    });

    const { password: _, accept, ...data } = update;
    return data;
  }
}
