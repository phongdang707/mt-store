import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { SettingsService } from '../settings/settings.service.js';
import { CreateProductDto, UpdateProductDto } from './product.dto.js';
import { Product } from './product.schema.js';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private readonly products: Model<Product>,
    private readonly settings: SettingsService,
  ) {}

  findAll() {
    return this.products.find().sort({ sort: 1, _id: 1 }).exec();
  }

  async findOne(id: string) {
    const p = await this.products.findById(id).exec();
    if (!p) throw new NotFoundException(`Không tìm thấy sản phẩm ${id}`);
    return p;
  }

  findMany(ids: string[]) {
    return this.products.find({ _id: { $in: ids } }).exec();
  }

  /** Dữ liệu trang bán hàng: giống `DATA` của app gốc. */
  async catalog() {
    const [s, products] = await Promise.all([this.settings.get(), this.findAll()]);
    return {
      store: s.store,
      subtitle: s.subtitle,
      cats: s.cats,
      countries: s.countries,
      bank: s.bank,
      qr: s.qr,
      zalo: s.zalo,
      shippingFee: s.shippingFee,
      products,
    };
  }

  /** Món mới đứng đầu danh sách, như nút "Thêm món mới" của app gốc. */
  async create(dto: CreateProductDto) {
    const s = await this.settings.get();
    const first = await this.products.findOne().sort({ sort: 1 }).select('sort').lean().exec();
    const { id, ...rest } = dto;
    // DTO class gán field không gửi thành undefined. Bỏ chúng, kẻo `cat: undefined` đè mất danh mục mặc định.
    const input = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined));
    return this.products.create({
      cat: s.cats?.find((c) => c.trim()) || 'Khác',
      ...input,
      _id: id ?? 'p' + Date.now().toString(36),
      sort: (first?.sort ?? 0) - 1,
    });
  }

  async update(id: string, dto: UpdateProductDto) {
    const p = await this.products.findByIdAndUpdate(id, { $set: dto }, { new: true, runValidators: true }).exec();
    if (!p) throw new NotFoundException(`Không tìm thấy sản phẩm ${id}`);
    return p;
  }

  async remove(id: string) {
    const r = await this.products.deleteOne({ _id: id }).exec();
    if (!r.deletedCount) throw new NotFoundException(`Không tìm thấy sản phẩm ${id}`);
  }
}
