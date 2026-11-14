import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard.js';
import { CustomerGuard } from '../customers/customer.guard.js';
import { CreateProductDto, UpdateProductDto } from './product.dto.js';
import { ProductsService } from './products.service.js';

@Controller()
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  /** Toàn bộ dữ liệu trang bán hàng. Cần phiên Facebook. */
  @Get('catalog')
  @UseGuards(CustomerGuard)
  catalog() {
    return this.products.catalog();
  }

  @Get('admin/products')
  @UseGuards(AdminGuard)
  list() {
    return this.products.findAll();
  }

  @Post('admin/products')
  @UseGuards(AdminGuard)
  create(@Body() dto: CreateProductDto) {
    return this.products.create(dto);
  }

  @Patch('admin/products/:id')
  @UseGuards(AdminGuard)
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.products.update(id, dto);
  }

  @Delete('admin/products/:id')
  @UseGuards(AdminGuard)
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.products.remove(id);
  }
}
