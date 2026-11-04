import { Type } from 'class-transformer';
import { IsIn, IsInt, IsMongoId, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { LOG_LEVELS, LOG_SOURCES, type LogLevel, type LogSource } from './log.schema.js';

export class LogListQuery {
  @IsOptional() @IsIn(LOG_LEVELS) level?: LogLevel;
  @IsOptional() @IsIn(LOG_SOURCES) source?: LogSource;
  @IsOptional() @IsString() @MaxLength(200) q?: string;
  @IsOptional() @IsString() @MaxLength(200) actor?: string;
  @IsOptional() @IsString() @MaxLength(32) rid?: string;
  @IsOptional() @IsString() @MaxLength(240) fingerprint?: string;
  @IsOptional() @IsMongoId() before?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limit?: number;
}
