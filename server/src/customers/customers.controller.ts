import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AdminGuard } from '../auth/admin.guard.js';
import { SyncProfileDto, UpdateCustomerDto } from './customer.dto.js';
import { CustomerGuard, type CustomerRequest } from './customer.guard.js';
import { CustomersService, socialName } from './customers.service.js';
import { FacebookAuthService } from './facebook-auth.service.js';
import { messengerLink } from './messenger.js';

@Controller('me')
@UseGuards(CustomerGuard)
export class CustomersController {
  constructor(
    private readonly customers: CustomersService,
    private readonly facebookAuth: FacebookAuthService,
    private readonly config: ConfigService,
  ) {}

  /** Id khách để tách giỏ trên máy, cùng SĐT/địa chỉ và link Messenger của đúng người đó. */
  @Get()
  me(@Req() req: CustomerRequest) {
    const c = req.customer;
    const id = String(c._id);
    return {
      id,
      name: socialName(c),
      avatar: c.avatar,
      phone: c.phone,
      addr: c.addr,
      role: c.role === 'support' ? 'support' : 'customer',
      careUrl: messengerLink(this.config.get<string>('FACEBOOK_PAGE_USERNAME'), id),
    };
  }

  /** Giỏ hàng hỏi hồ sơ đã có tên hoặc ảnh chưa. */
  @Get('profile')
  profile(@Req() req: CustomerRequest) {
    return this.customers.profileOf(req.customer);
  }

  /** Ghi tên và ảnh. Web thì server tự lấy từ token Facebook đã lưu. */
  @Post('profile')
  async sync(@Req() req: CustomerRequest, @Body() dto: SyncProfileDto) {
    let facebookName = dto.facebookName;
    let avatar = dto.avatar;
    const remote = await this.facebookAuth.storedProfile(req.customer._id);
    if (remote.name) facebookName = remote.name;
    if (remote.avatar) avatar = remote.avatar;
    return this.customers.syncProfile(req.customer._id, { facebookName, avatar });
  }
}

@Controller('admin/customers')
@UseGuards(AdminGuard)
export class AdminCustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.customers.updateAdmin(id, dto);
  }
}
