require('dotenv').config();
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function getChatCompletion(message) {
  let attempts = 0;
  const maxAttempts = 3; // Set a maximum number of attempts to avoid infinite loops

  while (attempts < maxAttempts) {
    try {
      const chatCompletion = await groq.chat.completions.create({
        "messages": [
          {
            "role": "system",
            "content": `You are a helpful assistant. You are being given a pair of text and code snippets.
            Based on the given input,
            Your job is to determine a starting point in the text string that is talking about the code snippet. 
            Respond with a starting position of the relevant text inside the given string.
            Important: Only return a single number in response`
          },
          {
            "role": "user",
            "content": message
          }
        ],
        "model": "llama3-8b-8192",
        "temperature": 1,
        "max_tokens": 1024,
        "top_p": 1,
        "stream": false,
        "stop": null
      });

      const result = chatCompletion.choices[0].message.content.toLowerCase();
      if (result === "text" || result === "code") {
        process.stdout.write("OK "); // Print 'OK' followed by a space, without a newline
        return result;
      } else {
        attempts++;
      }
    } catch (error) {
      if (error.response && error.response.status === 429) {
        const retryAfter = error.response.headers['retry-after'];
        process.stdout.write("ER "); // Print 'ER' followed by a space, without a newline
        await new Promise(resolve => setTimeout(resolve, retryAfter * 60000)); // Wait before retrying
        attempts++;
      } else {
        process.stdout.write("ER "); // Print 'ER' for other errors as well, without a newline
      }
    }
  }
  return "Error: Failed to get valid response after several attempts.";
}

module.exports = { getChatCompletion };