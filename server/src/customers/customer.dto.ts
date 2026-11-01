import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class BlockCustomerDto {
  @IsBoolean() blocked: boolean;
}

/** Tên và ảnh Zalo mới nhất, đọc trên máy khách sau khi đã có quyền. */
export class SyncProfileDto {
  @IsOptional() @IsString() @MaxLength(120) zaloName?: string;
  @IsOptional() @IsString() @MaxLength(2000) avatar?: string;
}
