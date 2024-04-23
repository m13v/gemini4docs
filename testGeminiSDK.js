import { sendMessageToGemini } from './geminiSDK.js';

// Example callback function to handle message parts
function onMessagePart(messagePart) {
  console.log('Received message part:', messagePart);
}

// Example user message to send
const userMessage = 'Hello, how are you today?';

sendMessageToGemini(userMessage, onMessagePart)
  .then(() => console.log('Message processing completed.'))
  .catch(error => console.error('An error occurred:', error));