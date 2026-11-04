import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductsModule } from '../products/products.module.js';
import { UploadsController } from '../uploads/uploads.controller.js';
import { AdminOrdersController } from './admin-orders.controller.js';
import { EventsService } from './events.service.js';
import { Order, OrderSchema } from './order.schema.js';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';
import { SupportInvoicesController } from './support-invoices.controller.js';
import { SupportOrdersController } from './support-orders.controller.js';

@Module({
  imports: [MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]), ProductsModule],
  controllers: [OrdersController, AdminOrdersController, SupportInvoicesController, SupportOrdersController, UploadsController],
  providers: [OrdersService, EventsService],
  exports: [MongooseModule],
})
export class OrdersModule {}
