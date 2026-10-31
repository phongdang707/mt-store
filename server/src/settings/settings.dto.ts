import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator';

class BankDto {
  @IsOptional() @IsString() @MaxLength(80) bank?: string;
  @IsOptional() @IsString() @MaxLength(12) bin?: string;
  @IsOptional() @IsString() @MaxLength(30) acc?: string;
  @IsOptional() @IsString() @MaxLength(80) name?: string;
}

export class UpdateSettingsDto {
  @IsOptional() @IsString() @MaxLength(60) store?: string;
  @IsOptional() @IsString() @MaxLength(80) subtitle?: string;
  @IsOptional() @IsString() @MaxLength(120) tagline?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) cats?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) countries?: string[];
  @IsOptional() @ValidateNested() @Type(() => BankDto) bank?: BankDto;
  @IsOptional() @IsString() qr?: string;
  @IsOptional() @IsString() @MaxLength(20) zalo?: string;
  @IsOptional() @IsString() @MaxLength(200) messenger?: string;
  @IsOptional() @IsInt() @Min(0) shippingFee?: number;
  @IsOptional() @IsString() @MaxLength(300) storefrontUrl?: string;
}
