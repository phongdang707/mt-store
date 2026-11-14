import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

/** `state` của một lần bấm đăng nhập. Hết hạn sau 10 phút. */
@Schema({ collection: 'login_states', timestamps: false })
export class LoginState {
  @Prop({ required: true, unique: true }) state: string;
  /** Mongo xoá document khi tới mốc này. */
  @Prop({ required: true, expires: 0 }) exp: Date;
}

export type LoginStateDocument = HydratedDocument<LoginState>;
export const LoginStateSchema = SchemaFactory.createForClass(LoginState);
