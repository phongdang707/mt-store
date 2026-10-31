import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';

export interface OrderEvent {
  type: 'order';
  code: string;
  kind: string;
  action: 'created' | 'updated' | 'paid';
}

/** Phát sự kiện đơn thay đổi cho trang quản lý (SSE). */
@Injectable()
export class EventsService {
  readonly stream = new Subject<OrderEvent>();

  emit(e: OrderEvent) {
    this.stream.next(e);
  }
}
