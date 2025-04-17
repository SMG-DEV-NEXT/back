import { Injectable } from '@nestjs/common';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';

@Injectable()
export class TwoFactorAuthService {
  generateSecret(userEmail: string) {
    const secret = speakeasy.generateSecret({
      name: `SMG (${userEmail})`, // App name with user email
    });

    return {
      secret: secret.base32, // Store this in the database
      otpauthUrl: secret.otpauth_url, // Use this to generate QR code
    };
  }

  async generateQrCode(otpauthUrl: string): Promise<string> {
    return await QRCode.toDataURL(otpauthUrl); // Returns a QR code as a base64 image
  }

  verifyToken(secret: string, token: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 1, // Allows for a slight time drift
    });
  }
}
