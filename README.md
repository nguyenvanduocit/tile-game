# Unveil Game

Đây là một game lật mở ô chữ realtime, multiple player.

Phần frontend sử dụng Vuejs cho GUI và BabylonJS cho phần đồ họa 3d.

Phía server sử dụng socketio.

Game mục đích sao cho đơn giản, implement nhanh nhất có thể, vậy nên server chỉ sử dụng một file duy nhất, phía frontend nếu bỏ hết thì có thể giữ lại một file createMenuCanvas.ts là đủ.

Giống như trong các engine game khác, project cố đưa càng nhiều phần xử lý logic về phía backend càng tốt, phần frontend chỉ nhằm xử lý giao diện mà thôi. Vì vậy, có một số event cho phép backend thay đổi state của frontend thay vì để frontend chủ động như trong các ứng dụng bình thường.

## Database

Game sử dụng file json làm databse.

## Auth

Game sử dụng Firebase, nên khi release nó, bạn phải tạo file service-account.json và đặt vào thư mục cùng cấp với file server.ts theo đúng hướng dẫn chính thức của firebase.

Đồng thời config lại file firebase.ts trong thư mục firebase của frontend

## Cắt ảnh

Các ô trong game không được chứa trong một file ảnh duy nhất, mà là một file ảnh có tỉ lệ 2:1, được cắt thành 200 tấm nhỏ, sau đó load độc lập với nhau, tạo thành material cho từng tile. Bạn có thể tìm script cắt file trong thư mục server/scripts
