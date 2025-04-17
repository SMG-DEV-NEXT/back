import { Controller, Get, Post, Body } from '@nestjs/common';
import { TwoFactorAuthService } from './towfactor.service';

@Controller('2fa')
export class TwoFactorAuthController {
  constructor(private readonly twoFactorAuthService: TwoFactorAuthService) {}

  @Post('generate')
  async generate(@Body('email') email: string) {
    const { secret, otpauthUrl } = this.twoFactorAuthService.generateSecret(email);
    const qrCode = await this.twoFactorAuthService.generateQrCode(otpauthUrl);

    return { secret, qrCode };
  }

  @Post('verify')
  verify(@Body() { secret, token }: { secret: string; token: string }) {
    return { valid: this.twoFactorAuthService.verifyToken(secret, token) };
  }
}
