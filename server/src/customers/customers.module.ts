import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CustomerSessionService } from './customer-session.service.js';
import { CustomerGuard } from './customer.guard.js';
import { SupportGuard } from './support.guard.js';
import { AdminCustomersController, CustomersController } from './customers.controller.js';
import { Customer, CustomerSchema } from './customer.schema.js';
import { CustomersService } from './customers.service.js';
import { FacebookAuthController } from './facebook-auth.controller.js';
import { FacebookAuthService } from './facebook-auth.service.js';
import { FacebookService } from './facebook.service.js';
import { LoginState, LoginStateSchema } from './login-state.schema.js';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Customer.name, schema: CustomerSchema },
      { name: LoginState.name, schema: LoginStateSchema },
    ]),
  ],
  controllers: [CustomersController, AdminCustomersController, FacebookAuthController],
  providers: [FacebookService, CustomersService, CustomerGuard, SupportGuard, CustomerSessionService, FacebookAuthService],
  exports: [MongooseModule, FacebookService, CustomersService, CustomerGuard, SupportGuard, CustomerSessionService],
})
export class CustomersModule {}
