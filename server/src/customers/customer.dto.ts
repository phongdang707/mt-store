import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { CUSTOMER_ROLES, type CustomerRole } from './customer.schema.js';

export class UpdateCustomerDto {
  @IsOptional() @IsBoolean() blocked?: boolean;
  @IsOptional() @IsIn(CUSTOMER_ROLES) role?: CustomerRole;
}

/** Tên và ảnh Facebook. Trường trống thì server giữ dữ liệu đang có. */
export class SyncProfileDto {
  @IsOptional() @IsString() @MaxLength(120) facebookName?: string;
  @IsOptional() @IsString() @MaxLength(2000) avatar?: string;
}
