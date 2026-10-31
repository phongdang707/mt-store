import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Matches, MaxLength, Min, ValidateNested } from 'class-validator';
import { MARKET_KEYS } from './settings.schema.js';

class BankDto {
  @IsOptional() @IsString() @MaxLength(80) bank?: string;
  @IsOptional() @IsString() @MaxLength(12) bin?: string;
  @IsOptional() @IsString() @MaxLength(30) acc?: string;
  @IsOptional() @IsString() @MaxLength(80) name?: string;
}

const DDMM = /^(|\d{1,2}\/\d{1,2})$/;

class MarketDto {
  @IsIn(MARKET_KEYS as unknown as string[]) key: string;
  @IsBoolean() open: boolean;
  @IsOptional() @Matches(DDMM, { message: 'Ngày bay dạng dd/mm' }) fly?: string;
  @IsOptional() @Matches(DDMM, { message: 'Ngày nhận đơn dạng dd/mm' }) until?: string;
}

class PrefsDto {
  @IsOptional() @IsBoolean() notiOrder?: boolean;
  @IsOptional() @IsBoolean() notiFind?: boolean;
  @IsOptional() @IsBoolean() hideRev?: boolean;
}

export class UpdateSettingsDto {
  @IsOptional() @IsString() @MaxLength(60) store?: string;
  @IsOptional() @IsString() @MaxLength(80) subtitle?: string;
  @IsOptional() @IsString() @MaxLength(500) logo?: string;
  @IsOptional() @IsString() @MaxLength(120) tagline?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) cats?: string[];
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => MarketDto) markets?: MarketDto[];
  @IsOptional() @ValidateNested() @Type(() => BankDto) bank?: BankDto;
  @IsOptional() @IsString() qr?: string;
  @IsOptional() @IsString() @MaxLength(20) zalo?: string;
  @IsOptional() @IsString() @MaxLength(200) messenger?: string;
  @IsOptional() @IsInt() @Min(0) shippingFee?: number;
  @IsOptional() @IsInt() @Min(0) freeShipFrom?: number;
  @IsOptional() @IsString() @MaxLength(500) orderNote?: string;
  @IsOptional() @ValidateNested() @Type(() => PrefsDto) prefs?: PrefsDto;
  @IsOptional() @IsString() @MaxLength(300) storefrontUrl?: string;
}
