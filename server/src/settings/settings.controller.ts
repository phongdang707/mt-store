import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard.js';
import { UpdateSettingsDto } from './settings.dto.js';
import { SettingsService } from './settings.service.js';

@Controller('admin/settings')
@UseGuards(AdminGuard)
export class AdminSettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  get() {
    return this.settings.get();
  }

  @Patch()
  update(@Body() dto: UpdateSettingsDto) {
    return this.settings.update(dto);
  }
}
