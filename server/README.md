# MT store — server

NestJS 12 + MongoDB (Mongoose 9), ESM. Phục vụ trang bán hàng (`client/`, Zalo Mini App) và trang quản lý (`admin/`).

```bash
cp .env.example .env      # điền MONGODB_URI, JWT_SECRET, ADMIN_EMAIL/ADMIN_PASSWORD, Cloudinary, Zalo
npm install               # npm 10 lỗi "edgesOut" thì: npx npm@11 install
npm run seed              # nạp 72 sản phẩm + cài đặt shop từ seed/ (chạy lại chỉ thêm món chưa có)
npm run seed -- --reset   # xoá hết sản phẩm rồi nạp lại (vd sau khi thêm key Cloudinary)
npm run start:dev         # http://localhost:3000/api
```

- **Ảnh**: Cloudinary khi có `CLOUDINARY_*`; chưa có (dev) thì lưu `./uploads`, phục vụ ở `/uploads`.
- **Khách**: Zalo Mini App gửi `x-zalo-token` (access token), server xác minh qua Graph API bằng `ZALO_APP_SECRET`. Dev chưa có secret: header `x-dev-user`.
- **Admin**: tài khoản tạo từ `ADMIN_EMAIL`/`ADMIN_PASSWORD` lúc khởi động; đổi `ADMIN_PASSWORD` rồi khởi động lại = đặt lại mật khẩu.
- `seed/` được tách từ app gốc bằng `scripts/extract-artifact.py`.

## API (prefix `/api`)

| | Method | Path | |
|---|---|---|---|
| công khai | GET | `/catalog` | cài đặt shop + toàn bộ sản phẩm |
| | GET | `/invoices/:token` | hoá đơn qua link chia sẻ |
| khách | GET | `/me` | SĐT/địa chỉ lần trước |
| | POST | `/orders` | `{ phone, addr, name?, note?, items: [{ productId, variant?, qty }] }`, giá lấy từ DB |
| | POST | `/uploads` → `/requests` | ảnh tìm hộ → `{ product, photos[] }` |
| | GET | `/orders/mine` | 30 đơn gần nhất |
| | POST | `/orders/:code/paid` | "Tôi đã chuyển khoản" |
| admin | POST | `/auth/login`, GET `/auth/me` | JWT Bearer |
| | GET | `/admin/badges`, `/admin/orders?kind&month&status&q`, `/admin/orders/months` | |
| | POST | `/admin/orders/:code/confirm` · `/unconfirm` | |
| | PATCH | `/admin/orders/:code` | `{ quoteTotal?, shippingFee? }` |
| | POST/PATCH/DELETE | `/admin/orders/:code/items[/:idx]` | thêm / sửa SL, giá / bỏ món (ghi lịch sử hoá đơn) |
| | POST | `/admin/orders/:code/send` | `{ via: zalo\|messenger\|link\|png }` |
| | GET/POST/PATCH/DELETE | `/admin/products[/:id]` | |
| | GET/PATCH | `/admin/settings` | |
| | POST | `/admin/uploads` | ảnh sản phẩm |
| | GET (SSE) | `/admin/events?token=` | đơn mới / đổi trạng thái |

Lưu ý ESM: import giá trị từ `mongoose` bằng default import; kiểu (`Model`, `Connection`, …) dùng `import type`.
