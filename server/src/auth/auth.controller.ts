import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsBoolean, IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';
import { AdminGuard } from './admin.guard.js';
import { AuthService, type AdminClaims } from './auth.service.js';

class LoginDto {
  @IsEmail({}, { message: 'Email chưa đúng định dạng' }) email: string;
  @IsString() @MaxLength(200) password: string;
  @IsOptional() @IsBoolean() remember?: boolean;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password, dto.remember ?? true);
  }

  @Get('me')
  @UseGuards(AdminGuard)
  me(@Req() req: { admin: AdminClaims }) {
    return { email: req.admin.email, name: req.admin.name };
  }
}
