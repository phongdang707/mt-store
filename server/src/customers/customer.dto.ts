import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { CUSTOMER_ROLES, type CustomerRole } from './customer.schema.js';

export class UpdateCustomerDto {
  @IsOptional() @IsBoolean() blocked?: boolean;
  @IsOptional() @IsIn(CUSTOMER_ROLES) role?: CustomerRole;
}

/** Tên và ảnh Zalo mới nhất, đọc trên máy khách sau khi đã có quyền. */
export class SyncProfileDto {
  @IsOptional() @IsString() @MaxLength(120) zaloName?: string;
  @IsOptional() @IsString() @MaxLength(2000) avatar?: string;
}
