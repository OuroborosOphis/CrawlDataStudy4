// use_exported_cookies.js
const puppeteer = require('puppeteer');
const fs = require('fs');

function mapSameSite(input) {
  if (!input) return undefined;
  // extension xuất "no_restriction" hoặc null; convert to Puppeteer expected values
  // Puppeteer expects 'Strict' | 'Lax' | 'None'
  const s = String(input).toLowerCase();
  if (s === 'no_restriction' || s === 'none') return 'None';
  if (s === 'lax') return 'Lax';
  if (s === 'strict') return 'Strict';
  return undefined;
}

(async () => {
  const cookieFile = './cookies.json';

  if (!fs.existsSync(cookieFile)) {
    console.error('Không tìm thấy cookies.json. Hãy đặt file vào cùng thư mục và đặt tên cookies.json');
    process.exit(1);
  }

  let raw = fs.readFileSync(cookieFile, 'utf8');
  let imported;
  try {
    imported = JSON.parse(raw);
  } catch (e) {
    console.error('Không parse được cookies.json:', e.message);
    process.exit(1);
  }

  // map to puppeteer-friendly cookies
  const cookies = imported.map(c => {
    const mapped = {
      name: c.name,
      value: c.value,
      path: c.path || '/',
      httpOnly: !!c.httpOnly,
      secure: !!c.secure,
    };

    // domain: keep as-is if present (puppeteer supports domain)
    if (c.domain) {
      mapped.domain = c.domain;
    }

    // expirationDate -> expires (Puppeteer expects number (seconds) ) 
    if (c.expirationDate) {
      // some exporters call it expirationDate or expiry; take any if present
      const exp = Number(c.expirationDate || c.expiry || c.expires);
      if (!Number.isNaN(exp) && exp > 0) {
        mapped.expires = Math.floor(exp);
      }
    }

    // session true => do not set expires (session cookie)
    if (c.session === true) {
      delete mapped.expires;
    }

    // sameSite mapping
    const ss = mapSameSite(c.sameSite);
    if (ss) mapped.sameSite = ss;

    return mapped;
  });

  // Launch browser
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 900 }
  });

  const page = await browser.newPage();

  // Go to the base domain first so page.setCookie can work (domain matching)
  await page.goto('https://study4.com', { waitUntil: 'networkidle2' });

  console.log('Đang thử nạp', cookies.length, 'cookie...');

  for (const c of cookies) {
    try {
      // Try to set cookie as-is
      await page.setCookie(c);
      console.log(`✔ set cookie ${c.name} (domain: ${c.domain || '(current)'}${c.expires ? ', expires: ' + c.expires : ''})`);
    } catch (err) {
      // fallback: try without domain (set for current page)
      try {
        const fallback = { name: c.name, value: c.value, path: c.path || '/', httpOnly: c.httpOnly, secure: c.secure, sameSite: c.sameSite };
        if (c.expires) fallback.expires = c.expires;
        await page.setCookie(fallback);
        console.log(`✔ fallback set cookie ${c.name} (no domain)`);
      } catch (e2) {
        console.warn(`✖ Không thể set cookie ${c.name}:`, e2.message);
      }
    }
  }

  // Reload to apply cookies
  await page.reload({ waitUntil: 'networkidle2' });

  // Verify: kiểm tra những selector xuất hiện khi đã login
  const checkSelectors = [
    '.profile-avatar',
    '.logout-button',
    '.test-card',
    'a[href*="/logout"]'
  ];

  let logged = false;
  for (const sel of checkSelectors) {
    const el = await page.$(sel);
    if (el) {
      console.log('Phát hiện selector chứng tỏ đã login:', sel);
      logged = true;
      break;
    }
  }

  if (!logged) {
    console.warn('Có vẻ chưa login. Hãy kiểm tra thủ công. (cookies có thể đã hết hạn hoặc cần cookie ở domain khác).');
    const currentCookies = await page.cookies();
    console.log('Cookies hiện tại trên page:', currentCookies.map(x => ({ name: x.name, domain: x.domain })));
  } else {
    console.log('✅ Có vẻ đã đăng nhập thành công bằng cookies.');
  }

  // (tùy chọn) bạn có thể xuất lại cookies hiện tại để dùng sau:
  // const current = await page.cookies();
  // fs.writeFileSync('./cookies_from_puppeteer.json', JSON.stringify(current, null, 2));
  // console.log('Saved current cookies to cookies_from_puppeteer.json');

  // giữ browser mở để bạn kiểm tra; nếu muốn đóng tự động, uncomment:
  // await browser.close();
})();
