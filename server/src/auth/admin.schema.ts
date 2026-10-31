import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true })
export class Admin {
  @Prop({ required: true, unique: true, lowercase: true, trim: true }) email: string;
  /** scrypt: `salt:hash` (hex). */
  @Prop({ required: true }) passwordHash: string;
  @Prop({ default: 'Chủ shop' }) displayName: string;
  /** Hash của ADMIN_PASSWORD ở lần đồng bộ gần nhất: chỉ ghi đè mật khẩu khi biến môi trường đổi. */
  @Prop({ default: '' }) envPasswordHash: string;
}

export const AdminSchema = SchemaFactory.createForClass(Admin);
