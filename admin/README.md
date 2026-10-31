# MT store — trang quản lý

Vite + React, theo canvas thiết kế "MT store – Trang quản lý" (Đăng nhập, Đơn hàng, Sản phẩm, Yêu cầu tìm hộ, Hoá đơn, bản điện thoại) + Cài đặt cửa hàng.

```bash
cp .env.example .env   # VITE_API_URL = địa chỉ server
npm install
npm run dev            # http://localhost:5174
npm run build          # dist/ (SPA: mọi đường dẫn trả về index.html)
```

Chạy bằng dữ liệu mẫu giống canvas thiết kế, không cần server (để xem/chụp so với thiết kế):

```bash
VITE_FIXTURE=1 npm run dev   # đăng nhập bằng email bất kỳ + mật khẩu bất kỳ
```

`/hd/:token` là trang hoá đơn công khai (link "Sao chép link" gửi khách), không cần đăng nhập.
