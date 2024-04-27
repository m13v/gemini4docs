import fetch from 'node-fetch';
import readline from 'readline';

const context = 'its a dummy context';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Function to send user input and context to the worker and receive the response
async function sendMessageToWorker(message) {
    try {
        const response = await fetch('https://worker-aged-night-839d.i-f9f.workers.dev', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, context })
        });
        const data = await response.json();
        return data.message;  // Assuming the worker responds with JSON containing a 'message' field
    } catch (error) {
        console.error('Error sending message to worker:', error);
        return "Failed to communicate with the worker.";
    }
}

// Modified function to ask for user input and handle the worker's response
async function askForMessagePrompt() {
    rl.question('Prompt (or type "exit"): ', async (msg) => {
        if (msg.toLowerCase() === "exit") {
            console.log("Exiting...");
            rl.close();
        } else {
            console.log(`Sending message to the worker...`);
            const response = await sendMessageToWorker(msg);
            console.log('Response from worker:', response);
            askForMessagePrompt();  // Ask for the next message
        }
    });
}

// Start the interaction
askForMessagePrompt();