import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { UpdateSettingsDto } from './settings.dto.js';
import { MARKET_KEYS, Settings, type Market } from './settings.schema.js';

/** Đủ 4 nước theo thứ tự cố định; nước chưa có trong `markets` lấy trạng thái mở từ `countries` cũ. */
function normalizeMarkets(markets: Partial<Market>[] | undefined, countries: string[]): Market[] {
  return MARKET_KEYS.map((key) => {
    const m = markets?.find((x) => x.key === key);
    return m
      ? { key, open: !!m.open, fly: m.fly ?? '', until: m.until ?? '' }
      : { key, open: countries.includes(key), fly: '', until: '' };
  });
}

@Injectable()
export class SettingsService {
  constructor(@InjectModel(Settings.name) private readonly model: Model<Settings>) {}

  async get() {
    const s = (await this.model.findById('main').exec()) ?? (await this.model.create({ _id: 'main' }));
    // Bản cũ chỉ có `countries: string[]`: dựng `markets` một lần.
    if (s.markets?.length !== MARKET_KEYS.length) {
      s.markets = normalizeMarkets(s.markets, s.countries ?? []);
      await s.save();
    }
    return s;
  }

  async update(dto: UpdateSettingsDto) {
    const set: Record<string, unknown> = { ...dto };
    for (const k of ['bank', 'prefs'] as const) {
      if (!dto[k]) continue;
      delete set[k];
      for (const [f, v] of Object.entries(dto[k])) if (v !== undefined) set[`${k}.${f}`] = v;
    }
    if (dto.markets) {
      const markets = normalizeMarkets(dto.markets, []);
      set.markets = markets;
      set.countries = markets.filter((m) => m.open).map((m) => m.key);
    }
    await this.model.updateOne({ _id: 'main' }, { $set: set }, { upsert: true, setDefaultsOnInsert: true }).exec();
    return this.get();
  }
}
