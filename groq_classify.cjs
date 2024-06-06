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
            "content": `You are a helpful assistant. Determine whether a given string is a piece of programming language syntex (code) or natural language (text). User will send a series of strings. Respond with either it's a 'code' or 'text' in lowercase. Important: Only return a single word in response"
            Examples:
            {
              "result": "text",
              "line": "Getting Started#"
            },
            {
              "result": "text",
              "line": "To install the library:"
            },
            {
              "result": "code",
              "line": "pip install llama-index"
            },
            {
              "result": "text",
              "line": "We recommend starting at how to read these docs which will point you to the right place based on your experience level."
            },
            {
              "result": "text",
              "line": "🗺️ Ecosystem#"
            },
            {
              "result": "text",
              "line": "To download or contribute, find LlamaIndex on:"
            },
            {
              "result": "text",
              "line": "Github"
            },
            {
              "result": "text",
              "line": "PyPi"
            },
            {
              "result": "text",
              "line": "LlamaIndex.TS (Typescript/Javascript package):"
            },
            {
              "result": "code",
              "line": "const Groq = require('groq-sdk');"
            },
            {
              "result": "code",
              "line": "import json"
            },
            {
              "result": "code",
              "line": "content = file.read()"
            },
            {
              "result": "code",
              "line": "return content"
            }`
          },
          {
            "role": "user",
            "content": message
          }
        ],
        "model": "llama3-8b-8192",
        "temperature": 1,
        "max_tokens": 10,
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