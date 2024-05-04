#!/usr/bin/env node
import fs from 'fs/promises';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import readline from 'readline'; // Import the readline module
import fetch from 'node-fetch';
import { main as indexLink } from './indexer.js';
import { EventEmitter } from 'events';
const indexerEvents = new EventEmitter();
import eventEmitter from './eventEmitter.js';  
import chokidar from 'chokidar';
import { marked } from 'marked';
import TerminalRenderer from 'marked-terminal';
import { highlight } from 'cli-highlight';


marked.setOptions({
    renderer: new TerminalRenderer({
      // Custom renderer for code blocks
      code: (code, language) => {
        return highlight(code, { language: language || 'javascript', theme: 'monokai' });
      }
    })
  });

async function callIndexer(url) {
    try {
        indexLink(url).then(() => {
        }).catch(error => {
            console.error('Error during indexing:', error);
        });
        return;
    } catch (error) {
        console.error('Error during callindexer execution:', error);
        throw error;  // Rethrow or handle error appropriately
    }
}

dotenv.config();
const Geminiapikey = 'AIzaSyBGG6YF0vXN8H27ZIN7ibGJvM-ReaVURWY'; //temporary api key
const genAI = new GoogleGenerativeAI(Geminiapikey);

const workerUrl = 'https://worker-aged-night-839d.i-f9f.workers.dev';

async function performSearch(query) {
    try {
        const response = await fetch(workerUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'search', query: query })
        });
        const results = await response.json();

        if (results.error) {
            console.error('Search failed:', results.error);
            return { error: results.error };
        }

        // Assuming the worker returns the results in the expected format
        return results.map((item, index) => ({
            number: index + 1,
            link: item.link,
            title: item.title,
            snippet: item.snippet
        }));
    } catch (error) {
        console.error('Error performing search:', error);
        return { error: "Search failed due to an error." };
    }
}

// Function to count tokens for text-only input
const countTokensForText = async (text) => {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });
    const { totalTokens } = await model.countTokens(text);
    eventEmitter.emit('docsUpdated', { message: `Tokens loaded: ${totalTokens}`});
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

function delayWithFeedback(ms) {
    return new Promise(resolve => {
        const startTime = Date.now();
        let timerId = setInterval(() => {
            process.stdout.clearLine(0);
            process.stdout.cursorTo(0);
            let elapsedTime = (Date.now() - startTime) / 1000; // Convert to seconds
            process.stdout.write(`Loading... [${elapsedTime.toFixed(1)}s / ${(ms / 1000).toFixed(1)}s]`);
        }, 100); // Update every 100 milliseconds

        setTimeout(() => {
            clearInterval(timerId);
            process.stdout.clearLine(0);
            process.stdout.cursorTo(0);
            resolve();
        }, ms);
    });
}

async function printTextSymbolBySymbol(text) {
    const fastDelay = 1;  // Faster delay time in milliseconds
    const slowDelay = 10; // Slower delay time in milliseconds
    const speedThreshold = 150; // Length threshold to switch to faster printing

    for (let i = 0; i < text.length; i++) {
        process.stdout.write(text[i]);
        // Use a shorter delay if the text length exceeds the threshold
        const delayTime = text.length > speedThreshold ? fastDelay : slowDelay;
        await delay(delayTime);
    }
}

let dataMap = new Map();
let debounceTimer;

eventEmitter.on('dataSaved', ({ data }) => {
    // console.log(`Data updated for ${data.baseUrl}:`);
    dataMap.set(data.baseUrl, data);
    if (debounceTimer) {
        clearTimeout(debounceTimer);
    }
    // Set a new timer
    debounceTimer = setTimeout(() => {
        loadAndStartChat(data.baseUrl);
    }, 3000);
});

let isModelInteracting = false; // Flag to control log printing
eventEmitter.setMaxListeners(20);

async function askQuestionAnimated_with_logs(question) {
    let previousLinesCount = 2;  // Track the number of lines printed previously
    // Listener for data received events
    eventEmitter.once('data_received', (data) => {
        updateConsoleWithMessage(data.message, question, previousLinesCount);
    });

    // Listener for documentation updates
    eventEmitter.once('docsUpdated', (data) => {
        updateConsoleWithMessage(data.message, question, previousLinesCount);
    });


    // Function to update console with a message
    function updateConsoleWithMessage(message, question, previousLinesCount) {
        if (isModelInteracting) return; // Skip logging if model interaction is active
        // Move up the cursor to the start of the previous two lines
        process.stdout.write('\u001b[s');  // Save the current cursor position
        process.stdout.moveCursor(0, -previousLinesCount);

        // Clear the previous two lines
        for (let i = 0; i < previousLinesCount; i++) {
            process.stdout.clearLine(0);  // Clear the current line
            process.stdout.cursorTo(0);   // Move cursor to the start of the line
            if (i < previousLinesCount - 1) {
                process.stdout.moveCursor(0, 1);  // Move down to the next line
            }
        }

        // Move cursor back to the start of the first cleared line
        process.stdout.moveCursor(0, -(previousLinesCount - 1));

        // Prepare the log message and calculate how many lines it will occupy
        const logMessage = `${message}`;
        const logLines = Math.ceil((logMessage.length + 1) / process.stdout.columns);
        console.log(logMessage);  // This adds a newline automatically

        // Print the question and calculate lines
        const questionLines = Math.ceil((question.length + 1) / process.stdout.columns);
        console.log(question);  // This adds a newline automatically

        process.stdout.write('\u001b[u');  // Restore the saved cursor position
        // Update the count of lines currently printed to the console
        previousLinesCount = logLines + questionLines;
    }

    return new Promise((resolve) => {
        const readlineCallback = (answer) => {
            eventEmitter.removeAllListeners('data_received');  // Clean up listeners after getting an answer
            eventEmitter.removeAllListeners('docsUpdated');  // Clean up listeners after getting an answer
            resolve(answer);
        };
        rl.question('', readlineCallback);
    });
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

const handleDocumentationSearch = async (query) => {
    await printTextSymbolBySymbol(`Docs search results:`);
    console.log('');
    const search_results = await performSearch(query);
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
            const answer = await askQuestionAnimated('Type result index, or search for something new: ');
            resolve(answer);
        });
        const selectedResult = search_results.find(result => result.number.toString() === selection);
        if (selectedResult) {
            console.log('');
            await printTextSymbolBySymbol(`Indexing documentation: ${selectedResult.title}`);
            console.log('');
            let url = selectedResult.link;
            callIndexer(url);
            generateResponseFromLink(url); 
        } else {
            // Assume the user wants to perform a new search
            await printTextSymbolBySymbol(`Searching for: ${selection}`);
            console.log('');
            handleDocumentationSearch(selection); // Perform the search with the new query
        }
    }
};

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
        console.log('');
        callIndexer(answer);
        generateResponseFromLink(answer); 
    } else {
        handleDocumentationSearch(answer);
    }
};


