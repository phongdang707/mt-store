import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CustomerSessionService } from './customer-session.service.js';
import { CustomerGuard } from './customer.guard.js';
import { SupportGuard } from './support.guard.js';
import { AdminCustomersController, CustomersController } from './customers.controller.js';
import { Customer, CustomerSchema } from './customer.schema.js';
import { CustomersService } from './customers.service.js';
import { ZaloAuthController } from './zalo-auth.controller.js';
import { ZaloAuthService } from './zalo-auth.service.js';
import { ZaloLoginState, ZaloLoginStateSchema } from './zalo-login-state.schema.js';
import { ZaloService } from './zalo.service.js';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Customer.name, schema: CustomerSchema },
      { name: ZaloLoginState.name, schema: ZaloLoginStateSchema },
    ]),
  ],
  controllers: [CustomersController, AdminCustomersController, ZaloAuthController],
  providers: [ZaloService, CustomersService, CustomerGuard, SupportGuard, CustomerSessionService, ZaloAuthService],
  exports: [MongooseModule, ZaloService, CustomersService, CustomerGuard, SupportGuard, CustomerSessionService],
})
export class CustomersModule {}
