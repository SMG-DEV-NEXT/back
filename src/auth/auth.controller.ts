import {
  Controller,
  Post,
  Body,
  Res,
  Get,
  UseGuards,
  Req,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Request, Response } from 'express';
import DOMPurify from 'dompurify';
import { SanitizeService } from 'src/santizie/santizie.service';
import { AuthGuard } from '@nestjs/passport';
import { TwoFactorAuthService } from 'src/twofactor/towfactor.service';
import {
  ForgetDtoStep1,
  ForgetDtoStep2,
  ForgetDtoStep3,
  LoginDto,
  RegisterDto,
  UpdateDto,
} from './dto';

// DTO for registration

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sanitizeService: SanitizeService,
    private readonly twoFactorAuthService: TwoFactorAuthService,
  ) {}

  // Register user
  @Post('register')
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const { name, email, password, lang, token } = registerDto;
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
      this.authService.addRefreshTokenToCookies(res, refresh_token);
      return res
        .status(200)
        .json({ user: userWithoutPassword, token: access_token });
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
      if (!rememberMe) {
        res.cookie('access', access_token, {
          httpOnly: true, // Prevent access via JavaScript (XSS protection)
          secure: true, // Use HTTPS
          sameSite: 'strict',
        });
        return res
          .status(200)
          .json({ user: userWithoutPassword, token: access_token });
      }
      this.authService.addRefreshTokenToCookies(res, refresh_token);
      return res
        .status(200)
        .json({ user: userWithoutPassword, token: access_token });
    } catch (error) {
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
  @UseGuards(AuthGuard('jwt'))
  async authUser(@Req() request: any, @Res() res: Response) {
    const user = await request.user;
    return res.status(200).send(user);
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

  @Get('verify')
  async verifyToken(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies['refresh_token'];
    if (!token) {
      this.authService.removeRefreshTokenFromResponse(res);
      throw new UnprocessableEntityException('Tokes is invalid');
    }
    const { data, tokens } = await this.authService.verifyToken(token);
    this.authService.addRefreshTokenToCookies(res, tokens.refresh_token);
    return { user: data, token: tokens.access_token };
  }

  @Post('/logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    this.authService.removeRefreshTokenFromResponse(res);
    return res.status(200).send(true);
  }

  @Post('/generate')
  @UseGuards(AuthGuard('jwt'))
  async generate(@Req() request: any) {
    return this.authService.enableTwoFactorAuth(request.user);
  }

  @Post('/disable-fa')
  @UseGuards(AuthGuard('jwt'))
  async DisableFa(@Req() request: any) {
    return this.authService.disableTwoFactorAuth(request.user);
  }

  @Get('/get-qr')
  @UseGuards(AuthGuard('jwt'))
  async getQR(@Req() request: any, @Res({ passthrough: true }) res: Response) {
    try {
      const { qrCode, secret } = await this.authService.getTwoFactorAuth(
        request.user.id,
      );
      return res.status(200).send({ qrCode, secret });
    } catch (err) {}
  }

  @Post('verify-fa')
  verify(@Body() { secret, token }: { secret: string; token: string }) {
    return { valid: this.twoFactorAuthService.verifyToken(secret, token) };
  }

  @Post('/forget-email')
  async forgetStep1(@Body() forgetDto: ForgetDtoStep1, @Res() res: Response) {
    try {
      const data = await this.authService.forgetStep1(
        forgetDto.email,
        forgetDto.lang,
      );
      return res.status(200).send(data);
    } catch (error) {
      return res.status(400).send(error);
    }
  }

  @Post('/forget-code')
  async forgetStep2(@Body() forgetDto: ForgetDtoStep2, @Res() res: Response) {
    try {
      const isVerify = await this.authService.forgetStep2(
        forgetDto.code,
        forgetDto.email,
      );
      return res.status(200).send(isVerify);
    } catch (error) {
      return res.status(400).send(error);
    }
  }

  @Post('/forget-reset')
  async forgetStep3(@Body() forgetDto: ForgetDtoStep3, @Res() res: Response) {
    try {
      await this.authService.forgetStep3(forgetDto.password, forgetDto.email);
      return res.status(200).send(true);
    } catch (error) {
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
      const { name, password, image } = data;
      const updatedUser = await this.authService.updateUser(
        name,
        password,
        image,
        request.user.id,
      );
      return res.status(200).send(updatedUser);
    } catch (error) {
      return res.status(400).send(error);
    }
  }
}
