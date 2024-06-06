#!/usr/bin/env node
import fs from 'fs/promises';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
// import readline from 'readline'; // Import the readline module
import fetch from 'node-fetch';
import { main as indexLink } from './indexer.js';
import { EventEmitter } from 'events';
const indexerEvents = new EventEmitter();
import eventEmitter from './eventEmitter.js';  
import chokidar from 'chokidar';
import { marked } from 'marked';
import TerminalRenderer from 'marked-terminal';
import { highlight } from 'cli-highlight';
import { screen, logBox, chatBox, inputBox } from './blessed.js';
import { getUserInput, displayLogMessage, displayChatMessage, reprintChatMessage } from './blessed.js';

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
            displayLogMessage(`Error: during indexing: ${error}`);
        });
        return;
    } catch (error) {
        displayLogMessage(`Error during callindexer execution: ${error}`);
        throw error;  // Rethrow or handle error appropriately
    }
}

dotenv.config();
const Geminiapikey = 'AIzaSyClVG_noIBt3_1WD8kfTdyzqeNAGK8YEKI'; //temporary api key
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
            displayLogMessage(`Error Search failed: ${results.error}`);
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
        displayLogMessage(`Error  performing search: ${error}`);
        return { error: "Search failed due to an error." };
    }
}

// Function to count tokens for text-only input
const countTokensForText = async (text) => {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });
    const { totalTokens } = await model.countTokens(text);
    // eventEmitter.emit('docsUpdated', { message: `Tokens loaded: ${totalTokens}`});

    if (totalTokens > 950000) {
        const reductionFactor = 950000 / totalTokens;
        const newLength = Math.floor(text.length * reductionFactor);
        text = text.substring(0, newLength);
        // Optionally recount tokens if necessary or just return the new text length
        const { totalTokens: adjustedTokens } = await model.countTokens(text);
        eventEmitter.emit('docsUpdated', { message: `Tokens reduced to: ${adjustedTokens}`});
        return adjustedTokens; // or return text if you need the modified text
    }

    return totalTokens;
};

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

let activeDelayControl = null;

function delayWithFeedback(ms) {
    let timerId, resolvePromise;
    const promise = new Promise(resolve => {
        resolvePromise = resolve;
        const startTime = Date.now();
        timerId = setInterval(() => {
            let elapsedTime = (Date.now() - startTime) / 1000; // Convert to seconds
            displayLogMessage(`Loading... [${elapsedTime.toFixed(1)}s]`); // Update log message
        }, 100); // Update every 100 milliseconds

        setTimeout(() => {
            clearInterval(timerId);
            displayLogMessage(''); // Clear the log message
            resolve();
        }, ms);
    });

    activeDelayControl = {
        stop: () => {
            clearInterval(timerId);
            displayLogMessage(''); // Clear the log message
            resolvePromise();
        }
    };

    return promise;
}

async function printTextSymbolBySymbol(text) {
    const fastDelay = 1;  // Faster delay time in milliseconds
    const slowDelay = 10; // Slower delay time in milliseconds
    const speedThreshold = 150; // Length threshold to switch to faster printing
    let currentContent = chatBox.getContent();  // Get the current content of the chatBox

    for (let i = 0; i < text.length; i++) {
        currentContent += text[i];  // Append the character to the current content
        chatBox.setContent(currentContent);  // Update the chatBox content
        chatBox.setScrollPerc(100);  // Keep scrolling to the bottom
        screen.render();  // Render the screen to update the display

        // Use a shorter delay if the text length exceeds the threshold
        const delayTime = text.length > speedThreshold ? fastDelay : slowDelay;
        await delay(delayTime);  // Wait for the specified delay
    }
}

let dataMap = new Map();
let debounceTimer;

eventEmitter.on('indexingFailed', ({ data }) => {
    if (activeDelayControl) {
        activeDelayControl.stop();
    }
    displayLogMessage(`\x1b[31mIndexing failed for ${data.baseUrl}. Returning to documentation type selection.\x1b[0m`);
    askForDocumentationType();
});

