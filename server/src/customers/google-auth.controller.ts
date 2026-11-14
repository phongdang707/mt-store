import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { GoogleAuthService } from './google-auth.service.js';

class ExchangeDto {
  @IsString() @MinLength(1) @MaxLength(2048) code: string;
  @IsString() @MinLength(8) @MaxLength(128) state: string;
}

@Controller('auth/google')
@Throttle({ default: { limit: 30, ttl: 60_000 } })
export class GoogleAuthController {
  constructor(private readonly googleAuth: GoogleAuthService) {}

  @Get('start')
  start() {
    return this.googleAuth.start();
  }

  @Post('exchange')
  @HttpCode(200)
  exchange(@Body() dto: ExchangeDto) {
    return this.googleAuth.exchange(dto.code, dto.state);
  }
}
