import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ORDER_KINDS, ORDER_STATUSES, SEND_VIA, type OrderKind, type OrderStatus, type SendVia } from './order.schema.js';

const PHONE = /^(\+?84|0)[\d\s.]{8,13}$/;

export class CartItemDto {
  @IsString() @IsNotEmpty() productId: string;
  @IsOptional() @IsInt() @Min(0) variant?: number;
  @IsInt() @Min(1) @Max(99) qty: number;
}

class ContactDto {
  @IsOptional() @IsString() @MaxLength(100) name?: string;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}

export class CreateOrderDto extends ContactDto {
  @Matches(PHONE, { message: 'Số điện thoại chưa đúng' }) phone: string;
  @IsString() @IsNotEmpty({ message: 'Bạn điền địa chỉ nhận hàng nhé' }) @MaxLength(300) addr: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(100) @ValidateNested({ each: true }) @Type(() => CartItemDto) items: CartItemDto[];
}

export class CreateRequestDto extends ContactDto {
  @IsOptional() @Matches(PHONE, { message: 'Số điện thoại chưa đúng' }) phone?: string;
  @IsOptional() @IsString() @MaxLength(300) addr?: string;
  @IsString() @IsNotEmpty({ message: 'Bạn nhập tên sản phẩm nhé' }) @MaxLength(300) product: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(6) @IsString({ each: true }) photos: string[];
}

export class AdminListQuery {
  @IsOptional() @IsIn(ORDER_KINDS) kind?: OrderKind;
  @IsOptional() @Matches(/^\d{4}-\d{2}$/) month?: string;
  @IsOptional() @IsIn(ORDER_STATUSES) status?: OrderStatus;
  @IsOptional() @IsString() @MaxLength(100) q?: string;
}

export class AddItemDto extends CartItemDto {}

export class UpdateItemDto {
  @IsOptional() @IsInt() @Min(0) @Max(99) qty?: number;
  @IsOptional() @IsInt() @Min(0) price?: number;
}

export class UpdateOrderDto {
  @IsOptional() @IsInt() @Min(0) quoteTotal?: number;
  @IsOptional() @IsInt() @Min(0) shippingFee?: number;
}

export class SendInvoiceDto {
  @IsIn(SEND_VIA) via: SendVia;
}
