import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();
const Geminiapikey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY; 
const genAI = new GoogleGenerativeAI(Geminiapikey);
// Function to build the prompt for Google Generative AI
const buildGoogleGenAIPrompt = (messages) => {
  // Ensure the last message is from a "user"
  if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
    throw new Error("The last message in the prompt must be from the 'user'.");
  }
  
  return {
    contents: messages
      .filter(message => message.role === 'user' || message.role === 'assistant')
      .map(message => ({
        role: message.role === 'user' ? 'user' : 'model',
        parts: [{ text: message.content }],
      })),
  };
};

// Updated sendMessageToGemini function to actually send the message and return the response
export const sendMessageToGemini = async (userMessage, onMessagePart) => {
  const messages = [
    { role: 'user', content: userMessage },
  ];

  try {
    const requestOptions = {
      apiVersion: 'v1beta'
    };

    const prompt = buildGoogleGenAIPrompt(messages);

    const {stream, response} = await genAI
      .getGenerativeModel({ model: 'gemini-1.5-pro-latest' }, requestOptions)
      .generateContentStream(prompt);
  
    for await (const data of stream) {
      const textParts = data.candidates.map(candidate => 
        candidate.content.parts.map(part => part.text).join(' ')
      ).join(' ');
      
      // Call the callback with each new message part
      onMessagePart(textParts);
    }
  } catch (error) {
    console.error('Error:', error);
    throw error; // Rethrow the error to handle it in the calling function
  }
};