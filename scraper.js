const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'data.json');

// Load existing database
let database = [];
if (fs.existsSync(DB_FILE)) {
    database = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

async function scrape() {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    const newItemsFound = [];

    const stores = [
        {
            name: "Zbfghk Store",
            url: "https://zbfghk.org/store/%E6%96%B0%E8%B2%A8%E3%80%82-c137759257",
            // Assuming items are in standard product grid classes
            selector: '.product-title, .ec-title', 
        },
        {
            name: "MyBookOne",
            url: "https://www.mybookone.com.hk/wapapp/index/index.html#/app/searchResultV2?sortField=_score&isSortAsc=false&keyCode=%E8%A7%92%E5%B7%9D%20%E6%9D%B1%E7%AB%8B%20%E5%B0%96%E7%AB%AF%20%E7%8E%89%E7%9A%87%E6%9C%9D%20%E6%96%87%E5%8C%96%E5%82%B3%E4%BF%A1%20%E5%A4%A9%E5%85%89%20%E9%9D%92%E6%96%87%20%E9%81%A0%E6%B5%81",
            selector: '.goods-name, .book-name, .title'
        },
        {
            name: "Premium Bandai HK",
            url: "https://p-bandai.com/hk/search?limit=20&sortType=NewArrival&offset=0&_f_productStatuses=On,Waiting&_f_categories=04-004",
            selector: '.m-card__title, .m-product-card__title'
        }
    ];

    for (let store of stores) {
        try {
            await page.goto(store.url, { waitUntil: 'networkidle2', timeout: 60000 });
            
            // Wait a moment for dynamic SPAs to fully render
            await new Promise(r => setTimeout(r, 5000));

            const items = await page.evaluate((sel) => {
                const elements = document.querySelectorAll(sel);
                return Array.from(elements).map(el => el.innerText.trim()).filter(text => text.length > 0);
            }, store.selector);

            items.forEach(title => {
                // Check if item already exists in database
                const exists = database.find(dbItem => dbItem.title === title && dbItem.store === store.name);
                if (!exists) {
                    const newItem = {
                        title: title,
                        store: store.name,
                        dateFound: new Date().toISOString()
                    };
                    database.push(newItem);
                    newItemsFound.push(newItem);
                }
            });

        } catch (error) {
            console.error(`Error scraping ${store.name}:`, error);
        }
    }

    await browser.close();

    // Sort database by newest first (optional)
    database.sort((a, b) => new Date(b.dateFound) - new Date(a.dateFound));

    // Save to data.json
    fs.writeFileSync(DB_FILE, JSON.stringify(database, null, 2));
    console.log(`Scrape complete. Added ${newItemsFound.length} new items.`);
}

scrape();
