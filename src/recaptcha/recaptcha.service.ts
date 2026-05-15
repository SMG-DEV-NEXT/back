// src/recaptcha/recaptcha.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class RecaptchaService {
  private readonly secretKey =
    process.env.NODE_ENV === 'development'
      ? '0x0000000000000000000000000000000000000000'
      : process.env.HCAPTCHA_SECRET_KEY!;

  async validate(token: string) {
    const body = new URLSearchParams({
      secret: this.secretKey,
      response: token,
    });
    const response = await axios.post(
      `https://hcaptcha.com/siteverify`,
      body.toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        proxy: false,
      },
    );

    const data = response.data;
    if (!data.success) {
      throw new BadRequestException('hCaptcha verification failed');
    }

    return true;
  }
}
