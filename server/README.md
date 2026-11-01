# MT store — server

NestJS 12 + MongoDB (Mongoose 9), ESM. Phục vụ trang bán hàng (`client/`, Zalo Mini App) và trang quản lý (`admin/`).

```bash
cp .env.example .env      # điền MONGODB_URI, JWT_SECRET, ADMIN_EMAIL/ADMIN_PASSWORD, Cloudinary, Zalo
npm install               # npm 10 lỗi "edgesOut" thì: npx npm@11 install
npm run seed              # nạp 72 sản phẩm + cài đặt shop từ seed/ (chạy lại chỉ thêm món chưa có)
npm run seed -- --reset   # xoá hết sản phẩm rồi nạp lại (vd sau khi thêm key Cloudinary)
npm run seed -- --rehost  # đẩy ảnh localhost đang có trong DB lên Cloudinary, giữ giá
npm run start:dev         # http://localhost:3000/api
```

Docker, MongoDB lấy `MONGODB_URI` trong `.env` (Atlas). API trong container chỉ mở `127.0.0.1:3000`. HTTPS public đi qua nginx của `gateway` (`nhatro_edge`).

DNS (một lần), panel `nhatrothongminh.click`: bản ghi `A` tên `mt-store` → `103.72.97.203`, cột Bảo vệ **tắt**. Atlas Network Access phải cho IP này.

```bash
make tls       # sau khi DNS trỏ đúng: chứng chỉ + vhost HTTPS
make rollout   # pull origin/main rồi build và thay container
make seed      # nạp catalog vào Atlas khi cần
make logs
make down
```

`https://mt-store.nhatrothongminh.click/api/health` — `mongo` phải là `up`. Sửa code liên tục trên host: `docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build`.

Render (instance 512MB), Root Directory = `server`:

```bash
# Build Command
yarn install --production=false && yarn build
# Start Command — bản đã build, không chạy nest start (hết RAM)
yarn start
```

Biến môi trường trên Render, không commit: `MONGODB_URI`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`. Ảnh production cần `CLOUDINARY_*`.

- **Ảnh**: Cloudinary khi có `CLOUDINARY_*`; chưa có (dev) thì lưu `./uploads`, phục vụ ở `/uploads`. Production không có Cloudinary thì API upload trả lỗi, server vẫn chạy.
- **Khách**: Zalo Mini App gửi `x-zalo-token` (access token), server xác minh qua Graph API bằng `ZALO_APP_SECRET`. Dev chưa có secret: header `x-dev-user`.
- **Admin**: tài khoản tạo từ `ADMIN_EMAIL`/`ADMIN_PASSWORD` lúc khởi động. Chủ shop đổi mật khẩu trong Cài đặt (`POST /api/auth/password`), mật khẩu đó được giữ qua các lần khởi động; chỉ khi đổi giá trị `ADMIN_PASSWORD` rồi khởi động lại thì mật khẩu mới bị đặt lại theo env.
- **Cài đặt**: `markets` (Nhật, Hàn, Úc, Trung: mở/khoá + ngày bay, hạn nhận đơn). Nước bị khoá bị ẩn khỏi `/api/catalog` cùng hàng của nó và không đặt được. `freeShipFrom`: đơn có tạm tính từ mức này được miễn phí giao (đơn lưu `shipBase` + `freeShipFrom` lúc đặt).
- `seed/` được tách từ app gốc bằng `scripts/extract-artifact.py`.

## API (prefix `/api`)

| | Method | Path | |
|---|---|---|---|
| công khai | GET | `/catalog` | cài đặt shop + toàn bộ sản phẩm |
| | GET | `/invoices/:token` | hoá đơn qua link chia sẻ |
| khách | GET | `/me` | SĐT/địa chỉ lần trước |
| | POST | `/me/visit` | hồ sơ, máy, số giây app đang hiện |
| | POST | `/me/events` | `{ events: [{ type: view\|open\|cart, productId }] }` |
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
| | GET | `/admin/analytics?days=7\|30\|90` | người dùng, thời gian dùng, sản phẩm xem nhiều |
| | GET | `/admin/analytics/users/:id?days=` | phiên và sản phẩm của một khách |
| | DELETE | `/admin/analytics/users/:id` | xoá hồ sơ khách và lịch sử xem; đơn đã đặt giữ nguyên |

Lưu ý ESM: import giá trị từ `mongoose` bằng default import; kiểu (`Model`, `Connection`, …) dùng `import type`.
