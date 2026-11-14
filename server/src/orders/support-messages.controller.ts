import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { CustomerGuard } from '../customers/customer.guard.js';
import { SupportGuard } from '../customers/support.guard.js';
import { MessengerService } from './messenger.service.js';

class SupportMessageDto {
  @IsString() @Matches(/^(?:MT\d{6}|TH\d{4,5})$/) code: string;
  @IsString() @MinLength(1) @MaxLength(1000) text: string;
}

@Controller('support/messages')
@UseGuards(CustomerGuard, SupportGuard)
export class SupportMessagesController {
  constructor(private readonly messenger: MessengerService) {}

  @Post()
  @HttpCode(200)
  send(@Body() dto: SupportMessageDto) {
    return this.messenger.sendForOrder(dto.code, dto.text);
  }
}
