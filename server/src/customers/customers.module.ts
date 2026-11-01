import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CustomerGuard } from './customer.guard.js';
import { AdminCustomersController, CustomersController } from './customers.controller.js';
import { Customer, CustomerSchema } from './customer.schema.js';
import { CustomersService } from './customers.service.js';
import { ZaloService } from './zalo.service.js';

@Global()
@Module({
  imports: [MongooseModule.forFeature([{ name: Customer.name, schema: CustomerSchema }])],
  controllers: [CustomersController, AdminCustomersController],
  providers: [ZaloService, CustomersService, CustomerGuard],
  exports: [MongooseModule, ZaloService, CustomersService, CustomerGuard],
})
export class CustomersModule {}
