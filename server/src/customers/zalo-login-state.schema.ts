import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

/** `code_verifier` của một lần bấm đăng nhập. Hết hạn sau 10 phút, oauth code cũng chỉ sống 10 phút. */
@Schema({ collection: 'zalo_login_states', timestamps: false })
export class ZaloLoginState {
  @Prop({ required: true, unique: true }) state: string;
  @Prop({ required: true }) verifier: string;
  /** Mongo xoá document khi tới mốc này. */
  @Prop({ required: true, expires: 0 }) exp: Date;
}

export type ZaloLoginStateDocument = HydratedDocument<ZaloLoginState>;
export const ZaloLoginStateSchema = SchemaFactory.createForClass(ZaloLoginState);
