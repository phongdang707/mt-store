# Rule khởi tạo Zalo Mini App

Dùng file này mỗi khi tạo một Mini App mới. Mỗi sản phẩm là một thư mục riêng, một Mini App ID riêng. Không copy màn hình, domain, hay bí mật từ repo khác vào project mới.

Tài liệu thắng code mẫu nếu hai bên lệch nhau:

- Tạo project: https://docs.zaloplatforms.com/docs/MA/intro/getting-started/dev-use-command-line
- ZaUI: https://docs.zaloplatforms.com/docs/MA/zaui
- API Mini App: https://miniapp.zaloplatforms.com/documents/api/

## Trước khi tạo

1. Có tài khoản tại https://developers.zalo.me.
2. Tạo Mini App tại https://mini.zalo.me và lấy **Mini App ID**. Không dùng lại ID của app khác.
3. Node.js bản LTS. CLI yêu cầu tối thiểu 12.13.
4. Hỏi tên hiển thị và thư mục. Chưa có ID thì dừng, không bịa ID.

## Tạo project

Project mới:

```bash
npx create-zalo-mini-app <ten-thu-muc>
cd <ten-thu-muc>
npm start
```

Hoặc CLI đã cài: `npm install -g zmp-cli` rồi `zmp init` trong thư mục trống.

Khi CLI hỏi, chọn:

| Câu hỏi                          | Chọn                                          |
| -------------------------------- | --------------------------------------------- |
| Mini App ID                      | ID vừa tạo trên mini.zalo.me                  |
| Template                         | `blank`, trừ khi người dùng chỉ định template |
| Ngôn ngữ                         | TypeScript                                    |
| CSS                              | CSS thuần                                     |
| Recoil, Tailwind, state lib khác | Không, trừ khi người dùng yêu cầu             |
| Đăng nhập                        | QR Zalo hoặc access token                     |

Web app có sẵn, chỉ cần phát hành lên Zalo: đứng ở root project, chạy `zmp init`, chọn **Use ZMP to deploy only**. Root DOM phải là `<div id="app"></div>`. Giữ cây thư mục CLI vừa sinh. Đừng xếp lại cho giống một repo cũ.

Token và App ID chỉ nằm trong `.env`. Không ghi vào source, không commit.

## File phải có

CLI tạo phần lớn. Kiểm tra và bổ sung phần còn thiếu:

- `app-config.json` ở root.
- `src/` là mã nguồn. Entry mount React vào `#app`.
- `import "zmp-ui/zaui.css"` đúng một lần, ở file gốc của app.
- `.env` bị gitignore. Có `.env.example` không chứa giá trị thật.
- `www/` và `dist/` là output của build. Không sửa tay, không commit.

`app-config.json` nguồn để trống danh sách asset. Lệnh build điền `listCSS` và `listSyncJS` vào bản trong `www/`.

```json
{
  "app": {
    "title": "<Tên hiển thị>",
    "actionBarHidden": true,
    "statusBar": "transparent",
    "textColor": "black"
  },
  "debug": false,
  "listCSS": [],
  "listSyncJS": [],
  "listAsyncJS": []
}
```

`.env.example`:

```bash
APP_ID=
ZMP_TOKEN=
VITE_API_URL=
```

`ZMP_TOKEN` là bí mật đăng nhập CLI. `APP_ID` khớp Mini App ID. `VITE_API_URL` là API của chính sản phẩm đó.

Viewport trong `index.html`:

```html
<meta
  name="viewport"
  content="width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover"
/>
```

## Vỏ ứng dụng

Bọc app bằng ZaUI. `theme` chỉ `light` hoặc `dark`.

```tsx
import {
  App,
  SnackbarProvider,
  ZMPRouter,
  AnimationRoutes,
  Route,
} from "zmp-ui";
import "zmp-ui/zaui.css";

export default function MiniApp() {
  return (
    <App theme="light">
      <SnackbarProvider>
        <ZMPRouter>
          <AnimationRoutes>
            <Route path="/" element={<HomePage />} />
          </AnimationRoutes>
        </ZMPRouter>
      </SnackbarProvider>
    </App>
  );
}
```

- Mỗi màn là `Page`. Header là `Header` của `zmp-ui`. Không thêm thanh nav thứ hai dưới header của Zalo.
- Tab chính là `BottomNavigation`, 4–6 mục, mỗi mục có icon và label.
- Điều hướng chỉ qua `ZMPRouter`, `AnimationRoutes`, `Route`, `useNavigate` từ `zmp-ui`. Không import `react-router-dom` trong app.
- Nếu router vỡ sau khi cài dependency, ghim `react-router` và `react-router-dom` ở 6.30.1. `zmp-ui` cũng chấp nhận nhánh 7 và hai nhánh không chạy chung.

Khi `actionBarHidden` là true, gọi một lần lúc mở app:

```ts
import { configAppView } from "zmp-sdk";

await configAppView({
  headerTextColor: "black",
  statusBarType: "transparent",
  actionBar: { hide: true },
});
```

Trên localhost lệnh này có thể ném lỗi. Bắt lỗi và bỏ qua. Trong Zalo thì không nuốt lỗi khác.

Control có sẵn thì lấy từ `zmp-ui`: `Button`, `Input`, `Password`, `Search`, `TextArea`, `OTP`, `Select`, `Picker`, `DatePicker`, `Checkbox`, `Radio`, `Switch`, `Slider`, `List`, `Text`, `Avatar`, `Icon`, `Spinner`, `Modal`, `Sheet`, `SnackbarProvider`, `Tabs`. Không thay chúng bằng `<button>`, `<input>`, `<select>`. Khối riêng của sản phẩm chỉ nằm trong `Page`.

## Quyền Zalo

Mọi quyền đi qua `zmp-sdk`. Giải thích mục đích trên màn hình trước khi gọi. User từ chối thì mã `-201`: dừng, không gọi lại trong vòng lặp, không chặn phần còn lại của app.

| Việc                       | Gọi                                                                                                                    |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Theo dõi OA                | `followOA({ id })` từ `zmp-sdk`. `id` là OA id                                                                         |
| Bỏ theo dõi                | `unfollowOA({ id })`                                                                                                   |
| Xin nhận thông báo qua OA  | `interactOA({ oaId })`. Tham số là `oaId`                                                                              |
| Widget Quan tâm            | `showOAWidget` từ `zmp-sdk/apis`. `id` là id phần tử DOM, không phải OA id                                             |
| Xin thông báo của Mini App | `requestSendNotification()` không tham số                                                                              |
| Đọc quyền đã cấp           | `getSetting()`. Chỉ có `userInfo`, `userLocation`, `userPhonenumber`, `camera`, `micro`. Không có trạng thái follow OA |

OA id lấy từ Mini App đã xác thực. Không hard-code.

## Xong khi

- `npm start` mở được preview.
- Màn đầu là `Page`, có ít nhất một control `zmp-ui`, bọc đúng vỏ ở trên.
- `.env` không nằm trong git. `.env.example` không có token thật.
- `app-config.json` mang tên và ID của project này.
- Không có file nghiệp vụ, asset, hay endpoint copy từ project khác.
