# Crawl Data Study4 - TOEIC Test Crawler

Dự án crawl dữ liệu đề thi TOEIC từ website Study4.com sử dụng Puppeteer.

## 📋 Mục đích

Project này được tạo để:
- Crawl dữ liệu đề thi TOEIC từ Study4.com
- Lưu trữ câu hỏi, đáp án, audio, và hình ảnh của các đề thi
- Hỗ trợ việc học và ôn luyện TOEIC offline

## 🛠️ Công nghệ sử dụng

- **Node.js** - Runtime environment
- **Puppeteer** - Headless browser automation
- **Puppeteer Extra** - Plugin system cho Puppeteer
- **Puppeteer Stealth Plugin** - Tránh bị phát hiện là bot
- **fs-extra** - File system operations
- **dotenv** - Environment variables management

## 📦 Cài đặt

### Yêu cầu hệ thống
- Node.js (phiên bản 14 trở lên)
- npm hoặc yarn

### Các bước cài đặt

1. Clone hoặc tải project về máy

2. Cài đặt dependencies:
```bash
npm install
```

## 🚀 Sử dụng

### Bước 1: Lấy Cookies

Để crawl dữ liệu, bạn cần đăng nhập vào Study4.com và lấy cookies:

1. **Cách 1: Sử dụng Browser Extension**
   - Cài đặt extension "EditThisCookie" hoặc "Cookie-Editor"
   - Đăng nhập vào https://study4.com
   - Export cookies và lưu vào file `cookies.json` ở thư mục gốc

2. **Cách 2: Sử dụng script loginAndSaveCookies.js**
   ```bash
   node loginAndSaveCookies.js
   ```
   - Script sẽ mở trình duyệt
   - Thực hiện đăng nhập thủ công
   - Cookies sẽ được lưu tự động

### Bước 2: Chạy Crawler

```bash
node crawl.js
```

Script sẽ:
1. Đọc cookies từ file `cookies.json`
2. Mở trình duyệt và load cookies
3. Truy cập vào đề thi TOEIC
4. Crawl toàn bộ 7 phần của đề thi
5. Lưu kết quả vào file `toeic_full_test.json`

## 📁 Cấu trúc thư mục

```
CrawlDataStudy4/
├── crawl.js                      # Script chính để crawl đề thi
├── loginAndSaveCookies.js        # Script đăng nhập và lưu cookies
├── index.js                      # File demo/test Puppeteer
├── cookies.json                  # File chứa cookies (cần tạo)
├── cookies_from_puppeteer.json   # Cookies được lưu từ Puppeteer
├── toeic_full_test.json          # Kết quả crawl (output)
├── data.json                     # Dữ liệu mẫu
├── note.txt                      # Ghi chú thông tin đăng nhập
├── package.json                  # Dependencies và scripts
└── html/                         # Thư mục chứa HTML mẫu
    ├── part4.html
    ├── part6.html
    └── test_form.html
```

## 📊 Cấu trúc dữ liệu đầu ra

File `toeic_full_test.json` sẽ có cấu trúc:

```json
[
  {
    "partId": "part-1",
    "partName": "Part 1: Photographs",
    "totalQuestions": 6,
    "questions": [
      {
        "number": "1",
        "questionText": "",
        "image": "https://...",
        "audio": "https://...",
        "answers": [
          { "option": "A", "text": "..." },
          { "option": "B", "text": "..." },
          { "option": "C", "text": "..." },
          { "option": "D", "text": "..." }
        ]
      }
    ]
  },
  {
    "partId": "part-3",
    "partName": "Part 3: Conversations",
    "totalGroups": 13,
    "groups": [
      {
        "group": 1,
        "passage": null,
        "audio": "https://...",
        "image": null,
        "questions": [
          {
            "number": "32",
            "questionText": "What are the speakers discussing?",
            "answers": [...]
          }
        ]
      }
    ]
  }
]
```

### Cấu trúc chi tiết (schema)

Tùy phiên bản script, file có thể:
- Là một mảng các Part: `Part[]` (mặc định của `crawl.js` hiện tại), hoặc
- Là một object có key `parts`: `{ parts: Part[] }`

Trong đó, Part có hai biến thể: Part dạng câu hỏi đơn (Part 1, 2, 5) hoặc Part dạng nhóm (Part 3, 4, 6, 7).

- Part (chung):
  - `partId`: string — id của tab/part trên trang (ví dụ: `part-1`, `partcontent-729`)
  - `partName`: string — tiêu đề part (ví dụ: `Part 3` hoặc tên đầy đủ)
  - `totalQuestions?`: number — chỉ xuất hiện với part đơn
  - `totalGroups?`: number — chỉ xuất hiện với part nhóm
  - `questions?`: Question[] — chỉ có với part đơn
  - `groups?`: Group[] — chỉ có với part nhóm

- Question (dùng cho part đơn hoặc bên trong Group):
  - `number`: string — số câu, giữ nguyên định dạng hiển thị (ví dụ: "32")
  - `questionText`: string — nội dung câu hỏi; có thể rỗng ở Part 1–2
  - `image`: string | null — URL ảnh minh họa nếu có
  - `audio`: string | null — URL audio nếu có
  - `answers`: Answer[]

- Group (dùng cho Part 3/4/6/7):
  - `group`: number — số thứ tự nhóm (bắt đầu từ 1)
  - `passage`: string | null — đoạn văn/đề bài chung (Part 6/7)
  - `audio`: string | null — URL audio chung cho nhóm (Part 3/4)
  - `image`: string | null — URL hình/graphic nếu có (câu hỏi nhìn hình)
  - `questions`: Question[] — danh sách câu hỏi thuộc nhóm

