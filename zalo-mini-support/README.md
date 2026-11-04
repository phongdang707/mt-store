# MT Chăm sóc

Mini App cho nhân viên customer support. Mở cuộc chat Zalo với khách theo `zaloUserId` đã lưu lúc khách đăng nhập. Không cần Official Account: `openChat` điền sẵn lời nhắn, nhân viên tự bấm gửi.

```bash
cp .env.example .env
```

`APP_ID` phải là Mini App ID của cùng ứng dụng đang cấp user id cho trang bán hàng (`ZALO_APP_ID` trên server). `VITE_API_URL` là API của cửa hàng, không có dấu `/` cuối. `ZMP_TOKEN` chỉ dùng khi deploy.

```bash
npm install
npm start
```

Admin gán quyền customer support trong Báo cáo. Nhân viên mở Mini App bằng đúng tài khoản Zalo đó.
