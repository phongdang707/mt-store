import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CustomerSessionService } from './customer-session.service.js';
import { CustomerGuard } from './customer.guard.js';
import { SupportGuard } from './support.guard.js';
import { AdminCustomersController, CustomersController } from './customers.controller.js';
import { Customer, CustomerSchema } from './customer.schema.js';
import { CustomersService } from './customers.service.js';
import { GoogleAuthController } from './google-auth.controller.js';
import { GoogleAuthService } from './google-auth.service.js';
import { GoogleService } from './google.service.js';
import { LoginState, LoginStateSchema } from './login-state.schema.js';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Customer.name, schema: CustomerSchema },
      { name: LoginState.name, schema: LoginStateSchema },
    ]),
  ],
  controllers: [CustomersController, AdminCustomersController, GoogleAuthController],
  providers: [GoogleService, CustomersService, CustomerGuard, SupportGuard, CustomerSessionService, GoogleAuthService],
  exports: [MongooseModule, GoogleService, CustomersService, CustomerGuard, SupportGuard, CustomerSessionService],
})
export class CustomersModule {}
