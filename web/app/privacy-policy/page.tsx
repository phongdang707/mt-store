import type { Metadata } from "next";
import Link from "next/link";
import { LegalShell } from "@/components/legal-shell";

export const metadata: Metadata = {
  title: "Chính sách quyền riêng tư – MT store",
  description: "MT store thu thập gì khi bạn đăng nhập Facebook, đặt hàng xách tay, chuyển khoản và nhắn Messenger, cùng cách yêu cầu xóa dữ liệu.",
};

export default function PrivacyPolicyPage() {
  return (
    <LegalShell>
      <article className="legal">
        <h1>Chính sách quyền riêng tư</h1>
        <p className="legal-date">Cập nhật: 14 tháng 11 năm 2026</p>
        <p>
          Chính sách này mô tả dữ liệu MT store thu thập khi bạn dùng trang đặt hàng xách tay, vì sao shop dùng dữ liệu đó, và cách bạn yêu cầu xóa. Trang viết bằng tiếng Việt.
        </p>

        <h2>Ai vận hành</h2>
        <p>
          Trang này do <strong>MT store</strong> vận hành (tên hiển thị: MT store – Hàng xách tay). MT store là cửa hàng hàng xách tay Nhật, Hàn, Úc và Trung. Bạn xem bảng giá, gửi đơn, hoặc gửi ảnh nhờ shop tìm món chưa có trên trang.
        </p>

        <h2>Dữ liệu shop thu thập</h2>
        <p>Shop chỉ nhận những gì cần để mở cửa hàng, nhận đơn và liên hệ bạn.</p>

        <h3>Đăng nhập Facebook</h3>
        <p>
          Bạn đăng nhập bằng Facebook để vào shop. Hộp thoại Facebook xin quyền <strong>public_profile</strong>. Shop nhận và lưu mã người dùng Facebook, tên hiển thị và ảnh đại diện.
        </p>
        <ul>
          <li>Shop không nhận mật khẩu Facebook.</li>
          <li>Máy chủ lưu access token Facebook cấp (bản dài hạn, khoảng 60 ngày) để đọc lại tên và ảnh. Token này không gửi ra trình duyệt.</li>
          <li>Trang không có đăng nhập Instagram và không lấy dữ liệu tài khoản Instagram.</li>
        </ul>

        <h3>Hồ sơ tạo từ trước</h3>
        <p>
          Một số tài khoản tạo lúc shop còn cho đăng nhập Zalo vẫn còn mã người dùng Zalo và tên Zalo. Khách mới không đăng nhập bằng Zalo.
        </p>

        <h3>Đơn hàng</h3>
        <p>Khi bạn gửi đơn, shop lưu:</p>
        <ul>
          <li>tên và ảnh lấy từ Facebook;</li>
          <li>số điện thoại bạn nhập ở ô “Số Zalo” — shop nhắn số này về hàng và thanh toán;</li>
          <li>địa chỉ nhận hàng;</li>
          <li>ghi chú, nếu bạn có để lại;</li>
          <li>món, số lượng, giá lúc đặt, phí giao hàng và mã đơn.</li>
        </ul>

        <h3>Tìm hộ theo ảnh</h3>
        <p>
          Khi bạn nhờ shop tìm món chưa có trên trang, shop lưu tên sản phẩm, tối đa 6 ảnh, cùng số điện thoại hoặc địa chỉ nếu bạn đã điền.
        </p>

        <h3>Thanh toán</h3>
        <p>
          Shop tạo mã VietQR để bạn chuyển khoản vào tài khoản ngân hàng của shop, kèm số tiền và nội dung là mã đơn. Bạn tự chuyển trên ứng dụng ngân hàng của bạn. Shop không thu số thẻ, không thu mật khẩu ngân hàng, và không đi qua cổng thanh toán thẻ. Nút “Tôi đã chuyển khoản” chỉ ghi nhận bạn đã báo đã chuyển, để shop đối soát. Shop không nhận biên lai từ ngân hàng qua trang này.
        </p>

        <h3>Messenger</h3>
        <p>
          Nếu bạn mở cuộc trò chuyện với Page Facebook của shop, shop lưu mã người nhận tin trên Page (PSID) và thời điểm nhắn gần nhất. Shop dùng mã này để gửi tin trong cửa sổ 24 giờ của Facebook, ví dụ hoá đơn.
        </p>

        <h3>Cách bạn dùng trang</h3>
        <p>Sau khi đăng nhập, shop ghi:</p>
        <ul>
          <li>bạn đang mở trên web, hệ điều hành, dòng máy nếu trình duyệt cho biết, và ngôn ngữ trình duyệt;</li>
          <li>số lần vào, thời gian trang đang mở, và lần cuối bạn mở trang;</li>
          <li>lượt xem, mở chi tiết và thêm sản phẩm vào giỏ.</li>
        </ul>

        <h3>Dữ liệu lưu trên máy bạn</h3>
        <p>Shop không dùng cookie quảng cáo và không gắn công cụ thống kê của bên thứ ba. Trình duyệt chỉ lưu trên máy bạn:</p>
        <ul>
          <li>
            <strong>localStorage:</strong> phiên đăng nhập, giỏ hàng, số điện thoại và địa chỉ nếu bạn chọn “Lưu thông tin cho lần sau”, nước đang xem, giao diện sáng hoặc tối, và thông báo lỗi đăng nhập.
          </li>
          <li>
            <strong>sessionStorage:</strong> một dấu hiệu tạm để trang quay về từ Facebook không xử lý cùng một lần đăng nhập hai lần.
          </li>
        </ul>

        <h2>Vì sao dùng dữ liệu</h2>
        <ul>
          <li>để nhận ra bạn sau khi đăng nhập;</li>
          <li>để nhận đơn, báo giá, giao hàng và gửi hoá đơn;</li>
          <li>để nhắn bạn trên Messenger khi bạn đã nhắn Page;</li>
          <li>để biết món nào được xem, phục vụ việc chỉnh hàng;</li>
          <li>để giữ giỏ hàng và giao diện trên máy bạn.</li>
        </ul>

        <h2>Chia sẻ với bên khác</h2>
        <ul>
          <li>
            <strong>Meta (Facebook):</strong> đăng nhập, ảnh đại diện và tin nhắn Messenger. Phần dữ liệu đó cũng theo chính sách của Meta.
          </li>
          <li>
            <strong>Nơi lưu ảnh:</strong> nếu shop bật Cloudinary, ảnh tìm hộ và ảnh hàng được lưu ở đó.
          </li>
          <li>
            <strong>Nhân viên shop</strong> và tài khoản được giao chăm sóc khách hàng xem đơn để xác nhận, gửi hoá đơn và nhắn tin.
          </li>
          <li>Ngân hàng của bạn chỉ tham gia khi bạn tự chuyển khoản. Shop không gửi dữ liệu thẻ cho bên thanh toán.</li>
        </ul>
        <p>Shop không bán dữ liệu của bạn.</p>

        <h2>Thời gian giữ</h2>
        <ul>
          <li>Nhật ký vào trang (số lần và số giây mỗi ngày) được giữ 90 ngày.</li>
          <li>Hồ sơ, đơn và ảnh tìm hộ được giữ trong lúc shop còn cần để giao hàng, đối soát và xử lý khiếu nại.</li>
          <li>Access token Facebook được giữ đến khi hết hạn hoặc khi hồ sơ bị xóa.</li>
        </ul>

        <h2>Quyền của bạn</h2>
        <p>Bạn có thể:</p>
        <ul>
          <li>xem đơn của mình trong trang sau khi đăng nhập;</li>
          <li>sửa số điện thoại và địa chỉ ở lần đặt sau, hoặc nhắn shop để sửa thông tin đang lưu;</li>
          <li>đăng xuất để xóa phiên trên máy này;</li>
          <li>yêu cầu xóa dữ liệu theo mục bên dưới;</li>
          <li>gỡ quyền của app trong phần cài đặt Facebook.</li>
        </ul>

        <h2>Cách yêu cầu xóa dữ liệu</h2>
        <p>Bạn chọn một trong hai cách. Shop không yêu cầu bạn tạo thêm tài khoản để gửi yêu cầu.</p>
        <p>
          <strong>Trên Facebook.</strong> Vào Cài đặt và quyền riêng tư → Trung tâm tài khoản → Ứng dụng và trang web → tìm MT store → Gỡ. Facebook gửi yêu cầu xóa tới shop. Shop xóa hồ sơ đăng nhập (mã Facebook, tên, ảnh, token) và lượt xem sản phẩm. Trên đơn đã tạo, shop gỡ tên, ảnh, số điện thoại, địa chỉ, ghi chú, mô tả món tìm hộ và ảnh bạn đã gửi. Mã đơn, danh sách món và số tiền được giữ lại để đối soát.
        </p>
        <p>
          <strong>Nhắn shop.</strong> Nhắn Page Facebook của MT store trên Messenger. Bạn ghi tên Facebook của mình và câu “yêu cầu xóa dữ liệu”. Shop xử lý theo cùng cách ở trên.
        </p>

        <h2>Liên hệ</h2>
        <p>
          Để hỏi về dữ liệu, sửa thông tin hoặc yêu cầu xóa, bạn nhắn Page Facebook của MT store trên Messenger. Đó là kênh liên hệ của shop: hoá đơn và tin nhắn đơn hàng cũng đi qua Messenger, cùng số điện thoại bạn để lại khi đặt hàng.
        </p>
        <p className="legal-ph">
          Email hoặc link Page để điền vào đây: [THAY BẰNG EMAIL HOẶC LINK PAGE FACEBOOK CỦA MT STORE]
        </p>

        <p className="legal-links">
          <Link href="/terms-of-service">Điều khoản sử dụng</Link>
        </p>
      </article>
    </LegalShell>
  );
}
