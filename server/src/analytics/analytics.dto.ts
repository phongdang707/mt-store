import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { EVENT_TYPES, type EventType } from './analytics.schema.js';

export class VisitDto {
  /** Tên Google. `facebookName`, `zaloName` và `name` là client cũ, cùng một giá trị. */
  @IsOptional() @IsString() @MaxLength(120) googleName?: string;
  @IsOptional() @IsString() @MaxLength(120) facebookName?: string;
  @IsOptional() @IsString() @MaxLength(120) zaloName?: string;
  @IsOptional() @IsString() @MaxLength(120) name?: string;
  @IsOptional() @IsString() @MaxLength(2000) avatar?: string;
  @IsOptional() @IsString() @MaxLength(32) platform?: string;
  @IsOptional() @IsString() @MaxLength(64) os?: string;
  @IsOptional() @IsString() @MaxLength(64) model?: string;
  @IsOptional() @IsString() @MaxLength(32) zaloVersion?: string;
  @IsOptional() @IsString() @MaxLength(16) language?: string;
  /** Giây vừa ở trước màn hình. Tối đa 45 để một nhịp trễ không cộng cả khoảng im lặng. */
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(45) seconds?: number;
}

export class ProductEventDto {
  @IsIn(EVENT_TYPES) type: EventType;
  @IsString() @Matches(/^[\w-]{1,64}$/) productId: string;
}

export class EventsDto {
  @IsArray() @ArrayMaxSize(30) @ValidateNested({ each: true }) @Type(() => ProductEventDto) events: ProductEventDto[];
}

export class DaysQuery {
  @IsOptional() @Type(() => Number) @IsIn([7, 30, 90]) days?: number;
}
