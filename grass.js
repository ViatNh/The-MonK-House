const axios = require('axios');
const fs = require('fs');
const puppeteer = require('puppeteer');
const { execSync } = require('child_process');
const path = require('path');

// Hàm thu thập proxy từ API
async function fetchProxies() {
    const url = 'https://www.proxy-list.download/api/v1/get?type=socks5';  // API proxy miễn phí

    try {
        const response = await axios.get(url);
        const proxies = response.data.split('\r\n');

        fs.writeFileSync('proxies.txt', proxies.join('\n'));
        console.log('Proxy đã được thu thập và lưu vào proxies.txt');
    } catch (error) {
        console.error('Lỗi khi thu thập proxy:', error.message);
    }
}

// Hàm kiểm tra proxy
async function checkProxy(proxy) {
    const proxies = {
        http: `socks5://${proxy}`,
        https: `socks5://${proxy}`,
    };

    try {
        const response = await axios.get('https://httpbin.org/ip', { proxies, timeout: 5000 });
        if (response.status === 200) {
            console.log(`Proxy ${proxy} hoạt động`);
            return true;
        }
    } catch (error) {
        console.log(`Proxy ${proxy} không hoạt động`);
    }

    return false;
}

// Hàm sao chép Chromium mẫu và cấu hình proxy
function copyChromiumTemplate(ip, port) {
    // Đường dẫn đến thư mục chứa file grass.js và Chromium mẫu
    const templatePath = path.join(__dirname, 'chromium_template'); // Tên thư mục mẫu Chromium
    const copyPath = path.join(__dirname, `chromium_${ip}_${port}`);

    // Sao chép Chromium mẫu vào thư mục mới
    execSync(`cp -r ${templatePath} ${copyPath}`);

    // Trả về đường dẫn của Chromium đã sao chép
    return copyPath;
}

// Hàm chạy Chromium với Puppeteer và cấu hình proxy
async function runChromiumWithProxy(ip, port) {
    try {
        const chromiumPath = copyChromiumTemplate(ip, port); // Sao chép Chromium mẫu

        const browser = await puppeteer.launch({
            headless: true,
            executablePath: chromiumPath, // Sử dụng Chromium đã sao chép
            args: [
                `--proxy-server=socks5://${ip}:${port}`,
                '--no-sandbox',
                '--disable-setuid-sandbox',
            ],
        });

        const page = await browser.newPage();
        await page.goto('https://hacdong0.blogspot.com/2024/12/chuong-1-hat-giong-tu-bong-toi.html');
        console.log(await page.title());

        // Thực hiện các tác vụ khác trên trang
        await browser.close();
    } catch (error) {
        console.error('Lỗi khi chạy Chromium:', error.message);
    }
}

// Chu trình chính
async function main() {
    while (true) {
        console.log("Thu thập proxy mới...");
        await fetchProxies();

        const proxies = fs.readFileSync('proxies.txt', 'utf-8').split('\n');
        
        for (const proxy of proxies) {
            const [ip, port] = proxy.split(':');
            if (await checkProxy(proxy)) {
                console.log(`Sử dụng proxy ${proxy}`);
                await runChromiumWithProxy(ip, port);
            } else {
                console.log(`Proxy ${proxy} không hoạt động, bỏ qua`);
            }
        }

        // Ngừng chu trình sau một khoảng thời gian (ví dụ 30 phút)
        console.log("Chờ 30 phút trước khi thu thập lại proxy...");
        await new Promise(resolve => setTimeout(resolve, 30 * 60 * 1000));  // 30 phút
    }
}

// Chạy hệ thống
main();