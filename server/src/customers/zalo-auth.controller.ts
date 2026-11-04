import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { ZaloAuthService } from './zalo-auth.service.js';

class ExchangeDto {
  @IsString() @MinLength(1) @MaxLength(2048) code: string;
  @IsString() @MinLength(8) @MaxLength(128) state: string;
}

@Controller('auth/zalo')
@Throttle({ default: { limit: 30, ttl: 60_000 } })
export class ZaloAuthController {
  constructor(private readonly zaloAuth: ZaloAuthService) {}

  @Get('start')
  start() {
    return this.zaloAuth.start();
  }

  @Post('exchange')
  @HttpCode(200)
  exchange(@Body() dto: ExchangeDto) {
    return this.zaloAuth.exchange(dto.code, dto.state);
  }
}