- Answer:
  - `option`: string — giá trị phương án (thường là "A", "B", "C", "D")
  - `text`: string — nội dung phương án; ở Part 1–2 có thể là chuỗi rỗng hoặc dạng "A." khi trang không hiển thị text

Ghi chú và edge cases:
- Một số part có `questionText` rỗng (đặc biệt Part 1, 2). Điều này phản ánh đúng giao diện đề thi.
- `audio`/`image` có thể là `null` nếu không hiện diện trong câu/nhóm đó.
- `partId` có thể khác nhau theo test và DOM (ví dụ: `partcontent-730`), không nên hard-code.
- Thứ tự phần tử trong file giữ nguyên như trên trang (Part 1→7, câu 1→100).

#### Ví dụ tối giản: Part đơn (Part 5)

```json
{
  "partId": "partcontent-733",
  "partName": "Part 5",
  "totalQuestions": 30,
  "questions": [
    {
      "number": "101",
      "questionText": "When filling out the order form, please _____ your address clearly to prevent delays.",
      "image": null,
      "audio": null,
      "answers": [
        { "option": "A", "text": "A. fix" },
        { "option": "B", "text": "B. write" },
        { "option": "C", "text": "C. send" },
        { "option": "D", "text": "D. direct" }
      ]
    }
  ]
}
```

#### Ví dụ tối giản: Part nhóm (Part 4 có hình/graphic)

```json
{
  "partId": "partcontent-732",
  "partName": "Part 4",
  "totalGroups": 10,
  "groups": [
    {
      "group": 8,
      "passage": null,
      "audio": null,
      "image": "https://study4.com/media/tez_media/img/..._92_94.png",
      "questions": [
        {
          "number": "92",
          "questionText": "Look at the graphic. Which items need to be ordered?",
          "answers": [
            { "option": "A", "text": "A. Office tables and chairs." },
            { "option": "B", "text": "B. Chairs and drafting tables." },
            { "option": "C", "text": "C. Whiteboards and office chairs." },
            { "option": "D", "text": "D. Chairs and whiteboard." }
          ]
        }
      ]
    }
  ]
}
```

### Phân loại các Part:

**Part đơn (questions):**
- Part 1: Photographs (6 câu)
- Part 2: Question-Response (25 câu)
- Part 5: Incomplete Sentences (30 câu)

**Part nhóm (groups):**
- Part 3: Conversations (39 câu / 13 nhóm)
- Part 4: Short Talks (30 câu / 10 nhóm)
- Part 6: Text Completion (16 câu / 4 nhóm)
- Part 7: Reading Comprehension (54 câu / nhiều nhóm)

## ⚙️ Cấu hình

### Puppeteer Browser Settings

Trong file `crawl.js`, có thể tùy chỉnh:

```javascript
const browser = await puppeteer.launch({
  headless: false,              // true = chạy ngầm, false = hiện trình duyệt
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
  defaultViewport: { 
    width: 1280, 
    height: 900 
  }
});
```

### Thời gian chờ

Có thể điều chỉnh timeout trong các selector:

```javascript
await page.waitForSelector(".tab-pane", { timeout: 20000 }); // 20 giây
```

## 🔍 Chi tiết các file

### crawl.js
- File chính để crawl đề thi TOEIC
- Xử lý cookies và đăng nhập
- Crawl tất cả 7 phần của đề thi
- Lưu kết quả vào JSON

### loginAndSaveCookies.js
- Mở trình duyệt với cookies
- Kiểm tra trạng thái đăng nhập
- Có thể dùng để verify cookies

### index.js
- File demo cơ bản về Puppeteer
- Ví dụ về cách crawl dữ liệu

## 🐛 Xử lý lỗi

### Lỗi thường gặp:

1. **"Không tìm thấy cookies.json"**
   - Đảm bảo file `cookies.json` tồn tại trong thư mục gốc
   - Export cookies từ trình duyệt sau khi đăng nhập

2. **"Có vẻ chưa login"**
   - Cookies có thể đã hết hạn
   - Thử đăng nhập lại và export cookies mới

3. **Timeout errors**
   - Tăng giá trị timeout trong code
   - Kiểm tra kết nối internet

4. **Selector không tìm thấy**
   - Website có thể đã thay đổi cấu trúc HTML
   - Cần cập nhật các selector trong code

## ⚠️ Lưu ý

- **Chỉ sử dụng cho mục đích học tập cá nhân**
- Không spam hoặc crawl quá nhiều request trong thời gian ngắn
- Tôn trọng điều khoản sử dụng của Study4.com
- Cookies có thời hạn, cần refresh định kỳ
- File `note.txt` chứa thông tin nhạy cảm, không commit lên Git

## 📝 Bảo mật

Các file nên thêm vào `.gitignore`:
```
cookies.json
cookies_from_puppeteer.json
note.txt
toeic_full_test.json
data.json
.env
```

## 🤝 Đóng góp

Nếu bạn muốn cải thiện project:
1. Fork repository
2. Tạo branch mới (`git checkout -b feature/improvement`)
3. Commit changes (`git commit -am 'Add new feature'`)
4. Push to branch (`git push origin feature/improvement`)
5. Tạo Pull Request

## 📄 License

Dự án này được tạo cho mục đích học tập và nghiên cứu.

## 👤 Tác giả

Dự án DATN - CrawlDataStudy4

## 📞 Liên hệ

Nếu có vấn đề hoặc câu hỏi, vui lòng tạo issue trong repository.

---

**Chúc bạn học tốt! 📚✨**
