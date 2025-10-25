const puppeteer = require('puppeteer');

// Sau khi đã đăng nhập thành công thủ công
const cookies = await page.cookies();
const fs = require('fs');
fs.writeFileSync('./cookies.json', JSON.stringify(cookies, null, 2));

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto('https://example.com'); // Ví dụ

    // Sử dụng page.evaluate() để chạy code trong trình duyệt
    const data = await page.evaluate(() => {
        // Lấy tiêu đề H1
        const title = document.querySelector('h1').innerText;
        
        // Lấy nội dung đoạn văn đầu tiên
        const paragraph = document.querySelector('p').innerText;

        // Trả về một object chứa dữ liệu
        return {
            title,
            paragraph
        };
    });

    console.log(data); // In dữ liệu đã crawl
    
    await browser.close();
})();