async function generateResponseFromLink(url) {
    try {
        await printTextSymbolBySymbol(`Reading docs`);
        console.log('');
        loadAndStartChat(url); 
    } catch (error) {
        console.error('Error generating response from link:', error);
        rl.close(); // Ensure readline interface is closed on error
    }
}

async function loadAndStartChat(url) {
    try {
        let allData;  // Declare allData at the function scope
        try {
            allData = await getDataWithRetry(url);  // Assign the data retrieved
            console.log("Data loaded, words:", allData.filteredTotalWords);
            if (!allData || !allData.links) {
                console.error('links are undefined or not an object:', allData ? allData.links : 'allData is null');
                return;
            }
        } catch (error) {
            console.error('Error loading or starting chat:', error);
            return;  // Exit the function if data loading fails
        }
        let allContent = [];

        if (allData.links && typeof allData.links === 'object') {
            for (const [link, data] of Object.entries(allData.links)) {
                if (data && data.filtered_content) {
                    let content = data.filtered_content;
                    allContent.push(`Link: ${link}\nContent: ${content}\n`);
                }
            }
        } else {
            console.error('links are undefined or not an object:', allData.links);
            return;  
        }

        let content = allContent.join('\n');
        await countTokensForText(content);
        startChatSession(content);
    } catch (error) {
        console.error('Error loading or starting chat:', error);
    }
}

async function getDataWithRetry(url, retries = 5) {
    let attempt = 1;
    while (attempt <= retries) {
        const data = dataMap.get(url);
        if (data) {
            // console.log("Data found for URL:", url);
            return data.data_received;
        } else {
            // console.log(`Data not found for ${url}, retrying... Attempt ${attempt}`);
            await delayWithFeedback(3000); // Wait for 3 seconds before retrying
            attempt++;
        }
    }
    throw new Error(`No data found for the provided URL after ${retries} retries.`);
}

async function startChatSession(content) {
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
    askForMessagePrompt(chat);
}


async function askForMessagePrompt(chat) {
    if (!chat || typeof chat.sendMessageStream !== 'function') {
        console.error('Invalid chat session object.');
        return;
    }
    console.log('\n___________________________________________________________________________________'); // Indicate the end of the stream
    await printTextSymbolBySymbol('\nType your prompt (or type "exit"):'); // Indicate the end of the stream
    console.log('\n');
    const msg = await askQuestionAnimated_with_logs('Type your prompt (or type "exit"):');
    isModelInteracting = true; // Disable logging
    if (msg.toLowerCase() === "exit") {
        await printTextSymbolBySymbol("Exiting...");
        isModelInteracting = false; // Re-enable logging after interaction
        rl.close();
        process.exit(0); 
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
            const modifiedMsg = msg + ". Please provide response solely based on the provided context. Keep your answer as short as possible.";
            const result = await chat.sendMessageStream(modifiedMsg);
            clearInterval(timerId); // Stop the timer once the first chunk is received
            process.stdout.clearLine(0);
            process.stdout.cursorTo(0);

            let text = '';
            let isFirstChunk = true;
            let lineCount = 0;
            for await (const chunk of result.stream) {
                const chunkText = chunk.text();
                lineCount += (chunkText.match(/\n/g) || []).length + 1; // Count new lines and add one for the current line
                if (isFirstChunk) {
                    let finalElapsedTime = (Date.now() - startTime) / 1000; // Convert to seconds
                    await printTextSymbolBySymbol(`\nReceived first chunk after ${finalElapsedTime.toFixed(1)} seconds.`);
                    await printTextSymbolBySymbol(`\nModel: `);
                    isFirstChunk = false;
                }
                await printTextSymbolBySymbol(chunk.text()); // Use the function to print chunk smoothly
                text += chunk.text();
            }
            process.stdout.moveCursor(0, -lineCount);
            process.stdout.clearScreenDown();
            const output = marked(text);
            console.log(output);
        } catch (error) {
            clearInterval(timerId); // Ensure to clear the timer in case of an error
            console.error('Failed to fetch response:', error);
            askForMessagePrompt(chat);  // Recursive call to allow continuous interaction
        }
        isModelInteracting = false; // Re-enable logging after interaction
        askForMessagePrompt(chat);  // Recursive call to allow continuous interaction
    }
};

askForDocumentationType();