import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminSettingsController } from './settings.controller.js';
import { Settings, SettingsSchema } from './settings.schema.js';
import { SettingsService } from './settings.service.js';

@Global()
@Module({
  imports: [MongooseModule.forFeature([{ name: Settings.name, schema: SettingsSchema }])],
  controllers: [AdminSettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
