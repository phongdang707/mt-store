import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true })
export class Admin {
  @Prop({ required: true, unique: true, lowercase: true, trim: true }) email: string;
  /** scrypt: `salt:hash` (hex). */
  @Prop({ required: true }) passwordHash: string;
  @Prop({ default: 'Chủ shop' }) displayName: string;
}

export const AdminSchema = SchemaFactory.createForClass(Admin);
