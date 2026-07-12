const puppeteer = require('puppeteer');
const fs = require('fs');

// Get the URL from GitHub Actions input
const targetUrl = process.env.TARGET_URL;

async function inspectPage() {
    console.log(`Inspecting: ${targetUrl}`);
    const browser = await puppeteer.launch({ 
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/114.0.0.0 Safari/537.36');
    
    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(r => setTimeout(r, 10000)); // Wait for JS to load the items

    const extractedData = await page.evaluate(() => {
        // Look at all elements that usually hold text
        const elements = document.querySelectorAll('div, span, p, h1, h2, h3, h4, a');
        let results = [];

        elements.forEach(el => {
            const text = el.innerText ? el.innerText.trim() : '';
            // Only grab elements that actually have text and a class name
            if (text.length > 2 && text.length < 100 && el.className && typeof el.className === 'string') {
                // Clean up the class name to make it a valid CSS selector
                const cleanClass = '.' + el.className.trim().split(/\s+/).join('.');
                results.push({
                    text: text,
                    tag: cleanClass
                });
            }
        });

        // Remove duplicates so the list isn't huge
        const unique = Array.from(new Set(results.map(a => JSON.stringify(a))))
            .map(a => JSON.parse(a));
        return unique;
    });

    // Save to a new debug file
    fs.writeFileSync('inspector.json', JSON.stringify({ url: targetUrl, data: extractedData }, null, 2));
    console.log(`Saved ${extractedData.length} tags to inspector.json`);
    
    await browser.close();
}

inspectPage();
