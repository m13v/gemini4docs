#!/usr/bin/env node
import fs from 'fs/promises';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import readline from 'readline'; // Import the readline module
import fetch from 'node-fetch';
import { exec } from 'child_process';
import path from 'path';

// Function to call the indexer.py script
function callIndexer(url) {
    const indexerPath = path.join(__dirname, 'node_modules', 'gemini4docs', 'indexer.py');
    return new Promise((resolve, reject) => {
        const process = exec(`python "${indexerPath}" "${url}"`);

        let fileName = null;  // Variable to store the file name

        process.stdout.on('data', (data) => {
            const output = data.toString();
            // if (process.stdout.clearLine && typeof process.stdout.clearLine === 'function') {
            //     process.stdout.clearLine();
            //     process.stdout.cursorTo(0);
            // } else {
            //     console.log('\x1Bc'); // This ANSI escape code clears the entire screen and moves the cursor to the top left on most terminals
            // }
            console.log(output.trim());  // Log the output directly to console

            // Check if the output contains the file name
            const match = output.match(/File name: (.*)$/m);
            if (match) {
                fileName = match[1].trim();  // Capture the file name
            }
        });

        process.stderr.on('data', (data) => {
            console.error(`stderr: ${data}`);  // Print each chunk of stderr as it comes in
        });

        process.on('error', (error) => {
            console.error(`exec error: ${error}`);
            reject(error);
        });

        process.on('close', (code) => {
            if (code !== 0) {
                console.error(`Process exited with code ${code}`);
                reject(new Error(`Process exited with code ${code}`));
            } else {
                console.log('Indexer process completed.');
                if (fileName) {
                    resolve(fileName);  // Resolve the promise with the captured file name
                } else {
                    console.error('No JSON file name returned from indexer.');
                    reject(new Error('No JSON file name returned from indexer.'));
                }
            }
        });
    });
}

dotenv.config();
const Geminiapikey = 'AIzaSyBGG6YF0vXN8H27ZIN7ibGJvM-ReaVURWY'; //temporary api key
// const Geminiapikey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
const genAI = new GoogleGenerativeAI(Geminiapikey);

async function performSearch(query) {
    const google_search_apiKey = 'AIzaSyAw9uxhcuqjBUu4WyM-9gZBbRIqUCpvczc'; //temporary api key
    const searchEngineId = '862ace6a23ddc4e37'; //temporary api key
    const modifiedQuery = `${query} documentation`;
    // const google_search_apiKey = process.env.GOOGLE_SEARCH;
    // const searchEngineId = process.env.SEARCH_ENGINE_ID;
    const url = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(modifiedQuery)}&key=${google_search_apiKey}&cx=${searchEngineId}`;

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
    const fastDelay = 1;  // Faster delay time in milliseconds
    const slowDelay = 1; // Slower delay time in milliseconds
    // const fastDelay = 5;  // Faster delay time in milliseconds
    // const slowDelay = 10; // Slower delay time in milliseconds
    const speedThreshold = 150; // Length threshold to switch to faster printing

    for (let i = 0; i < text.length; i++) {
        process.stdout.write(text[i]);
        // Use a shorter delay if the text length exceeds the threshold
        const delayTime = text.length > speedThreshold ? fastDelay : slowDelay;
        await delay(delayTime);
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
        await printTextSymbolBySymbol('Processing the link...');
        const filename = await callIndexer(answer); // Now waits for completion
        if (filename) {
            generateResponseFromLink(filename); // Pass the JSON file path to the function
        } else {
            console.error('No JSON file path returned from indexer.');
        }
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
                    const filename = await callIndexer(selectedResult.link); // Now waits for completion
                    if (filename) {
                        generateResponseFromLink(filename); // Pass the JSON file path to the function
                    } else {
                        console.error('No JSON file path returned from indexer.');
                    }
                } else {
                    await printTextSymbolBySymbol('Invalid selection. Please try again.');
                    askForDocumentationType(); // Invalid selection, retry
                }
            }
        }
    }
};

async function generateResponseFromLink(filename) {
    try {
        await printTextSymbolBySymbol(`Reading docs`);
        console.log('');
        const fileContent = await fs.readFile(filename, 'utf8');
        await printTextSymbolBySymbol('File content successfully read.');
        console.log('');

        const allData = JSON.parse(fileContent);
        let allContent = [];

        // Iterate over all entries in the JSON file
        for (const [link, data] of Object.entries(allData.links)) {
            if (data && data.content) {  // Check if data and content exist
                let content = data.content; // Extract the full content of the link
                allContent.push(`Link: ${link}\nContent: ${content}\n`);
            }
        }

        let content = allContent.join('\n');
        await countTokensForText(content);
        console.log('Starting chat with the model...');
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
                await printTextSymbolBySymbol(`Sending message to the model...`);
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