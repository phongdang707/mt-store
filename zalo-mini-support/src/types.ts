export type InvoiceStatus = "new" | "changed" | "sent";

export interface Invoice {
  code: string;
  name: string;
  avatar: string;
  phone: string;
  total: number;
  invoiceStatus: InvoiceStatus;
  zaloUserId: string;
  items: { name: string; variantName: string; qty: number }[];
}

export interface Desk {
  store: string;
  invoices: Invoice[];
}

export interface Me {
  id: string;
  name: string;
  avatar: string;
  phone: string;
  role?: "customer" | "support";
}

export interface Person {
  zaloUserId: string;
  name: string;
  avatar: string;
  phone: string;
  orders: number;
  open: number;
}
