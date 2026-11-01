import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CustomersModule } from '../customers/customers.module.js';
import { OrdersModule } from '../orders/orders.module.js';
import { ProductsModule } from '../products/products.module.js';
import { AdminAnalyticsController, TrackController } from './analytics.controller.js';
import { ProductEvent, ProductEventSchema, Visit, VisitSchema } from './analytics.schema.js';
import { AnalyticsService } from './analytics.service.js';

@Module({
  imports: [
    CustomersModule,
    OrdersModule,
    ProductsModule,
    MongooseModule.forFeature([
      { name: Visit.name, schema: VisitSchema },
      { name: ProductEvent.name, schema: ProductEventSchema },
    ]),
  ],
  controllers: [TrackController, AdminAnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
