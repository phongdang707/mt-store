import type { Metadata } from "next";
import Link from "next/link";
import { LegalShell } from "@/components/legal-shell";

export const metadata: Metadata = {
  title: "Điều khoản sử dụng – MT store",
  description: "Điều khoản dùng trang MT store: đăng nhập Google, đặt hàng xách tay, chuyển khoản VietQR và nhờ shop tìm hộ.",
};

export default function TermsOfServicePage() {
  return (
    <LegalShell>
      <article className="legal">
        <h1>Điều khoản sử dụng</h1>
        <p className="legal-date">Cập nhật: 14 tháng 11 năm 2026</p>
        <p>
          Điều khoản này áp dụng khi bạn dùng trang <strong>MT store</strong> (MT store – Hàng xách tay). Trang viết bằng tiếng Việt.
        </p>

        <h2>Chấp nhận</h2>
        <p>
          Mở trang, đăng nhập, xem hàng, gửi đơn hoặc gửi ảnh tìm hộ nghĩa là bạn đồng ý điều khoản này và{" "}
          <Link href="/privacy-policy">Chính sách quyền riêng tư</Link>. Nếu bạn không đồng ý, bạn ngừng dùng trang.
        </p>

        <h2>Dịch vụ</h2>
        <p>
          MT store là trang đặt hàng xách tay từ Nhật, Hàn, Úc và Trung. Hàng được mua theo đơn và lịch bay, không phải kho có sẵn mọi món mọi lúc. Nước nào shop đang khoá thì không đặt được. Giá trên trang là giá lúc bạn xem. Món chưa có giá thì chờ shop báo.
        </p>
        <p>
          Yêu cầu tìm hộ là nhờ shop tìm món bạn gửi ảnh. Đó chưa phải đơn đã chốt cho đến khi shop báo giá và bạn xác nhận.
        </p>

        <h2>Tài khoản</h2>
        <p>
          Bạn đăng nhập bằng Google của chính mình. Shop xin tên, email và ảnh. Bạn không dùng tài khoản của người khác và không chia sẻ phiên đăng nhập. Shop có thể tạm ngừng nhận đơn của một tài khoản, ví dụ khi trang đang bảo trì hoặc tài khoản bị chặn.
        </p>

        <h2>Đơn hàng</h2>
        <ul>
          <li>Bạn gửi đơn khi đã điền số điện thoại và địa chỉ nhận hàng.</li>
          <li>Đơn mới ở trạng thái chờ shop liên hệ. Shop xác nhận hoặc huỷ và sẽ báo bạn.</li>
          <li>Phí giao, nếu shop đang thu, được cộng vào đơn. Đơn đạt mức miễn phí giao thì không cộng phí đó.</li>
          <li>Hàng xách tay có thể hết, đổi hạn dùng, hoặc chậm vì lịch bay. Shop liên hệ qua Messenger hoặc số bạn để lại.</li>
        </ul>

        <h2>Thanh toán</h2>
        <p>
          Bạn chuyển khoản theo mã VietQR của shop: ngân hàng, số tài khoản, số tiền và nội dung chuyển khoản. Shop không thu tiền qua thẻ trên trang này. Nút “Tôi đã chuyển khoản” chỉ là lời báo của bạn. Shop đối soát với sao kê của shop. Chuyển sai nội dung hoặc sai số tiền thì shop có thể chưa khớp được đơn cho đến khi hai bên làm rõ.
        </p>

        <h2>Cách dùng được chấp nhận</h2>
        <p>
          Bạn không gửi đơn giả, không gửi ảnh không liên quan đến món cần tìm, không cố tình làm rối trang, và không lấy dữ liệu của người khác.
        </p>

        <h2>Nội dung và ảnh</h2>
        <p>
          Logo, bảng giá, ảnh và chữ do shop đăng thuộc shop hoặc người đã cho shop dùng. Bạn không sao chép cả catalog để bán lại. Ảnh và tên món bạn gửi để tìm hộ vẫn là của bạn. Bạn cho shop dùng chúng để tìm hàng, báo giá và lưu trong đơn cho đến khi dữ liệu được xóa theo chính sách quyền riêng tư.
        </p>

        <h2>Giới hạn trách nhiệm</h2>
        <p>
          Shop mô tả hàng theo thông tin đang có lúc đăng. Shop không chịu phần ngoài tầm kiểm soát của shop, như gián đoạn Google hoặc Facebook, lỗi mạng, hoặc ngân hàng từ chối giao dịch. Nếu shop không giao được phần bạn đã trả, shop hoàn số tiền đó hoặc đổi món hai bên đã thống nhất. Shop không bồi thường thêm các thiệt hại gián tiếp.
        </p>

        <h2>Chấm dứt</h2>
        <p>
          Bạn có thể đăng xuất và ngừng dùng bất kỳ lúc nào. Shop có thể ngừng nhận đơn khi bảo trì hoặc khi tài khoản bị lạm dụng. Việc xóa dữ liệu làm theo Chính sách quyền riêng tư, gồm cả mục cách yêu cầu xóa dữ liệu.
        </p>

        <h2>Sửa điều khoản</h2>
        <p>
          Shop có thể sửa điều khoản. Ngày ở đầu trang là lần cập nhật gần nhất. Bạn tiếp tục dùng trang sau ngày đó nghĩa là bạn đồng ý bản mới.
        </p>

        <h2>Liên hệ</h2>
        <p>
          Bạn nhắn Page Facebook của MT store trên Messenger khi cần hỏi về đơn, thanh toán hoặc điều khoản. Shop cũng dùng số điện thoại bạn để lại lúc đặt hàng.
        </p>
        <p>
          Email: <a href="mailto:phongdang707@gmail.com">phongdang707@gmail.com</a>
        </p>

        <h2>Ngôn ngữ</h2>
        <p>Điều khoản này viết bằng tiếng Việt. Khi có bản dịch, bản tiếng Việt là bản dùng.</p>

        <p className="legal-links">
          <Link href="/privacy-policy">Chính sách quyền riêng tư</Link>
        </p>
      </article>
    </LegalShell>
  );
}
