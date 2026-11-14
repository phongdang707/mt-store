import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { FacebookAuthService } from './facebook-auth.service.js';

class ExchangeDto {
  @IsString() @MinLength(1) @MaxLength(2048) code: string;
  @IsString() @MinLength(8) @MaxLength(128) state: string;
}

@Controller('auth/facebook')
@Throttle({ default: { limit: 30, ttl: 60_000 } })
export class FacebookAuthController {
  constructor(private readonly facebookAuth: FacebookAuthService) {}

  @Get('start')
  start() {
    return this.facebookAuth.start();
  }

  @Post('exchange')
  @HttpCode(200)
  exchange(@Body() dto: ExchangeDto) {
    return this.facebookAuth.exchange(dto.code, dto.state);
  }
}
