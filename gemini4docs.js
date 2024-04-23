#!/usr/bin/env node
import fs from 'fs/promises';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import readline from 'readline'; // Import the readline module
import fetch from 'node-fetch';

dotenv.config();

const Geminiapikey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
const genAI = new GoogleGenerativeAI(Geminiapikey);

async function performSearch(query) {
    const google_search_apiKey = process.env.GOOGLE_SEARCH;
    const searchEngineId = process.env.SEARCH_ENGINE_ID;
    const url = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}&key=${google_search_apiKey}&cx=${searchEngineId}`;

    try {
        const response = await fetch(url);
        const results = await response.json();

        if (results.items && results.items.length > 0) {
            // Limit the results to the top 3
            const topResults = results.items.slice(0, 3);
            // Format the top results
            const formattedResults = topResults.map((item, index) => ({
                number: index + 1,
                link: item.link,
                title: item.title,
                snippet: item.snippet
            }));
            return formattedResults;
        } else {
            return { error: "No results found." };
        }
    } catch (error) {
        console.error('Search failed:', error);
        return { error: "Search failed due to an error." };
    }
}

// Function to count tokens for text-only input
const countTokensForText = async (text) => {
    await printTextSymbolBySymbol('Counting tokens for the provided docs...');
    console.log('');
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });
    const { totalTokens } = await model.countTokens(text);
    await printTextSymbolBySymbol(`Tokens input loaded: ${totalTokens}`);
    console.log('');
    return totalTokens;
};

let isPrinting = false;
function clearConsoleSafely() {
    if (!isPrinting) {
        return;
    } else {
        // Wait for a short period and then try to clear the console again
        setTimeout(clearConsoleSafely, 100); // Check again after 100 milliseconds
    }
}
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function printTextSymbolBySymbol(text) {
    for (let i = 0; i < text.length; i++) {
        process.stdout.write(text[i]);
        await delay(10); // Wait for 100 milliseconds
    }
}

// Example of using printTextSymbolBySymbol with rl.question
async function askQuestionAnimated(question) {
    await printTextSymbolBySymbol(question);
    return new Promise((resolve) => {
        process.stdout.write('\n'); // Add a newline at the end of the animation
        rl.question('', (answer) => {
            resolve(answer);
        });
    });
}

// Create readline interface
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function simulateProgressBar(taskName, duration = 10000, steps = 20) {
    return new Promise((resolve) => { // Return a new promise
        const progressBarLength = 30; // Length of the progress bar in characters
        let currentStep = 0;
        const stepDuration = duration / steps;
        const progressInterval = setInterval(() => {
            currentStep++;
            const progress = Math.floor((currentStep / steps) * progressBarLength);
            const progressBar = "[" + "=".repeat(progress) + " ".repeat(progressBarLength - progress) + "]";
            clearConsoleSafely();
            process.stdout.clearLine(0); // Clear the current console line
            process.stdout.cursorTo(0); // Move cursor to the beginning of the line
            process.stdout.write(`${taskName}: ${progressBar} ${Math.floor((progress / progressBarLength) * 100)}%`);

            if (currentStep >= steps) {
                clearInterval(progressInterval);
                process.stdout.clearLine(0);
                process.stdout.cursorTo(0);
                console.log(`${taskName}: Complete!`);
                resolve(); // Resolve the promise
            }
        }, stepDuration);
    });
}
// New function to ask for documentation type
const askForDocumentationType = async () => {
    const answer = await askQuestionAnimated('Which documentation do you need? (link or keywords): ');
    const urlPattern = new RegExp('^(https?:\\/\\/)?' + // protocol
        '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // domain name and extension
        '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
        '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
        '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
        '(\\#[-a-z\\d_]*)?$', 'i'); // fragment locator
    if (urlPattern.test(answer)) {
        await printTextSymbolBySymbol('You entered a valid URL. Processing the link...');
        await simulateProgressBar('Indexing external documentation', 5000, 20);
        generateResponseFromLink('todo_links.json'); // Assuming you modify this function to accept a link directly
    } else {
        await printTextSymbolBySymbol(`Search results for documentation related to: ${answer}`);
        console.log('');
        const search_results = await performSearch(answer);
        if (search_results.error) {
            await printTextSymbolBySymbol(search_results.error);
            console.log('');
            askForDocumentationType(); // Retry if there's an error
        } else {
            // Format and log the search results
            const formattedResults = search_results.map(result => {
                return `${result.number}: ${result.title}\n  ${result.link}\n  ${result.snippet}`;
            }).join('\n\n');
            console.log('');
            await printTextSymbolBySymbol(formattedResults);
            const selection = await new Promise(async (resolve) => { // Make the callback function async
                process.stdout.write('\n'); // Add a newline at the end of the animation
                console.log('');
                const answer = await askQuestionAnimated('Type documentation index, or type "retry" to search again: ');
                resolve(answer);
            });
            if (selection.toLowerCase() === 'retry') {
                askForDocumentationType(); // Retry search
            } else {
                const selectedResult = search_results.find(result => result.number.toString() === selection);
                if (selectedResult) {
                    console.log('');
                    await printTextSymbolBySymbol(`Indexing documentation: ${selectedResult.title}`);
                    console.log('');
                    await simulateProgressBar('Indexing external documentation', 5000, 20);
                    generateResponseFromLink('todo_links.json', selectedResult.link); // Pass the selected link for indexing
                } else {
                    await printTextSymbolBySymbol('Invalid selection. Please try again.');
                    askForDocumentationType(); // Invalid selection, retry
                }
            }
        }
    }
};

async function generateResponseFromLink(filePath) {
    try {
        await printTextSymbolBySymbol(`Reading docs`);
        console.log('');
        const fileContent = await fs.readFile(filePath, 'utf8');
        await printTextSymbolBySymbol('File content successfully read.');
        console.log('');
        // const linkData = JSON.parse(fileContent)["https://www.selenium.dev/documentation/test_practices/discouraged/two_factor_authentication/"];
        const linkData = JSON.parse(fileContent)["https://www.selenium.dev/documentation/_print/"];
        const content = linkData.content; // Extract the full content of the link

        // Count tokens for the full content
        await countTokensForText(content);
        await printTextSymbolBySymbol('Starting chat with the model...');
        console.log('');
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });
        const chat = model.startChat({
            history: [
                {
                    role: "user",
                    parts: [{ text: content }],
                },
                {
                    role: "model",
                    parts: [{ text: "Thank you for the information. How can I assist you further?" }],
                },
            ],
            apiVersion: 'v1beta'
        });

        // Function to ask for the message prompt
        const askForMessagePrompt = async () => {
            const msg = await askQuestionAnimated('Prompt (or type "exit"): ');
            if (msg.toLowerCase() === "exit") {
                await printTextSymbolBySymbol("Exiting...");
                rl.close();
            } else {
                await printTextSymbolBySymbol(`Sending message: "${msg}" to the model...`);
                console.log('');
                const startTime = Date.now();
                let timerId = setInterval(() => {
                    // Update the console with the elapsed time every tenth of a second
                    process.stdout.clearLine(0);
                    process.stdout.cursorTo(0);
                    let elapsedTime = (Date.now() - startTime) / 1000; // Convert to seconds
                    process.stdout.write(`Thinking... [${elapsedTime.toFixed(1)}s].`);
                }, 100); // Update every 100 milliseconds (0.1 second)

                try {
                    const modifiedMsg = msg + ". Please provide response solely based on the provided context";
                    const result = await chat.sendMessageStream(modifiedMsg);
                    clearInterval(timerId); // Stop the timer once the first chunk is received
                    process.stdout.clearLine(0);
                    process.stdout.cursorTo(0);

                    let text = '';
                    let isFirstChunk = true;
                    for await (const chunk of result.stream) {
                        if (isFirstChunk) {
                            let finalElapsedTime = (Date.now() - startTime) / 1000; // Convert to seconds
                            await printTextSymbolBySymbol(`\nReceived first chunk after ${finalElapsedTime.toFixed(1)} seconds.`);
                            await printTextSymbolBySymbol(`Model:`);
                            isFirstChunk = false;
                        }
                        await printTextSymbolBySymbol(chunk.text()); // Use the function to print chunk smoothly
                        text += chunk.text();
                    }
                } catch (error) {
                    clearInterval(timerId); // Ensure to clear the timer in case of an error
                    console.error('Failed to fetch response:', error);
                }
                askForMessagePrompt();
            }
        };

        // Start asking for user input
        askForMessagePrompt();

    } catch (error) {
        console.error('Error generating response from link:', error);
        rl.close(); // Ensure readline interface is closed on error
    }
}

askForDocumentationType();