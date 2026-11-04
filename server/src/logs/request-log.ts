import { AsyncLocalStorage } from 'node:async_hooks';

/** Trạng thái nhật ký của request hiện tại. Một request chỉ một dòng. */
export interface RequestLogState {
  skip: boolean;
  id?: string;
  pending?: Promise<string | null>;
}

export const requestLog = new AsyncLocalStorage<RequestLogState>();
