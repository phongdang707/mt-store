import { BadRequestException, Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { CustomersService } from '../customers/customers.service.js';
import { Order } from './order.schema.js';

const GRAPH = 'https://graph.facebook.com/v21.0';

@Injectable()
export class MessengerService {
  private readonly log = new Logger(MessengerService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly customers: CustomersService,
    @InjectModel(Order.name) private readonly orders: Model<Order>,
  ) {}

  /** Gửi text từ Page tới khách của đơn. Chỉ trong cửa sổ 24 giờ. */
  async sendForOrder(code: string, text: string) {
    const order = await this.orders.findOne({ code }).select('customer').exec();
    if (!order) throw new NotFoundException(`Không tìm thấy đơn ${code}`);
    const target = await this.customers.messengerOf(order.customer);
    if (!target?.psid) throw new BadRequestException('Khách chưa nhắn Page');
    if (!target.ready) throw new BadRequestException('Hết hạn 24 giờ, khách cần nhắn Page lại');
    await this.send(target.psid, text.trim());
    return { code, sent: true };
  }

  private async send(psid: string, text: string) {
    const token = this.config.get<string>('FACEBOOK_PAGE_ACCESS_TOKEN')?.trim();
    const page = this.config.get<string>('FACEBOOK_PAGE_ID')?.trim();
    if (!token || !page) throw new ServiceUnavailableException('Server chưa cấu hình Messenger');
    let res: Response;
    try {
      res = await fetch(`${GRAPH}/${page}/messages`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ recipient: { id: psid }, messaging_type: 'RESPONSE', message: { text } }),
      });
    } catch (err) {
      this.log.warn(`Messenger không phản hồi: ${(err as Error).message}`);
      throw new BadRequestException('Chưa gửi được tin nhắn');
    }
    if (res.ok) return;
    let data: { error?: { code?: number; error_subcode?: number; message?: string } } = {};
    try {
      data = (await res.json()) as typeof data;
    } catch {
      data = {};
    }
    const code = data.error?.code;
    const sub = data.error?.error_subcode;
    const message = data.error?.message || '';
    this.log.warn(`Messenger từ chối tin: ${code ?? res.status} ${sub ?? ''} ${message}`);
    if (code === 10 || sub === 2018278 || /outside of allowed window/i.test(message)) {
      throw new BadRequestException('Hết hạn 24 giờ, khách cần nhắn Page lại');
    }
    throw new BadRequestException('Chưa gửi được tin nhắn');
  }
}
