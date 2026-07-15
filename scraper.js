const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'data.json');

let database = [];
if (fs.existsSync(DB_FILE)) {
    database = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

async function scrape() {
    const browser = await puppeteer.launch({ 
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080'] 
    });
    const page = await browser.newPage();
    // Set a normal browser user agent to help bypass simple bot blocks
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');
    
    const newItemsFound = [];

    const stores = [
        {
            name: "Zbfghk",
            url: "https://zbfghk.org/store/%E6%96%B0%E8%B2%A8%E3%80%82-c137759257",
            selector: '.grid-product__title' 
        },
        {
            name: "MyBookOne",
            url: "https://www.mybookone.com.hk/wapapp/index/index.html#/app/searchResultV2?sortField=searchDate&isSortAsc=false&keyCode=%E8%A7%92%E5%B7%9D%20%E6%9D%B1%E7%AB%8B%20%E5%B0%96%E7%AB%AF%20%E7%8E%89%E7%9A%87%E6%9C%9D%20%E6%96%87%E5%8C%96%E5%82%B3%E4%BF%A1%20%E5%A4%A9%E5%85%89%20%E9%9D%92%E6%96%87%20%E9%81%A0%E6%B5%81",
            selector: '.book_title_box'
        },
        {
            name: "Bandai",
            url: "https://p-bandai.com/hk/search?limit=20&sortType=NewArrival&offset=0&_f_productStatuses=On,Waiting&_f_categories=04-004",
            selector: '.c-product'
        },
        {
            name: "Hobbyland",
            url: "https://www.hobbylandeshop.com/product-category/model_area/gundam_zone",
            selector: '.q-px-sm.q-pb-sm'
        },
        {
            name: "Up-Next",
            url: "https://zh.up-next.com.hk/collections/model-kit/Bandai",
            selector: '.info'
        }
        /*
        ,
        {
            name: "Kadokawa TW",
            url: "https://www.kadokawa.com.tw/categories/%E7%94%B7%E6%80%A7%E5%90%91?limit=72&sort_by=created_at&order_by=desc",
            selector: '.product-item'
        },
        {
            name: "TLComics HK",
            url: "https://www.tlcomics.com/categories/%E5%B0%91%E5%B9%B4?limit=72&sort_by=created_at&order_by=desc",
            selector: '.Product-info'
        }
        */
    ];

    for (let store of stores) {
        try {
            console.log(`Visiting ${store.name}...`);
            await page.goto(store.url, { waitUntil: 'networkidle2', timeout: 60000 });
            1
            // Wait 10 full seconds for dynamic items to appear
            await new Promise(r => setTimeout(r, 10000));

            // TAKE A SCREENSHOT FOR DEBUGGING
            //await page.screenshot({ path: `${store.name}.png`, fullPage: true });
            //console.log(`Saved screenshot for ${store.name}`);

            const items = await page.evaluate((sel) => {
                const elements = document.querySelectorAll(sel);
                return Array.from(elements).map(el => el.innerText.trim()).filter(text => text.length > 0);
            }, store.selector);

            console.log(`Found ${items.length} items for ${store.name}`);

            items.forEach(title => {
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

    database.sort((a, b) => new Date(b.dateFound) - new Date(a.dateFound));
    fs.writeFileSync(DB_FILE, JSON.stringify(database, null, 2));
    console.log(`Scrape complete. Added ${newItemsFound.length} new items.`);
}

scrape();
