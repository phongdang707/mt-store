import { Controller, Get } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import mongoose, { type Connection } from 'mongoose';

@Controller('health')
export class HealthController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  @Get()
  check() {
    const up = this.connection.readyState === mongoose.ConnectionStates.connected;
    const images = process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET ? 'cloudinary' : 'local';
    return { status: up ? 'ok' : 'error', mongo: up ? 'up' : 'down', images };
  }
}
