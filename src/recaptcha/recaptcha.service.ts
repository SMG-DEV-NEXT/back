// src/recaptcha/recaptcha.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class RecaptchaService {
  private readonly secretKey = process.env.RECAPTCHA_SECRET_KEY!;

  async validate(token: string) {
    const response = await axios.post(
      `https://www.google.com/recaptcha/api/siteverify`,
      null,
      {
        params: {
          secret: this.secretKey,
          response: token,
        },
      },
    );

    const data = response.data;
    if (!data.success) {
      throw new BadRequestException('reCAPTCHA verification failed');
    }

    return true;
  }
}