eventEmitter.on('dataSaved', async ({ data }) => {  // Add async here
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
let isWaitingForInput = false;
// let logCounter = 0;

async function askQuestionAnimated_with_logs(question) {

    let previousLinesCount = 1;  // Track the number of lines printed previously
    // eventEmitter.removeAllListeners('data_received');  // Clean up listeners after getting an answer
    // eventEmitter.removeAllListeners('docsUpdated');  // Clean up listeners after getting an answer

    // Listener for data received events
    eventEmitter.on('data_received', (data) => {
        updateConsoleWithMessage(data.message, question, previousLinesCount);
    });

    // Listener for documentation updates
    eventEmitter.on('docsUpdated', (data) => {
        updateConsoleWithMessage(data.message, question, previousLinesCount);
    });

    // Function to update console with a message
    function updateConsoleWithMessage(message, question, previousLinesCount) {
        if (isModelInteracting) return; // Skip logging if model interaction is active
        // Move up the cursor to the start of the previous line
        const logMessage = `${message} | ${question}`;
        // const logLines = Math.ceil((logMessage.length + 1) / process.stdout.columns);

        // process.stdout.write('\u001b[s');  // Save the current cursor position
        // process.stdout.moveCursor(0, -previousLinesCount);

        // Clear the previous line
        // process.stdout.clearLine(0);  // Clear the current line
        // process.stdout.cursorTo(0);   // Move cursor to the start of the line

        // Prepare the log message and calculate how many lines it will occupy
        displayLogMessage(logMessage);  // This adds a newline automatically

        // process.stdout.write('\u001b[u');  // Restore the saved cursor position
        // Update the count of lines currently printed to the console
        // previousLinesCount = logLines;
    }


    isWaitingForInput = true;
    const answer = await getUserInput('Your input:');
    isWaitingForInput = false;
    return answer;
    // return new Promise((resolve) => {
    //     const readlineCallback = (answer) => {
    //         eventEmitter.removeAllListeners('data_received');  // Clean up listeners after getting an answer
    //         eventEmitter.removeAllListeners('docsUpdated');  // Clean up listeners after getting an answer
    //         isWaitingForInput = false;
    //         resolve(answer);
    //     };
    //     rl.question('You: ', readlineCallback);
    // });
}

async function askQuestionAnimated(question) {
    await printTextSymbolBySymbol(question);  // Assuming this function animates text display in chatBox
    const answer = await getUserInput('Your input:');
    return answer;
}

// Create readline interface
// const rl = readline.createInterface({
//     input: process.stdin,
//     output: process.stdout
// });

const handleDocumentationSearch = async (query) => {
    await printTextSymbolBySymbol(`Docs search results:\n`);
    // console.log('');
    const search_results = await performSearch(query);
    if (search_results.error) {
        await printTextSymbolBySymbol(`${search_results.error}\n`);
        // console.log('');
        askForDocumentationType(); // Retry if there's an error
    } else {
        // Format and log the search results
        const formattedResults = search_results.map(result => {
            return `${result.number}: ${result.title}\n  ${result.link}\n  ${result.snippet}`;
        }).join('\n\n');
        // console.log('');
        await printTextSymbolBySymbol(formattedResults);
        const selection = await new Promise(async (resolve) => { // Make the callback function async
            // process.stdout.write('\n'); // Add a newline at the end of the animation
            // console.log('');
            const answer = await askQuestionAnimated('\n\nType result index, or search for something new: ');
            resolve(answer);
        });
        const selectedResult = search_results.find(result => result.number.toString() === selection);
        if (selectedResult) {
            // console.log('');
            await printTextSymbolBySymbol(`Indexing documentation: ${selectedResult.title}`);
            // console.log('');
            let url = selectedResult.link;
            callIndexer(url);
            generateResponseFromLink(url); 
        } else {
            // Assume the user wants to perform a new search
            await printTextSymbolBySymbol(`Searching for: ${selection}`);
            // console.log('');
            handleDocumentationSearch(selection); // Perform the search with the new query
        }
    }
};

const askForDocumentationType = async () => {
    let answer = await askQuestionAnimated('Which documentation do you need? (link or keywords): ');
    answer = answer.trim().toLowerCase(); // Trim and convert to lowercase to standardize the input
    const urlPattern = new RegExp('^(https?:\\/\\/)?([\\da-z\\.-]+)\\.([a-z\\.]{2,6})([\\/\\w \\.-]*)*\\/?$', 'i');
    if (urlPattern.test(answer)) {
        await printTextSymbolBySymbol('\nProcessing the link...\n');
        // console.log('');
        if (!answer.startsWith('http://') && !answer.startsWith('https://')) {
            answer = 'https://' + answer; // Default to https if no protocol is specified
        }
        callIndexer(answer);
        generateResponseFromLink(answer); 
    } else {
        handleDocumentationSearch(answer);
    }
};


async function generateResponseFromLink(url) {
    try {
        await printTextSymbolBySymbol(`\nReading docs\n`);
        // console.log('');
        delayWithFeedback(60000);
    } catch (error) {
        displayLogMessage(`Error: generating response from link: ${error}`);
        // rl.close(); // Ensure readline interface is closed on error
    }
}

async function loadAndStartChat(url) {
    // let previousLinesCount = 1; 
    try {
        let allData;  // Declare allData at the function scope
        try {
            allData = await getDataWithRetry(url);  // Assign the data retrieved
            // console.log("Data loaded, words:", allData.filteredTotalWords);
            if (!allData || !allData.links) {
                displayLogMessage(`Error: links are undefined or not an object: ${allData} ? ${allData.links} : allData is null`);
                return;
            }
        } catch (error) {
            `Error loading or starting chat: ${error}`;
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
            displayLogMessage(`Error: links are undefined or not an object: ${allData.links}`);
            return;  
        }

        let content = allContent.join('\n');
        await countTokensForText(content);
        if (activeDelayControl) {
            activeDelayControl.stop();
        }
    
        if (!isModelInteracting) {
            startChatSession(content);
    
            const logMessage = 'Chat is reloaded with updated context';
            // const logLines = Math.ceil((logMessage.length + 1) / process.stdout.columns);
    
            // process.stdout.write('\u001b[s');  // Save the current cursor position
            // process.stdout.moveCursor(0, -previousLinesCount);
    
            // Clear the previous line
            // process.stdout.clearLine(0);  // Clear the current line
            // process.stdout.cursorTo(0);   // Move cursor to the start of the line
    
            // Prepare the log message and calculate how many lines it will occupy
            displayLogMessage(logMessage);  // This adds a newline automatically
    
            // process.stdout.write('\u001b[u');  // Restore the saved cursor position
            // Update the count of lines currently printed to the console
            // previousLinesCount = logLines;
        }
    } catch (error) {
        displayLogMessage(`Error: loading or starting chat: ${error}`);
    }
}

async function getDataWithRetry(url, retries = 5) {
    let attempt = 1;
    while (attempt <= retries) {
        const data = dataMap.get(url);
        if (data) {
            return data.data_received;
        } else {
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
        displayLogMessage(`Error: Invalid chat session object.`);
        return;
    }
    // console.log('_____________________'); // Indicate the end of the stream
    // console.log('\n');
    // console.log('Type your prompt (or type "exit"):'); // Indicate the end of the stream
    const msg = await askQuestionAnimated_with_logs('Type your prompt (or type "exit"):');
    isModelInteracting = true; // Disable logging
    if (msg.toLowerCase() === "exit") {
        await printTextSymbolBySymbol("Exiting...");
        isModelInteracting = false; // Re-enable logging after interaction
        // rl.close();
        process.exit(0); 
    } else {
        // await printTextSymbolBySymbol(`Sending message to the model...`);
        // console.log('');
        const startTime = Date.now();
        let timerId = setInterval(() => {
            // Update the console with the elapsed time every tenth of a second
            // process.stdout.clearLine(0);
            // process.stdout.cursorTo(0);
            let elapsedTime = (Date.now() - startTime) / 1000; // Convert to seconds
            displayLogMessage(`Thinking... [${elapsedTime.toFixed(1)}s].`);
        }, 100); // Update every 100 milliseconds (0.1 second)

        try {
            const modifiedMsg = msg + ". Please provide response solely based on the provided context. Keep your answer as short as possible. Provide all source links";
            const result = await chat.sendMessageStream(modifiedMsg);
            clearInterval(timerId); // Stop the timer once the first chunk is received
            // process.stdout.clearLine(0);
            // process.stdout.cursorTo(0);

            let text = '';
            let isFirstChunk = true;
            let lineCount = 0;
            let currentChat=`${chatBox.getContent()}`
            for await (const chunk of result.stream) {
                const chunkText = chunk.text();
                lineCount += (chunkText.match(/\n/g) || []).length + 1; // Count new lines and add one for the current line
                if (isFirstChunk) {
                    let finalElapsedTime = (Date.now() - startTime) / 1000; // Convert to seconds
                    // await printTextSymbolBySymbol(`\nReceived first chunk after ${finalElapsedTime.toFixed(1)} seconds.`);
                    await printTextSymbolBySymbol(`\nModel: `);
                    isFirstChunk = false;
                }
                await printTextSymbolBySymbol(chunk.text()); // Use the function to print chunk smoothly
                text += chunk.text();
            }
            const output = marked(text);
            let updatedchat = currentChat + "Model: " + output;
            reprintChatMessage(updatedchat);
            // process.stdout.moveCursor(0, -lineCount);
            // process.stdout.clearScreenDown();
            // printTextSymbolBySymbol(`Model: ${output}`);
            // process.stdout.moveCursor(0, -1);
        } catch (error) {
            clearInterval(timerId); // Ensure to clear the timer in case of an error
            displayLogMessage(`Error: Failed to fetch response: ${error}`);
            askForMessagePrompt(chat);  // Recursive call to allow continuous interaction
        }
        isModelInteracting = false; // Re-enable logging after interaction
        askForMessagePrompt(chat);  // Recursive call to allow continuous interaction
    }
};

askForDocumentationType();