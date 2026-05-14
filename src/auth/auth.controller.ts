import {
  BadRequestException,
  Controller,
  Post,
  Body,
  Res,
  Get,
  UseGuards,
  Req,
  UnprocessableEntityException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Request, Response } from 'express';
import DOMPurify from 'dompurify';
import { SanitizeService } from 'src/santizie/santizie.service';
import { AuthGuard } from '@nestjs/passport';
import {
  ConfirmFaDto,
  DisableFaDto,
  ForgetDtoStep1,
  ForgetDtoStep2,
  ForgetDtoStep3,
  LoginDto,
  RegisterDto,
  UpdateDto,
} from './dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuditService } from 'src/audit/audit.service';
import { AuditAction, AuditSeverity } from 'constants/audit-actions';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sanitizeService: SanitizeService,
    private prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private async isAdminEmail(email: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { isAdmin: true },
    });
    return user?.isAdmin === true;
  }

  private getAuditCtx(req: Request) {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      null;
    return {
      ip,
      userAgent: (req.headers['user-agent'] as string) || null,
      method: req.method,
      endpoint: req.originalUrl || req.url,
    };
  }

  // Register user
  @Post('register')
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
  ) {
    try {
      const { name, email, password, lang, token, confirmPassword, repeatEmail } =
        registerDto;
      if (confirmPassword && confirmPassword !== password) {
        throw new BadRequestException('passwords_not_match');
      }
      if (repeatEmail && repeatEmail.toLowerCase() !== email.toLowerCase()) {
        throw new BadRequestException('emails_not_match');
      }
      const sanitizedEmail = this.sanitizeService.sanitizeHtml(email);
      const sanitizedName = this.sanitizeService.sanitizeHtml(name);
      const findUser = await this.authService.getUserByEmail(email);
      if (findUser) {
        return res.status(400).send({ message: 'email_exists' });
      }
      const user = await this.authService.register(
        sanitizedName,
        sanitizedEmail,
        password,
        lang,
        token,
      );
      const { access_token, refresh_token } = this.authService.generateTokens(
        user.id,
      );
      const { password: p, ...userWithoutPassword } = user;
      this.authService.setAuthCookies(res, access_token, refresh_token, true);
      void this.audit.logAuth(AuditAction.REGISTER, this.getAuditCtx(req), {
        userId: user.id,
        status: 200,
      });
      return res.status(200).json({ user: userWithoutPassword });
    } catch (err) {
      console.log(err);
      return res.status(400).send(err);
    }
  }

  // Login user
  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
  ) {
    try {
      const { email, password, code, rememberMe } = loginDto;
      const sanitizedEmail = this.sanitizeService.sanitizeHtml(email);
      const santizedPassword = this.sanitizeService.sanitizeHtml(password);
      const data = await this.authService.login(
        sanitizedEmail,
        santizedPassword,
        code,
      );
      if (data.secret) {
        return res.status(200).json(data);
      }
      const { access_token, refresh_token, user } = data;
      const { password: p, ...userWithoutPassword } = user;
      if (loginDto.fromAdmin && !userWithoutPassword.isAdmin) {
        throw new UnauthorizedException('user_not_found');
      }
      this.authService.setAuthCookies(
        res,
        access_token,
        refresh_token,
        rememberMe,
      );
      void this.audit.logAuth(AuditAction.LOGIN_SUCCESS, this.getAuditCtx(req), {
        userId: userWithoutPassword.id,
        status: 200,
      });
      return res.status(200).json({ user: userWithoutPassword });
    } catch (error) {
      void this.audit.logAuth(AuditAction.LOGIN_FAILED, this.getAuditCtx(req), {
        status: 400,
        metadata: { email: loginDto.email, reason: error?.message },
      });
      return res.status(400).send(error);
    }
  }

  @Post('refresh-token')
  async refreshToken(
    @Body() body: { refresh_token: string },
    @Res() res: Response,
  ) {
    const { refresh_token } = body;
    const { access_token } = await this.authService.refreshToken(refresh_token);
    res.cookie('access_token', access_token, {
      httpOnly: true,
      maxAge: 60 * 60 * 1000,
      secure: process.env.NODE_ENV === 'production',
    });

    return res.json({ access_token });
  }

  @Get('')
  async authUser(@Req() request: any, @Res() res: Response) {
    const user = await request.user;
    const token = request.cookies['access_token'];
    if (token) {
      const { userId } = await this.authService.verifyAccessToken(token);
      if (!userId) {
        const verifiedUser = await this.verifyToken(request, res);

        return res.status(200).send(verifiedUser.user);
      }
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          balance: true,
          totalSpent: true,
          logo: true,
          twoFactorSecret: true,
          isTwoFactorEnabled: true,
          isAdmin: true,
          comments: true,
          accept: true,
          isDeactivated: true,
          transactions: {
            where: { status: 'success' },
            include: { cheat: true },
          },
        },
      });
      const safeUser = this.authService.sanitizeUser(user as any);
      const userWithLoyalty = await this.authService.attachClientUserLoyalty(
        safeUser as any,
      );
      return res.status(200).send(userWithLoyalty);
    }
    return res.status(200).send(null);
  }

  @Post('/resend-email')
  @UseGuards(AuthGuard('jwt'))
  async resendEmail(
    @Req() request: any,
    @Res() res: Response,
    @Body() { lang }: { lang: string },
  ) {
    const user = await request.user;
    await this.authService.resendEmail(user.email, lang);
    return res.status(200).send(true);
  }

  async verifyToken(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies['refresh_token'];
    if (!token) {
      this.authService.clearAuthCookies(res);
      throw new UnprocessableEntityException('Tokes is invalid');
    }
    const { data, tokens } = await this.authService.verifyToken(token);
    this.authService.setAuthCookies(
      res,
      tokens.access_token,
      tokens.refresh_token,
      true,
    );
    return { user: data };
  }

  @Post('/logout')
  async logout(@Res({ passthrough: true }) res: Response, @Req() req: Request) {
    this.authService.clearAuthCookies(res);
    void this.audit.logAuth(AuditAction.LOGOUT, this.getAuditCtx(req), { status: 200 });
    return res.status(200).send(true);
  }

  @Post('/generate')
  @UseGuards(AuthGuard('jwt'))
  async generate(@Req() request: any) {
    return this.authService.enableTwoFactorAuth(request.user);
  }

  @Post('/confirm-fa')
  @UseGuards(AuthGuard('jwt'))
  async confirmFa(
    @Body() dto: ConfirmFaDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      await this.authService.confirmTwoFactorAuth(req.user, dto.code);
      return res.status(200).send(true);
    } catch (error) {
      return res.status(400).send(error);
    }
  }

  @Post('/disable-fa')
  @UseGuards(AuthGuard('jwt'))
  async DisableFa(
    @Body() dto: DisableFaDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      await this.authService.disableTwoFactorAuth(req.user, dto.code);
      void this.audit.log({
        action: AuditAction.SUSPICIOUS_ACTIVITY,
        entity: 'Auth',
        severity: AuditSeverity.WARN,
        ...this.getAuditCtx(req),
        status: 200,
        metadata: { userId: req.user.id, action: 'disable_2fa' },
      });
      return res.status(200).send(true);
    } catch (error) {
      return res.status(400).send(error);
    }
  }

  @Get('/get-qr')
  @UseGuards(AuthGuard('jwt'))
  async getQR(@Req() request: any, @Res({ passthrough: true }) res: Response) {
    try {
      const { qrCode } = await this.authService.getTwoFactorAuth(
        request.user.id,
      );
      return res.status(200).send({ qrCode });
    } catch (err) { }
  }

  @Post('/forget-email')
  async forgetStep1(
    @Body() forgetDto: ForgetDtoStep1,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    try {
      if (await this.isAdminEmail(forgetDto.email)) {
        void this.audit.logSecurity(AuditAction.SUSPICIOUS_ACTIVITY, this.getAuditCtx(req), {
          metadata: { email: forgetDto.email, step: 'forget-email', reason: 'admin_password_reset_attempt' },
        });
        return res.status(403).send({ message: 'forbidden' });
      }
      const data = await this.authService.forgetStep1(forgetDto.email, forgetDto.lang);
      void this.audit.log({
        action: AuditAction.PASSWORD_RESET,
        entity: 'Auth',
        severity: AuditSeverity.INFO,
        ...this.getAuditCtx(req),
        status: 200,
        metadata: { email: forgetDto.email, step: 'forget-email' },
      });
      return res.status(200).send(data);
    } catch (error) {
      return res.status(400).send(error);
    }
  }

  @Post('/forget-code')
  async forgetStep2(
    @Body() forgetDto: ForgetDtoStep2,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    try {
      if (await this.isAdminEmail(forgetDto.email)) {
        void this.audit.logSecurity(AuditAction.SUSPICIOUS_ACTIVITY, this.getAuditCtx(req), {
          metadata: { email: forgetDto.email, step: 'forget-code', reason: 'admin_password_reset_attempt' },
        });
        return res.status(403).send({ message: 'forbidden' });
      }
      const resetToken = await this.authService.forgetStep2(forgetDto.code, forgetDto.email);
      void this.audit.log({
        action: AuditAction.PASSWORD_RESET,
        entity: 'Auth',
        severity: AuditSeverity.INFO,
        ...this.getAuditCtx(req),
        status: 200,
        metadata: { email: forgetDto.email, step: 'forget-code' },
      });
      return res.status(200).send({ resetToken });
    } catch (error) {
      return res.status(400).send(error);
    }
  }

  @Post('/forget-reset')
  async forgetStep3(
    @Body() forgetDto: ForgetDtoStep3,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    try {
      if (await this.isAdminEmail(forgetDto.email)) {
        void this.audit.logSecurity(AuditAction.SUSPICIOUS_ACTIVITY, this.getAuditCtx(req), {
          metadata: { email: forgetDto.email, step: 'forget-reset', reason: 'admin_password_reset_attempt' },
        });
        return res.status(403).send({ message: 'forbidden' });
      }
      await this.authService.forgetStep3(forgetDto.password, forgetDto.email, forgetDto.resetToken);
      void this.audit.log({
        action: AuditAction.PASSWORD_RESET,
        entity: 'Auth',
        severity: AuditSeverity.INFO,
        ...this.getAuditCtx(req),
        status: 200,
        metadata: { email: forgetDto.email, step: 'forget-reset' },
      });
      return res.status(200).send(true);
    } catch (error) {
      if (error?.message === 'invalid_reset_token') {
        void this.audit.log({
          action: AuditAction.INVALID_TOKEN,
          entity: 'Security',
          severity: AuditSeverity.CRITICAL,
          ...this.getAuditCtx(req),
          status: 401,
          metadata: {
            email: forgetDto.email,
            step: 'forget-reset',
            reason: 'invalid_or_replayed_reset_token',
          },
        });
      }
      return res.status(400).send(error);
    }
  }

  @Post('/account-save')
  @UseGuards(AuthGuard('jwt'))
  async saveUser(
    @Body() data: UpdateDto,
    @Res() res: Response,
    @Req() request: any,
  ) {
    try {
      const { name, password, image, currentPassword, email } = data;
      if (email.toLowerCase() !== request.user.email.toLowerCase()) {
        throw new UnauthorizedException('email_mismatch');
      }
      const updatedUser = await this.authService.updateUser(
        name,
        password,
        image,
        request.user.id,
        currentPassword,
      );
      return res.status(200).send(updatedUser);
    } catch (error) {
      return res.status(400).send(error);
    }
  }
}
