import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TokenService } from './token.service';

@Controller('token')
export class TokenController {
  constructor(private readonly tokenService: TokenService) {}
  @Post('/verify')
  verifyToken(@Body('token') token: string) {
    return this.tokenService.verifyToken(token);
  }
}
