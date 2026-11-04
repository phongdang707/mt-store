# MT Chăm sóc

Mini App cho nhân viên customer support. Mở cuộc chat Zalo với khách theo `zaloUserId` đã lưu lúc khách đăng nhập. Không cần Official Account: `openChat` điền sẵn lời nhắn, nhân viên tự bấm gửi.

```bash
cp .env.example .env
```

`APP_ID` là **Mini App ID** (lấy trên mini.zalo.me, dùng cho `zmp login`/`zmp deploy`), không phải Zalo App ID. Mini App phải nằm trong Zalo App của trang bán hàng (`ZALO_APP_ID` trên server, ví dụ MTStore), vì Zalo cấp user id theo Zalo App: cùng Zalo App thì cùng user id, server xác minh token bằng secret của Zalo App đó. `VITE_API_URL` là API của cửa hàng, không có dấu `/` cuối. `ZMP_TOKEN` chỉ dùng khi deploy.

```bash
npm install
npm start
```

Admin gán quyền customer support trong Báo cáo. Nhân viên mở Mini App bằng đúng tài khoản Zalo đó.
