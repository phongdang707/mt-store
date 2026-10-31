import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { UpdateSettingsDto } from './settings.dto.js';
import { Settings } from './settings.schema.js';

@Injectable()
export class SettingsService {
  constructor(@InjectModel(Settings.name) private readonly model: Model<Settings>) {}

  async get() {
    return (
      (await this.model.findById('main').exec()) ??
      (await this.model.create({ _id: 'main' }))
    );
  }

  async update(dto: UpdateSettingsDto) {
    const set: Record<string, unknown> = { ...dto };
    if (dto.bank) {
      delete set.bank;
      for (const [k, v] of Object.entries(dto.bank)) set[`bank.${k}`] = v;
    }
    return this.model
      .findByIdAndUpdate('main', { $set: set }, { new: true, upsert: true, setDefaultsOnInsert: true })
      .exec();
  }
}
