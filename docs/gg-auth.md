Tóm tắt các bước cấu hình Google Auth với Supabase

Để thiết lập đăng nhập bằng Google cho dự án Supabase, bạn cần thực hiện các bước sau:

1. Cấu hình trên Google Cloud Console

Đây là nơi bạn tạo thông tin định danh (Credentials) cho ứng dụng.

Tạo Project: Truy cập Google Cloud Console và tạo một dự án mới.

Thiết lập OAuth Consent Screen:

Chọn loại người dùng (thường là External).

Điền thông tin ứng dụng (App name, support email).

Thêm các phạm vi truy cập (Scopes): .../auth/userinfo.email và .../auth/userinfo.profile.

Tạo OAuth Client ID:

Đi tới mục Credentials -> Create Credentials -> OAuth client ID.

Chọn Application type (Web application).

Authorized JavaScript origins: Thêm URL dự án Supabase của bạn (ví dụ: https://xyz.supabase.co).

Authorized redirect URIs: Lấy URL này từ trang cấu hình Supabase Auth (thường có dạng https://xyz.supabase.co/auth/v1/callback).

Lưu thông tin: Sau khi tạo, bạn sẽ nhận được Client ID và Client Secret.

2. Cấu hình trên Supabase Dashboard

Kết nối thông tin từ Google vào dự án Supabase của bạn.

Vào dự án của bạn trên Supabase Dashboard.

Đi đến Authentication -> Providers -> Google.

Bật (Enable) Google Provider.

Nhập Client ID và Client Secret đã lấy từ Google Cloud Console.

Lưu thay đổi.

3. Triển khai Code (Phía Client)

Sử dụng thư viện @supabase/supabase-js để gọi hàm đăng nhập.

const { data, error } = await supabase.auth.signInWithOAuth({
provider: 'google',
options: {
queryParams: {
access_type: 'offline',
prompt: 'consent',
},
},
})

Lưu ý quan trọng:

Môi trường Mobile: Nếu bạn làm ứng dụng Native (iOS/Android), quy trình sẽ phức tạp hơn một chút với việc cấu hình Client ID riêng cho từng nền tảng và xử lý SHA-1 certificate.

Redirect URL: Đảm bảo Redirect URI trong Google Cloud khớp hoàn toàn với cấu hình trong Supabase để tránh lỗi "Redirect URI mismatch".

Local Development: Khi chạy ở localhost, bạn cần thêm http://localhost:3000 (hoặc cổng tương ứng) vào danh sách "Additional Redirect URLs" trong phần Authentication Settings của Supabase.
