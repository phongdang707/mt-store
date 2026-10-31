import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module.js';
import { CustomersModule } from './customers/customers.module.js';
import { HealthModule } from './health/health.module.js';
import { OrdersModule } from './orders/orders.module.js';
import { ProductsModule } from './products/products.module.js';
import { SettingsModule } from './settings/settings.module.js';
import { StorageModule } from './storage/storage.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({ uri: config.getOrThrow<string>('MONGODB_URI') }),
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
    StorageModule,
    SettingsModule,
    AuthModule,
    CustomersModule,
    HealthModule,
    ProductsModule,
    OrdersModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
