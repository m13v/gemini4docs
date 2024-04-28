import { Builder, By, Key, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { EventEmitter } from 'events';
const indexerEvents = new EventEmitter();
import eventEmitter from './eventEmitter.js';  

async function loadExistingData(baseUrl) {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const sanitizedFilename = baseUrl.replace(/\W+/g, '_') + '.json';
    const filePath = path.join(__dirname, sanitizedFilename);

    if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        return {
            todoLinks: new Map(Object.entries(data.links)),
            allLinks: new Set(Object.keys(data.links)),
            totalWords: data.total_words,
            filteredTotalWords: data.filtered_total_words,
            filename: filePath  // Return the file path as well
        };
    } else {
        return { filename: filePath };  // Return only the file path if no data exists
    }
}

async function saveTodoLinks(todoLinks, filename, totalWords, totalLinks, filteredTotalWords) {
    const sanitizedFilename = filename.replace(/\W+/g, '_') + '.json';
    fs.writeFileSync(sanitizedFilename, JSON.stringify({ total_words: totalWords, total_links: totalLinks, filtered_total_words: filteredTotalWords, links: todoLinks }, null, 4), 'utf-8');
    return sanitizedFilename;
}

function countWords(text) {
    if (!text) return 0; // Return 0 if text is undefined or null
    return text.split(/\s+/).filter(Boolean).length;
}

function countLineOccurrences(allTexts) {
    let lineCounts = {};
    allTexts.forEach(text => {
        text.split('\n').forEach(line => {
            lineCounts[line] = (lineCounts[line] || 0) + 1;
        });
    });
    return lineCounts;
}

// Helper function to filter lines based on occurrences
function filterLines(text, lineCounts, maxOccurrences) {
    return text.split('\n').filter(line => lineCounts[line] <= maxOccurrences).join('\n');
}

function buildDriver() {
    let options = new chrome.Options();
    // Set a custom user agent string
    options.addArguments(`user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.150 Safari/537.36`);
    options.addArguments('--headless');  // Run in headless mode
    options.addArguments('--disable-gpu');  // Disable GPU hardware acceleration
    options.addArguments('--window-size=1920,1080');  
    // Initialize the Chrome driver with these options
    let driver = new Builder()
        .forBrowser('chrome')
        .setChromeOptions(options)
        .build();

    return driver;
}

async function acceptCookies(driver) {
    try {
        // Wait for the cookie consent bar to appear and the button to be clickable
        const cookieButton = await driver.wait(until.elementLocated(By.xpath("//button[contains(text(), 'Accept Cookies')]")), 1000);
        await driver.wait(until.elementIsEnabled(cookieButton), 5000);  // Ensure the button is clickable
        await cookieButton.click();
        return true;  // Return true when cookies are successfully accepted
    } catch (error) {
        return false;  // Return false if there was an error
    }
}

async function indexLink(driver, url, allLinks, doneLinksCount, totalWords, filteredTotalWords, allTexts, maxOccurrences) {
    await driver.get(url);
    let cookiesAccepted = await acceptCookies(driver);  // Capture the return value
    let allText = await driver.executeScript("return document.documentElement.innerText");
    allTexts.push(allText); // Collect all texts for line occurrence counting
    let lineCounts = countLineOccurrences(allTexts);
    let filteredText = filterLines(allText, lineCounts, maxOccurrences); // Filter lines based on occurrences
    let filteredWordCount = countWords(filteredText);
    let wordCount = countWords(allText); // Use the robust countWords function
    let attempt = 0;
    const maxAttempts = 3;
    let status = '';
    let cookieStatus = cookiesAccepted ? "Accepted" : "n/a";
    let lastWord = "";  // Initialize lastWord to ensure it's always defined

    while (attempt < maxAttempts) {
        try {
            let linksElements = await driver.findElements(By.tagName('a'));
            for (let link of linksElements) {
                let href = await link.getAttribute('href');
                if (href && href.startsWith(url)) {
                    if (!allLinks.has(href)) {
                        allLinks.add(href);
                        let urlParts = href.split('/');
                        let lastPart = urlParts[urlParts.length - 1] || urlParts[urlParts.length - 2]; // Handle trailing slash
                        let lastWord = lastPart.split('-').pop().split('?')[0]; // Handle hyphens and parameters
                        //process.stdout.write('\r\x1b[K');
                        eventEmitter.emit('data_received', { message: `${doneLinksCount} / ${allLinks.size} links processed, Total words: ${totalWords}, Filtered: ${filteredTotalWords}, - Last link: /${lastWord}, Words added: ${filteredWordCount}. Cookies: ${cookieStatus}`});
                    }
                }
            }
            break;
        } catch (error) {
            attempt++;
            if (attempt === maxAttempts) {
                console.log("\nFailed to retrieve links after several attempts. Error", error);
            }
        }
    }

    if (allText.length < 100) {
        status = 'Seems like it failed';
    } else {
        status = 'Looks good';
    }
    return { allLinks, allText, filteredText, status, wordCount, filteredWordCount, totalWords, lastWord, cookieStatus };
}


export async function main(baseUrl) {
    let driver = buildDriver();
    const maxOccurrences = 1;
    let { todoLinks, allLinks, totalWords, filteredTotalWords, filename } = await loadExistingData(baseUrl);

    if (!todoLinks) {
        todoLinks = new Map([[baseUrl, { status: "not_indexed", word_count: 0 }]]);
        allLinks = new Set();
        totalWords = 0;
        filteredTotalWords = 0;
    }

    let allTexts = [];
    let doneLinksCount = 0;

    try {
        while (Array.from(todoLinks.values()).some(v => v.status === "not_indexed")) {
            for (let [url, info] of todoLinks) {
                if (info.status === "not_indexed") {
                    let result = await indexLink(driver, url, allLinks, doneLinksCount, totalWords, filteredTotalWords, allTexts, maxOccurrences);
                    if (!result) {
                        console.error('No result returned from indexLink for URL:', url);
                        continue;
                    }
                    allLinks = result.allLinks;
                    totalWords += result.wordCount; 
                    filteredTotalWords += result.filteredWordCount; 
                    doneLinksCount++;
                    //process.stdout.write('\r\x1b[K');
                    eventEmitter.emit('data_received', { message: `${doneLinksCount} / ${allLinks.size} links processed, Total words: ${totalWords}, Filtered: ${filteredTotalWords}, - Last link: /${result.lastWord}, Words added: ${result.filteredWordCount}. Cookies: ${result.cookieStatus}`});
                    if (result.status === 'Seems like it failed') {
                        console.log(`Failed to index ${url}. Exiting...`);
                        console.log(`Content: ${result.allText}`);
                        return;
                    }
                    for (let link of allLinks) {
                        if (!todoLinks.has(link)) {
                            todoLinks.set(link, { status: "not_indexed", word_count: 0, filtered_word_count: 0, filtered_content: "" });
                        }
                    }
                    todoLinks.set(url, { status: result.status, content: result.allText, word_count: result.wordCount, filtered_content: result.filteredText, filtered_word_count: result.filteredWordCount });
                    filename = await saveTodoLinks(Object.fromEntries(todoLinks), baseUrl, totalWords, allLinks.size, filteredTotalWords);
                }
            }
        }
        eventEmitter.emit('data_received', { message: `\nIndexing complete. Total links: ${allLinks.size}, Total words: ${totalWords}, Filtered total words: ${filteredTotalWords}`});
    } finally {
        await driver.quit();
    }
    return filename;
}

