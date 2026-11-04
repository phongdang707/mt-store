import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { type HydratedDocument } from 'mongoose';

export const LOG_LEVELS = ['error', 'warn', 'info'] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];
export const LOG_SOURCES = ['http', 'webhook', 'zalo', 'app'] as const;
export type LogSource = (typeof LOG_SOURCES)[number];

/** Nhật ký kỹ thuật. TTL xoá sau 15 ngày. */
@Schema({ timestamps: false })
export class AppLog {
  @Prop({ required: true }) at: Date;
  @Prop({ type: String, enum: LOG_LEVELS, required: true }) level: LogLevel;
  @Prop({ type: String, enum: LOG_SOURCES, required: true }) source: LogSource;
  @Prop({ required: true, maxlength: 500 }) message: string;
  @Prop() status?: number;
  @Prop() method?: string;
  @Prop() path?: string;
  @Prop() stack?: string;
  @Prop({ type: mongoose.Schema.Types.Mixed }) meta?: Record<string, string | number>;
}

export type AppLogDocument = HydratedDocument<AppLog>;
export const AppLogSchema = SchemaFactory.createForClass(AppLog);
AppLogSchema.index({ at: -1 });
AppLogSchema.index({ at: 1 }, { expireAfterSeconds: 15 * 24 * 60 * 60 });
