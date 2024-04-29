import { marked } from 'marked';
import TerminalRenderer from 'marked-terminal';
import { highlight } from 'cli-highlight';

// Set the renderer to marked-terminal with custom code highlighting
marked.setOptions({
  renderer: new TerminalRenderer({
    // Custom renderer for code blocks
    code: (code, language) => {
      return highlight(code, { language: language || 'javascript', theme: 'monokai' });
    }
  })
});

// Sample Markdown text with embedded JavaScript code
const markdown = `
## Sample Code: Highlighting Console Logs

\`\`\`javascript
import { emphasize } from 'emphasize';

// Assuming you have a string 'code' containing your console log
const code = \`console.log("Hello, world!")\`;

// Highlight the code automatically
const highlightedCode = emphasize.highlightAuto(code).value;

// Output the highlighted code to the console
console.log(highlightedCode);
\`\`\`

**Explanation:**

1. **Import:** We bring in the \`emphasize\` function from the library.
2. **Code Variable:** Replace \`"console.log("Hello, world!")"\` with the actual string content of your console log.
3. **Highlighting:**  \`emphasize.highlightAuto(code)\` automatically detects the language and applies highlighting. The \`.value\` property extracts the resulting highlighted string.
4. **Output:** The highlighted code is then printed to the console.
`;

// Convert Markdown to terminal-friendly output with highlighted code blocks
const output = marked(markdown);

// Print the formatted and highlighted output to the console
console.log(output);