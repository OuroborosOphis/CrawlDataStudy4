    // use_exported_cookies.js
    const puppeteer = require("puppeteer");
    const fs = require("fs");
    
    // === ⚙️ Cấu hình chính ===
    const TEST_URL = "https://study4.com/tests/224/new-economy-toeic-test-1/"; // 👈 chỉ sửa dòng này khi crawl đề khác
    const START_URL = TEST_URL.replace(/\/[^/]+\/?$/, "/start/"); // tự động đổi phần cuối thành /start/
    
    
    function mapSameSite(input) {
      if (!input) return undefined;
      // extension xuất "no_restriction" hoặc null; convert to Puppeteer expected values
      // Puppeteer expects 'Strict' | 'Lax' | 'None'
      const s = String(input).toLowerCase();
      if (s === "no_restriction" || s === "none") return "None";
      if (s === "lax") return "Lax";
      if (s === "strict") return "Strict";
      return undefined;
    }
    
    (async () => {
      const cookieFile = "./cookies.json";
    
      if (!fs.existsSync(cookieFile)) {
        console.error(
          "Không tìm thấy cookies.json. Hãy đặt file vào cùng thư mục và đặt tên cookies.json"
        );
        process.exit(1);
      }
    
      let raw = fs.readFileSync(cookieFile, "utf8");
      let imported;
      try {
        imported = JSON.parse(raw);
      } catch (e) {
        console.error("Không parse được cookies.json:", e.message);
        process.exit(1);
      }
    
      // map to puppeteer-friendly cookies
      const cookies = imported.map((c) => {
        const mapped = {
          name: c.name,
          value: c.value,
          path: c.path || "/",
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
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
        defaultViewport: { width: 1280, height: 900 },
      });
    
      const page = await browser.newPage();
    
      // Go to the base domain first so page.setCookie can work (domain matching)
      await page.goto(TEST_URL, { waitUntil: "networkidle2" });
    
      console.log("Đang thử nạp", cookies.length, "cookie...");
    
      for (const c of cookies) {
        try {
          // Try to set cookie as-is
          await page.setCookie(c);
          console.log(
            `✔ set cookie ${c.name} (domain: ${c.domain || "(current)"}${
              c.expires ? ", expires: " + c.expires : ""
            })`
          );
        } catch (err) {
          // fallback: try without domain (set for current page)
          try {
            const fallback = {
              name: c.name,
              value: c.value,
              path: c.path || "/",
              httpOnly: c.httpOnly,
              secure: c.secure,
              sameSite: c.sameSite,
            };
            if (c.expires) fallback.expires = c.expires;
            await page.setCookie(fallback);
            console.log(`✔ fallback set cookie ${c.name} (no domain)`);
          } catch (e2) {
            console.warn(`✖ Không thể set cookie ${c.name}:`, e2.message);
          }
        }
      }
    
      // Reload to apply cookies
      await page.reload({ waitUntil: "networkidle2" });
    
      // Verify: kiểm tra những selector xuất hiện khi đã login
      const checkSelectors = [
        ".profile-avatar",
        ".logout-button",
        ".test-card",
        'a[href*="/logout"]',
      ];
    
      let logged = false;
      for (const sel of checkSelectors) {
        const el = await page.$(sel);
        if (el) {
          console.log("Phát hiện selector chứng tỏ đã login:", sel);
          logged = true;
          break;
        }
      }
    
      if (!logged) {
        console.warn(
          "Có vẻ chưa login. Hãy kiểm tra thủ công. (cookies có thể đã hết hạn hoặc cần cookie ở domain khác)."
        );
        const currentCookies = await page.cookies();
        console.log(
          "Cookies hiện tại trên page:",
          currentCookies.map((x) => ({ name: x.name, domain: x.domain }))
        );
      } else {
        console.log("✅ Có vẻ đã đăng nhập thành công bằng cookies.");
      }
    
      // click vào làm full test
      // await page.waitForSelector('a[href="#nav-taketest"]', { visible: true });
      // await page.click('a[href="#nav-taketest"]');
      // console.log("✅ Đã click 'Làm full test'");
    
      // // --- 4️⃣ Chờ nút "BẮT ĐẦU THI" xuất hiện rồi click ---
      // await page.waitForSelector(`a[href="${new URL(START_URL).pathname}"]`, { visible: true });
      // await page.click(`a[href="${new URL(START_URL).pathname}"]`);
      // console.log("✅ Đã click 'BẮT ĐẦU THI'");
    
      // // --- 6️⃣ Chờ các câu hỏi xuất hiện ---
      // await page.waitForSelector(".test-question, .question", { timeout: 20000 });
      // console.log("✅ Đã load đề thi");
      // Go to the base domain first so page.setCookie can work (domain matching)
      await page.goto("https://study4.com/tests/224/practice/?part=729&part=730&part=731&part=732&part=733&part=734&part=735", { waitUntil: "networkidle2" });
    
      // 5️⃣ Đảm bảo tất cả part đã load
      await page.waitForSelector(".tab-pane", { timeout: 20000 });
    
      // 6️⃣ Crawl toàn bộ 7 part
      const result = await page.evaluate(() => {
        const parts = document.querySelectorAll(".tab-pane");
        const allParts = [];
    
        // 🎧 Lấy audio tổng của full test
        const globalAudio =
          document.querySelector(".plyr audio source")?.src || // trường hợp nằm trong <source>
          document.querySelector(".plyr audio")?.src || // fallback nếu audio có src trực tiếp
          document.querySelector("audio source")?.src || // fallback khác
          document.querySelector("audio")?.src ||
          null;
    
        parts.forEach((part, partIdx) => {
          const partId = part.id || `part-${partIdx + 1}`;
          const partName =
            part.querySelector(".part-title")?.innerText?.trim() ||
            `Part ${partIdx + 1}`;
    
          const groupWrappers = part.querySelectorAll(".question-group-wrapper");
    
          // Nếu có nhóm (Part 3–4–6–7)
          if (groupWrappers.length > 0) {
            const groups = Array.from(groupWrappers).map((group, groupIndex) => {
              const passage =
                group.querySelector(".context-content")?.innerText?.trim() || null;
              const image = group.querySelector("img")?.src || null;
    
              const questions = Array.from(
                group.querySelectorAll(".question-item-wrapper")
              ).map((q, i) => {
                const number =
                  q.querySelector(".question-number strong")?.innerText?.trim() ||
                  String(i + 1);
                const questionText =
                  q.querySelector(".question-text, .qtext")?.innerText?.trim() ||
                  "";
    
                const answers = Array.from(q.querySelectorAll(".form-check")).map(
                  (a) => ({
                    option: a.querySelector("input")?.value || "",
                    text:
                      a
                        .querySelector("label")
                        ?.innerText?.replace(/^[A-D]\.\s*/, "")
                        ?.trim() || "",
                  })
                );
    
                return { number, questionText, answers };
              });
    
              return {
                group: groupIndex + 1,
                passage,
                image,
                questions,
              };
            });
    
            allParts.push({
              partId,
              partName,
              totalGroups: groups.length,
              groups,
            });
          } else {
            // Part 1–2 hoặc Part 5
            const questions = Array.from(
              part.querySelectorAll(".question-item-wrapper")
            ).map((q, idx) => {
              const number =
                q.querySelector(".question-number strong")?.innerText?.trim() ||
                String(idx + 1);
              const questionText =
                q.querySelector(".question-text, .qtext")?.innerText?.trim() || "";
              const image = q.querySelector("img")?.src || null;
    
              const answers = Array.from(q.querySelectorAll(".form-check")).map(
                (a) => ({
                  option: a.querySelector("input")?.value || "",
                  text:
                    a
                      .querySelector("label")
                      ?.innerText?.replace(/^[A-D]\.\s*/, "")
                      ?.trim() || "",
                })
              );
    
              return { number, questionText, image, answers };
            });
    
            allParts.push({
              partId,
              partName,
              totalQuestions: questions.length,
              questions,
            });
          }
        });
    
        return { globalAudio, parts: allParts };
      });
    
      // 7️⃣ Lưu kết quả ra file
      fs.writeFileSync(
        "toeic_full_part.json",
        JSON.stringify(result, null, 2),
        "utf-8"
      );
      console.log(
        `✅ Crawl xong ${result.partslength} part, đã lưu -> toeic_full_part.json`
      );
    
      // giữ browser mở để bạn kiểm tra; nếu muốn đóng tự động, uncomment:
      await browser.close();
    })();
    