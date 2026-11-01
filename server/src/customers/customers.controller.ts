import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard.js';
import { BlockCustomerDto, SyncProfileDto } from './customer.dto.js';
import { CustomerGuard, type CustomerRequest } from './customer.guard.js';
import { CustomersService } from './customers.service.js';
import { ZaloService } from './zalo.service.js';

@Controller('me')
@UseGuards(CustomerGuard)
export class CustomersController {
  constructor(
    private readonly customers: CustomersService,
    private readonly zalo: ZaloService,
  ) {}

  /** Id khách để tách giỏ trên máy, cùng SĐT/địa chỉ của đúng người đó. */
  @Get()
  me(@Req() req: CustomerRequest) {
    const c = req.customer;
    return { id: String(c._id), name: c.zaloName || c.name, avatar: c.avatar, phone: c.phone, addr: c.addr };
  }

  /** Giỏ hàng hỏi hồ sơ đã có tên hoặc ảnh chưa. */
  @Get('profile')
  profile(@Req() req: CustomerRequest) {
    return this.customers.profileOf(req.customer);
  }

  /** Ghi tên và ảnh. Token Zalo thì server tự lấy từ Graph, không phụ thuộc lệnh lỗi trên máy khách. */
  @Post('profile')
  async sync(@Req() req: CustomerRequest, @Body() dto: SyncProfileDto) {
    let zaloName = dto.zaloName;
    let avatar = dto.avatar;
    const token = req.header('x-zalo-token');
    if (token) {
      const remote = await this.zalo.profile(token);
      if (remote.name) zaloName = remote.name;
      if (remote.avatar) avatar = remote.avatar;
    }
    return this.customers.syncProfile(req.customer._id, { zaloName, avatar });
  }
}

@Controller('admin/customers')
@UseGuards(AdminGuard)
export class AdminCustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Patch(':id')
  block(@Param('id') id: string, @Body() dto: BlockCustomerDto) {
    return this.customers.setBlocked(id, dto.blocked);
  }
}
